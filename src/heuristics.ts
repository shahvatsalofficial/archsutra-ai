// Heuristics that keep rules from firing on code a maintainer would not act on:
// comments and docstrings, vendored or minified files, generated data tables, dummy credential values.

export const TEST_PATH = /(^|\/)(tests?|__tests__|spec|e2e|fixtures?)(\/|$)|(^|\/)(test|tests|spec)\.[a-z]+$|\.(test|spec)\.[a-z]+$|_test\.(go|py)$/i;

/** Developer-tooling Dockerfiles are not deployed workloads. */
export const DEV_TOOLING_PATH = /(^|\/)(\.devcontainer|\.github|\.gitpod)(\/|$)/;

const VENDOR_SEGMENT = /(^|\/)(vendor|vendors|third[_-]?party|bower_components|extern|external|plugins|wwwroot\/lib)(\/|$)|(^|\/)(static|public|assets)\/(js|javascripts|scripts)(\/|$)|(^|\/)(js|javascripts)\/(lib|libs|vendor)(\/|$)/i;

export function isVendoredPath(rel: string): boolean {
  return VENDOR_SEGMENT.test(rel) || /\.min\.[a-z]+$|-min\.js$|\.bundle\.js$/i.test(rel);
}

/** Minified files have very long lines. */
export function isMinified(lines: string[]): boolean {
  if (lines.length === 0) return false;
  let long = 0;
  for (const l of lines) if (l.length > 800) long++;
  return long >= 2 || (lines.length < 40 && lines.some((l) => l.length > 1500));
}

const HEADER_VENDOR = /(copyright|\(c\)|@license|licen[sc]e|released under|version\s*[:v]?\s*\d+\.\d+)/i;
/** A third-party library usually announces itself in its first lines. Only trusted together with a big file. */
export function looksThirdParty(lines: string[]): boolean {
  if (lines.length < 400) return false;
  const head = lines.slice(0, 25).join('\n');
  return HEADER_VENDOR.test(head) && /\b(v?\d+\.\d+\.\d+|MIT|Apache|BSD|GPL|jQuery|Bootstrap)\b/i.test(head);
}

/** Large files that are mostly literals (ABIs, fixtures, lookup tables) rather than logic. */
export function isDataLike(lines: string[]): boolean {
  if (lines.length < 200) return false;
  let logic = 0;
  for (const l of lines) if (/\b(function\s*\w*\s*\(|return\b|if\s*\(|for\s*\(|while\s*\(|class\s+\w+|def\s+\w+|=>)/.test(l)) logic++;
  return logic / lines.length < 0.03;
}

const HASH_COMMENT_EXT = new Set(['.py', '.rb', '.sh', '.yml', '.yaml', '.toml', '.tf', '.hcl', '.pl', '.r']);

/**
 * For each line, true when the line is inside a comment or docstring. Conservative: only whole-line
 * comments and block comments or triple-quoted strings are masked, never trailing comments.
 */
export function commentMask(lines: string[], ext: string): boolean[] {
  const mask = new Array<boolean>(lines.length).fill(false);
  const hash = HASH_COMMENT_EXT.has(ext);
  const py = ext === '.py';
  let block = false;
  let triple: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (triple) {
      mask[i] = true;
      if (t.includes(triple)) triple = null;
      continue;
    }
    if (block) {
      mask[i] = true;
      if (t.includes('*/')) block = false;
      continue;
    }
    if (py) {
      const m = /^[rRbBuUfF]*("""|''')/.exec(t);
      if (m) {
        mask[i] = true;
        if (!t.slice(m[0].length).includes(m[1])) triple = m[1];
        continue;
      }
    }
    if (t.startsWith('/*')) {
      mask[i] = true;
      if (!t.includes('*/')) block = true;
    } else if (t.startsWith('//') || t.startsWith('* ') || t === '*' || t.startsWith('<!--') || (hash && t.startsWith('#')) || t.startsWith('--')) {
      mask[i] = true;
    }
  }
  return mask;
}

const DUMMY_VALUE = /^(password|passw0rd|passwd|secret|changeme|change[_-]?me|example|dummy|sample|test|testing|username|user|token|apikey|api[_-]?key|default|none|null|undefined|your[_-].*|my[_-]?secret.*)\d{0,4}$/i;

/** Decide whether the value assigned to a credential-like name is plausibly a real secret. */
export function plausibleSecretValue(value: string): boolean {
  if (value.length < 8) return false;
  if (/[$%{}<>\\[\]]/.test(value)) return false; // interpolation, templating, escapes, our own [REDACTED] marker
  if (DUMMY_VALUE.test(value)) return false;
  if (/^[a-z]+(\.[a-z]+)+$/i.test(value)) return false; // dotted identifiers such as keyword.operator.class
  let classes = 0;
  if (/[a-z]/.test(value)) classes++;
  if (/[A-Z]/.test(value)) classes++;
  if (/[0-9]/.test(value)) classes++;
  if (/[^A-Za-z0-9._-]/.test(value)) classes++;
  return classes >= 2 || value.length >= 12;
}
