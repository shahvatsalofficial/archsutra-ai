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
const MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@12.3.0/dist/mermaid.esm.min.mjs';

const GROUPS = [
  { title: 'Start here', pages: ['guides/getting-started.md', 'guides/real-world-scenarios.md', 'guides/how-it-works.md', 'guides/reading-a-report.md', 'guides/ci-recipes.md', 'guides/cheat-sheet.md', 'guides/evidence-at-a-glance.md'] },
  { title: 'Handbook', pages: ['handbook/README.md', 'handbook/01-executive-summary.md', 'handbook/02-functional-specification.md', 'handbook/03-technical-specification.md', 'handbook/04-architecture.md', 'handbook/05-user-guide.md', 'handbook/06-cli-reference.md', 'handbook/07-security-privacy-legal.md', 'handbook/08-testing-and-proof.md', 'handbook/09-compatibility-and-roadmap.md', 'handbook/10-contributor-guide.md', 'handbook/11-glossary-and-faq.md', 'handbook/12-rule-catalog.md', 'handbook/13-trust-and-assurance.md', 'handbook/14-real-world-evaluation.md', 'handbook/15-supply-chain-and-release.md', 'handbook/16-performance-and-quality-metrics.md'] },
  { title: 'Reference', pages: ['architecture/overview.md', 'architecture/threat-model.md', 'compatibility/matrix.md', 'rfc/0001-archsutra-v0.1.md', 'decisions/ADR-0001-deterministic-cli-plus-ide-skills.md', 'compatibility/smoke-tests/README.md', 'community/good-first-issues.md', 'legal/trademark-and-name-clearance.md', 'legal/legal-review-brief.md', 'proof/accessibility.md'] },
];
const ALL = GROUPS.flatMap((g) => g.pages);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
const outRel = (src) => src.replace(/(^|\/)README\.md$/, '$1index.html').replace(/\.md$/, '.html');
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
  let s = text.replace(/`([^`]+)`/g, (_m, c) => `\u0000${codes.push(`<code>${esc(c.replace(/\\\|/g, '|'))}</code>`) - 1}\u0000`);
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, u) => {
    const src = esc(rewriteLink(u.replace(/&amp;/g, '&'), srcRel, curOut));
    const dark = src.replace(/\.svg$/, '-dark.svg');
    const hasDark = src.endsWith('.svg') && existsSync(path.join(DOCS, 'assets', 'charts', path.basename(dark)));
    return hasDark
      ? `<img class="theme-light" src="${src}" alt="${alt}" loading="lazy"><img class="theme-dark" src="${dark}" alt="${alt}" loading="lazy">`
      : `<img src="${src}" alt="${alt}" loading="lazy">`;
  });
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
  let lastHeading = '';
  let tableNo = 0;
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
      else html.push(`<div class="code"><button class="copy" type="button" aria-label="Copy code">Copy</button><pre tabindex="0"><code${fence[1] ? ` class="language-${fence[1]}"` : ''}>${esc(code)}</code></pre></div>`);
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const id = slug(h[2]);
      const body = inline(h[2], srcRel, curOut);
      lastHeading = h[2].replace(/`/g, '');
      if (level === 1 && !title) title = h[2].replace(/`/g, '');
      else if (level === 1) title = title || h[2];
      if (level >= 2 && level <= 3) headings.push({ level, id, text: h[2].replace(/`|\*\*/g, '') });
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
      html.push(`<div class="table-wrap" tabindex="0" role="region" aria-label="${esc(`Table ${++tableNo}: ${lastHeading || title}`)}"><table><thead><tr>${head.map((c) => `<th scope="col">${inline(c, srcRel, curOut)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c, srcRel, curOut)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (line.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, ''));
      const joined = buf.join(' ');
      const kind = /^\*\*(Real output|Illustrative|Tip|Note|Warning|Why it matters)\.?\*\*/.exec(joined);
      const cls = kind ? ` class="callout callout-${kind[1].toLowerCase().replace(/\s+/g, '-')}"` : '';
      html.push(`<blockquote${cls}>${inline(joined, srcRel, curOut)}</blockquote>`);
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
    const only = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(buf.join(' ').trim());
    if (only) html.push(`<figure class="figure">${inline(buf.join(' ').trim(), srcRel, curOut)}<figcaption>${esc(only[1])}</figcaption></figure>`);
    else html.push(`<p>${inline(buf.join(' '), srcRel, curOut)}</p>`);
  }
  return { html: html.join('\n'), title, headings, summary };
}

