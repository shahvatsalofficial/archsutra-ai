import type { AuditResult, Finding } from './types.js';

const UNKNOWN = '> **unknown.** A deterministic scan cannot choose this. Fill it in the matching ArchSutra skill inside your IDE. No model API was called.';

export function renderReview(res: AuditResult): string {
  const lines = res.findings.map((f) => `- ${f.rule} ${f.severity} ${f.title} (${f.evidence[0]?.path ?? '.'})`);
  return [
    '# Evidence review',
    '',
    'Observed findings from `archsutra audit`. This is the deterministic review. It is not a design judgment.',
    '',
    lines.length ? lines.join('\n') : '_No findings._',
    '',
    UNKNOWN,
    '',
  ].join('\n');
}

export function renderDesign(res: AuditResult): string {
  const mods = res.map.modules.map((m) => `- ${m.name}: ${m.files} files, ${m.lines} lines (${m.ecosystems.join(', ')})`);
  return [
    '# Design starter',
    '',
    '## Observed structure',
    mods.length ? mods.join('\n') : '_No modules._',
    '',
    `Ecosystems: ${res.map.ecosystems.join(', ') || 'none'}.`,
    `Blind spots: ${res.map.blindSpots.join(' ') || 'none recorded.'}`,
    '',
    '## Options',
    UNKNOWN,
    '',
    '## Non-functional targets',
    UNKNOWN,
    '',
    '## Decision',
    UNKNOWN,
    '',
  ].join('\n');
}

export function renderThreatModel(res: AuditResult): string {
  const sec = res.findings.filter((f) => f.category === 'security' || f.category === 'ai-security' || f.category === 'infrastructure');
  const row = (f: Finding) => `| ${f.rule} | observed | ${f.severity} | ${f.title} | ${f.evidence[0]?.path ?? '.'} |`;
  return [
    '# Threat-model starter',
    '',
    'Rows below are observed rule hits. They are not a complete STRIDE model.',
    '',
    '| Rule | Evidence | Severity | Title | Path |',
    '|---|---|---|---|---|',
    sec.length ? sec.map(row).join('\n') : '| — | unknown | — | No security rule fired | — |',
    '',
    '## Spoofing, tampering, repudiation, information disclosure, denial of service, elevation',
    UNKNOWN,
    '',
    '## LLM and agent threats',
    UNKNOWN,
    '',
  ].join('\n');
}

export function renderModernize(res: AuditResult): string {
  const rows = res.findings.map((f, i) => `${i + 1}. **${f.rule}** (${f.severity}, effort ${f.effort}). ${f.title}. Evidence: ${f.evidence[0]?.path ?? '.'}. Fix recorded by the rule: ${f.fix}`);
  return [
    '# Modernization starter',
    '',
    'Each slice is one open finding. Target architecture is unknown until you set it.',
    '',
    rows.length ? rows.join('\n') : '_No findings to slice._',
    '',
    '## Target architecture',
    UNKNOWN,
    '',
    '## Success numbers',
    UNKNOWN,
    '',
  ].join('\n');
}

export function renderCost(res: AuditResult): string {
  return [
    '# Cost starter',
    '',
    'Cost is **not assessed**. The scan has no prices, regions, or traffic.',
    '',
    `Observed manifests and ecosystems: ${res.map.ecosystems.join(', ') || 'none'}.`,
    `Datastores named in manifests: ${res.map.datastores.join(', ') || 'none'}.`,
    '',
    '## Spend, unit cost, lock-in',
    UNKNOWN,
    '',
  ].join('\n');
}
