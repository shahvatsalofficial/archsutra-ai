import { readFile } from 'node:fs/promises';
import { runAudit } from './audit.js';
import { diffFindings } from './drift.js';
import { buildMap } from './map.js';
import { findingsJson } from './report.js';

interface Rpc {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: { name?: string; arguments?: Record<string, unknown> };
}

const TOOLS = [
  { name: 'archsutra_audit', description: 'Offline architecture audit. Returns findings JSON. Read-only. No network.', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { name: 'archsutra_map', description: 'Offline module map: ecosystems, edges, cycles, blind spots. Read-only.', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { name: 'archsutra_drift', description: 'Diff two findings.json files already on disk.', inputSchema: { type: 'object', properties: { before: { type: 'string' }, after: { type: 'string' } }, required: ['before', 'after'] } },
];

function frame(obj: unknown): string {
  const body = JSON.stringify(obj);
  return `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
}

async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  if (name === 'archsutra_audit') {
    const res = await runAudit(String(args.path ?? '.'));
    return JSON.stringify(findingsJson(res));
  }
  if (name === 'archsutra_map') {
    return JSON.stringify(await buildMap(String(args.path ?? '.')));
  }
  if (name === 'archsutra_drift') {
    const before = JSON.parse(await import('node:fs/promises').then((fs) => fs.readFile(String(args.before), 'utf8')));
    const after = JSON.parse(await import('node:fs/promises').then((fs) => fs.readFile(String(args.after), 'utf8')));
    const b = Array.isArray(before) ? before : before.findings;
    const a = Array.isArray(after) ? after : after.findings;
    return JSON.stringify(diffFindings(b, a));
  }
  throw new Error(`Unknown tool ${name}`);
}

/** Speak MCP over stdio (Content-Length framing). One process, then exit when stdin closes. */
export async function serveMcp(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const buf = Buffer.concat(chunks);
  let offset = 0;
  const text = buf.toString('utf8');
  while (offset < text.length) {
    const headerEnd = text.indexOf('\r\n\r\n', offset);
    if (headerEnd < 0) break;
    const header = text.slice(offset, headerEnd);
    const m = /Content-Length:\s*(\d+)/i.exec(header);
    if (!m) break;
    const len = Number(m[1]);
    const start = headerEnd + 4;
    const body = text.slice(start, start + len);
    offset = start + len;
    let msg: Rpc;
    try {
      msg = JSON.parse(body) as Rpc;
    } catch {
      continue;
    }
    if (msg.id === undefined || msg.id === null) continue;
    if (msg.method === 'initialize') {
      const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
      process.stdout.write(frame({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'archsutra', version: pkg.version } } }));
    } else if (msg.method === 'tools/list') {
      process.stdout.write(frame({ jsonrpc: '2.0', id: msg.id, result: { tools: TOOLS } }));
    } else if (msg.method === 'tools/call') {
      try {
        const textOut = await callTool(String(msg.params?.name), msg.params?.arguments ?? {});
        process.stdout.write(frame({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: textOut }] } }));
      } catch (e) {
        process.stdout.write(frame({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: e instanceof Error ? e.message : String(e) } }));
      }
    } else {
      process.stdout.write(frame({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `Method not found: ${msg.method}` } }));
    }
  }
}
