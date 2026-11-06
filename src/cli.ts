#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { HOSTS, detectHosts, doctor, install, packageRoot, planInstall, uninstall } from './adapters.js';
import { runAudit } from './audit.js';
import { exists } from './fsutil.js';
import { buildMap } from './map.js';
import { markdownTitle, renderAuditHtml, renderCurrentStateHtml, renderMarkdownHtml, renderOverviewHtml } from './html.js';
import { findingsJson, registerJson, renderAuditReport, renderCurrentState, renderOverview, renderSarif } from './report.js';
import { diffFindings, renderDrift } from './drift.js';
import { serveMcp } from './mcp.js';
import { renderCost, renderDesign, renderModernize, renderReview, renderThreatModel } from './scaffold.js';
import type { Finding, Severity } from './types.js';
import { verifyProject } from './verify.js';

const EXIT = { ok: 0, findings: 1, usage: 2, needsModel: 3, verifyFailed: 4, error: 5 } as const;

const HELP = `ArchSutra AI - Design. Audit. Evolve.

Usage: archsutra <command> [path] [options]

Deterministic commands (no AI, no network, read-only unless noted):
  init [path]        detect project + hosts, propose an install plan
  doctor [path]      check Node, hosts, installed files, conflicts
  map [path]         reverse-engineer modules, dependencies, cycles
  audit [path]       evidence-linked findings + scorecard
  review [path]      same evidence as audit, written as a review starter
  design [path]      design starter from the module map; decisions stay unknown
  threat-model [path] STRIDE starter from security findings; the rest stays unknown
  modernize [path]   one slice per finding; target architecture stays unknown
  cost [path]        states that cost is not assessed
  drift              diff two findings.json files, or a project against --baseline
  compare            same diff as drift, for two ArchSutra snapshots
  verify [path]      validate skills, agents, links, diagrams, findings.json
  export [path]      write every report as Markdown and HTML (use --output)
  html <file.md>     write a readable HTML page next to a Markdown report
  mcp                MCP server on stdio (tools: audit, map, drift)
  install            install skills/agents into a project (--host, --target)
  uninstall          remove files ArchSutra installed (--host, --target)
  hosts              list adapters and their support level

Semantic judgment (options, STRIDE completion, spend) stays marked unknown.
Run the matching skill in your IDE to fill those sections. No model API is called.

Options:
  --json             machine-readable output
  --format <md|html> stdout format for audit and map when not writing files (default md)
  --dry-run          show what would change; write nothing
  --output <dir>     directory for audit, map, export, and the starter commands
  --baseline <file>  findings.json to diff against (drift, compare)
  --host <id>        claude | cursor | codex | copilot | gemini
  --target <dir>     project to install into (default .)
  --force            overwrite modified files (backups kept)
  --fail-on <sev>    audit, review, and drift exit 1 at or above this severity
  --verbose          extra detail
  --version, --help
`;

interface Args {
  cmd?: string;
  pos: string[];
  flags: Record<string, string | boolean>;
}

function parse(argv: string[]): Args {
  const flags: Args['flags'] = {};
  const pos: string[] = [];
  const withValue = new Set(['output', 'host', 'target', 'fail-on', 'format', 'baseline']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (withValue.has(key)) flags[key] = argv[++i] ?? '';
      else flags[key] = true;
    } else pos.push(a);
  }
  return { cmd: pos.shift(), pos, flags };
}

function out(json: boolean, data: unknown, text: string): void {
  process.stdout.write(json ? `${JSON.stringify(data, null, 2)}\n` : `${text}\n`);
}

type ReportFile = { path: string; content: string };

function insideProject(target: string, outputFlag: string): string | undefined {
  const outDir = path.resolve(target, outputFlag);
  const rel = path.relative(target, outDir);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return undefined;
  return outDir;
}

function reportBundle(res: Awaited<ReturnType<typeof runAudit>>): ReportFile[] {
  const files: ReportFile[] = [
    { path: 'README.md', content: renderOverview(res) },
    { path: 'index.html', content: renderOverviewHtml(res) },
    { path: 'current-state.md', content: renderCurrentState(res.map) },
    { path: 'current-state.html', content: renderCurrentStateHtml(res.map) },
    { path: 'audit-report.md', content: renderAuditReport(res) },
    { path: 'audit-report.html', content: renderAuditHtml(res) },
    { path: 'findings.json', content: JSON.stringify(findingsJson(res), null, 2) },
    { path: 'findings.sarif', content: JSON.stringify(renderSarif(res), null, 2) },
  ];
  files.push({ path: 'architecture-register.json', content: JSON.stringify(registerJson(files), null, 2) });
  return files;
}

