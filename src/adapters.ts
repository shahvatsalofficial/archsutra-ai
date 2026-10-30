import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exists, safeJoin } from './fsutil.js';
import { parseFrontmatter } from './verify.js';

export type Support = 'adapter' | 'manual' | 'experimental' | 'unsupported';

export interface HostSpec {
  id: string;
  label: string;
  support: Support;
  skillsDir: string;
  agentsDir?: string;
  agentSuffix?: string;
  agentsMdBlock?: boolean;
  notes: string;
  docs: string;
}

/**
 * Locations follow each vendor's published layout at build time. None of these have been
 * smoke-tested inside the live host by this project yet, so support is "adapter", not "native-verified".
 */
export const HOSTS: HostSpec[] = [
  { id: 'claude', label: 'Claude Code', support: 'adapter', skillsDir: '.claude/skills', agentsDir: '.claude/agents', agentSuffix: '.md',
    notes: 'Skills and subagents. Subagent files get a read-only tools list.', docs: 'https://code.claude.com/docs/' },
  { id: 'cursor', label: 'Cursor', support: 'adapter', skillsDir: '.cursor/skills',
    notes: 'Agent Skills only. No custom subagent files are written.', docs: 'https://cursor.com/docs/skills' },
  { id: 'codex', label: 'OpenAI Codex', support: 'adapter', skillsDir: '.agents/skills', agentsMdBlock: true,
    notes: 'Agent Skills plus a managed block in AGENTS.md.', docs: 'https://developers.openai.com/codex/' },
  { id: 'copilot', label: 'GitHub Copilot', support: 'adapter', skillsDir: '.github/skills', agentsDir: '.github/agents', agentSuffix: '.agent.md',
    notes: 'Skills plus custom agents (.agent.md); only description and tools are written.', docs: 'https://docs.github.com/en/copilot/concepts/customizations/custom-agents' },
  { id: 'gemini', label: 'Gemini CLI', support: 'experimental', skillsDir: '.gemini/skills',
    notes: 'Skill layout unconfirmed against the current Gemini CLI release. Use `export --host manual` as fallback.', docs: 'https://github.com/google-gemini/gemini-cli' },
];

export const MANIFEST_PATH = '.archsutra/install-manifest.json';
const BLOCK_START = '<!-- archsutra:begin -->';
const BLOCK_END = '<!-- archsutra:end -->';

export function packageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

const sha = (s: string | Buffer): string => createHash('sha256').update(s).digest('hex');

export interface PlannedFile {
  rel: string;
  content: string;
  action: 'create' | 'update' | 'unchanged' | 'conflict';
  reason?: string;
}

export interface InstallPlan {
  host: string;
  target: string;
  files: PlannedFile[];
  agentsMd?: { rel: string; action: 'create' | 'update' | 'unchanged'; content: string };
}

interface Manifest {
  version: 1;
  installs: Record<string, { files: Record<string, string>; agentsMd?: boolean; at: string }>;
}

async function readManifest(target: string): Promise<Manifest> {
  try {
    return JSON.parse(await fs.readFile(path.join(target, MANIFEST_PATH), 'utf8')) as Manifest;
  } catch {
    return { version: 1, installs: {} };
  }
}

async function listDir(dir: string, pred: (n: string) => boolean = () => true): Promise<string[]> {
  try {
    return (await fs.readdir(dir)).filter(pred).sort();
  } catch {
    return [];
  }
}

export async function loadCanonical(pkg = packageRoot()): Promise<{ skills: { name: string; files: { rel: string; content: string }[] }[]; agents: { name: string; content: string }[] }> {
  const skills = [];
  for (const name of await listDir(path.join(pkg, 'skills'))) {
    const base = path.join(pkg, 'skills', name);
    if (!(await fs.stat(base)).isDirectory()) continue;
    const files: { rel: string; content: string }[] = [];
    const walkDir = async (dir: string): Promise<void> => {
      for (const e of await fs.readdir(dir, { withFileTypes: true })) {
        const abs = path.join(dir, e.name);
        if (e.isSymbolicLink()) continue;
        if (e.isDirectory()) await walkDir(abs);
        else files.push({ rel: path.relative(base, abs).split(path.sep).join('/'), content: await fs.readFile(abs, 'utf8') });
      }
    };
    await walkDir(base);
    skills.push({ name, files });
  }
  const agents = [];
  for (const f of await listDir(path.join(pkg, 'agents'), (n) => n.endsWith('.md'))) {
    agents.push({ name: f.replace(/\.md$/, ''), content: await fs.readFile(path.join(pkg, 'agents', f), 'utf8') });
  }
  return { skills, agents };
}

/** Render a canonical agent for a host. Unsupported frontmatter keys are never emitted. */
export function renderAgent(host: HostSpec, content: string): string {
  const fm = parseFrontmatter(content);
  if (!fm) return content;
  const desc = fm.data.description ?? '';
  if (host.id === 'claude') {
    return `---\nname: ${fm.data.name}\ndescription: ${desc}\ntools: Read, Grep, Glob\n---\n${fm.body}`;
  }
  if (host.id === 'copilot') {
    return `---\ndescription: ${desc}\ntools: ['read', 'search']\n---\n${fm.body}`;
  }
  return content;
}

