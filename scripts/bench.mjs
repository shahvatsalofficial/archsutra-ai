// Performance benchmark on synthetic repositories. Each size runs in a fresh child process so peak RSS is meaningful.
//   node scripts/bench.mjs            -> prints and writes docs/proof/benchmarks.json and benchmarks.md
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir, cpus, platform, release, totalmem } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(HERE), '..');

function makeRepo(files, linesPerFile) {
  const dir = mkdtempSync(path.join(tmpdir(), 'archsutra-bench-'));
  const modules = 50;
  for (let i = 0; i < files; i++) {
    const m = i % modules;
    const d = path.join(dir, 'src', `mod${m}`);
    mkdirSync(d, { recursive: true });
    const body = [];
    if (m > 0) body.push(`import { x${i} } from '../mod${m - 1}/f${i - 1 >= 0 ? i - modules >= 0 ? i - modules : 0 : 0}.js';`);
    for (let l = 0; l < linesPerFile; l++) body.push(`export const v${i}_${l} = (a: number) => a + ${l}; // filler line ${l}`);
    writeFileSync(path.join(d, `f${i}.ts`), body.join('\n'));
  }
  writeFileSync(path.join(dir, 'package.json'), '{"name":"bench","dependencies":{}}');
  return dir;
}

if (process.argv[2] === 'child') {
  const { runAudit } = await import(pathToFileURL(path.join(ROOT, 'dist', 'audit.js')).href);
  const dir = process.argv[3];
  const t0 = performance.now();
  const res = await runAudit(dir);
  const ms = Math.round(performance.now() - t0);
  console.log(JSON.stringify({ ms, filesScanned: res.map.coverage.filesScanned, truncated: res.map.coverage.truncated, findings: res.findings.length, maxRssMB: Math.round(process.resourceUsage().maxRSS / 1024) }));
  process.exit(0);
}

const cases = [
  { label: 'small', files: 200, lines: 100 },
  { label: 'medium', files: 1000, lines: 100 },
  { label: 'at default limit', files: 5000, lines: 100 },
  { label: 'over limit (20k files, truncated)', files: 20000, lines: 100 },
];
const rows = [];
for (const c of cases) {
  const dir = makeRepo(c.files, c.lines);
  const r = spawnSync(process.execPath, [HERE, 'child', dir], { encoding: 'utf8' });
  rmSync(dir, { recursive: true, force: true });
  const out = JSON.parse(r.stdout.trim().split('\n').pop());
  rows.push({ ...c, ...out });
  console.log(c.label, out);
}
const env = { node: process.version, os: `${platform()} ${release()}`, cpus: cpus().length, cpuModel: cpus()[0]?.model, ramGB: Math.round(totalmem() / 2 ** 30) };
const dest = path.join(ROOT, 'docs', 'proof');
writeFileSync(path.join(dest, 'benchmarks.json'), JSON.stringify({ generatedAt: new Date().toISOString(), env, rows }, null, 2));
writeFileSync(path.join(dest, 'benchmarks.md'), [
  '# Benchmarks (synthetic repositories)',
  '',
  `Environment: ${env.os}, ${env.cpus} CPU (${env.cpuModel}), ${env.ramGB} GB RAM, Node ${env.node}. Reproduce: \`node scripts/bench.mjs\`.`,
  '',
  '| Case | Files generated | Files scanned | Truncated | Time (ms) | Peak RSS (MB) |',
  '|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.label} | ${r.files} | ${r.filesScanned} | ${r.truncated} | ${r.ms} | ${r.maxRssMB} |`),
  '',
  'Synthetic files are uniform, so real repositories differ. See `docs/proof/realworld/results.json` for timings on real projects. The scan is bounded by design (5000 files, 512 KiB per file, 120 MiB total, 15 s traversal); the over-limit case demonstrates truncation is reported rather than silent.',
  '',
].join('\n'));
