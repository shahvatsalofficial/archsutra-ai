// Static documentation site generator. No dependencies.
// Source: docs/handbook/*.md and selected docs/**/*.md. Output: HTML next to the sources, plus docs/index.html,
// docs/assets/*, docs/sitemap.xml, docs/robots.txt.
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(ROOT, 'docs');
const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const SITE = 'https://shahvatsalofficial.github.io/archsutra-ai';
const REPO = 'https://github.com/shahvatsalofficial/archsutra-ai';
const MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@11.4.0/dist/mermaid.esm.min.mjs';

const GROUPS = [
  { title: 'Handbook', pages: ['handbook/README.md', 'handbook/01-executive-summary.md', 'handbook/02-functional-specification.md', 'handbook/03-technical-specification.md', 'handbook/04-architecture.md', 'handbook/05-user-guide.md', 'handbook/06-cli-reference.md', 'handbook/07-security-privacy-legal.md', 'handbook/08-testing-and-proof.md', 'handbook/09-compatibility-and-roadmap.md', 'handbook/10-contributor-guide.md', 'handbook/11-glossary-and-faq.md', 'handbook/12-rule-catalog.md'] },
  { title: 'Reference', pages: ['architecture/overview.md', 'architecture/threat-model.md', 'compatibility/matrix.md', 'rfc/0001-archsutra-v0.1.md', 'decisions/ADR-0001-deterministic-cli-plus-ide-skills.md'] },
];
const ALL = GROUPS.flatMap((g) => g.pages);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
const outRel = (src) => (src === 'handbook/README.md' ? 'handbook/index.html' : src.replace(/\.md$/, '.html'));
const relTo = (fromOut, toOut) => {
  const r = path.posix.relative(path.posix.dirname(fromOut), toOut);
  return r || path.posix.basename(toOut);
};

function rewriteLink(url, srcRel, curOut) {
  if (/^(https?:|mailto:|#)/.test(url)) return url;
  const [p, anchor] = url.split('#');
  const repoPath = path.posix.normalize(path.posix.join('docs', path.posix.dirname(srcRel), p));
  const suffix = anchor ? `#${anchor}` : '';
  if (repoPath.startsWith('docs/')) {
    const docRel = repoPath.slice(5);
    if (ALL.includes(docRel)) return relTo(curOut, outRel(docRel)) + suffix;
    if (existsSync(path.join(ROOT, repoPath)) && !statSync(path.join(ROOT, repoPath)).isDirectory()) return relTo(curOut, docRel) + suffix;
  }
  const abs = path.join(ROOT, repoPath);
  const isDir = existsSync(abs) && statSync(abs).isDirectory();
  return `${REPO}/${isDir ? 'tree' : 'blob'}/main/${repoPath.replace(/\/$/, '')}${suffix}`;
}

function inline(text, srcRel, curOut) {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_m, c) => `\u0000${codes.push(`<code>${esc(c)}</code>`) - 1}\u0000`);
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t, u) => {
    const href = rewriteLink(u.replace(/&amp;/g, '&'), srcRel, curOut);
    const ext = /^https?:/.test(href);
    return `<a href="${esc(href)}"${ext ? ' rel="noopener"' : ''}>${t}</a>`;
  });
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+[^\s<).,;])/g, '$1<a href="$2" rel="noopener">$2</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?![*\w])/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_m, i) => codes[Number(i)]);
}