export function agentsMdBlock(): string {
  return [
    BLOCK_START,
    '## ArchSutra AI',
    'For architecture design, audit, threat-model or modernization requests, use the `architecture-*` and `threat-modeling` skills.',
    'Stay read-only unless the user approves changes. Label claims as observed, inferred, proposed or unknown, and cite file and line evidence.',
    BLOCK_END,
    '',
  ].join('\n');
}

export async function planInstall(hostId: string, target: string, pkg = packageRoot()): Promise<InstallPlan> {
  const host = HOSTS.find((h) => h.id === hostId);
  if (!host) throw new Error(`Unknown host "${hostId}". Known: ${HOSTS.map((h) => h.id).join(', ')}`);
  const tgt = path.resolve(target);
  const canon = await loadCanonical(pkg);
  const manifest = await readManifest(tgt);
  const owned = manifest.installs[host.id]?.files ?? {};
  const files: PlannedFile[] = [];

  const consider = async (rel: string, content: string): Promise<void> => {
    const abs = safeJoin(tgt, rel);
    if (!(await exists(abs))) return void files.push({ rel, content, action: 'create' });
    const current = await fs.readFile(abs, 'utf8');
    if (current === content) return void files.push({ rel, content, action: 'unchanged' });
    if (owned[rel] && owned[rel] === sha(current)) return void files.push({ rel, content, action: 'update' });
    files.push({ rel, content, action: 'conflict', reason: owned[rel] ? 'modified since install' : 'exists and was not installed by ArchSutra' });
  };

  for (const s of canon.skills) for (const f of s.files) await consider(`${host.skillsDir}/${s.name}/${f.rel}`, f.content);
  if (host.agentsDir) for (const a of canon.agents) await consider(`${host.agentsDir}/${a.name}${host.agentSuffix}`, renderAgent(host, a.content));

  let agentsMd: InstallPlan['agentsMd'];
  if (host.agentsMdBlock) {
    const abs = safeJoin(tgt, 'AGENTS.md');
    const block = agentsMdBlock();
    if (!(await exists(abs))) agentsMd = { rel: 'AGENTS.md', action: 'create', content: block };
    else {
      const cur = await fs.readFile(abs, 'utf8');
      const re = new RegExp(`${BLOCK_START}[\\s\\S]*?${BLOCK_END}\\n?`);
      const next = re.test(cur) ? cur.replace(re, block) : `${cur.replace(/\s*$/, '\n\n')}${block}`;
      agentsMd = { rel: 'AGENTS.md', action: next === cur ? 'unchanged' : 'update', content: next };
    }
  }
  return { host: host.id, target: tgt, files, agentsMd };
}

export interface InstallOptions {
  dryRun?: boolean;
  force?: boolean;
}

export async function install(plan: InstallPlan, opts: InstallOptions = {}): Promise<{ written: string[]; backedUp: string[]; blocked: string[] }> {
  const written: string[] = [];
  const backedUp: string[] = [];
  const blocked = plan.files.filter((f) => f.action === 'conflict' && !opts.force).map((f) => f.rel);
  if (opts.dryRun || blocked.length) return { written, backedUp, blocked };

  const manifest = await readManifest(plan.target);
  const rec = manifest.installs[plan.host] ?? { files: {}, at: '' };
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  for (const f of plan.files) {
    const abs = safeJoin(plan.target, f.rel);
    if (f.action === 'unchanged') {
      rec.files[f.rel] = sha(f.content);
      continue;
    }
    if (f.action === 'conflict') {
      const bak = safeJoin(plan.target, `.archsutra/backup/${stamp}/${f.rel}`);
      await fs.mkdir(path.dirname(bak), { recursive: true });
      await fs.copyFile(abs, bak);
      backedUp.push(f.rel);
    }
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, f.content, 'utf8');
    rec.files[f.rel] = sha(f.content);
    written.push(f.rel);
  }
  if (plan.agentsMd && plan.agentsMd.action !== 'unchanged') {
    const abs = safeJoin(plan.target, plan.agentsMd.rel);
    if (plan.agentsMd.action === 'update') {
      const bak = safeJoin(plan.target, `.archsutra/backup/${stamp}/AGENTS.md`);
      await fs.mkdir(path.dirname(bak), { recursive: true });
      await fs.copyFile(abs, bak);
      backedUp.push('AGENTS.md');
    }
    await fs.writeFile(abs, plan.agentsMd.content, 'utf8');
    rec.agentsMd = true;
    written.push('AGENTS.md');
  }
  rec.at = new Date().toISOString();
  manifest.installs[plan.host] = rec;
  const mp = safeJoin(plan.target, MANIFEST_PATH);
  await fs.mkdir(path.dirname(mp), { recursive: true });
  await fs.writeFile(mp, JSON.stringify(manifest, null, 2), 'utf8');
  return { written, backedUp, blocked };
}

