#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { HOSTS, detectHosts, doctor, install, packageRoot, planInstall, uninstall } from './adapters.js';
import { runAudit } from './audit.js';
import { exists } from './fsutil.js';
import { buildMap } from './map.js';
import { findingsJson, registerJson, renderAuditReport, renderCurrentState, renderOverview, renderSarif } from './report.js';
import type { Severity } from './types.js';
import { verifyProject } from './verify.js';

const EXIT = { ok: 0, findings: 1, usage: 2, needsModel: 3, verifyFailed: 4, error: 5 } as const;
const MODEL_COMMANDS = ['design', 'review', 'threat-model', 'modernize', 'compare', 'cost', 'drift'];

const HELP = `ArchSutra AI - Design. Audit. Evolve.

Usage: archsutra <command> [path] [options]

Deterministic commands (no AI, no network, read-only unless noted):
  init [path]        detect project + hosts, propose an install plan
  doctor [path]      check Node, hosts, installed files, conflicts
  map [path]         reverse-engineer modules, dependencies, cycles
  audit [path]       evidence-linked findings + scorecard
  verify [path]      validate skills, agents, links, diagrams, findings.json
  export [path]      write docs/architecture/* (use --output; writes files)
  install            install skills/agents into a project (--host, --target)
  uninstall          remove files ArchSutra installed (--host, --target)
  hosts              list adapters and their support level

Model-backed workflows (${MODEL_COMMANDS.join(', ')}):
  Run these through the ArchSutra skills inside your AI IDE.

Options:
  --json             machine-readable output
  --dry-run          show what would change; write nothing
  --output <dir>     output directory for export (default docs/architecture)
  --host <id>        claude | cursor | codex | copilot | gemini
  --target <dir>     project to install into (default .)
  --force            overwrite modified files (backups kept)
  --fail-on <sev>    audit exits 1 if a finding is at or above: critical|high|medium|low
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
  const withValue = new Set(['output', 'host', 'target', 'fail-on']);
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
      out(json, map, renderCurrentState(map));
      return EXIT.ok;
    }
    case 'audit': {
      const res = await runAudit(target);
      out(json, findingsJson(res), renderAuditReport(res));
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
    case 'verify': {
      const checks = await verifyProject(target);
      out(json, checks, checks.map((c) => `${c.ok ? 'PASS' : 'FAIL'} ${c.id}: ${c.message}`).join('\n'));
      return checks.every((c) => c.ok) ? EXIT.ok : EXIT.verifyFailed;
    }
    case 'export': {
      const outDir = path.resolve(target, String(args.flags.output ?? 'docs/architecture'));
      const rel = path.relative(target, outDir);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        process.stderr.write('--output must stay inside the project directory.\n');
        return EXIT.usage;
      }
      const res = await runAudit(target);
      const files = [
        { path: 'README.md', content: renderOverview(res) },
        { path: 'current-state.md', content: renderCurrentState(res.map) },
        { path: 'audit-report.md', content: renderAuditReport(res) },
        { path: 'findings.json', content: JSON.stringify(findingsJson(res), null, 2) },
        { path: 'findings.sarif', content: JSON.stringify(renderSarif(res), null, 2) },
      ];
      files.push({ path: 'architecture-register.json', content: JSON.stringify(registerJson(files), null, 2) });
      if (!dry) {
        await fs.mkdir(outDir, { recursive: true });
        for (const f of files) await fs.writeFile(path.join(outDir, f.path), f.content, 'utf8');
      }
      out(json, { dryRun: dry, outDir, files: files.map((f) => f.path) }, `${dry ? 'Would write' : 'Wrote'} ${files.length} files to ${outDir}\n${files.map((f) => `  ${f.path}`).join('\n')}`);
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
    default:
      if (MODEL_COMMANDS.includes(args.cmd)) {
        const msg = `"${args.cmd}" needs semantic reasoning, which a deterministic CLI cannot do honestly.\nRun it inside your AI IDE through the matching ArchSutra skill (install with: archsutra install --host <id>).\nNo API call was made.`;
        out(json, { command: args.cmd, requiresModel: true, message: msg }, msg);
        return EXIT.needsModel;
      }
      process.stderr.write(`Unknown command "${args.cmd}".\n${HELP}`);
      return EXIT.usage;
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
