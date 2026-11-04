import { mermaidContainers, mermaidContext } from './report.js';
import type { ArchMap, AuditResult, Evidence, Finding } from './types.js';

const MERMAID_SRC = 'https://cdn.jsdelivr.net/npm/mermaid@11.4.0/dist/mermaid.esm.min.mjs';

/** Every dynamic value (file paths, excerpts, titles) comes from untrusted repositories: always escape. */
export const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const CSS = `
:root{--bg:#fbfbfd;--card:#fff;--soft:#f2f3f8;--text:#15181e;--muted:#565e6e;--line:#e1e4ec;--accent:#4338ca;--crit:#b42318;--high:#c2410c;--med:#8a5a00;--low:#1d4ed8;--info:#565e6e;--ok:#17794a;color-scheme:light}
@media(prefers-color-scheme:dark){:root{--bg:#0c0f14;--card:#131820;--soft:#1a202a;--text:#e8ebf2;--muted:#a2abbb;--line:#262e3b;--accent:#a5a8ff;--crit:#ff8a80;--high:#ffab70;--med:#f0c36a;--low:#8fb4ff;--info:#a2abbb;--ok:#5fd39a;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--accent)}code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.9em}
:not(pre)>code{background:var(--soft);border:1px solid var(--line);padding:.1em .35em;border-radius:6px;overflow-wrap:anywhere}
.wrap{max-width:1000px;margin:0 auto;padding:24px 20px 56px}
header.top{border-bottom:1px solid var(--line);background:var(--card)}header.top .wrap{padding-block:18px}
h1{font-size:clamp(1.6rem,3vw,2.2rem);letter-spacing:-.02em;margin:.1em 0}h2{font-size:1.35rem;margin:2em 0 .6em;padding-top:1em;border-top:1px solid var(--line)}h3{margin:0;font-size:1.02rem}
.muted{color:var(--muted)}.nav a{margin-right:14px}.lede{color:var(--muted);margin:.2em 0 0}
.notice{margin:16px 0;padding:12px 16px;border-left:4px solid var(--accent);background:var(--soft);border-radius:0 10px 10px 0}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin:16px 0}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}.card b{display:block;font-size:1.8rem;line-height:1.1}.card span{color:var(--muted);font-size:.85rem}
.table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px;background:var(--card);margin:12px 0}table{border-collapse:collapse;width:100%;font-size:.93rem}
th,td{text-align:left;vertical-align:top;padding:9px 13px;border-bottom:1px solid var(--line)}th{background:var(--soft)}tr:last-child td{border-bottom:0}
.badge{display:inline-block;padding:1px 9px;border-radius:999px;border:1px solid currentColor;font-size:.78rem;font-weight:650;text-transform:uppercase;letter-spacing:.03em;white-space:nowrap}
.sev-critical{color:var(--crit)}.sev-high{color:var(--high)}.sev-medium{color:var(--med)}.sev-low{color:var(--low)}.sev-info{color:var(--info)}
.r-strong{color:var(--ok)}.r-adequate{color:var(--med)}.r-weak{color:var(--high)}.r-critical{color:var(--crit)}.r-not{color:var(--muted)}
.filters{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.filters button{font:inherit;font-size:.88rem;padding:5px 12px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--text);cursor:pointer}
.filters button[aria-pressed=true]{background:var(--accent);color:var(--bg);border-color:var(--accent)}
details.finding{background:var(--card);border:1px solid var(--line);border-left-width:5px;border-radius:12px;margin:10px 0;padding:4px 16px}
details.finding.sev-critical{border-left-color:var(--crit)}details.finding.sev-high{border-left-color:var(--high)}details.finding.sev-medium{border-left-color:var(--med)}details.finding.sev-low{border-left-color:var(--low)}details.finding.sev-info{border-left-color:var(--info)}
details.finding summary{cursor:pointer;padding:10px 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap}.fid{font-family:ui-monospace,monospace;font-size:.82rem;color:var(--muted)}
.fbody{padding:4px 0 14px}.fbody dt{font-weight:650;margin-top:.8em}.fbody dd{margin:.15em 0 0}.ev{list-style:none;padding:0;margin:.2em 0}.ev li{margin:.2em 0}
pre{background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:12px 14px;overflow:auto}
figure.diagram{margin:12px 0;padding:14px;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow-x:auto}pre.mermaid{background:transparent;border:0;padding:0;text-align:center}
footer{margin-top:40px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:.85rem}
:focus-visible{outline:3px solid var(--accent);outline-offset:2px;border-radius:4px}
@media print{.filters,.nav{display:none}details.finding{break-inside:avoid}details.finding:not([open])>*{display:block}}
`;

