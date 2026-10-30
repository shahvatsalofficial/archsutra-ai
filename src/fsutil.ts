import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Corpus, SourceFile } from './types.js';

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'target', 'vendor', '.venv', 'venv', '__pycache__',
  '.next', '.nuxt', 'coverage', '.gradle', '.idea', '.vscode', 'bin', 'obj', '.terraform', '.archsutra',
  'graphify-out',
]);

const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.gz', '.tgz', '.tar', '.7z', '.jar',
  '.class', '.exe', '.dll', '.so', '.dylib', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.mov',
  '.bin', '.lock', '.map', '.wasm', '.pyc',
]);

export interface WalkOptions {
  maxFiles?: number;
  maxFileBytes?: number;
  timeBudgetMs?: number;
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

/** Resolve a path and make sure it stays inside root (defends against traversal). */
export function safeJoin(root: string, rel: string): string {
  const abs = path.resolve(root, rel);
  const r = path.resolve(root);
  if (abs !== r && !abs.startsWith(r + path.sep)) throw new Error(`Path escapes root: ${rel}`);
  return abs;
}

/**
 * Bounded, symlink-safe repository walk. Never follows symlinks, never reads file contents.
 */
export async function walk(root: string, opts: WalkOptions = {}): Promise<Corpus> {
  const limits = {
    maxFiles: opts.maxFiles ?? 5000,
    maxFileBytes: opts.maxFileBytes ?? 512 * 1024,
    timeBudgetMs: opts.timeBudgetMs ?? 15000,
  };
  const start = Date.now();
  const files: SourceFile[] = [];
  const skipped = { ignoredDirs: 0, tooLarge: 0, binary: 0, symlinks: 0, overBudget: 0 };
  let truncated = false;
  const absRoot = path.resolve(root);

  async function visit(dir: string): Promise<void> {
    if (truncated) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      if (Date.now() - start > limits.timeBudgetMs || files.length >= limits.maxFiles) {
        truncated = true;
        skipped.overBudget++;
        return;
      }
      const abs = path.join(dir, e.name);
      if (e.isSymbolicLink()) {
        skipped.symlinks++;
        continue;
      }
      if (e.isDirectory()) {
        if (IGNORED_DIRS.has(e.name)) {
          skipped.ignoredDirs++;
          continue;
        }
        await visit(abs);
        continue;
      }
      if (!e.isFile()) continue;
      const ext = path.extname(e.name).toLowerCase();
      if (BINARY_EXT.has(ext)) {
        skipped.binary++;
        continue;
      }
      let size = 0;
      try {
        size = (await fs.stat(abs)).size;
      } catch {
        continue;
      }
      if (size > limits.maxFileBytes) {
        skipped.tooLarge++;
        continue;
      }
      files.push({ rel: toPosix(path.relative(absRoot, abs)), abs, size, ext });
    }
  }

  await visit(absRoot);
  return { root: absRoot, files, skipped, limits, truncated };
}

const textCache = new Map<string, string[] | null>();

/** Read a file as lines. Returns null for binary content (NUL byte) or read errors. */
export async function readLines(file: SourceFile): Promise<string[] | null> {
  if (textCache.has(file.abs)) return textCache.get(file.abs)!;
  let out: string[] | null = null;
  try {
    const buf = await fs.readFile(file.abs);
    out = buf.includes(0) ? null : buf.toString('utf8').split(/\r?\n/);
  } catch {
    out = null;
  }
  textCache.set(file.abs, out);
  return out;
}

export function clearTextCache(): void {
  textCache.clear();
}

export async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