async function writeReportFiles(outDir: string, files: ReportFile[], dry: boolean): Promise<void> {
  if (dry) return;
  await fs.mkdir(outDir, { recursive: true });
  for (const f of files) await fs.writeFile(path.join(outDir, f.path), f.content, 'utf8');
}

function wroteLine(dry: boolean, outDir: string, files: ReportFile[], hint: string): string {
  return `${dry ? 'Would write' : 'Wrote'} ${files.length} files to ${outDir}\n${files.map((f) => `  ${f.path}`).join('\n')}\n${hint}`;
}

async function readFindings(file: string): Promise<Finding[]> {
  const raw = JSON.parse(await fs.readFile(file, 'utf8')) as { findings?: Finding[] } | Finding[];
  const list = Array.isArray(raw) ? raw : raw.findings;
  if (!Array.isArray(list)) throw new Error(`${file} has no findings array`);
  return list;
}

function severityExit(findings: { severity: Severity }[], th: string | undefined): number | undefined {
  if (!th) return undefined;
  const order: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
  const i = order.indexOf(th as Severity);
  if (i < 0) return EXIT.usage;
  return findings.some((f) => order.indexOf(f.severity) <= i) ? EXIT.findings : EXIT.ok;
}

async function main(): Promise<number> {
  const args = parse(process.argv.slice(2));
  const json = Boolean(args.flags.json);
  const dry = Boolean(args.flags['dry-run']);
  const verbose = Boolean(args.flags.verbose);

  if (args.flags.version || args.cmd === 'version') {
    const pkg = JSON.parse(await fs.readFile(path.join(packageRoot(), 'package.json'), 'utf8')) as { version: string };
    out(json, { version: pkg.version }, pkg.version);
    return EXIT.ok;
  }
  if (!args.cmd || args.flags.help || args.cmd === 'help') {
    process.stdout.write(HELP);
    return args.cmd || args.flags.help ? EXIT.ok : EXIT.usage;
  }
  const target = path.resolve(args.pos[0] ?? '.');

  switch (args.cmd) {
    case 'hosts': {
      out(json, HOSTS, HOSTS.map((h) => `${h.id.padEnd(8)} ${h.support.padEnd(13)} ${h.label} - ${h.notes}`).join('\n'));
      return EXIT.ok;
    }
    case 'init': {
      const detected = await detectHosts(target);
      const plans = [];
      for (const d of detected) plans.push(await planInstall(d.id, target));
      const text = [
        `Project: ${target}`,
        `Hosts detected: ${detected.map((d) => `${d.id} (${d.evidence})`).join(', ') || 'none'}`,
        ...plans.map((p) => `Plan for ${p.host}: ${p.files.filter((f) => f.action === 'create').length} create, ${p.files.filter((f) => f.action === 'update').length} update, ${p.files.filter((f) => f.action === 'conflict').length} conflict`),
        detected.length ? 'Apply with: archsutra install --host <id> --target .' : 'No host detected. Choose one: archsutra install --host claude --target .',
        'Nothing was written.',
      ].join('\n');
      out(json, { target, detected, plans: plans.map((p) => ({ host: p.host, files: p.files.map((f) => ({ rel: f.rel, action: f.action })) })) }, text);
      return EXIT.ok;
    }
    case 'doctor': {
      const res = await doctor(target);
      const text = res.map((r) => `${r.ok ? 'OK  ' : 'FAIL'} ${r.id}: ${r.message}${r.fix ? `\n     fix: ${r.fix}` : ''}`).join('\n');
      out(json, res, text);
      return res.every((r) => r.ok) ? EXIT.ok : EXIT.findings;
    }
    case 'map': {
      const map = await buildMap(target);
      const fmt = String(args.flags.format ?? 'md');
      if (args.flags.format && !['md', 'html'].includes(fmt)) {
        process.stderr.write(`Invalid --format "${fmt}" (use md or html)\n`);
        return EXIT.usage;
      }
      if ('output' in args.flags) {
        const outDir = insideProject(target, String(args.flags.output || 'docs/architecture'));
        if (!outDir) {
          process.stderr.write('--output must stay inside the project directory.\n');
          return EXIT.usage;
        }
        const files: ReportFile[] = [
          { path: 'current-state.md', content: renderCurrentState(map) },
          { path: 'current-state.html', content: renderCurrentStateHtml(map) },
        ];
        await writeReportFiles(outDir, files, dry);
        out(json, { dryRun: dry, outDir, files: files.map((f) => f.path) }, wroteLine(dry, outDir, files, 'Open current-state.html in a browser. current-state.md is the same report in Markdown.'));
        return EXIT.ok;
      }
      out(json, map, fmt === 'html' ? renderCurrentStateHtml(map) : renderCurrentState(map));
      return EXIT.ok;
    }
    case 'audit': {
      const res = await runAudit(target);
      const fmt = String(args.flags.format ?? 'md');
      if (args.flags.format && !['md', 'html'].includes(fmt)) {
        process.stderr.write(`Invalid --format "${fmt}" (use md or html)\n`);
        return EXIT.usage;
      }
      if ('output' in args.flags) {
        const outDir = insideProject(target, String(args.flags.output || 'docs/architecture'));
        if (!outDir) {
          process.stderr.write('--output must stay inside the project directory.\n');
          return EXIT.usage;
        }
        const files = reportBundle(res);
        await writeReportFiles(outDir, files, dry);
        out(json, { dryRun: dry, outDir, files: files.map((f) => f.path) }, wroteLine(dry, outDir, files, 'Open index.html in a browser. Each report also has a Markdown file beside it.'));
      } else {
        out(json, findingsJson(res), fmt === 'html' ? renderAuditHtml(res) : renderAuditReport(res));
      }
      const order: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
      const th = args.flags['fail-on'] as string | undefined;
      if (th) {
        const i = order.indexOf(th as Severity);
        if (i < 0) {
          process.stderr.write(`Invalid --fail-on "${th}"\n`);
          return EXIT.usage;
        }
        if (res.findings.some((f) => order.indexOf(f.severity) <= i)) return EXIT.findings;
      }
      return EXIT.ok;
    }
    case 'html': {
      const srcArg = args.pos[0];
      if (!srcArg) {
        process.stderr.write('html requires a Markdown file.\n');
        return EXIT.usage;
      }
      const src = path.resolve(srcArg);
      const md = await fs.readFile(src, 'utf8');
      const dest = args.flags.output ? path.resolve(String(args.flags.output)) : `${src.replace(/\.md$/i, '')}.html`;
      if (path.extname(dest).toLowerCase() !== '.html') {
        process.stderr.write('--output for html must be a .html file.\n');
        return EXIT.usage;
      }
      const title = markdownTitle(md, path.basename(src, path.extname(src)));
      const html = renderMarkdownHtml(md, title);
      if (!dry) {
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.writeFile(dest, html, 'utf8');
      }
      out(json, { dryRun: dry, source: src, output: dest }, `${dry ? 'Would write' : 'Wrote'} ${dest}\nOpen it in a browser. The Markdown file stays beside it.`);
      return EXIT.ok;
    }
    case 'verify': {
      const checks = await verifyProject(target);
      out(json, checks, checks.map((c) => `${c.ok ? 'PASS' : 'FAIL'} ${c.id}: ${c.message}`).join('\n'));
      return checks.every((c) => c.ok) ? EXIT.ok : EXIT.verifyFailed;
    }
    case 'export': {
      const outDir = insideProject(target, String(args.flags.output || 'docs/architecture'));
      if (!outDir) {
        process.stderr.write('--output must stay inside the project directory.\n');
        return EXIT.usage;
      }
      const res = await runAudit(target);
      const files = reportBundle(res);
      await writeReportFiles(outDir, files, dry);
      out(json, { dryRun: dry, outDir, files: files.map((f) => f.path) }, wroteLine(dry, outDir, files, 'Open index.html in a browser. Each report also has a Markdown file beside it.'));
      return EXIT.ok;
    }
    case 'install': {
      const host = String(args.flags.host ?? '');
      if (!host) {
        process.stderr.write('install requires --host <id>. See: archsutra hosts\n');
        return EXIT.usage;
      }
      const tgt = path.resolve(String(args.flags.target ?? args.pos[0] ?? '.'));
      const plan = await planInstall(host, tgt);
      const dryRun = dry;
      const res = await install(plan, { dryRun, force: Boolean(args.flags.force) });
      const lines = plan.files.map((f) => `${f.action.padEnd(9)} ${f.rel}${f.reason ? ` (${f.reason})` : ''}`);
      if (plan.agentsMd) lines.push(`${plan.agentsMd.action.padEnd(9)} AGENTS.md (managed block)`);
      if (res.blocked.length) {
        process.stderr.write(`${lines.join('\n')}\nBlocked: ${res.blocked.length} conflicting file(s). Re-run with --force to overwrite (originals are backed up) or --dry-run to inspect.\n`);
        return EXIT.findings;
      }
      out(json, { plan: plan.files.map((f) => ({ rel: f.rel, action: f.action })), ...res, dryRun }, `${dryRun ? 'DRY RUN - nothing written\n' : ''}${lines.join('\n')}${verbose ? `\n${JSON.stringify(res)}` : ''}`);
      return EXIT.ok;
    }
    case 'uninstall': {
      const host = String(args.flags.host ?? '');
      if (!host) {
        process.stderr.write('uninstall requires --host <id>\n');
        return EXIT.usage;
      }
      const tgt = path.resolve(String(args.flags.target ?? args.pos[0] ?? '.'));
      const res = await uninstall(host, tgt, dry);
      out(json, { ...res, dryRun: dry }, `${dry ? 'DRY RUN\n' : ''}removed: ${res.removed.length}\n${res.removed.map((r) => `  - ${r}`).join('\n')}${res.kept.length ? `\nkept (modified by you): \n${res.kept.map((r) => `  - ${r}`).join('\n')}` : ''}`);
      return EXIT.ok;
    }
    case 'mcp': {
      await serveMcp();
      return EXIT.ok;
    }
    case 'drift':
    case 'compare': {
      let before: Finding[];
      let after: Finding[];
      if (args.flags.baseline) {
        before = await readFindings(path.resolve(String(args.flags.baseline)));
        after = (await runAudit(target)).findings;
      } else if (args.pos.length >= 2) {
        before = await readFindings(path.resolve(args.pos[0]));
        after = await readFindings(path.resolve(args.pos[1]));
      } else {
        process.stderr.write(`${args.cmd} needs two findings.json files, or a project path and --baseline <findings.json>.\nSemgrep overlap stays in scripts/compare.mjs. This command does not download rules or clone repositories.\n`);
        return EXIT.usage;
      }
      const report = diffFindings(before, after);
      const title = args.cmd === 'compare' ? 'Findings comparison' : 'Architecture drift';
      const note = args.cmd === 'compare' ? '\nSemgrep overlap is scripts/compare.mjs (needs semgrep on PATH). Not run by this command.\n' : '';
      const md = `${renderDrift(report, title)}${note}`;
      if ('output' in args.flags) {
        const outDir = insideProject(path.resolve(args.pos[0] ?? '.'), String(args.flags.output || 'docs/architecture'));
        if (!outDir) {
          process.stderr.write('--output must stay inside the project directory.\n');
          return EXIT.usage;
        }
        const files: ReportFile[] = [
          { path: `${args.cmd}.md`, content: md },
          { path: `${args.cmd}.html`, content: renderMarkdownHtml(md, title) },
        ];
        await writeReportFiles(outDir, files, dry);
      }
      out(json, report, md);
      const added = report.added.map((r) => ({ severity: (r.after ?? 'info') as Severity }));
      const gate = severityExit(added, args.flags['fail-on'] as string | undefined);
      if (gate === EXIT.usage) {
        process.stderr.write(`Invalid --fail-on "${args.flags['fail-on']}"\n`);
        return EXIT.usage;
      }
      return gate ?? EXIT.ok;
    }
    case 'review':
    case 'design':
    case 'threat-model':
    case 'modernize':
    case 'cost': {
      const res = await runAudit(target);
      const md = args.cmd === 'review' ? renderReview(res)
        : args.cmd === 'design' ? renderDesign(res)
          : args.cmd === 'threat-model' ? renderThreatModel(res)
            : args.cmd === 'modernize' ? renderModernize(res)
              : renderCost(res);
      if ('output' in args.flags) {
        const outDir = insideProject(target, String(args.flags.output || 'docs/architecture'));
        if (!outDir) {
          process.stderr.write('--output must stay inside the project directory.\n');
          return EXIT.usage;
        }
        const files: ReportFile[] = [
          { path: `${args.cmd}.md`, content: md },
          { path: `${args.cmd}.html`, content: renderMarkdownHtml(md, args.cmd) },
        ];
        await writeReportFiles(outDir, files, dry);
        out(json, { dryRun: dry, command: args.cmd }, wroteLine(dry, outDir, files, 'Unknown sections stay unknown. The IDE skill fills those.'));
      } else {
        out(json, { command: args.cmd, markdown: md }, md);
      }
      if (args.cmd === 'review') {
        const gate = severityExit(res.findings, args.flags['fail-on'] as string | undefined);
        if (gate === EXIT.usage) {
          process.stderr.write(`Invalid --fail-on "${args.flags['fail-on']}"\n`);
          return EXIT.usage;
        }
        return gate ?? EXIT.ok;
      }
      return EXIT.ok;
    }
    default: {
      process.stderr.write(`Unknown command "${args.cmd}".\n${HELP}`);
      return EXIT.usage;
    }
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  async (e: Error) => {
    process.stderr.write(`archsutra: ${e.message}\n`);
    if (process.argv.includes('--verbose')) process.stderr.write(`${e.stack}\n`);
    if (!(await exists(process.cwd()))) process.stderr.write('Working directory no longer exists.\n');
    process.exitCode = EXIT.error;
  },
);