const MERMAID_JS = `
const dark=matchMedia('(prefers-color-scheme: dark)').matches;
try{const m=(await import('${MERMAID_SRC}')).default;
m.initialize({startOnLoad:false,securityLevel:'strict',theme:'base',themeVariables:dark?{primaryColor:'#1f2340',primaryTextColor:'#e8ebf2',primaryBorderColor:'#a5a8ff',lineColor:'#a2abbb',edgeLabelBackground:'#131820',textColor:'#e8ebf2'}:{primaryColor:'#eceafd',primaryTextColor:'#15181e',primaryBorderColor:'#4338ca',lineColor:'#565e6e',edgeLabelBackground:'#ffffff',textColor:'#15181e'}});
await m.run({nodes:document.querySelectorAll('pre.mermaid')});}catch(e){/* offline: diagram source stays visible */}`;

const FILTER_JS = `
const btns=[...document.querySelectorAll('.filters button')];
btns.forEach(b=>b.addEventListener('click',()=>{const s=b.dataset.sev;btns.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
document.querySelectorAll('details.finding').forEach(d=>{d.hidden=!(s==='all'||d.dataset.sev===s)})}));`;

function page(title: string, nav: string, body: string, opts: { mermaid?: boolean; filter?: boolean } = {}): string {
  const script = [opts.filter ? FILTER_JS : '', opts.mermaid ? MERMAID_JS : ''].filter(Boolean).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' https://cdn.jsdelivr.net; connect-src https://cdn.jsdelivr.net; img-src data:; base-uri 'none'; form-action 'none'">
<meta name="color-scheme" content="light dark">
<meta name="generator" content="ArchSutra AI">
<title>${esc(title)}</title>
<style>${CSS}</style>
</head>
<body>
<header class="top"><div class="wrap"><nav class="nav" aria-label="Report pages">${nav}</nav><h1>${esc(title)}</h1><p class="lede">Generated by ArchSutra AI. Deterministic static scan, read-only.</p></div></header>
<main class="wrap">
${body}
<footer>Review aid only. Not a certification, compliance attestation, security guarantee or legal advice. Findings marked <code>inferred</code> or <code>unknown</code> are hypotheses; absence of findings does not prove absence of problems. Secrets are redacted.</footer>
</main>
${script ? `<script type="module">${script}</script>` : ''}
</body>
</html>
`;
}

const NAV = '<a href="index.html">Overview</a><a href="audit-report.html">Audit report</a><a href="current-state.html">Current state</a>';
const ratingClass = (r: string): string => `r-${r.split(' ')[0]}`;

function evHtml(e: Evidence): string {
  const loc = e.startLine ? `${e.path}:${e.startLine}${e.endLine && e.endLine !== e.startLine ? `-${e.endLine}` : ''}` : e.path;
  return `<li><span class="badge" style="color:var(--muted)">${esc(e.kind)}</span> <code>${esc(loc)}</code>${e.excerpt ? ` <code>${esc(e.excerpt)}</code>` : ''}</li>`;
}

function findingHtml(f: Finding): string {
  const dl: [string, string][] = [
    ['Impact', esc(f.impact)], ['Why it matters', esc(f.whyItMatters)], ['Fix', esc(f.fix)], ['How to verify', esc(f.verification)],
    ['Acceptance criteria', esc(f.acceptanceCriteria)], ['Effort / owner', `${esc(f.effort)} / ${esc(f.ownerType)}`],
  ];
  if (f.caveats) dl.push(['Caveats and false-positive notes', esc(f.caveats)]);
  const refs = f.references.length ? f.references.filter((r) => /^https:\/\//.test(r)).map((r) => `<a href="${esc(r)}" rel="noopener noreferrer">${esc(r)}</a>`).join(', ') : '';
  return `<details class="finding sev-${esc(f.severity)}" data-sev="${esc(f.severity)}"${['critical', 'high'].includes(f.severity) ? ' open' : ''}>
<summary><span class="badge sev-${esc(f.severity)}">${esc(f.severity)}</span><h3>${esc(f.title)}</h3><span class="fid">${esc(f.id)}</span><span class="muted">confidence: ${esc(f.confidence)}</span></summary>
<div class="fbody"><p class="muted">Category: ${esc(f.category)}</p><p><b>Evidence</b></p><ul class="ev">${f.evidence.map(evHtml).join('')}</ul>
<dl>${dl.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}${refs ? `<dt>References</dt><dd>${refs}</dd>` : ''}</dl></div>
</details>`;
}

const diagram = (src: string, caption: string): string => `<figure class="diagram"><pre class="mermaid">${esc(src)}</pre><figcaption class="muted">${esc(caption)}</figcaption></figure>`;

function sevCounts(r: AuditResult): Record<string, number> {
  const c: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of r.findings) c[f.severity]++;
  return c;
}

export function renderAuditHtml(r: AuditResult): string {
  const c = sevCounts(r);
  const cards = [['Findings', r.findings.length, ''], ['Critical', c.critical, 'sev-critical'], ['High', c.high, 'sev-high'], ['Medium', c.medium, 'sev-medium'], ['Low', c.low, 'sev-low'], ['Info', c.info, 'sev-info']]
    .map(([l, n, k]) => `<div class="card"><b class="${k}">${n}</b><span>${l}</span></div>`).join('');
  const body = `
<h2 style="border-top:0;margin-top:0">Summary</h2>
<div class="cards">${cards}</div>
<p>Files scanned: <b>${r.map.coverage.filesScanned}</b>${r.map.coverage.truncated ? ' <span class="badge sev-high">truncated by budget</span>' : ''}. Stack observed: ${esc(r.map.ecosystems.join(', ') || 'none recognised')}.</p>
<h2>Scorecard</h2>
<div class="table-wrap"><table><thead><tr><th scope="col">Category</th><th scope="col">Rating</th><th scope="col">Basis</th></tr></thead><tbody>${r.scorecard.map((s) => `<tr><td>${esc(s.category)}</td><td><span class="badge ${ratingClass(s.rating)}">${esc(s.rating)}</span></td><td>${esc(s.basis)}</td></tr>`).join('')}</tbody></table></div>
<h2>Findings</h2>
${r.findings.length ? `<div class="filters" role="group" aria-label="Filter by severity"><button type="button" data-sev="all" aria-pressed="true">All (${r.findings.length})</button>${(['critical', 'high', 'medium', 'low', 'info'] as const).filter((s) => c[s]).map((s) => `<button type="button" data-sev="${s}" aria-pressed="false">${s} (${c[s]})</button>`).join('')}</div>${r.findings.map(findingHtml).join('\n')}` : '<p class="notice">No findings from the implemented rules. This does not prove the absence of problems.</p>'}
<h2>Scope and blind spots</h2>
<ul>${r.map.blindSpots.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
${r.failedChecks.length ? `<h3>Failed checks</h3><ul>${r.failedChecks.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
<p class="muted">Skipped: <code>${esc(JSON.stringify(r.map.coverage.skipped))}</code></p>`;
  return page('Architecture Audit Report', NAV, body, { filter: r.findings.length > 0 });
}

export function renderCurrentStateHtml(map: ArchMap): string {
  const row = (k: string, v: string): string => `<tr><th scope="row">${k}</th><td>${esc(v || 'none detected')}</td></tr>`;
  const body = `
<h2 style="border-top:0;margin-top:0">Stack</h2>
<div class="table-wrap"><table><tbody>${row('Ecosystems', map.ecosystems.join(', '))}${row('Frameworks (from manifests)', map.frameworks.join(', '))}${row('Datastores / messaging (from manifests)', map.datastores.join(', '))}${row('Infrastructure files', map.infra.join(', '))}${row('Entry points', map.entrypoints.join(', '))}</tbody></table></div>
<h2>System context (C4 level 1, inferred from manifests)</h2>
${diagram(mermaidContext(map), 'Diagram source is shown if it cannot be rendered offline.')}
<h2>Modules and dependencies (observed imports)</h2>
${diagram(mermaidContainers(map), 'Numbers on arrows are import counts.')}
<div class="table-wrap"><table><thead><tr><th scope="col">Module</th><th scope="col">Files</th><th scope="col">Lines</th><th scope="col">Languages</th></tr></thead><tbody>${map.modules.slice(0, 40).map((m) => `<tr><td><code>${esc(m.name)}</code></td><td>${m.files}</td><td>${m.lines}</td><td>${esc(m.ecosystems.join(', '))}</td></tr>`).join('')}</tbody></table></div>
<h2>Dependency cycles</h2>
${map.cycles.length ? `<ul>${map.cycles.map((cy) => `<li><code>${esc(cy.join(' <-> '))}</code></li>`).join('')}</ul>` : '<p class="muted">None detected at module level.</p>'}
<h2>Blind spots</h2>
<ul>${map.blindSpots.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`;
  return page('Current State (observed)', NAV, body, { mermaid: true });
}

export function renderOverviewHtml(r: AuditResult): string {
  const c = sevCounts(r);
  const body = `
<h2 style="border-top:0;margin-top:0">Reports</h2>
<div class="table-wrap"><table><thead><tr><th scope="col">Report</th><th scope="col">What it shows</th><th scope="col">Formats</th></tr></thead><tbody>
<tr><td><a href="audit-report.html">Audit report</a></td><td>${r.findings.length} finding(s): ${c.critical} critical, ${c.high} high, ${c.medium} medium, ${c.low} low, ${c.info} info; scorecard; blind spots</td><td><a href="audit-report.html">HTML</a>, <a href="audit-report.md">Markdown</a>, <a href="findings.json">JSON</a>, <a href="findings.sarif">SARIF</a></td></tr>
<tr><td><a href="current-state.html">Current state</a></td><td>Stack, system context and module diagrams, dependency cycles</td><td><a href="current-state.html">HTML</a>, <a href="current-state.md">Markdown</a></td></tr>
<tr><td>Artifact register</td><td>SHA-256 of every generated file</td><td><a href="architecture-register.json">JSON</a></td></tr>
</tbody></table></div>
<p class="notice">Open the HTML files in a browser for a readable view; use the Markdown files in repositories and pull requests, and JSON or SARIF for tools. Use the <code>architecture-audit</code> skill in your AI IDE to add semantic analysis, ADRs and a roadmap on top of this evidence.</p>`;
  return page('Architecture Documentation', NAV, body);
}
