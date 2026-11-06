import type { Finding, Severity } from './types.js';

export interface DriftRow {
  key: string;
  rule: string;
  path: string;
  before?: Severity;
  after?: Severity;
}

export interface DriftReport {
  added: DriftRow[];
  removed: DriftRow[];
  changed: DriftRow[];
}

function keyOf(f: Pick<Finding, 'rule' | 'evidence'>): { key: string; path: string } {
  const paths = [...new Set(f.evidence.map((e) => e.path))].sort();
  const path = paths[0] ?? '.';
  return { key: `${f.rule}@${paths.join('|') || '.'}`, path };
}

/** Diff two findings lists. Identity is rule plus evidence paths, not the generated sequence id. */
export function diffFindings(before: Finding[], after: Finding[]): DriftReport {
  const prev = new Map<string, { sev: Severity; path: string; rule: string }>();
  const next = new Map<string, { sev: Severity; path: string; rule: string }>();
  for (const f of before) {
    const k = keyOf(f);
    prev.set(k.key, { sev: f.severity, path: k.path, rule: f.rule });
  }
  for (const f of after) {
    const k = keyOf(f);
    next.set(k.key, { sev: f.severity, path: k.path, rule: f.rule });
  }
  const added: DriftRow[] = [];
  const removed: DriftRow[] = [];
  const changed: DriftRow[] = [];
  for (const [key, row] of next) {
    const old = prev.get(key);
    if (!old) added.push({ key, rule: row.rule, path: row.path, after: row.sev });
    else if (old.sev !== row.sev) changed.push({ key, rule: row.rule, path: row.path, before: old.sev, after: row.sev });
  }
  for (const [key, row] of prev) {
    if (!next.has(key)) removed.push({ key, rule: row.rule, path: row.path, before: row.sev });
  }
  const byKey = (a: DriftRow, b: DriftRow) => a.key.localeCompare(b.key);
  added.sort(byKey);
  removed.sort(byKey);
  changed.sort(byKey);
  return { added, removed, changed };
}

export function renderDrift(report: DriftReport, title: string): string {
  const line = (r: DriftRow) => `- ${r.rule} ${r.path}${r.before ? ` ${r.before}` : ''}${r.before && r.after ? ' ->' : ''} ${r.after ?? ''}`.replace(/\s+/g, ' ').trim();
  return [
    `# ${title}`,
    '',
    'Deterministic diff of two ArchSutra findings files. This is not a Semgrep comparison and not a model review.',
    '',
    `Added: ${report.added.length}. Removed: ${report.removed.length}. Severity changed: ${report.changed.length}.`,
    '',
    '## Added',
    report.added.length ? report.added.map(line).join('\n') : '_None._',
    '',
    '## Removed',
    report.removed.length ? report.removed.map(line).join('\n') : '_None._',
    '',
    '## Severity changed',
    report.changed.length ? report.changed.map(line).join('\n') : '_None._',
    '',
  ].join('\n');
}
