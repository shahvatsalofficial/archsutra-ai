// Labeled-fixture evaluation: compares rule IDs found by `audit` with expected.json.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAudit } from '../dist/audit.js';

const FIX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

export async function evaluate() {
  const rows = [];
  let tp = 0, fp = 0, fn = 0;
  for (const name of (await readdir(FIX)).sort()) {
    const dir = path.join(FIX, name);
    let expected;
    try { expected = JSON.parse(await readFile(path.join(dir, 'expected.json'), 'utf8')); } catch { continue; }
    const got = new Set((await runAudit(dir)).findings.map((f) => f.rule));
    const want = new Set(expected.expectedRules);
    const hit = [...want].filter((r) => got.has(r));
    const missed = [...want].filter((r) => !got.has(r));
    const extra = [...got].filter((r) => !want.has(r));
    tp += hit.length; fn += missed.length; fp += extra.length;
    rows.push({ fixture: name, expected: want.size, found: got.size, truePositives: hit.length, missed, unexpected: extra });
  }
  const precision = tp + fp ? tp / (tp + fp) : 1;
  const recall = tp + fn ? tp / (tp + fn) : 1;
  return { fixtures: rows, totals: { truePositives: tp, falsePositives: fp, falseNegatives: fn, precision, recall } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await evaluate(), null, 2));
}
