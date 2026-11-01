// Checks that precision fixes did not remove findings that were labeled "valid".
//   node scripts/labeled-recall.mjs <workdir>
// For every labeled-valid finding (baseline, holdout, holdout2 labels) it re-runs the CURRENT audit on the cached clone
// and reports whether the same rule still fires at the same file and line. Also reports how many labeled false positives disappeared.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'proof', 'realworld');
const { runAudit } = await import(pathToFileURL(path.join(ROOT, 'dist', 'audit.js')).href);
const work = path.resolve(process.argv[2] ?? path.join(process.env.TEMP ?? '/tmp', 'archsutra-realworld'));

// sample and label sets. Baseline samples were produced by the v0.1.0 build and are kept as sample.json.
const sets = [['', 'baseline (tuning set)'], ['-holdout', 'holdout (round-1 fixes)'], ['-holdout2', 'holdout2 (round-2 fixes)']];
const byRepo = new Map();
for (const [sfx, name] of sets) {
  const sample = JSON.parse(readFileSync(path.join(OUT, `sample${sfx}.json`), 'utf8'));
  const labels = JSON.parse(readFileSync(path.join(OUT, `labels${sfx}.json`), 'utf8')).labels;
  for (const s of sample) {
    const l = labels[s.id];
    if (!l || l.verdict === 'unclear') continue;
    (byRepo.get(s.repo) ?? byRepo.set(s.repo, []).get(s.repo)).push({ set: name, id: s.id, rule: s.rule, path: s.evidence.path, line: s.evidence.startLine, verdict: l.verdict, reason: l.reason });
  }
}

const rows = { valid: { kept: 0, lost: [] }, false_positive: { suppressed: 0, remaining: [] } };
for (const [repo, items] of byRepo) {
  const dir = path.join(work, repo.replace('/', '__'));
  if (!existsSync(dir)) { console.log('skip (no clone)', repo); continue; }
  const res = await runAudit(dir);
  const now = new Set(res.findings.flatMap((f) => f.evidence.map((e) => `${f.rule}|${e.path}|${e.startLine}`)));
  for (const it of items) {
    const present = now.has(`${it.rule}|${it.path}|${it.line}`);
    if (it.verdict === 'valid') (present ? rows.valid.kept++ : rows.valid.lost.push({ repo, ...it }));
    else (present ? rows.false_positive.remaining.push({ repo, ...it }) : rows.false_positive.suppressed++);
  }
}
const nv = rows.valid.kept + rows.valid.lost.length, nf = rows.false_positive.suppressed + rows.false_positive.remaining.length;
const out = {
  generatedAt: new Date().toISOString(),
  labeledValid: { total: nv, stillReported: rows.valid.kept, retention: nv ? rows.valid.kept / nv : null, lost: rows.valid.lost },
  labeledFalsePositive: { total: nf, nowSuppressed: rows.false_positive.suppressed, stillReported: rows.false_positive.remaining },
  caveat: 'The baseline false positives drove the fixes, so their suppression is expected (tuning set). Retention of labeled true positives is the meaningful number here.',
};
writeFileSync(path.join(OUT, 'labeled-recall.json'), JSON.stringify(out, null, 2));
console.log(`labeled valid retained: ${rows.valid.kept}/${nv}`);
console.log(`labeled false positives suppressed: ${rows.false_positive.suppressed}/${nf}`);
for (const l of rows.valid.lost) console.log('LOST', l.repo, l.rule, `${l.path}:${l.line}`, '-', l.reason);
for (const l of rows.false_positive.remaining) console.log('STILL FP', l.repo, l.rule, `${l.path}:${l.line}`);