const prefix = (out) => '../'.repeat(out.split('/').length - 1);

const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
  evidence: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  ci: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7M8.3 7.3l7.4 3.4"/>',
  shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
  scale: '<path d="M12 4v16M7 20h10M5 8h14"/><path d="m5 8-3 7a4 4 0 0 0 6 0zM19 8l-3 7a4 4 0 0 0 6 0z"/>',
  code: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
};
const icon = (n, cls = 'icon') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;
const LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="currentColor" opacity=".14"/><path d="M6 24 16 7l10 17M10.5 18h11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function navHtml(p, current) {
  return GROUPS.map((g) => `<div class="nav-group"><p class="nav-title">${g.title}</p><ul>${g.pages.map((pg) => {
    const o = outRel(pg);
    const label = pg === 'handbook/README.md' ? 'Overview' : pg === 'compatibility/smoke-tests/README.md' ? 'Live smoke tests' : ((readTitle(pg) || pg).replace(/^ArchSutra AI\s+/, ''));
    return `<li><a href="${p}${o}"${o === current ? ' aria-current="page"' : ''}>${esc(label)}</a></li>`;
  }).join('')}</ul></div>`).join('');
}

function shell({ title, description, out, body, toc = [], current = '', landing = false, jsonld = '', pn = '' }) {
  const p = prefix(out);
  const canonical = `${SITE}/${out === 'index.html' ? '' : out.replace(/index\.html$/, '')}`;
  const nav = navHtml(p, current);
  const section = out.startsWith('guides/') ? 'guides' : out.startsWith('handbook/') ? 'handbook' : '';
  const links = [['Get started', 'guides/getting-started.html', out === 'guides/getting-started.html'], ['Scenarios', 'guides/real-world-scenarios.html', out === 'guides/real-world-scenarios.html'], ['Handbook', 'handbook/index.html', section === 'handbook'], ['Proof', 'guides/evidence-at-a-glance.html', out === 'guides/evidence-at-a-glance.html']];
  const topLinks = links.map(([t, h, on]) => `<a href="${p}${h}"${on ? ' aria-current="true"' : ''}>${t}</a>`).join('');
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
<meta name="theme-color" content="#ffffff">
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
<script>try{if(localStorage.getItem('as-theme')==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}</script>
${jsonld}
</head>
<body class="${landing ? 'landing' : 'doc'}" data-root="${p}">
<a class="skip" href="#main">Skip to content</a>
<header class="topbar">
  <div class="topbar-inner">
    <a class="brand" href="${p}index.html" aria-label="ArchSutra AI home">${LOGO}<span>ArchSutra <b>AI</b></span></a>
    <nav class="top-links" aria-label="Primary">${topLinks}</nav>
    <span class="spacer"></span>
    <div class="search" role="search"><label class="sr-only" for="q">Search the documentation</label><input id="q" type="search" placeholder="Search docs  ( / )" autocomplete="off" aria-controls="results" aria-expanded="false"><ul id="results" class="results" role="listbox" hidden></ul></div>
    <a class="gh-btn" href="${REPO}" rel="noopener">${icon('github')}<span>GitHub</span></a>
    <button class="icon-btn theme-btn" type="button" aria-label="Switch between light and dark theme"><span class="sun">${icon('sun')}</span><span class="moon">${icon('moon')}</span></button>
    <button class="icon-btn menu-btn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="drawer">${icon('menu')}</button>
  </div>
</header>
<div id="drawer" class="drawer" aria-hidden="true">
  <div class="drawer-scrim" data-close></div>
  <div class="drawer-panel" role="dialog" aria-label="Menu">
    <div class="drawer-head"><a class="brand" href="${p}index.html">${LOGO}<span>ArchSutra <b>AI</b></span></a><button class="icon-btn" type="button" data-close aria-label="Close menu">${icon('close')}</button></div>
    <div class="primary-links"><a href="${p}index.html">Home</a>${links.map(([t, h]) => `<a href="${p}${h}">${t}</a>`).join('')}<a href="${REPO}" rel="noopener">GitHub</a></div>
    ${nav}
  </div>
</div>
${landing ? `<main id="main">${body}</main>` : `<div class="layout">
  <aside id="sidebar" class="sidebar" aria-label="Documentation">${nav}</aside>
  <main id="main" class="content"><article class="prose">${body}</article>${pn}</main>
  <aside class="rail">${tocHtml}</aside>
</div>`}
<footer class="footer">
  <div class="footer-inner">
    <div class="footer-grid">
      <div class="about-col"><a class="brand" href="${p}index.html">${LOGO}<span>ArchSutra <b>AI</b></span></a><p class="about">Design. Audit. Evolve. An open-source, evidence-first software architecture agent. Created by <a href="https://shahvatsal.com" rel="noopener">Vatsal Shah</a>. Apache-2.0.</p></div>
      <div><h4>Learn</h4><ul><li><a href="${p}guides/getting-started.html">Get started</a></li><li><a href="${p}guides/real-world-scenarios.html">Real-world scenarios</a></li><li><a href="${p}guides/how-it-works.html">How it works</a></li><li><a href="${p}guides/cheat-sheet.html">Cheat sheet</a></li></ul></div>
      <div><h4>Trust</h4><ul><li><a href="${p}guides/evidence-at-a-glance.html">Evidence at a glance</a></li><li><a href="${p}handbook/13-trust-and-assurance.html">Honesty register</a></li><li><a href="${p}handbook/07-security-privacy-legal.html">Security and legal</a></li><li><a href="${p}handbook/15-supply-chain-and-release.html">Supply chain</a></li></ul></div>
      <div><h4>Project</h4><ul><li><a href="${REPO}" rel="noopener">GitHub</a></li><li><a href="https://www.npmjs.com/package/archsutra-ai" rel="noopener">npm</a></li><li><a href="${p}handbook/10-contributor-guide.html">Contribute</a></li><li><a href="${REPO}/blob/main/CHANGELOG.md" rel="noopener">Changelog</a></li></ul></div>
    </div>
    <p class="fine">v${pkg.version}. Review aid only. Not a certification, compliance attestation, security guarantee or legal advice. Not affiliated with Anthropic, OpenAI, Cursor, GitHub or Google; product names belong to their owners. <a href="${p}handbook/07-security-privacy-legal.html">Legal details</a>.</p>
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
const searchIndex = [];
for (const src of ALL) {
  const out = outRel(src);
  const raw = readFileSync(path.join(DOCS, src), 'utf8');
  const r = md(raw, src, out);
  const title = `${r.title} | ArchSutra AI`;
  const desc = r.summary || `${r.title} - ArchSutra AI documentation.`;
  const crumb = `<p class="crumbs"><a href="${prefix(out)}index.html">ArchSutra AI</a> / ${src.startsWith('guides/') ? 'Start here' : src.startsWith('handbook/') ? 'Handbook' : 'Reference'}</p>`;
  const meta = `<p class="meta">Version ${pkg.version} &middot; Source: <a href="${REPO}/blob/main/docs/${src}" rel="noopener">docs/${src}</a></p>`;
  const body = r.html.replace(/^(<h1[^>]*>.*?<\/h1>)/, `${crumb}$1\n${r.summary ? `<p class="lede">${esc(r.summary)}</p>` : ''}${meta}`);
  const ld = `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'TechArticle', headline: r.title, description: desc, author: { '@type': 'Person', name: 'Vatsal Shah', url: 'https://shahvatsal.com' }, inLanguage: 'en', isPartOf: { '@type': 'WebSite', name: 'ArchSutra AI', url: SITE } })}</script>`;
  const grp = GROUPS.find((g) => g.pages.includes(src));
  const gi = grp ? grp.pages.indexOf(src) : -1;
  const lab = (pg) => (pg === 'handbook/README.md' ? 'Overview' : pg === 'compatibility/smoke-tests/README.md' ? 'Live smoke tests' : readTitle(pg).replace(/^ArchSutra AI\s+/, ''));
  const prevP = grp && gi > 0 ? grp.pages[gi - 1] : null;
  const nextP = grp && gi >= 0 && gi < grp.pages.length - 1 ? grp.pages[gi + 1] : null;
  const pn = '<nav class="pn" aria-label="Previous and next page">' + (prevP ? '<a class="prev" href="' + relTo(out, outRel(prevP)) + '"><small>Previous</small><span>' + esc(lab(prevP)) + '</span></a>' : '<span></span>') + (nextP ? '<a class="next" href="' + relTo(out, outRel(nextP)) + '"><small>Next</small><span>' + esc(lab(nextP)) + '</span></a>' : '') + '</nav><p class="edit"><a href="' + REPO + '/edit/main/docs/' + src + '" rel="noopener">Edit this page on GitHub</a></p>';
  const full = shell({ title, description: desc, out, body, toc: r.headings, current: out, jsonld: ld, pn });
  mkdirSync(path.dirname(path.join(DOCS, out)), { recursive: true });
  writeFileSync(path.join(DOCS, out), full);
  pages.push(out);
  searchIndex.push({ t: r.title, u: out, h: r.headings.map((x) => x.text), s: r.summary || '' });
}
writeFileSync(path.join(DOCS, 'search-index.json'), JSON.stringify(searchIndex));

// ---- Landing page ----
const stats = [
  ['52', 'real repositories evaluated'],
  ['98', 'findings hand-labeled'],
  ['19', 'audit rules'],
  ['12', 'specialist agents'],
  ['0', 'runtime dependencies'],
  ['0', 'API keys required'],
];
const faq = [
  ['What is ArchSutra AI?', 'An open-source software architecture agent: portable Agent Skills plus a deterministic offline CLI that help AI coding assistants audit, design, threat-model and modernize software with file-and-line evidence.'],
  ['Do I need an API key?', 'No. The CLI is offline. Inside a supported AI IDE the skills use that IDE\'s own model, so you need access to the IDE, not an ArchSutra key.'],
  ['Does it send my code anywhere?', 'The CLI sends nothing anywhere and has no telemetry. When you use the skills, your AI IDE\'s model provider processes your prompts and code under its own terms.'],
  ['How accurate is it?', 'On repositories not used for tuning, 69% then 95% of sampled findings were genuine instances of the rule, and about half were worth acting on. Samples are small and one labeler did the labeling; every label is published.'],
  ['Which AI tools does it support?', 'Adapters exist for Claude Code, Cursor, OpenAI Codex, GitHub Copilot and Gemini CLI. All are adapter level: files follow each vendor\'s documented layout, and live smoke tests are still pending.'],
  ['Does it certify compliance or security?', 'No. Reports are review aids. Absence of findings is not proof of absence of vulnerabilities, and nothing here is legal advice or a compliance attestation.'],
];
const scenarios = [
  ['Day one on a legacy monolith', 'A new tech lead gets the real risks in two hours.', '#1-day-one-on-a-legacy-monolith'],
  ['Stop regressions at the door', 'Fail the build only on new problems, with a baseline.', '#2-stop-regressions-at-the-door'],
  ['A startup picks its architecture', 'Options scored with numbers, one ADR, a revisit trigger.', '#3-a-startup-picks-its-architecture'],
  ['The bot that can issue refunds', 'Threat-model an AI agent before it touches money.', '#4-the-support-bot-that-can-issue-refunds'],
  ['The board asks "are we safe?"', 'One honest paragraph from a scorecard that admits what it cannot see.', '#5-the-board-asks-are-we-safe'],
  ['A key leaked into git', 'Rotate first. Find the rest. Add the gate. Nothing printed twice.', '#6-a-key-leaked-into-git'],
  ['Strangler migration in six slices', 'Change a live system without a big-bang rewrite.', '#7-strangler-migration-in-six-slices'],
];
const pair = (name, alt) => `<img class="theme-light" src="assets/charts/${name}.svg" alt="${esc(alt)}" loading="lazy" width="900"><img class="theme-dark" src="assets/charts/${name}-dark.svg" alt="${esc(alt)}" loading="lazy" width="900">`;
const features = [
  ['evidence', 'Evidence, not vibes', 'Every claim is labeled observed, inferred, proposed or unknown. Findings cite file and line, with fix and acceptance test.'],
  ['lock', 'Keyless and private', 'Offline CLI, no telemetry. The skills use the model you already have in your IDE. No ArchSutra account.'],
  ['ci', 'Made for CI', 'Fail on new problems only with a baseline. SARIF for code scanning. <a href="guides/ci-recipes.html">See the recipes</a>.'],
  ['shield', 'Safe to adopt', 'Dry-run installs, hashes, backups and an uninstall that never deletes your edits.'],
  ['scale', 'Honest by design', '"Not assessed" is a rating. Suppressions need a reason and an expiry.'],
  ['code', 'Open and auditable', 'Apache-2.0, zero runtime dependencies, tests, SBOMs and published labels. <a href="handbook/15-supply-chain-and-release.html">Supply chain</a>.'],
];
const hero = `
<section class="hero">
  <div class="wrap hero-grid">
    <div>
      <p class="eyebrow">Open source &middot; Apache-2.0 &middot; v${pkg.version}</p>
      <h1>Know what your architecture is <em>really</em> doing. With proof.</h1>
      <p class="hero-lede">ArchSutra AI turns Claude Code, Cursor, Codex, GitHub Copilot and Gemini CLI into an evidence-first architect. Audit, design, threat-model and modernize, with <code>file:line</code> evidence, severity and confidence. No extra API key.</p>
      <div class="cta">
        <a class="btn primary" href="guides/getting-started.html">Get started in 5 minutes</a>
        <a class="btn" href="guides/real-world-scenarios.html">See real scenarios</a>
      </div>
      <p class="hero-note">Read-only &middot; Offline &middot; No telemetry &middot; Secrets redacted</p>
      <div class="chips" aria-label="Works with"><span class="chip">Claude Code</span><span class="chip">Cursor</span><span class="chip">OpenAI Codex</span><span class="chip">GitHub Copilot</span><span class="chip">Gemini CLI</span></div>
    </div>
    <div class="terminal" role="img" aria-label="Example terminal session running archsutra audit and showing three findings">
      <div class="term-bar"><span></span><span></span><span></span><b>~/shop-api</b></div>
      <pre><code><span class="p">$</span> npx archsutra-ai audit . --output arch-report

<span class="m">Files scanned: 7   Stack: TypeScript, Node.js</span>
<span class="m">Findings: 12  (critical 0, high 3, medium 7, low 2)</span>

<span class="sev high">HIGH  </span> SQL built by string interpolation
        <span class="m">src/services/user.ts:2</span>  <span class="ok">[observed]</span>
<span class="sev high">HIGH  </span> Dynamic code or shell execution
        <span class="m">src/services/user.ts:3</span>  <span class="ok">[observed]</span>
<span class="sev med">MEDIUM</span> Circular dependency (src/api &lt;-&gt; src/db)
        <span class="m">src/api/routes.ts:1</span>   <span class="ok">[observed]</span>

Security <span class="bad">weak</span> &middot; Reliability <span class="m">not assessed</span> &middot; Cost <span class="m">not assessed</span>
<span class="m">Open arch-report/index.html in a browser.</span></code></pre>
    </div>
  </div>
</section>
<section class="stats" aria-label="Facts"><div class="wrap"><ul>${stats.map(([n, l]) => `<li><span class="num">${n}</span><span class="lbl">${l}</span></li>`).join('')}</ul></div></section>

<section class="wrap"><p class="eyebrow-s">How it works</p><h2>The CLI measures. Your IDE's model reasons.</h2>
  <p class="section-lede">Two parts, two jobs. The offline CLI is a measuring tool that always gives the same answer. The skills tell your IDE's own model how to reason from that evidence without guessing.</p>
  <figure class="figure">${pair('pipeline', 'ArchSutra pipeline: repository, CLI, evidence, skills and your IDE model, report')}</figure>
  <div class="steps">
    <article><span class="stepno">1</span><h3>Measure</h3><p>Walks your files read-only, maps modules and imports, applies 19 rules and redacts secrets. Same input, same output.</p></article>
    <article><span class="stepno">2</span><h3>Reason</h3><p>In your IDE, Prime and eleven specialists open each cited line, drop what they cannot reproduce, and judge impact and trade-offs.</p></article>
    <article><span class="stepno">3</span><h3>Deliver</h3><p>One report as HTML for people, Markdown for pull requests, JSON and SARIF for tools, every claim labeled.</p></article>
  </div>
  <p class="muted" style="margin-top:18px"><a href="guides/how-it-works.html">Seven diagrams that explain the rest &rarr;</a></p>
</section>

<section class="band"><div class="wrap">
  <p class="eyebrow-s">Real scenarios</p><h2>Pick your story</h2>
  <p class="section-lede">Real situations with the commands, the output and the decisions. No theory first.</p>
  <div class="cards">${scenarios.map(([t, d, a], i) => `<a class="card link" href="guides/real-world-scenarios.html${a}"><span class="num-b">${i + 1}</span><h3>${t}</h3><p>${d}</p></a>`).join('')}</div>
</div></section>

<section class="wrap"><p class="eyebrow-s">The report</p><h2>A report people actually open</h2>
  <p class="section-lede">This is the real output of <code>archsutra audit</code> on the sample project: severity cards, a filter, collapsible findings and diagrams. Every report also exists as Markdown, JSON and SARIF.</p>
  <div class="cta"><a class="btn primary" href="sample-report/audit-report.html">Open the sample audit</a><a class="btn" href="sample-report/current-state.html">Open the maps</a><a class="btn ghost" href="guides/reading-a-report.html">How to read one</a></div>
  <figure class="figure">${pair('finding-anatomy', 'Anatomy of a finding: ID, severity, evidence, impact, fix, verification')}</figure>
</section>

<section class="band"><div class="wrap">
  <p class="eyebrow-s">Proof, with the caveats</p><h2>Measured on 52 real repositories</h2>
  <p class="section-lede">The first version was only 50% right. We published that, fixed the false positives it exposed, and measured again on repositories we had never tuned on.</p>
  <figure class="figure">${pair('precision-by-batch', 'Precision 50%, 69%, 95% and actionable rate 29%, 34%, 52% by batch')}</figure>
  <p class="honest"><strong>Read the whiskers.</strong> Small samples, one labeler, recall not measured. About half of valid findings need no action. Live behavior inside each AI IDE, an independent security review, trademark clearance and a lawyer's review are not done, and we say so.</p>
  <div class="cta" style="margin-top:20px"><a class="btn" href="guides/evidence-at-a-glance.html">All the charts</a><a class="btn ghost" href="handbook/13-trust-and-assurance.html">The honesty register</a></div>
</div></section>

<section class="wrap"><p class="eyebrow-s">Why teams use it</p><h2>Built for the way you work</h2>
  <div class="cards">${features.map(([ic, t, d]) => `<article class="card"><span class="ico">${icon(ic)}</span><h3>${t}</h3><p>${d}</p></article>`).join('')}</div>
</section>

<section class="band"><div class="wrap"><p class="eyebrow-s">Compatibility</p><h2>Supported AI IDEs</h2>
  <div class="table-wrap" tabindex="0" role="region" aria-label="Supported hosts"><table><thead><tr><th scope="col">Host</th><th scope="col">Level</th><th scope="col">Skills</th><th scope="col">Agents</th></tr></thead><tbody>
  <tr><td>Claude Code</td><td>adapter</td><td><code>.claude/skills/</code></td><td><code>.claude/agents/</code></td></tr>
  <tr><td>Cursor</td><td>adapter</td><td><code>.cursor/skills/</code></td><td><code>.cursor/agents/</code></td></tr>
  <tr><td>OpenAI Codex</td><td>adapter</td><td><code>.agents/skills/</code> + AGENTS.md</td><td>none</td></tr>
  <tr><td>GitHub Copilot</td><td>adapter</td><td><code>.github/skills/</code></td><td><code>.github/agents/*.agent.md</code></td></tr>
  <tr><td>Gemini CLI</td><td>adapter</td><td><code>.gemini/skills/</code></td><td>none</td></tr>
  </tbody></table></div>
  <p class="muted">"adapter" = files written to the vendor-documented layout; not yet smoke-tested in the live host. Install one host per project. <a href="handbook/09-compatibility-and-roadmap.html">Full matrix</a></p>
</div></section>

<section class="wrap"><p class="eyebrow-s">Documentation</p><h2>Find your way</h2>
  <div class="cards">${[
    ['I am new here', 'guides/getting-started.html', 'Five minutes to your first report.'],
    ['I lead a team', 'handbook/01-executive-summary.html', 'Problem, value, risks, decisions.'],
    ['I am an architect', 'handbook/04-architecture.html', 'C4 views, flows, trust boundaries.'],
    ['I write code', 'handbook/03-technical-specification.html', 'Modules, algorithms, limits.'],
    ['I review security', 'handbook/07-security-privacy-legal.html', 'Model, privacy, license, disclaimers.'],
    ['I want a quick reference', 'guides/cheat-sheet.html', 'Commands, flags, exit codes, files.'],
    ['I want to add CI', 'guides/ci-recipes.html', 'GitHub, GitLab, pre-commit, baselines.'],
    ['I want to contribute', 'handbook/10-contributor-guide.html', 'Rules, agents, adapters, release.'],
  ].map(([t, h, d]) => `<a class="card link" href="${h}"><h3>${t}</h3><p>${d}</p></a>`).join('')}</div>
</section>

<section class="band"><div class="wrap faq"><p class="eyebrow-s">FAQ</p><h2>Frequently asked questions</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
  <p class="muted"><a href="handbook/11-glossary-and-faq.html">More questions and a glossary</a></p>
</div></section>

<section class="wrap cta-band"><h2>See what your architecture is really doing</h2>
  <p class="section-lede">One command, no account, no key. Five minutes to a report you can open in a browser.</p>
  <div class="cta"><a class="btn primary" href="guides/getting-started.html">Get started in 5 minutes</a><a class="btn" href="${REPO}" rel="noopener">Star on GitHub</a></div>
  <div class="code" style="max-width:520px;margin:18px auto 0;text-align:left"><button class="copy" type="button" aria-label="Copy command">Copy</button><pre><code>npx archsutra-ai audit .</code></pre></div>
</section>`;

const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
const swLd = { '@context': 'https://schema.org', '@type': 'SoftwareSourceCode', name: 'ArchSutra AI', description: 'Open-source software architecture audit, design and threat-modeling agent skills and offline CLI for Claude Code, Cursor, Codex, GitHub Copilot and Gemini CLI.', codeRepository: REPO, programmingLanguage: 'TypeScript', runtimePlatform: 'Node.js', license: 'https://www.apache.org/licenses/LICENSE-2.0', version: pkg.version, author: { '@type': 'Person', name: 'Vatsal Shah', url: 'https://shahvatsal.com' }, url: SITE };
writeFileSync(path.join(DOCS, 'index.html'), shell({
  title: 'ArchSutra AI - Software Architecture Audit Agent for Claude Code, Cursor, Codex, Copilot & Gemini CLI',
  description: 'Open-source software architecture agent: audit, design, threat-model and modernize with file-and-line evidence. Agent Skills plus an offline CLI. No extra API key. Apache-2.0.',
  out: 'index.html', body: hero, landing: true, current: 'index.html',
  jsonld: `<script type="application/ld+json">${JSON.stringify(swLd)}</script>\n<script type="application/ld+json">${JSON.stringify(faqLd)}</script>`,
}));
pages.unshift('index.html');

// ---- real sample report served from the site ----
import { cpSync } from 'node:fs';
cpSync(path.join(ROOT, 'examples', 'brownfield-monolith', 'sample-output'), path.join(DOCS, 'sample-report'), { recursive: true });
pages.push('sample-report/index.html', 'sample-report/audit-report.html', 'sample-report/current-state.html');

// ---- sitemap, robots, assets ----
const today = new Date().toISOString().slice(0, 10);
writeFileSync(path.join(DOCS, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${SITE}/${p === 'index.html' ? '' : p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(path.join(DOCS, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
writeFileSync(path.join(DOCS, '.nojekyll'), '');
mkdirSync(path.join(DOCS, 'assets'), { recursive: true });
console.log(`Built ${pages.length} pages into docs/`);
