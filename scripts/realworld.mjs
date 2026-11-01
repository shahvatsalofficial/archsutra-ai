// Real-world evaluation harness.
//   node scripts/realworld.mjs run <workdir> <tuning|holdout> [tag]   clone (shallow) + audit the repos of one batch
//        writes docs/proof/realworld/results[-tag].json and sample[-tag].json
//   node scripts/realworld.mjs report [tag]                           join sample[-tag].json with labels[-tag].json
//        writes docs/proof/realworld/summary[-tag].json and summary[-tag].md
// Cloned code is only read, never executed. `git clone` does not run hooks.
// ARCHSUTRA_DIST=<dir> runs an older build (used to reproduce the v0.1.0 baseline).
import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'proof', 'realworld');
const DIST = process.env.ARCHSUTRA_DIST ? path.resolve(process.env.ARCHSUTRA_DIST) : path.join(ROOT, 'dist');
const { runAudit } = await import(pathToFileURL(path.join(DIST, 'audit.js')).href);
const { clearTextCache } = await import(pathToFileURL(path.join(DIST, 'fsutil.js')).href);
const allRepos = JSON.parse(readFileSync(path.join(ROOT, 'scripts', 'realworld-repos.json'), 'utf8')).repos;

// Deterministic PRNG so the sample is reproducible.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