function splitRow(line) {
  const cells = [];
  let cur = '';
  let tick = false;
  const t = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  for (const ch of t) {
    if (ch === '`') tick = !tick;
    if (ch === '|' && !tick) {
      cells.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function renderList(items, srcRel, curOut) {
  const root = { children: [], indent: -1 };
  const stack = [root];
  for (const it of items) {
    while (stack.length > 1 && it.indent <= stack[stack.length - 1].indent) stack.pop();
    const node = { ...it, children: [] };
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  const out = (nodes) => {
    if (!nodes.length) return '';
    const tag = nodes[0].ordered ? 'ol' : 'ul';
    return `<${tag}>${nodes.map((n) => `<li>${inline(n.text, srcRel, curOut)}${out(n.children)}</li>`).join('')}</${tag}>`;
  };
  return out(root.children);
}

function md(source, srcRel, curOut) {
  let summary = '';
  const text = source.replace(/<!--\s*summary:\s*([\s\S]*?)-->/, (_m, s) => {
    summary = s.trim();
    return '';
  }).replace(/<!--[\s\S]*?-->/g, '');
  const lines = text.split(/\r?\n/);
  const html = [];
  const headings = [];
  let title = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++;
      const code = buf.join('\n');
      if (fence[1] === 'mermaid') html.push(`<figure class="diagram"><pre class="mermaid">${esc(code)}</pre><figcaption>Diagram (Mermaid). If it does not render, the source is shown above.</figcaption></figure>`);
      else html.push(`<div class="code"><button class="copy" type="button" aria-label="Copy code">Copy</button><pre><code${fence[1] ? ` class="language-${fence[1]}"` : ''}>${esc(code)}</code></pre></div>`);
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const id = slug(h[2]);
      const body = inline(h[2], srcRel, curOut);
      if (level === 1 && !title) title = h[2].replace(/`/g, '');
      else if (level === 1) title = title || h[2];
      if (level >= 2 && level <= 3) headings.push({ level, id, text: h[2].replace(/`/g, '') });
      html.push(level === 1 ? `<h1 id="${id}">${body}</h1>` : `<h${level} id="${id}">${body}<a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${level}>`);
      i++;
      continue;
    }
    if (/^---+\s*$/.test(line)) { html.push('<hr>'); i++; continue; }
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(splitRow(lines[i++]));
      html.push(`<div class="table-wrap" tabindex="0" role="region" aria-label="Table"><table><thead><tr>${head.map((c) => `<th scope="col">${inline(c, srcRel, curOut)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c, srcRel, curOut)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (line.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, ''));
      html.push(`<blockquote>${inline(buf.join(' '), srcRel, curOut)}</blockquote>`);
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const items = [];
      while (i < lines.length) {
        const m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(lines[i]);
        if (m) { items.push({ indent: m[1].length, ordered: /\d/.test(m[2]), text: m[3] }); i++; }
        else if (lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && items.length) { items[items.length - 1].text += ` ${lines[i].trim()}`; i++; }
        else break;
      }
      html.push(renderList(items, srcRel, curOut));
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|>|\s*([-*]|\d+\.)\s+|\|)/.test(lines[i])) buf.push(lines[i++]);
    if (!buf.length) { buf.push(lines[i++]); }
    html.push(`<p>${inline(buf.join(' '), srcRel, curOut)}</p>`);
  }
  return { html: html.join('\n'), title, headings, summary };
}

const prefix = (out) => '../'.repeat(out.split('/').length - 1);

