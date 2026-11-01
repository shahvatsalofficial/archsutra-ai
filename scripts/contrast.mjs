// WCAG 2.x contrast ratios for the documentation site's design tokens (see docs/assets/site.css).
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const themes = {
  light: { bg: '#fbfbfd', surface: '#ffffff', surface2: '#f2f3f8', text: '#15181e', muted: '#565e6e', accent: '#4338ca', accentInk: '#ffffff', accentSoft: '#eceafd', line: '#e1e4ec', codeBg: '#f3f4f9' },
  dark: { bg: '#0c0f14', surface: '#131820', surface2: '#1a202a', text: '#e8ebf2', muted: '#a2abbb', accent: '#a5a8ff', accentInk: '#0c0f14', accentSoft: '#1f2340', line: '#262e3b', codeBg: '#10151d' },
};
const pairs = [['text on bg', 'text', 'bg', 4.5], ['text on surface', 'text', 'surface', 4.5], ['muted on bg', 'muted', 'bg', 4.5], ['muted on surface', 'muted', 'surface', 4.5], ['muted on surface-2', 'muted', 'surface2', 4.5], ['accent link on bg', 'accent', 'bg', 4.5], ['accent link on surface', 'accent', 'surface', 4.5], ['accent on accent-soft (nav current)', 'accent', 'accentSoft', 4.5], ['primary button text on accent', 'accentInk', 'accent', 4.5], ['text on code background', 'text', 'codeBg', 4.5], ['focus ring (accent) on bg, non-text', 'accent', 'bg', 3]];
const rows = [];
for (const [t, c] of Object.entries(themes)) for (const [name, f, b, min] of pairs) { const r = ratio(c[f], c[b]); rows.push({ theme: t, pair: name, ratio: Math.round(r * 100) / 100, required: min, pass: r >= min }); }
console.log(JSON.stringify(rows, null, 2));
if (rows.some((r) => !r.pass)) process.exitCode = 1;
