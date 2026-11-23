// Generates the SVG figures used in the docs and README from the real proof data. No dependencies.
//   node scripts/build-charts.mjs   ->  docs/assets/charts/*.svg
// Every number comes from a committed file in docs/proof or examples/, so charts cannot drift from the evidence.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'assets', 'charts');
mkdirSync(OUT, { recursive: true });
const read = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pct = (x) => `${Math.round(x * 100)}%`;

// Palette works on light and dark: the SVG carries its own background and switches with the system theme.
const STYLE = `
<style>
:root{--bg:#ffffff;--ink:#15181e;--mute:#565e6e;--line:#d9dde7;--a:#4338ca;--b:#0f766e;--c:#b45309;--bad:#b42318;--ok:#17794a}
@media (prefers-color-scheme: dark){:root{--bg:#131820;--ink:#e8ebf2;--mute:#a2abbb;--line:#2b3442;--a:#a5a8ff;--b:#5eead4;--c:#f0c36a;--bad:#ff8a80;--ok:#5fd39a}}
text{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;fill:var(--ink)}
.m{fill:var(--mute)}.t{font-size:18px;font-weight:700}.s{font-size:12px}.l{font-size:13px}.n{font-size:13px;font-weight:700}
.axis{stroke:var(--line);stroke-width:1}.grid{stroke:var(--line);stroke-width:1;stroke-dasharray:3 4}
</style>`;

function wrap(w, h, title, desc, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc>${STYLE}
<rect width="${w}" height="${h}" rx="14" fill="var(--bg)" stroke="var(--line)"/>
${body}
</svg>
`;
}
const save = (name, svg) => writeFileSync(path.join(OUT, name), svg);

// ---------- 1. Precision and actionable by batch (with 95% intervals) ----------
{
  const batches = [
    ['Baseline (v0.1.0)', read('docs/proof/realworld/summary.json')],
    ['Unseen batch 1', read('docs/proof/realworld/summary-holdout.json')],
    ['Unseen batch 2', read('docs/proof/realworld/summary-holdout2.json')],
  ];
  const W = 760, H = 420, L = 70, R = 30, T = 70, B = 80;
  const pw = W - L - R, ph = H - T - B;
  const y = (v) => T + ph - v * ph;
  let g = `<text x="${L}" y="34" class="t">Share of findings that were real, by evaluation batch</text>
<text x="${L}" y="54" class="s m">Hand-labeled on 52 public repositories. Whiskers are 95% intervals. Small samples: read the width.</text>`;
  for (const v of [0, 0.25, 0.5, 0.75, 1]) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="${v === 0 ? 'axis' : 'grid'}"/><text x="${L - 10}" y="${y(v) + 4}" text-anchor="end" class="s m">${pct(v)}</text>`;
  const gw = pw / batches.length;
  batches.forEach(([label, s], i) => {
    const cx = L + gw * i + gw / 2;
    const bars = [
      ['Precision', s.overall.precision, s.overall.ci95, 'var(--a)', -38],
      ['Actionable', s.actionable.rate, s.actionable.ci95, 'var(--b)', 12],
    ];
    for (const [name, v, ci, col, dx] of bars) {
      const x = cx + dx - (dx < 0 ? 0 : 0);
      g += `<rect x="${x}" y="${y(v)}" width="30" height="${ph * v}" rx="4" fill="${col}"/>`;
      g += `<line x1="${x + 15}" x2="${x + 15}" y1="${y(ci[0])}" y2="${y(ci[1])}" stroke="var(--ink)" stroke-width="1.6"/><line x1="${x + 9}" x2="${x + 21}" y1="${y(ci[0])}" y2="${y(ci[0])}" stroke="var(--ink)" stroke-width="1.6"/><line x1="${x + 9}" x2="${x + 21}" y1="${y(ci[1])}" y2="${y(ci[1])}" stroke="var(--ink)" stroke-width="1.6"/>`;
      g += `<text x="${x + 15}" y="${y(ci[1]) - 7}" text-anchor="middle" class="n">${pct(v)}</text>`;
    }
    g += `<text x="${cx}" y="${H - B + 24}" text-anchor="middle" class="l">${esc(label)}</text><text x="${cx}" y="${H - B + 42}" text-anchor="middle" class="s m">n = ${s.overall.labeled} labeled</text>`;
  });
  g += `<rect x="${L}" y="${H - 22}" width="12" height="12" rx="3" fill="var(--a)"/><text x="${L + 18}" y="${H - 12}" class="s">Precision: the code really is what the rule says</text>`;
  g += `<rect x="${L + 330}" y="${H - 22}" width="12" height="12" rx="3" fill="var(--b)"/><text x="${L + 348}" y="${H - 12}" class="s">Actionable: a maintainer would act</text>`;
  save('precision-by-batch.svg', wrap(W, H, 'Precision and actionable rate by evaluation batch', `Precision was ${pct(batches[0][1].overall.precision)} at baseline, ${pct(batches[1][1].overall.precision)} on the first unseen batch and ${pct(batches[2][1].overall.precision)} on the second. The actionable rate was ${pct(batches[0][1].actionable.rate)}, ${pct(batches[1][1].actionable.rate)} and ${pct(batches[2][1].actionable.rate)}.`, g));
}

