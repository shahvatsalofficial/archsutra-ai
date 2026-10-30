import { promises as fs } from 'node:fs';
import path from 'node:path';
import { exists, walk } from './fsutil.js';

export interface Check {
  id: string;
  ok: boolean;
  message: string;
}

export function parseFrontmatter(text: string): { data: Record<string, string>; body: string } | null {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return null;
  const data: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (kv) data[kv[1]] = kv[2].replace(/^(["'])(.*)\1$/, '$2');
  }
  return { data, body: m[2] };
}

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const AGENT_HEADINGS = ['Purpose', 'When to invoke', 'Required inputs', 'Tools and policy', 'Outputs', 'Quality criteria', 'Escalation'];
const MERMAID_TYPES = /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|journey|gantt|pie|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|timeline|mindmap)\b/;

export function checkMermaid(src: string): string | null {
  const first = src.split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith('%%'));
  if (!first || !MERMAID_TYPES.test(first)) return `unknown diagram type: ${first ?? '(empty)'}`;
  const pairs: [string, string][] = [['[', ']'], ['(', ')'], ['{', '}']];
  for (const [o, c] of pairs) {
    const a = src.split(o).length - 1;
    const b = src.split(c).length - 1;
    if (a !== b) return `unbalanced ${o}${c}`;
  }
  return null;
}

export function validateFindings(obj: unknown): string[] {
  const errs: string[] = [];
  const o = obj as Record<string, unknown>;
  if (!o || typeof o !== 'object') return ['not an object'];
  if (o.schemaVersion !== '1.0.0') errs.push('schemaVersion must be "1.0.0"');
  if (!Array.isArray(o.findings)) return [...errs, 'findings must be an array'];
  const sev = new Set(['critical', 'high', 'medium', 'low', 'info']);
  const conf = new Set(['high', 'medium', 'low']);
  const ids = new Set<string>();
  (o.findings as Record<string, unknown>[]).forEach((f, i) => {
    const at = `findings[${i}]`;
    for (const k of ['id', 'rule', 'title', 'category', 'impact', 'fix', 'verification', 'acceptanceCriteria']) {
      if (typeof f[k] !== 'string' || !(f[k] as string).length) errs.push(`${at}.${k} missing`);
    }
    if (typeof f.id === 'string') {
      if (!/^AS-[A-Z]+-\d{3}#\d{3}$/.test(f.id)) errs.push(`${at}.id malformed`);
      if (ids.has(f.id)) errs.push(`${at}.id duplicate`);
      ids.add(f.id);
    }
    if (!sev.has(f.severity as string)) errs.push(`${at}.severity invalid`);
    if (!conf.has(f.confidence as string)) errs.push(`${at}.confidence invalid`);
    if (!Array.isArray(f.evidence) || !f.evidence.length) errs.push(`${at}.evidence must be non-empty`);
  });
  return errs;
}

async function mdFiles(root: string): Promise<string[]> {
  const c = await walk(root, { maxFiles: 20000 });
  return c.files.filter((f) => f.ext === '.md' && !f.rel.startsWith('prompt/')).map((f) => f.rel);
}

export async function verifyProject(root: string): Promise<Check[]> {
  const checks: Check[] = [];
  const add = (id: string, ok: boolean, message: string): void => void checks.push({ id, ok, message });

  // Skills
  const skillsDir = path.join(root, 'skills');
  if (await exists(skillsDir)) {
    for (const d of await fs.readdir(skillsDir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const file = path.join(skillsDir, d.name, 'SKILL.md');
      if (!(await exists(file))) {
        add(`skill:${d.name}`, false, 'SKILL.md missing');
        continue;
      }
      const fm = parseFrontmatter(await fs.readFile(file, 'utf8'));
      if (!fm) {
        add(`skill:${d.name}`, false, 'missing frontmatter');
        continue;
      }
      const problems: string[] = [];
      if (fm.data.name !== d.name) problems.push(`name "${fm.data.name}" must equal directory "${d.name}"`);
      if (!NAME_RE.test(fm.data.name ?? '') || (fm.data.name ?? '').length > 64) problems.push('name must be lowercase-hyphen, max 64 chars');
      const desc = fm.data.description ?? '';
      if (!desc || desc.length > 1024) problems.push('description must be 1-1024 chars');
      if (fm.body.split('\n').length > 500) problems.push('body over 500 lines; move detail to references/');
      add(`skill:${d.name}`, !problems.length, problems.join('; ') || 'valid');
    }
  } else add('skills', false, 'skills/ directory missing');

  // Agents
  const agentsDir = path.join(root, 'agents');
  if (await exists(agentsDir)) {
    for (const f of (await fs.readdir(agentsDir)).filter((x) => x.endsWith('.md'))) {
      const fm = parseFrontmatter(await fs.readFile(path.join(agentsDir, f), 'utf8'));
      if (!fm) {
        add(`agent:${f}`, false, 'missing frontmatter');
        continue;
      }
      const problems: string[] = [];
      if (!fm.data.name || !fm.data.description) problems.push('name and description required');
      for (const h of AGENT_HEADINGS) if (!new RegExp(`^##\\s+${h}\\b`, 'mi').test(fm.body)) problems.push(`missing "## ${h}"`);
      add(`agent:${f}`, !problems.length, problems.join('; ') || 'valid');
    }
  }

  // Markdown links and mermaid
  const broken: string[] = [];
  const badDiagrams: string[] = [];
  for (const rel of await mdFiles(root)) {
    const text = await fs.readFile(path.join(root, rel), 'utf8');
    const noFence = text.replace(/```[\s\S]*?```/g, '');
    for (const m of noFence.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = m[1].split('#')[0];
      if (!target || /^[a-z]+:/i.test(target) || target.startsWith('mailto:')) continue;
      if (!(await exists(path.resolve(root, path.dirname(rel), decodeURIComponent(target))))) broken.push(`${rel} -> ${target}`);
    }
    for (const m of text.matchAll(/```mermaid\r?\n([\s\S]*?)```/g)) {
      const err = checkMermaid(m[1]);
      if (err) badDiagrams.push(`${rel}: ${err}`);
    }
  }
  add('links', !broken.length, broken.length ? `broken: ${broken.slice(0, 10).join('; ')}` : 'all relative links resolve');
  add('mermaid', !badDiagrams.length, badDiagrams.length ? badDiagrams.join('; ') : 'diagram syntax plausible (structural check only; not rendered)');

  // findings.json produced by audit
  for (const cand of ['findings.json', 'docs/architecture/findings.json']) {
    const p = path.join(root, cand);
    if (await exists(p)) {
      try {
        const errs = validateFindings(JSON.parse(await fs.readFile(p, 'utf8')));
        add(`findings:${cand}`, !errs.length, errs.slice(0, 5).join('; ') || 'schema-valid');
      } catch (e) {
        add(`findings:${cand}`, false, `invalid JSON: ${(e as Error).message}`);
      }
    }
  }
  return checks;
}