export async function uninstall(hostId: string, target: string, dryRun = false): Promise<{ removed: string[]; kept: string[] }> {
  const tgt = path.resolve(target);
  const manifest = await readManifest(tgt);
  const rec = manifest.installs[hostId];
  const removed: string[] = [];
  const kept: string[] = [];
  if (!rec) return { removed, kept };
  for (const [rel, hash] of Object.entries(rec.files)) {
    const abs = safeJoin(tgt, rel);
    if (!(await exists(abs))) continue;
    if (sha(await fs.readFile(abs)) !== hash) {
      kept.push(rel);
      continue;
    }
    if (!dryRun) {
      await fs.rm(abs);
      let dir = path.dirname(abs);
      while (dir.startsWith(tgt) && dir !== tgt) {
        if ((await fs.readdir(dir)).length) break;
        await fs.rmdir(dir);
        dir = path.dirname(dir);
      }
    }
    removed.push(rel);
  }
  if (rec.agentsMd) {
    const abs = safeJoin(tgt, 'AGENTS.md');
    if (await exists(abs)) {
      const cur = await fs.readFile(abs, 'utf8');
      const next = cur.replace(new RegExp(`\\n*${BLOCK_START}[\\s\\S]*?${BLOCK_END}\\n?`), '\n');
      if (next !== cur) {
        if (!dryRun) {
          if (next.trim() === '') await fs.rm(abs);
          else await fs.writeFile(abs, next, 'utf8');
        }
        removed.push('AGENTS.md (managed block)');
      }
    }
  }
  if (!dryRun) {
    delete manifest.installs[hostId];
    await fs.writeFile(path.join(tgt, MANIFEST_PATH), JSON.stringify(manifest, null, 2), 'utf8');
  }
  return { removed, kept };
}

export async function detectHosts(target: string): Promise<{ id: string; evidence: string }[]> {
  const probes: Record<string, string[]> = {
    claude: ['.claude', 'CLAUDE.md'], cursor: ['.cursor', '.cursorrules'], codex: ['AGENTS.md', '.codex'],
    copilot: ['.github/copilot-instructions.md', '.github/agents'], gemini: ['.gemini', 'GEMINI.md'],
  };
  const out: { id: string; evidence: string }[] = [];
  for (const [id, paths] of Object.entries(probes)) {
    for (const p of paths) if (await exists(path.join(target, p))) {
      out.push({ id, evidence: p });
      break;
    }
  }
  return out;
}

export async function doctor(target: string): Promise<{ id: string; ok: boolean; message: string; fix?: string }[]> {
  const out: { id: string; ok: boolean; message: string; fix?: string }[] = [];
  const major = Number(process.versions.node.split('.')[0]);
  out.push({ id: 'node', ok: major >= 20, message: `Node ${process.versions.node}`, fix: major >= 20 ? undefined : 'Install Node.js 20 or newer (LTS).' });
  const tgt = path.resolve(target);
  out.push({ id: 'target', ok: await exists(tgt), message: tgt, fix: 'Pass an existing project directory.' });
  const manifest = await readManifest(tgt);
  const detected = await detectHosts(tgt);
  out.push({ id: 'hosts-detected', ok: true, message: detected.length ? detected.map((d) => `${d.id} (${d.evidence})`).join(', ') : 'none detected (use --host to choose)' });
  for (const [hostId, rec] of Object.entries(manifest.installs)) {
    let drift = 0;
    let missing = 0;
    for (const [rel, hash] of Object.entries(rec.files)) {
      const abs = path.join(tgt, rel);
      if (!(await exists(abs))) missing++;
      else if (sha(await fs.readFile(abs)) !== hash) drift++;
    }
    out.push({ id: `install:${hostId}`, ok: !missing && !drift, message: `${Object.keys(rec.files).length} files, ${missing} missing, ${drift} modified`,
      fix: missing || drift ? `Run: archsutra install --host ${hostId} --target ${target} (use --force to overwrite modified files; backups are kept).` : undefined });
  }
  const pkg = packageRoot();
  out.push({ id: 'canonical-skills', ok: await exists(path.join(pkg, 'skills')), message: path.join(pkg, 'skills'), fix: 'Reinstall archsutra-ai; skills/ is missing.' });
  const agentsMd = path.join(tgt, 'AGENTS.md');
  if (await exists(agentsMd)) {
    const txt = await fs.readFile(agentsMd, 'utf8');
    const begins = txt.split(BLOCK_START).length - 1;
    out.push({ id: 'agents-md', ok: begins <= 1, message: begins > 1 ? 'duplicate ArchSutra blocks' : 'ok', fix: begins > 1 ? 'Remove duplicate archsutra blocks from AGENTS.md.' : undefined });
  }
  return out;
}