// ---------- 2. Baseline precision by rule ----------
{
  const s = read('docs/proof/realworld/summary.json');
  const rows = [...s.perRule].sort((a, b) => a.precision - b.precision);
  const W = 760, rowH = 34, T = 78, L = 150, R = 80, H = T + rows.length * rowH + 40;
  const pw = W - L - R;
  let g = `<text x="24" y="34" class="t">Where the first version was noisy: precision by rule (v0.1.0 baseline)</text>
<text x="24" y="54" class="s m">Each bar is the share of that rule's sampled findings that were real. Labeled count at the right. These are the rules the fixes targeted.</text>`;
  rows.forEach((r, i) => {
    const y = T + i * rowH;
    const col = r.precision >= 0.8 ? 'var(--ok)' : r.precision >= 0.5 ? 'var(--c)' : 'var(--bad)';
    g += `<text x="${L - 10}" y="${y + 19}" text-anchor="end" class="l">${esc(r.rule)}</text><rect x="${L}" y="${y + 4}" width="${pw}" height="20" rx="4" fill="var(--line)" opacity=".5"/><rect x="${L}" y="${y + 4}" width="${Math.max(2, pw * r.precision)}" height="20" rx="4" fill="${col}"/>`;
    g += `<text x="${L + pw * r.precision + 8}" y="${y + 19}" class="n">${pct(r.precision)}</text><text x="${W - 24}" y="${y + 19}" text-anchor="end" class="s m">n=${r.labeled}</text>`;
  });
  save('precision-by-rule.svg', wrap(W, H, 'Baseline precision by audit rule', `Per-rule precision at baseline: ${rows.map((r) => `${r.rule} ${pct(r.precision)} (n=${r.labeled})`).join(', ')}.`, g));
}

// ---------- 3. Sample findings by severity ----------
{
  const f = read('examples/brownfield-monolith/sample-output/findings.json').findings;
  const order = ['critical', 'high', 'medium', 'low', 'info'];
  const colors = { critical: 'var(--bad)', high: 'var(--bad)', medium: 'var(--c)', low: 'var(--a)', info: 'var(--mute)' };
  const counts = Object.fromEntries(order.map((k) => [k, f.filter((x) => x.severity === k).length]));
  const max = Math.max(...Object.values(counts), 1);
  const W = 760, H = 330, L = 120, T = 80, rowH = 44, pw = W - L - 110;
  let g = `<text x="24" y="34" class="t">What one audit of the sample monolith found</text><text x="24" y="54" class="s m">${f.length} findings from the real output in examples/brownfield-monolith (severity, not importance order).</text>`;
  order.forEach((k, i) => {
    const y = T + i * rowH;
    g += `<text x="${L - 12}" y="${y + 24}" text-anchor="end" class="l">${k}</text><rect x="${L}" y="${y + 6}" width="${Math.max(4, (pw * counts[k]) / max)}" height="26" rx="5" fill="${colors[k]}" opacity="${counts[k] ? 1 : 0.25}"/><text x="${L + Math.max(4, (pw * counts[k]) / max) + 10}" y="${y + 25}" class="n">${counts[k]}</text>`;
  });
  save('sample-findings-by-severity.svg', wrap(W, H, 'Findings by severity in the sample audit', `Counts: ${order.map((k) => `${k} ${counts[k]}`).join(', ')}.`, g));
}

