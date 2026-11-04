// ArchSutra AI docs: theme toggle, mobile nav, copy buttons, active TOC, Mermaid rendering.
const MERMAID_SRC = 'https://cdn.jsdelivr.net/npm/mermaid@12.3.0/dist/mermaid.esm.min.mjs';
const root = document.documentElement;

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};

function currentTheme() {
  return root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

document.querySelector('.theme-btn')?.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  store.set('as-theme', next);
  renderDiagrams();
});

const menu = document.querySelector('.menu-btn');
const sidebar = document.getElementById('sidebar');
menu?.addEventListener('click', () => {
  const open = sidebar?.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(Boolean(open)));
});

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
