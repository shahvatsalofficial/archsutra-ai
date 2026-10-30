import path from 'node:path';
import { promises as fs } from 'node:fs';
import { readLines, walk } from './fsutil.js';
import { excerpt } from './redact.js';
import type { ArchMap, Corpus, ModuleNode, SourceFile } from './types.js';

const ECOSYSTEM_BY_EXT: Record<string, string> = {
  '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript', '.jsx': 'JavaScript', '.mjs': 'JavaScript',
  '.cjs': 'JavaScript', '.py': 'Python', '.java': 'Java', '.kt': 'Kotlin', '.cs': 'C#/.NET', '.go': 'Go',
  '.rs': 'Rust', '.php': 'PHP', '.rb': 'Ruby', '.swift': 'Swift', '.dart': 'Dart/Flutter',
};

const MANIFESTS: Record<string, string> = {
  'package.json': 'Node.js', 'pyproject.toml': 'Python', 'requirements.txt': 'Python', 'pom.xml': 'Java (Maven)',
  'build.gradle': 'JVM (Gradle)', 'build.gradle.kts': 'JVM (Gradle)', 'go.mod': 'Go', 'Cargo.toml': 'Rust',
  'composer.json': 'PHP', 'Gemfile': 'Ruby', 'Package.swift': 'Swift', 'pubspec.yaml': 'Dart/Flutter',
};

const FRAMEWORK_DEPS: Record<string, string> = {
  express: 'Express', fastify: 'Fastify', koa: 'Koa', '@nestjs/core': 'NestJS', next: 'Next.js', react: 'React',
  vue: 'Vue', '@angular/core': 'Angular', svelte: 'Svelte', django: 'Django', flask: 'Flask', fastapi: 'FastAPI',
  'spring-boot': 'Spring Boot', rails: 'Rails', laravel: 'Laravel', gin: 'Gin',
};

const DATASTORE_HINTS: Record<string, string> = {
  pg: 'PostgreSQL', postgres: 'PostgreSQL', psycopg2: 'PostgreSQL', mysql: 'MySQL', mysql2: 'MySQL',
  mongoose: 'MongoDB', mongodb: 'MongoDB', pymongo: 'MongoDB', redis: 'Redis', ioredis: 'Redis',
  sqlite3: 'SQLite', 'better-sqlite3': 'SQLite', prisma: 'Prisma ORM', '@prisma/client': 'Prisma ORM',
  typeorm: 'TypeORM', sequelize: 'Sequelize', sqlalchemy: 'SQLAlchemy', kafkajs: 'Kafka', amqplib: 'RabbitMQ',
  '@aws-sdk/client-s3': 'S3', '@aws-sdk/client-dynamodb': 'DynamoDB', elasticsearch: 'Elasticsearch',
  chromadb: 'Chroma (vector)', pinecone: 'Pinecone (vector)', '@pinecone-database/pinecone': 'Pinecone (vector)',
};

const GROUP_DIRS = new Set(['packages', 'apps', 'services', 'libs', 'modules', 'internal', 'cmd']);

export function moduleOf(rel: string): string {
  const parts = rel.split('/');
  if (parts.length === 1) return '(root)';
  if (GROUP_DIRS.has(parts[0]) && parts.length > 2) return `${parts[0]}/${parts[1]}`;
  if (parts[0] === 'src' && parts.length > 2) return `src/${parts[1]}`;
  return parts[0];
}

