/** Longest known module path that is a suffix of an import. Stdlib names only match when a repo module is actually named that. */
export function moduleForImport(spec: string, moduleNames: Set<string>): string | undefined {
  const norm = spec.replace(/::/g, '/').replace(/\./g, '/').replace(/^\/+|\/+$/g, '');
  const parts = norm.split('/').filter((p) => p && p !== 'crate' && p !== 'super' && p !== 'self');
  let best: string | undefined;
  for (let i = 0; i < parts.length; i++) {
    const suffix = parts.slice(i).join('/');
    for (const cand of [suffix, `src/${suffix}`]) {
      if (moduleNames.has(cand) && (best === undefined || cand.length > best.length)) best = cand;
    }
  }
  return best;
}

const GO_IMPORT = /"([^"]+)"/g;
const DOT_IMPORT = /^\s*import\s+(?:static\s+)?([A-Za-z_][\w.]*)/;
const CS_USING = /^\s*using\s+(?:static\s+)?([A-Za-z_][\w.]*)\s*;/;
const RUST_USE = /^\s*(?:pub\s+)?use\s+([A-Za-z_][\w:]*)/;
const RUST_MOD = /^\s*(?:pub\s+)?mod\s+([A-Za-z_][\w]*)\s*;/;

export function importSpecs(ext: string, line: string, fromRel: string): string[] {
  if (ext === '.go') return [...line.matchAll(GO_IMPORT)].map((m) => m[1]).filter((s) => s.includes('/'));
  if (ext === '.java' || ext === '.kt') {
    const m = DOT_IMPORT.exec(line);
    return m ? [m[1]] : [];
  }
  if (ext === '.cs') {
    const m = CS_USING.exec(line);
    return m ? [m[1]] : [];
  }
  if (ext === '.rs') {
    const use = RUST_USE.exec(line);
    if (use) return [use[1]];
    const mod = RUST_MOD.exec(line);
    if (!mod) return [];
    const dir = fromRel.split('/').slice(0, -1).join('/');
    return [dir ? `${dir}/${mod[1]}` : mod[1]];
  }
  return [];
}
