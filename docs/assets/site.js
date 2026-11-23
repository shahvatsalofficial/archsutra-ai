// ArchSutra AI docs: theme toggle, mobile nav, copy buttons, active TOC, Mermaid rendering.
const MERMAID_SRC = 'https://cdn.jsdelivr.net/npm/mermaid@12.3.0/dist/mermaid.esm.min.mjs';
const root = document.documentElement;

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};

// Light is the default. Dark applies only when the reader chooses it (stored in this browser).
function currentTheme() {
  return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

document.querySelector('.theme-btn')?.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  if (next === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
  store.set('as-theme', next);
  renderDiagrams();
});

// Mobile drawer: menu button opens it, scrim, close button, Escape and any link close it.
const drawer = document.getElementById('drawer');
const menu = document.querySelector('.menu-btn');
const setDrawer = (open) => {
  drawer?.classList.toggle('open', open);
  drawer?.setAttribute('aria-hidden', String(!open));
  menu?.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) drawer?.querySelector('[data-close]')?.nextElementSibling?.querySelector('button, a')?.focus();
};
menu?.addEventListener('click', () => setDrawer(true));
drawer?.addEventListener('click', (e) => {
  const t = e.target;
  if (t instanceof Element && (t.closest('[data-close]') || t.closest('a'))) setDrawer(false);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer?.classList.contains('open')) { setDrawer(false); menu?.focus(); } });
matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setDrawer(false); });

document.querySelectorAll('.copy').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const code = btn.parentElement?.querySelector('code')?.textContent ?? '';
    try {
      await navigator.clipboard.writeText(code);
      btn.textContent = 'Copied';
    } catch {
      btn.textContent = 'Press Ctrl+C';
    }
    setTimeout(() => { btn.textContent = 'Copy'; }, 1600);
  });
});

const links = [...document.querySelectorAll('.rail a')];
if (links.length && 'IntersectionObserver' in window) {
  const map = new Map(links.map((a) => [a.getAttribute('href')?.slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        links.forEach((l) => l.classList.remove('active'));
        map.get(e.target.id)?.classList.add('active');
      }
    }
  }, { rootMargin: '-80px 0px -70% 0px' });
  map.forEach((_a, id) => { const el = id ? document.getElementById(id) : null; if (el) io.observe(el); });
}

const sources = new Map();
let mermaidApi = null;
async function renderDiagrams() {
  const nodes = [...document.querySelectorAll('pre.mermaid')];
  if (!nodes.length) return;
  nodes.forEach((n) => {
    if (!sources.has(n)) sources.set(n, n.textContent ?? '');
    n.removeAttribute('data-processed');
    n.textContent = sources.get(n) ?? '';
  });
  try {
    mermaidApi ??= (await import(MERMAID_SRC)).default;
    const dark = currentTheme() === 'dark';
    mermaidApi.initialize({
      startOnLoad: false, securityLevel: 'strict', theme: 'base', fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      themeVariables: dark
        ? { background: '#131820', primaryColor: '#1f2340', primaryTextColor: '#e8ebf2', primaryBorderColor: '#a5a8ff', lineColor: '#a2abbb', secondaryColor: '#1a202a', tertiaryColor: '#131820', edgeLabelBackground: '#131820', textColor: '#e8ebf2', noteBkgColor: '#1a202a', noteTextColor: '#e8ebf2' }
        : { background: '#ffffff', primaryColor: '#eceafd', primaryTextColor: '#15181e', primaryBorderColor: '#4338ca', lineColor: '#565e6e', secondaryColor: '#f2f3f8', tertiaryColor: '#ffffff', edgeLabelBackground: '#ffffff', textColor: '#15181e', noteBkgColor: '#f2f3f8', noteTextColor: '#15181e' },
    });
    await mermaidApi.run({ nodes });
  } catch {
    /* offline or blocked: the diagram source stays visible as text */
  }
}
renderDiagrams();

// ---- search: tiny client-side index (docs/search-index.json) ----
const input = document.getElementById('q');
const list = document.getElementById('results');
if (input && list) {
  const base = document.body.dataset.root ?? '';
  let docs = null;
  const load = async () => {
    if (docs) return docs;
    try { docs = await (await fetch(`${base}search-index.json`)).json(); } catch { docs = []; }
    return docs;
  };
  const score = (d, terms) => {
    const t = d.t.toLowerCase(), h = d.h.join(' ').toLowerCase(), s = d.s.toLowerCase();
    let n = 0;
    for (const w of terms) {
      if (!(t.includes(w) || h.includes(w) || s.includes(w))) return 0;
      if (t.includes(w)) n += 6;
      if (h.includes(w)) n += 3;
      if (s.includes(w)) n += 2;
    }
    return n;
  };
  const render = (items) => {
    list.replaceChildren();
    if (!items.length) {
      const li = document.createElement('li');
      li.className = 'none';
      li.textContent = 'No matches. Try a rule ID, a command or a topic.';
      list.append(li);
    }
    for (const d of items) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `${base}${d.u}`;
      const rt = document.createElement('span');
      rt.className = 'rt';
      rt.textContent = d.t;
      const rs = document.createElement('span');
      rs.className = 'rs';
      rs.textContent = d.s.length > 110 ? `${d.s.slice(0, 107)}...` : d.s;
      a.append(rt, rs);
      li.append(a);
      list.append(li);
    }
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); };
  input.addEventListener('input', async () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) return close();
    const terms = q.split(/\s+/);
    const all = await load();
    render(all.map((d) => [score(d, terms), d]).filter(([n]) => n > 0).sort((a, b) => b[0] - a[0]).slice(0, 8).map(([, d]) => d));
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); input.blur(); }
    if (e.key === 'Enter') list.querySelector('a')?.click();
    if (e.key === 'ArrowDown') { e.preventDefault(); list.querySelector('a')?.focus(); }
  });
  list.addEventListener('keydown', (e) => {
    const links = [...list.querySelectorAll('a')];
    const i = links.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' && links[i + 1]) { e.preventDefault(); links[i + 1].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (links[i - 1] ?? input).focus(); }
    if (e.key === 'Escape') { close(); input.focus(); }
  });
  document.addEventListener('click', (e) => { if (!e.target.closest?.('.search')) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) { e.preventDefault(); input.focus(); }
  });
}