function shell({ title, description, out, body, toc = [], current = '', landing = false, jsonld = '' }) {
  const p = prefix(out);
  const canonical = `${SITE}/${out === 'index.html' ? '' : out.replace(/index\.html$/, '')}`;
  const nav = GROUPS.map((g) => `<div class="nav-group"><p class="nav-title">${g.title}</p><ul>${g.pages.map((pg) => {
    const o = outRel(pg);
    const label = pg === 'handbook/README.md' ? 'Overview' : ((readTitle(pg) || pg).replace(/^ArchSutra AI\s+/, ''));
    return `<li><a href="${p}${o}"${o === current ? ' aria-current="page"' : ''}>${esc(label)}</a></li>`;
  }).join('')}</ul></div>`).join('');
  const tocHtml = toc.length ? `<nav class="toc" aria-label="On this page"><p class="nav-title">On this page</p><ul>${toc.map((t) => `<li class="l${t.level}"><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ul></nav>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta name="color-scheme" content="light dark">
<meta property="og:type" content="${landing ? 'website' : 'article'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="ArchSutra AI">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="author" content="Vatsal Shah">
<link rel="icon" href="${p}assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${p}assets/site.css">
<script>try{var t=localStorage.getItem('as-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
${jsonld}
</head>
<body class="${landing ? 'landing' : 'doc'}">
<a class="skip" href="#main">Skip to content</a>
<header class="topbar">
  <div class="topbar-inner">
    <button class="menu-btn" type="button" aria-label="Toggle navigation" aria-expanded="false" aria-controls="sidebar">Menu</button>
    <a class="brand" href="${p}index.html" aria-label="ArchSutra AI home"><svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><rect width="32" height="32" rx="8" fill="currentColor" opacity=".12"/><path d="M6 24 16 7l10 17M10.5 18h11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>ArchSutra <b>AI</b></span></a>
    <nav class="top-links" aria-label="Primary"><a href="${p}handbook/index.html">Handbook</a><a href="${p}handbook/05-user-guide.html">Get started</a><a href="${p}handbook/08-testing-and-proof.html">Proof</a><a href="${REPO}" rel="noopener">GitHub</a></nav>
    <button class="theme-btn" type="button" aria-label="Toggle color theme"><span class="sun" aria-hidden="true">Light</span><span class="moon" aria-hidden="true">Dark</span></button>
  </div>
</header>
${landing ? `<main id="main">${body}</main>` : `<div class="layout">
  <aside id="sidebar" class="sidebar" aria-label="Documentation">${nav}</aside>
  <main id="main" class="content"><article class="prose">${body}</article></main>
  <aside class="rail">${tocHtml}</aside>
</div>`}
<footer class="footer">
  <div class="footer-inner">
    <p><strong>ArchSutra AI</strong> v${pkg.version}. Design. Audit. Evolve. Created by <a href="https://github.com/shahvatsalofficial" rel="noopener">Vatsal Shah</a>. Licensed under <a href="${REPO}/blob/main/LICENSE" rel="noopener">Apache-2.0</a>.</p>
    <p class="fine">Review aid only. Not a certification, compliance attestation, security guarantee or legal advice. Not affiliated with Anthropic, OpenAI, Cursor, GitHub or Google; product names belong to their owners. <a href="${p}handbook/07-security-privacy-legal.html">Legal details</a>.</p>
  </div>
</footer>
<script src="${p}assets/site.js" type="module"></script>
</body>
</html>
`;
}

const titleCache = {};
function readTitle(src) {
  if (!titleCache[src]) {
    const m = /^#\s+(.+)$/m.exec(readFileSync(path.join(DOCS, src), 'utf8'));
    titleCache[src] = m ? m[1].replace(/`/g, '') : src;
  }
  return titleCache[src];
}

const pages = [];
for (const src of ALL) {
  const out = outRel(src);
  const raw = readFileSync(path.join(DOCS, src), 'utf8');
  const r = md(raw, src, out);
  const title = `${r.title} | ArchSutra AI`;
  const desc = r.summary || `${r.title} - ArchSutra AI documentation.`;
  const crumb = `<p class="crumbs"><a href="${prefix(out)}index.html">ArchSutra AI</a> / ${src.startsWith('handbook/') ? 'Handbook' : 'Reference'}</p>`;
  const meta = `<p class="meta">Version ${pkg.version} &middot; Source: <a href="${REPO}/blob/main/docs/${src}" rel="noopener">docs/${src}</a></p>`;
  const body = r.html.replace(/^(<h1[^>]*>.*?<\/h1>)/, `${crumb}$1\n${r.summary ? `<p class="lede">${esc(r.summary)}</p>` : ''}${meta}`);
  const ld = `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'TechArticle', headline: r.title, description: desc, author: { '@type': 'Person', name: 'Vatsal Shah' }, inLanguage: 'en', isPartOf: { '@type': 'WebSite', name: 'ArchSutra AI', url: SITE } })}</script>`;
  const full = shell({ title, description: desc, out, body, toc: r.headings, current: out, jsonld: ld });
  mkdirSync(path.dirname(path.join(DOCS, out)), { recursive: true });
  writeFileSync(path.join(DOCS, out), full);
  pages.push(out);
}

