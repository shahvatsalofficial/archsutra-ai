import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Finding } from './types.js';

export interface Suppression {
  rule: string;
  path?: string;
  reason: string;
  expires?: string;
}

/** Load `.archsutra/suppress.json`. Missing file means nothing is suppressed. Invalid JSON throws. Entries without a rule and a reason are ignored. */
export async function loadSuppressions(root: string, today = new Date().toISOString().slice(0, 10)): Promise<Suppression[]> {
  const abs = path.join(root, '.archsutra', 'suppress.json');
  let text: string;
  try {
    text = await readFile(abs, 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('.archsutra/suppress.json is not valid JSON.');
  }
  const list = Array.isArray(raw) ? raw : (raw as { suppress?: unknown }).suppress;
  if (!Array.isArray(list)) throw new Error('.archsutra/suppress.json must be an array, or an object with a suppress array.');
  const out: Suppression[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.rule !== 'string' || typeof row.reason !== 'string' || !row.reason.trim()) continue;
    if (typeof row.expires === 'string' && row.expires < today) continue;
    out.push({
      rule: row.rule,
      path: typeof row.path === 'string' ? row.path.replace(/\\/g, '/').replace(/^\.\//, '') : undefined,
      reason: row.reason.trim(),
      expires: typeof row.expires === 'string' ? row.expires : undefined,
    });
  }
  return out;
}

export function isSuppressed(finding: Pick<Finding, 'rule' | 'evidence'>, rules: Suppression[]): boolean {
  return rules.some((s) => {
    if (s.rule !== finding.rule) return false;
    if (!s.path) return true;
    return finding.evidence.some((e) => e.path === s.path || e.path.startsWith(`${s.path}/`));
  });
}