const JS_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const IMPORT_RE = /(?:\bfrom\s+|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)(['"])(\.{1,2}\/[^'"]*|\.{1,2})\1/;
const PY_IMPORT_RE = /^\s*(?:from\s+([A-Za-z_][\w.]*)\s+import|import\s+([A-Za-z_][\w.]*))/;

/** Resolve a relative import specifier to a repo-relative posix path (file existence not required). */
export function resolveRelative(fromRel: string, spec: string): string {
  const dir = path.posix.dirname(fromRel);
  return path.posix.normalize(path.posix.join(dir, spec));
}

export async function readJson(abs: string): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(await fs.readFile(abs, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function findCycles(nodes: string[], adj: Map<string, Set<string>>): string[][] {
  let index = 0;
  const idx = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const out: string[][] = [];
  const strong = (v: string): void => {
    idx.set(v, index);
    low.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);
    for (const w of adj.get(v) ?? []) {
      if (!idx.has(w)) {
        strong(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, idx.get(w)!));
      }
    }
    if (low.get(v) === idx.get(v)) {
      const comp: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        comp.push(w);
      } while (w !== v);
      if (comp.length > 1) out.push(comp.sort());
    }
  };
  for (const n of nodes) if (!idx.has(n)) strong(n);
  return out;
}

export async function buildMap(root: string, corpus?: Corpus): Promise<ArchMap> {
  const c = corpus ?? (await walk(root));
  const ecoCount = new Map<string, number>();
  const modules = new Map<string, ModuleNode>();
  const ecosystems = new Set<string>();
  const frameworks = new Set<string>();
  const datastores = new Set<string>();
  const infra = new Set<string>();
  const entrypoints: string[] = [];
  const edgeMap = new Map<string, { from: string; to: string; count: number; example: ArchMap['edges'][number]['example'] }>();
  const blind = new Set<string>();
  const moduleNames = new Set(c.files.map((f) => moduleOf(f.rel)));

  for (const f of c.files) {
    const base = path.posix.basename(f.rel);
    if (MANIFESTS[base]) ecosystems.add(MANIFESTS[base]);
    if (base === 'Dockerfile' || base.startsWith('Dockerfile.')) infra.add('Docker');
    if (base.startsWith('docker-compose') || base === 'compose.yaml') infra.add('Docker Compose');
    if (f.ext === '.tf') infra.add('Terraform');
    if (/\.github\/workflows\//.test(f.rel)) infra.add('GitHub Actions');
    if (/^(k8s|kubernetes|deploy|helm|charts)\//i.test(f.rel) && /\.(ya?ml)$/.test(f.ext)) infra.add('Kubernetes/Helm manifests');
    if (/^(index|main|server|app|cli)\.(ts|js|mjs|py)$/.test(base) && f.rel.split('/').length <= 3) entrypoints.push(f.rel);
    if (/(^|\/)(main|__main__)\.(go|py|rs|java|kt)$/.test(f.rel)) entrypoints.push(f.rel);

    const eco = ECOSYSTEM_BY_EXT[f.ext];
    if (!eco) continue;
    ecosystems.add(eco);
    ecoCount.set(eco, (ecoCount.get(eco) ?? 0) + 1);
  }

  // Dependency manifests (package.json, requirements.txt)
  for (const f of c.files) {
    const base = path.posix.basename(f.rel);
    if (base === 'package.json') {
      const pkg = await readJson(f.abs);
      if (!pkg) continue;
      const deps = { ...(pkg.dependencies as object | undefined), ...(pkg.devDependencies as object | undefined) } as Record<string, string>;
      for (const d of Object.keys(deps)) {
        if (FRAMEWORK_DEPS[d]) frameworks.add(FRAMEWORK_DEPS[d]);
        if (DATASTORE_HINTS[d]) datastores.add(DATASTORE_HINTS[d]);
      }
      if (typeof pkg.main === 'string' && f.rel === 'package.json') entrypoints.push(pkg.main);
    } else if (base === 'requirements.txt' || base === 'pyproject.toml') {
      const lines = (await readLines(f)) ?? [];
      for (const l of lines) {
        const name = l.trim().toLowerCase().split(/[=<>~\[\s;]/)[0].replace(/^"|"$/g, '');
        if (FRAMEWORK_DEPS[name]) frameworks.add(FRAMEWORK_DEPS[name]);
        if (DATASTORE_HINTS[name]) datastores.add(DATASTORE_HINTS[name]);
      }
    }
  }

  for (const f of c.files) {
    const eco = ECOSYSTEM_BY_EXT[f.ext];
    if (!eco) continue;
    const mod = moduleOf(f.rel);
    const lines = await readLines(f);
    if (!lines) continue;
    const m = modules.get(mod) ?? { name: mod, files: 0, lines: 0, ecosystems: [] };
    m.files++;
    m.lines += lines.length;
    if (!m.ecosystems.includes(eco)) m.ecosystems.push(eco);
    modules.set(mod, m);

    const addEdge = (to: string, lineNo: number, text: string): void => {
      if (to === mod || !moduleNames.has(to)) return;
      const key = `${mod}->${to}`;
      const cur = edgeMap.get(key);
      if (cur) cur.count++;
      else
        edgeMap.set(key, {
          from: mod, to, count: 1,
          example: { path: f.rel, startLine: lineNo, endLine: lineNo, kind: 'observed', excerpt: excerpt(text) },
        });
    };

    if (JS_EXT.has(f.ext)) {
      lines.forEach((text, i) => {
        const mt = IMPORT_RE.exec(text);
        if (mt) addEdge(moduleOf(resolveRelative(f.rel, mt[2])), i + 1, text);
      });
    } else if (f.ext === '.py') {
      lines.forEach((text, i) => {
        const mt = PY_IMPORT_RE.exec(text);
        if (!mt) return;
        const first = (mt[1] ?? mt[2]).split('.')[0];
        for (const cand of [first, `src/${first}`]) if (moduleNames.has(cand)) addEdge(cand, i + 1, text);
      });
    } else {
      blind.add(`Import graph not implemented for ${eco}; module dependencies are not computed for those files.`);
    }
  }

  const adj = new Map<string, Set<string>>();
  for (const e of edgeMap.values()) {
    if (!adj.has(e.from)) adj.set(e.from, new Set());
    adj.get(e.from)!.add(e.to);
  }
  const cycles = findCycles([...modules.keys()], adj);

  if (c.truncated) blind.add('Scan hit the file-count or time budget; results are partial.');
  if (c.skipped.tooLarge) blind.add(`${c.skipped.tooLarge} file(s) over the size limit were not read.`);
  if (c.skipped.symlinks) blind.add(`${c.skipped.symlinks} symlink(s) were not followed.`);
  blind.add('Runtime behaviour, deployed topology, and data volumes are not observable from source alone.');
  blind.add('Dependency edges are module-level and based on relative imports; dynamic imports and DI wiring may be missed.');

  const sortedEco = [...ecosystems].sort((a, b) => (ecoCount.get(b) ?? 0) - (ecoCount.get(a) ?? 0));
  return {
    root: c.root,
    generatedBy: 'archsutra map (deterministic, no AI inference)',
    ecosystems: sortedEco,
    frameworks: [...frameworks].sort(),
    datastores: [...datastores].sort(),
    infra: [...infra].sort(),
    entrypoints: [...new Set(entrypoints)].sort(),
    modules: [...modules.values()].sort((a, b) => b.lines - a.lines),
    edges: [...edgeMap.values()].sort((a, b) => b.count - a.count),
    cycles,
    blindSpots: [...blind],
    coverage: { filesScanned: c.files.length, skipped: c.skipped, truncated: c.truncated },
  };
}

export type { SourceFile };