function git(args, cwd) {
  return spawnSync('git', ['-c', 'core.longpaths=true', '-c', 'core.symlinks=false', ...args], { cwd, encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
}

async function run(work, batch, sfx) {
  const repos = allRepos.filter((r) => r.batch === batch);
  if (!repos.length) throw new Error(`no repos in batch "${batch}"`);
  mkdirSync(work, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  const results = [];
  const all = [];
  for (const r of repos) {
    const dir = path.join(work, r.name.replace('/', '__'));
    if (!existsSync(dir)) {
      const c = git(['clone', '--depth', '1', '--single-branch', '--no-tags', '--quiet', `https://github.com/${r.name}.git`, dir]);
      if (c.status !== 0) {
        results.push({ ...r, error: (c.stderr || '').slice(0, 200) });
        console.log('FAIL', r.name);
        continue;
      }
    }
    const sha = git(['rev-parse', 'HEAD'], dir).stdout.trim();
    const t0 = performance.now();
    clearTextCache();
    const res = await runAudit(dir);
    const ms = Math.round(performance.now() - t0);
    const byRule = {};
    const bySev = {};
    for (const f of res.findings) {
      byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
      bySev[f.severity] = (bySev[f.severity] ?? 0) + 1;
      all.push({ repo: r.name, kind: r.kind, sha, rule: f.rule, severity: f.severity, confidence: f.confidence, title: f.title, evidence: f.evidence.slice(0, 3) });
    }
    results.push({ ...r, commit: sha, files: res.map.coverage.filesScanned, truncated: res.map.coverage.truncated, ms, findings: res.findings.length, byRule, bySeverity: bySev, modules: res.map.modules.length, cycles: res.map.cycles.length });
    console.log(r.name, sha.slice(0, 8), `${res.map.coverage.filesScanned} files`, `${ms}ms`, `${res.findings.length} findings`);
  }
  writeFileSync(path.join(OUT, `results${sfx}.json`), JSON.stringify({ batch, generatedAt: new Date().toISOString(), node: process.version, results }, null, 2));

  // Stratified sample for manual labeling: up to 4 line-evidenced findings per rule per repo kind (6 for secrets), deterministic.
  const rand = rng(20261101);
  const groups = new Map();
  for (const f of all) {
    if (!f.evidence[0]?.startLine) continue; // only findings with a concrete line can be checked
    const k = `${f.rule}|${f.kind}`;
    (groups.get(k) ?? groups.set(k, []).get(k)).push(f);
  }
  const sample = [];
  for (const [k, list] of [...groups].sort()) {
    const copy = [...list].sort((a, b) => `${a.repo}${a.evidence[0].path}${a.evidence[0].startLine}`.localeCompare(`${b.repo}${b.evidence[0].path}${b.evidence[0].startLine}`));
    for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
    const take = k.startsWith('AS-SEC-001') || k.startsWith('AS-SEC-002') ? 6 : 4;
    sample.push(...copy.slice(0, take).map((f) => ({ ...f, evidence: f.evidence[0], populationInGroup: list.length })));
  }
  sample.forEach((s, i) => (s.id = `S${String(i + 1).padStart(3, '0')}`));
  writeFileSync(path.join(OUT, `sample${sfx}.json`), JSON.stringify(sample, null, 2));
  // Context dump for the labeler (stays in the work directory, not committed).
  const lines = [];
  for (const s of sample) {
    const dir = path.join(work, s.repo.replace('/', '__'));
    let ctx = '';
    try {
      const src = readFileSync(path.join(dir, s.evidence.path), 'utf8').split(/\r?\n/);
      const a = Math.max(0, s.evidence.startLine - 3), b = Math.min(src.length, s.evidence.startLine + 2);
      ctx = src.slice(a, b).map((l, i) => `${a + i + 1}| ${l.slice(0, 220)}`).join('\n');
    } catch { ctx = '(unreadable)'; }
    lines.push(`=== ${s.id} ${s.rule} [${s.severity}] ${s.repo} ${s.evidence.path}:${s.evidence.startLine}\n${s.title}\n${ctx}\n`);
  }
  writeFileSync(path.join(work, `sample-context${sfx}.txt`), lines.join('\n'));
  console.log(`sample: ${sample.length} findings of ${all.length}; context at ${path.join(work, `sample-context${sfx}.txt`)}`);
}

// Wilson score interval (95%).
function wilson(k, n) {
  if (!n) return [0, 0];
  const z = 1.96, p = k / n, d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n), m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [Math.max(0, (c - m) / d), Math.min(1, (c + m) / d)];
}
const pct = (x) => `${(100 * x).toFixed(0)}%`;

function report(sfx) {
  const results = JSON.parse(readFileSync(path.join(OUT, `results${sfx}.json`), 'utf8'));
  const sample = JSON.parse(readFileSync(path.join(OUT, `sample${sfx}.json`), 'utf8'));
  const labels = JSON.parse(readFileSync(path.join(OUT, `labels${sfx}.json`), 'utf8')).labels;
  const rows = {};
  let k = 0, n = 0, act = 0;
  const unlabeled = [];
  for (const s of sample) {
    const l = labels[s.id];
    if (!l) { unlabeled.push(s.id); continue; }
    if (l.verdict === 'unclear') continue;
    const r = (rows[s.rule] ??= { tp: 0, fp: 0, sev: s.severity });
    n++;
    if (l.verdict === 'valid') { r.tp++; k++; } else r.fp++;
    if (l.actionable) act++;
  }
  const [lo, hi] = wilson(k, n);
  const [alo, ahi] = wilson(act, n);
  const perRule = Object.entries(rows).sort().map(([rule, v]) => { const t = v.tp + v.fp; const [a, b] = wilson(v.tp, t); return { rule, severity: v.sev, labeled: t, valid: v.tp, falsePositive: v.fp, precision: v.tp / t, ci95: [a, b] }; });
  const high = sample.filter((s) => ['critical', 'high'].includes(s.severity) && labels[s.id] && labels[s.id].verdict !== 'unclear');
  const hv = high.filter((s) => labels[s.id].verdict === 'valid').length;
  const [hlo, hhi] = wilson(hv, high.length);
  const summary = {
    generatedAt: new Date().toISOString(), batch: results.batch,
    repos: results.results.length, reposFailed: results.results.filter((r) => r.error).length,
    totalFindings: results.results.reduce((a, r) => a + (r.findings ?? 0), 0),
    sampled: sample.length, labeled: n, unlabeled: unlabeled.length,
    overall: { valid: k, labeled: n, precision: n ? k / n : null, ci95: [lo, hi] },
    actionable: { count: act, labeled: n, rate: n ? act / n : null, ci95: [alo, ahi] },
    criticalHigh: { labeled: high.length, valid: hv, precision: high.length ? hv / high.length : null, ci95: [hlo, hhi] },
    perRule,
  };
  writeFileSync(path.join(OUT, `summary${sfx}.json`), JSON.stringify(summary, null, 2));
  const md = [
    `# Real-world evaluation summary (${results.batch}${sfx ? `, ${sfx.slice(1)}` : ''})`,
    '',
    `Repositories audited: ${summary.repos - summary.reposFailed} of ${summary.repos}. Total findings: ${summary.totalFindings}. Sampled findings with a concrete line: ${sample.length}. Labeled (excluding unclear): ${n}.`,
    '',
    `- **Precision** (code genuinely matches the rule): ${n ? pct(k / n) : 'n/a'} (95% CI ${pct(lo)} to ${pct(hi)}, n=${n}).`,
    `- **Actionable** (a maintainer would plausibly act): ${n ? pct(act / n) : 'n/a'} (95% CI ${pct(alo)} to ${pct(ahi)}, n=${n}).`,
    `- **Critical and high only:** ${high.length ? pct(hv / high.length) : 'n/a'} (95% CI ${pct(hlo)} to ${pct(hhi)}, n=${high.length}).`,
    '',
    '| Rule | Severity | Labeled | Valid | False positive | Precision | 95% CI |',
    '|---|---|---|---|---|---|---|',
    ...perRule.map((r) => `| ${r.rule} | ${r.severity} | ${r.labeled} | ${r.valid} | ${r.falsePositive} | ${pct(r.precision)} | ${pct(r.ci95[0])} to ${pct(r.ci95[1])} |`),
    '',
    `Per-repository results: [results${sfx}.json](results${sfx}.json). Labels with reasons: [labels${sfx}.json](labels${sfx}.json).`,
    '',
  ].join('\n');
  writeFileSync(path.join(OUT, `summary${sfx}.md`), md);
  console.log(md);
  if (unlabeled.length) console.log('UNLABELED:', unlabeled.join(','));
}

const [cmd, arg, batchArg, tagArg] = process.argv.slice(2);
if (cmd === 'run') await run(path.resolve(arg ?? path.join(process.env.TEMP ?? '/tmp', 'archsutra-realworld')), batchArg ?? 'tuning', tagArg ? `-${tagArg}` : '');
else if (cmd === 'report') report(arg ? `-${arg}` : '');
else console.log('usage: realworld.mjs run <workdir> <tuning|holdout> [tag] | report [tag]');
