import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../scripts/eval.mjs';

test('labeled fixtures: precision and recall on seeded rules', async () => {
  const r = await evaluate();
  assert.ok(r.fixtures.length >= 2);
  assert.deepEqual(r.fixtures.flatMap((f) => f.missed), [], 'missed expected rules');
  assert.deepEqual(r.fixtures.flatMap((f) => f.unexpected), [], 'unexpected rules (false positives)');
  assert.equal(r.totals.precision, 1);
  assert.equal(r.totals.recall, 1);
});