// ---------- 4. Scan time and memory ----------
{
  const b = read('docs/proof/benchmarks.json');
  const rows = b.rows;
  const W = 760, H = 380, L = 70, R = 30, T = 90, B = 90;
  const pw = W - L - R, ph = H - T - B;
  const max = Math.max(...rows.map((r) => r.ms)) * 1.15;
  const bw = pw / rows.length;
  let g = `<text x="24" y="34" class="t">How long a scan takes (synthetic repositories, one laptop)</text><text x="24" y="54" class="s m">Time in seconds with peak memory. Capped at 5 000 files: bigger repositories are cut off and the report says so.</text>`;
  for (const v of [0, 0.25, 0.5, 0.75, 1]) { const yy = T + ph - v * ph; g += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" class="${v === 0 ? 'axis' : 'grid'}"/><text x="${L - 8}" y="${yy + 4}" text-anchor="end" class="s m">${((max * v) / 1000).toFixed(0)}s</text>`; }
  rows.forEach((r, i) => {
    const x = L + bw * i + bw * 0.22, w = bw * 0.56, h = (ph * r.ms) / max;
    g += `<rect x="${x}" y="${T + ph - h}" width="${w}" height="${h}" rx="5" fill="${r.truncated ? 'var(--c)' : 'var(--a)'}"/><text x="${x + w / 2}" y="${T + ph - h - 8}" text-anchor="middle" class="n">${(r.ms / 1000).toFixed(1)}s</text>`;
    g += `<text x="${x + w / 2}" y="${H - B + 22}" text-anchor="middle" class="s">${esc(r.label.replace(' (20k files, truncated)', ''))}</text><text x="${x + w / 2}" y="${H - B + 40}" text-anchor="middle" class="s m">${r.filesScanned} files, ${r.maxRssMB} MB${r.truncated ? ', truncated' : ''}</text>`;
  });
  save('scan-time.svg', wrap(W, H, 'Scan time and memory by repository size', `Synthetic benchmark: ${rows.map((r) => `${r.label}: ${(r.ms / 1000).toFixed(1)} seconds, ${r.maxRssMB} MB`).join('; ')}.`, g));
}

// ---------- 5. Test coverage ----------
{
  const cov = readFileSync(path.join(ROOT, 'docs/proof/coverage.txt'), 'utf8');
  const m = /all files\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/.exec(cov);
  if (m) {
    const rows = [['Lines', +m[1]], ['Branches', +m[2]], ['Functions', +m[3]]];
    const W = 760, H = 250, L = 110, T = 84, rowH = 44, pw = W - L - 110;
    let g = `<text x="24" y="34" class="t">Test coverage of the compiled CLI</text><text x="24" y="54" class="s m">Node's built-in coverage over dist/. Reported in CI; not yet enforced as a threshold.</text>`;
    rows.forEach(([k, v], i) => {
      const y = T + i * rowH;
      g += `<text x="${L - 12}" y="${y + 22}" text-anchor="end" class="l">${k}</text><rect x="${L}" y="${y + 4}" width="${pw}" height="24" rx="5" fill="var(--line)" opacity=".5"/><rect x="${L}" y="${y + 4}" width="${(pw * v) / 100}" height="24" rx="5" fill="var(--ok)"/><text x="${L + (pw * v) / 100 + 10}" y="${y + 22}" class="n">${v.toFixed(1)}%</text>`;
    });
    save('coverage.svg', wrap(W, H, 'Test coverage', `Lines ${m[1]} percent, branches ${m[2]} percent, functions ${m[3]} percent.`, g));
  }
}

// ---------- 6. Pipeline (concept figure) ----------
{
  const W = 900, H = 330;
  const box = (x, y, w, h, title, sub, col) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="none" stroke="${col}" stroke-width="2"/><text x="${x + w / 2}" y="${y + 30}" text-anchor="middle" class="l" style="font-weight:700">${esc(title)}</text><text x="${x + w / 2}" y="${y + 52}" text-anchor="middle" class="s m">${esc(sub)}</text>`;
  const arrow = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--mute)" stroke-width="2" marker-end="url(#ah)"/>`;
  let g = `<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="var(--mute)"/></marker></defs>
<text x="24" y="34" class="t">How ArchSutra turns your repository into a trustworthy report</text>
<text x="24" y="54" class="s m">The CLI measures (offline, read-only). Your IDE's own model reasons. The skills keep the model honest.</text>`;
  g += box(24, 96, 160, 82, 'Your repository', 'read-only, never executed', 'var(--mute)');
  g += box(236, 80, 250, 114, 'archsutra CLI', 'walk, map, 19 rules, redact', 'var(--a)');
  g += box(540, 80, 170, 114, 'Evidence', 'findings.json, SARIF, maps', 'var(--b)');
  g += box(540, 226, 170, 82, 'Skills + Prime', '5 skills, 12 agents', 'var(--c)');
  g += box(236, 226, 250, 82, 'Your AI IDE model', 'reasons, verifies, writes', 'var(--c)');
  g += box(750, 130, 126, 82, 'Report', 'HTML + Markdown', 'var(--ok)');
  g += arrow(184, 137, 236, 137) + arrow(486, 137, 540, 137) + arrow(710, 137, 750, 160) + arrow(625, 194, 625, 226) + arrow(540, 267, 486, 267) + arrow(361, 226, 361, 194);
  g += `<text x="298" y="214" class="s m" text-anchor="start" transform="translate(70,0)">checks every finding</text><text x="548" y="214" class="s m">method</text>`;
  g += `<g class="s m"><text x="24" y="226">CLI never calls a model</text><text x="24" y="246">No API key. No telemetry.</text><text x="24" y="266">Secrets redacted before output.</text></g>`;
  save('pipeline.svg', wrap(W, H, 'ArchSutra pipeline', 'The repository is scanned read-only by the CLI, which produces evidence. The IDE model, guided by ArchSutra skills, verifies the evidence and writes the report.', g));
}

// ---------- 7. Anatomy of a finding (teaching figure) ----------
{
  // Assembled from parts so this script does not trip the very rule the figure illustrates.
  const DEMO_SQL_CALL = esc(['db.query(', '`SELECT * FROM users WHERE id = $', '{id}`', ')'].join(''));
  const W = 900, H = 400;
  const tag = (x, y, n) => `<circle cx="${x}" cy="${y}" r="13" fill="var(--a)"/><text x="${x}" y="${y + 5}" text-anchor="middle" style="fill:#fff;font-size:13px;font-weight:700">${n}</text>`;
  let g = `<text x="24" y="34" class="t">Anatomy of one finding</text><text x="24" y="54" class="s m">Real finding from the sample audit. Every field exists so you can check it, not just trust it.</text>
<rect x="60" y="76" width="560" height="300" rx="12" fill="none" stroke="var(--line)" stroke-width="2"/>
<text x="80" y="106" class="l" style="font-weight:700">AS-SEC-005#002</text><rect x="214" y="90" width="52" height="22" rx="11" fill="none" stroke="var(--bad)"/><text x="240" y="106" text-anchor="middle" class="s" style="fill:var(--bad);font-weight:700">HIGH</text>
<text x="280" y="106" class="l">SQL built by string interpolation</text>
<text x="80" y="140" class="s m">confidence: medium    category: security    effort: M</text>
<text x="80" y="172" class="s m">EVIDENCE</text><text x="80" y="194" class="l"><tspan style="fill:var(--ok)">[observed]</tspan> src/services/user.ts:2</text>
<text x="80" y="214" class="s" style="font-family:ui-monospace,Menlo,Consolas,monospace">${DEMO_SQL_CALL}</text>
<text x="80" y="246" class="s m">IMPACT</text><text x="80" y="266" class="s">Possible SQL injection if id comes from a request.</text>
<text x="80" y="296" class="s m">FIX</text><text x="80" y="316" class="s">Use a bound parameter: db.query(sql, [id]).</text>
<text x="80" y="346" class="s m">VERIFY and ACCEPT</text><text x="80" y="366" class="s">Test with  1 OR 1=1  returns nothing; no interpolated SQL left in src/.</text>`;
  const notes = [
    [660, 100, 1, 'Stable ID. Same rule, same ID next run.'],
    [660, 140, 2, 'Severity = impact if true. Confidence = how sure.'],
    [660, 194, 3, 'File and line. Label says observed, inferred or unknown.'],
    [660, 262, 4, 'Impact in one sentence a manager can read.'],
    [660, 312, 5, 'A concrete fix, not a lecture.'],
    [660, 362, 6, 'How to prove it is fixed, and when you are done.'],
  ];
  for (const [x, y, n, t] of notes) g += tag(x, y, n) + `<text x="${x + 24}" y="${y + 4}" class="s">${esc(t)}</text>`;
  save('finding-anatomy.svg', wrap(W, H, 'Anatomy of a finding', 'A finding has a stable ID, severity and confidence, evidence with a file and line, impact, a fix, and a verification and acceptance test.', g));
}

console.log('charts written to docs/assets/charts');