// ---- Landing page ----
const stats = [
  ['20', 'automated tests'],
  ['6/6', 'CI jobs green (3 OS x Node 20, 22)'],
  ['0', 'runtime dependencies'],
  ['19', 'audit rules'],
  ['12', 'specialist agents'],
  ['0', 'API keys required'],
];
const faq = [
  ['What is ArchSutra AI?', 'An open-source software architecture agent: portable Agent Skills plus a deterministic offline CLI that help AI coding assistants audit, design, threat-model and modernize software with file-and-line evidence.'],
  ['Do I need an API key?', 'No. The CLI is offline. Inside a supported AI IDE the skills use that IDE\'s own model, so you need access to the IDE, not an ArchSutra key.'],
  ['Does it send my code anywhere?', 'The CLI sends nothing anywhere and has no telemetry. When you use the skills, your AI IDE\'s model provider processes your prompts and code under its own terms.'],
  ['Which AI tools does it support?', 'Adapters exist for Claude Code, Cursor, OpenAI Codex and GitHub Copilot (adapter level) and Gemini CLI (experimental). Live smoke tests are pending and stated openly.'],
  ['Does it certify compliance or security?', 'No. Reports are review aids. Absence of findings is not proof of absence of vulnerabilities, and nothing here is legal advice or a compliance attestation.'],
];
const hero = `
<section class="hero">
  <div class="wrap">
    <p class="eyebrow">Open source &middot; Apache-2.0 &middot; v${pkg.version}</p>
    <h1>The software architecture agent that shows its evidence.</h1>
    <p class="hero-lede">ArchSutra AI turns Claude Code, Cursor, Codex, GitHub Copilot and Gemini CLI into an evidence-first architect. Audit, design, threat-model and modernize with <code>file:line</code> proof, severity and confidence, no extra API key.</p>
    <div class="cta">
      <a class="btn primary" href="handbook/05-user-guide.html">Get started in 60 seconds</a>
      <a class="btn" href="handbook/index.html">Read the handbook</a>
      <a class="btn ghost" href="${REPO}" rel="noopener">View on GitHub</a>
    </div>
    <div class="code hero-code"><button class="copy" type="button" aria-label="Copy command">Copy</button><pre><code>npx github:shahvatsalofficial/archsutra-ai audit .</code></pre></div>
    <p class="hero-note">Read-only. Offline. No telemetry. Secrets redacted.</p>
  </div>
</section>
<section class="stats" aria-label="Facts"><div class="wrap"><ul>${stats.map(([n, l]) => `<li><span class="num">${n}</span><span class="lbl">${l}</span></li>`).join('')}</ul></div></section>
<section class="band"><div class="wrap">
  <h2>Why teams use it</h2>
  <div class="cards">
    <article class="card"><h3>Evidence, not vibes</h3><p>Every claim is tagged observed, inferred, proposed or unknown. Findings cite file and line, with severity, confidence, fix and acceptance criteria.</p></article>
    <article class="card"><h3>Keyless and private</h3><p>The CLI runs offline with no telemetry. Inside your IDE, the skills use the model you already have. No ArchSutra account.</p></article>
    <article class="card"><h3>Built for CI</h3><p>Gate pull requests with <code>--fail-on high</code>. Export Markdown, Mermaid, JSON and SARIF 2.1.0 for code scanning.</p></article>
    <article class="card"><h3>A specialist team</h3><p>Twelve role contracts led by Prime: security, data, cloud, integration, AI, reliability, cost, delivery and verification.</p></article>
    <article class="card"><h3>Safe to adopt</h3><p>Dry-run installs, SHA-256 manifests, conflict detection, backups, and uninstall that never deletes your edits.</p></article>
    <article class="card"><h3>Honest by design</h3><p>Support levels stated plainly. Reliability, performance and cost are "not assessed" unless evidence exists.</p></article>
  </div>
</div></section>
<section class="wrap how"><h2>How it works</h2>
  <figure class="diagram"><pre class="mermaid">flowchart LR
  dev["You, in an AI IDE"] --> skill["ArchSutra skills + Prime"]
  skill --> cli["archsutra CLI (offline)"]
  cli --> repo[("Your repository, read-only")]
  cli --> ev["Evidence: findings.json, SARIF, Mermaid"]
  ev --> skill
  skill --> out["Report, ADRs, roadmap"]</pre><figcaption>The CLI measures. Your IDE's model reasons. Neither needs an ArchSutra key.</figcaption></figure>
</section>
<section class="band"><div class="wrap">
  <h2>Trust, with receipts</h2>
  <div class="cards two">
    <article class="card"><h3>Reproducible proof</h3><p>20 tests, a 6-job CI matrix, labeled-fixture evaluation, real sample reports. Re-run everything yourself.</p><a href="handbook/08-testing-and-proof.html">See the evidence</a></article>
    <article class="card"><h3>Legal and privacy clarity</h3><p>Apache-2.0, NOTICE, third-party notices, trademark disclaimers, and an explicit list of checks not yet done.</p><a href="handbook/07-security-privacy-legal.html">Read the policy</a></article>
  </div>
  <p class="honest"><strong>What is not proven yet:</strong> live behavior inside each AI IDE, accuracy on real-world repositories, and trademark clearance for the name. We say so up front.</p>
</div></section>
<section class="wrap"><h2>Supported AI IDEs</h2>
  <div class="table-wrap" tabindex="0" role="region" aria-label="Supported hosts"><table><thead><tr><th scope="col">Host</th><th scope="col">Level</th><th scope="col">Skills</th><th scope="col">Agents</th></tr></thead><tbody>
  <tr><td>Claude Code</td><td>adapter</td><td><code>.claude/skills/</code></td><td><code>.claude/agents/</code></td></tr>
  <tr><td>Cursor</td><td>adapter</td><td><code>.cursor/skills/</code></td><td>none</td></tr>
  <tr><td>OpenAI Codex</td><td>adapter</td><td><code>.agents/skills/</code> + AGENTS.md</td><td>none</td></tr>
  <tr><td>GitHub Copilot</td><td>adapter</td><td><code>.github/skills/</code></td><td><code>.github/agents/*.agent.md</code></td></tr>
  <tr><td>Gemini CLI</td><td>experimental</td><td><code>.gemini/skills/</code></td><td>none</td></tr>
  </tbody></table></div>
  <p class="muted">"adapter" = files written to the vendor-documented layout; not yet smoke-tested in the live host. <a href="handbook/09-compatibility-and-roadmap.html">Full matrix</a>.</p>
</section>
<section class="band"><div class="wrap"><h2>Documentation</h2>
  <div class="cards">${[
    ['Executive summary', 'handbook/01-executive-summary.html', 'Problem, value, risks, decisions.'],
    ['Functional specification', 'handbook/02-functional-specification.html', 'Every requirement and scenario.'],
    ['Technical specification', 'handbook/03-technical-specification.html', 'Modules, algorithms, limits.'],
    ['Architecture', 'handbook/04-architecture.html', 'C4 views, flows, trust boundaries.'],
    ['User guide', 'handbook/05-user-guide.html', 'Install, audit, IDE prompts, CI.'],
    ['CLI reference', 'handbook/06-cli-reference.html', 'Commands, flags, exit codes.'],
    ['Security, privacy, legal', 'handbook/07-security-privacy-legal.html', 'Model, license, disclaimers.'],
    ['Testing and proof', 'handbook/08-testing-and-proof.html', 'Results, CI, evaluation, samples.'],
    ['Rule catalog', 'handbook/12-rule-catalog.html', 'All 19 audit rules.'],
  ].map(([t, h, d]) => `<a class="card link" href="${h}"><h3>${t}</h3><p>${d}</p></a>`).join('')}</div>
</div></section>
<section class="wrap faq"><h2>Frequently asked questions</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
  <p class="muted"><a href="handbook/11-glossary-and-faq.html">More questions and a glossary</a></p>
</section>`;
const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
const swLd = { '@context': 'https://schema.org', '@type': 'SoftwareSourceCode', name: 'ArchSutra AI', description: 'Open-source software architecture audit, design and threat-modeling agent skills and offline CLI for Claude Code, Cursor, Codex, GitHub Copilot and Gemini CLI.', codeRepository: REPO, programmingLanguage: 'TypeScript', runtimePlatform: 'Node.js', license: 'https://www.apache.org/licenses/LICENSE-2.0', version: pkg.version, author: { '@type': 'Person', name: 'Vatsal Shah', url: 'https://github.com/shahvatsalofficial' }, url: SITE };
writeFileSync(path.join(DOCS, 'index.html'), shell({
  title: 'ArchSutra AI - Software Architecture Audit Agent for Claude Code, Cursor, Codex, Copilot & Gemini CLI',
  description: 'Open-source software architecture agent: audit, design, threat-model and modernize with file-and-line evidence. Agent Skills plus an offline CLI. No extra API key. Apache-2.0.',
  out: 'index.html', body: hero, landing: true, current: 'index.html',
  jsonld: `<script type="application/ld+json">${JSON.stringify(swLd)}</script>\n<script type="application/ld+json">${JSON.stringify(faqLd)}</script>`,
}));
pages.unshift('index.html');

// ---- sitemap, robots, assets ----
const today = new Date().toISOString().slice(0, 10);
writeFileSync(path.join(DOCS, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${SITE}/${p === 'index.html' ? '' : p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(path.join(DOCS, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
writeFileSync(path.join(DOCS, '.nojekyll'), '');
mkdirSync(path.join(DOCS, 'assets'), { recursive: true });
console.log(`Built ${pages.length} pages into docs/`);
