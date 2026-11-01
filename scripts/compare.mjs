// Head-to-head comparison of ArchSutra and Semgrep on the same repositories.
//   node scripts/compare.mjs <workdir> <batch>
// Needs `semgrep` on PATH (CI installs a pinned version). Writes docs/proof/comparison/{results.json,report.md}.
// Matching is by (file, line +/- 2). It measures overlap and unique findings, NOT which tool is "right":
// every unique finding needs human review before drawing conclusions.
import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'proof', 'comparison');
const { runAudit } = await import(pathToFileURL(path.join(ROOT, 'dist', 'audit.js')).href);
const [work, batch = 'holdout2'] = process.argv.slice(2);
if (!work) throw new Error('usage: compare.mjs <workdir> <batch>');
const repos = JSON.parse(readFileSync(path.join(ROOT, 'scripts', 'realworld-repos.json'), 'utf8')).repos.filter((r) => r.batch === batch);

const sg = spawnSync('semgrep', ['--version'], { encoding: 'utf8' });
if (sg.status !== 0) throw new Error('semgrep not found on PATH');
const semgrepVersion = sg.stdout.trim();
mkdirSync(OUT, { recursive: true });
mkdirSync(work, { recursive: true });

const rows = [];
for (const r of repos) {
  const dir = path.join(work, r.name.replace('/', '__'));
  if (!existsSync(dir)) {
    const c = spawnSync('git', ['clone', '--depth', '1', '--single-branch', '--no-tags', '--quiet', `https://github.com/${r.name}.git`, dir], { encoding: 'utf8' });
    if (c.status !== 0) { rows.push({ repo: r.name, error: 'clone failed' }); continue; }
  }
  const arch = (await runAudit(dir)).findings.flatMap((f) => f.evidence.filter((e) => e.startLine).map((e) => ({ rule: f.rule, severity: f.severity, path: e.path, line: e.startLine })));
  const s = spawnSync('semgrep', ['scan', '--config', 'p/default', '--json', '--quiet', '--metrics=off', '--timeout', '20', dir], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  let sem = [];
  try {
    sem = (JSON.parse(s.stdout).results ?? []).map((x) => ({ rule: x.check_id, severity: x.extra?.severity, path: path.relative(dir, x.path).split(path.sep).join('/'), line: x.start.line }));
  } catch { rows.push({ repo: r.name, error: 'semgrep output unreadable' }); continue; }
  const near = (a, b) => a.path === b.path && Math.abs(a.line - b.line) <= 2;
  const both = arch.filter((a) => sem.some((b) => near(a, b)));
  rows.push({ repo: r.name, archsutra: arch.length, semgrep: sem.length, overlap: both.length, archsutraOnly: arch.length - both.length, semgrepOnly: sem.filter((b) => !arch.some((a) => near(a, b))).length });
  console.log(r.name, rows.at(-1));
}
const sum = (k) => rows.reduce((a, r) => a + (r[k] ?? 0), 0);
writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ generatedAt: new Date().toISOString(), batch, semgrepVersion, semgrepConfig: 'p/default', rows }, null, 2));
writeFileSync(path.join(OUT, 'report.md'), [
  '# ArchSutra vs Semgrep: overlap on the same repositories',
  '',
  `Batch: ${batch}. Semgrep ${semgrepVersion}, config p/default. Matching: same file and line within 2.`,
  '',
  '| Repository | ArchSutra | Semgrep | Overlap | ArchSutra only | Semgrep only |',
  '|---|---|---|---|---|---|',
  ...rows.map((r) => (r.error ? `| ${r.repo} | ${r.error} | | | | |` : `| ${r.repo} | ${r.archsutra} | ${r.semgrep} | ${r.overlap} | ${r.archsutraOnly} | ${r.semgrepOnly} |`)),
  `| **Total** | ${sum('archsutra')} | ${sum('semgrep')} | ${sum('overlap')} | ${sum('archsutraOnly')} | ${sum('semgrepOnly')} |`,
  '',
  'Interpretation: the tools target different things (ArchSutra: architecture and delivery hygiene plus a few security patterns; Semgrep: security and bug patterns). Low overlap is expected. Findings unique to either tool are unreviewed and are not evidence that one tool is better.',
  '',
].join('\n'));
