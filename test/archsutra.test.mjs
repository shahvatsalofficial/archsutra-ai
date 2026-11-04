import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { runAudit } from '../dist/audit.js';
import { buildMap } from '../dist/map.js';
import { redact, detectSecrets } from '../dist/redact.js';
import { safeJoin, walk } from '../dist/fsutil.js';
import { planInstall, install, uninstall, HOSTS } from '../dist/adapters.js';
import { validateFindings, checkMermaid, verifyProject } from '../dist/verify.js';
import { findingsJson, renderSarif } from '../dist/report.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(REPO, 'dist', 'cli.js');

async function tmp(name) {
  return mkdtemp(path.join(tmpdir(), `archsutra-${name}-`));
}
async function put(root, rel, content) {
  const abs = path.join(root, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, content, 'utf8');
}
const FAKE_AWS = ['AKIA', 'ABCDEFGHIJKLMNOP'].join('');

async function badFixture() {
  const r = await tmp('bad');
  await put(r, 'package.json', JSON.stringify({ name: 'bad', dependencies: { express: 'latest', pg: '^8' } }));
  await put(r, 'src/a/index.ts', "import { b } from '../b/index.js';\nexport const a = b;\n");
  await put(r, 'src/b/index.ts', "import { a } from '../a/index.js';\nexport const b = a;\n");
  await put(r, 'src/db/repo.ts', "import { handler } from '../controllers/h.js';\nexport const x = handler;\n");
  await put(r, 'src/controllers/h.ts', "export const handler = 1;\n");
  await put(r, 'src/services/svc.ts', `const key = "${FAKE_AWS}";\nconst q = db.query(\`SELECT * FROM u WHERE id = \${id}\`);\neval(userInput);\nconst agent = new https.Agent({ rejectUnauthorized: false });\n`);
  await put(r, 'Dockerfile', 'FROM node\nCOPY . .\nCMD ["node","x"]\n');
  await put(r, '.env', 'TOKEN=abc\n');
  return r;
}

test('redact masks secrets and never returns the value', () => {
  const line = `key = "${FAKE_AWS}" and password = "supersecretvalue"`;
  const out = redact(line);
  assert.ok(!out.includes(FAKE_AWS));
  assert.ok(!out.includes('supersecretvalue'));
  assert.equal(detectSecrets(line).length >= 2, true);
});

test('safeJoin rejects traversal', () => {
  assert.throws(() => safeJoin('/tmp/x', '../etc/passwd'));
  assert.doesNotThrow(() => safeJoin('/tmp/x', 'a/b'));
});

test('walk skips node_modules, respects file limit and flags truncation', async () => {
  const r = await tmp('walk');
  await put(r, 'node_modules/x/index.js', 'x');
  for (let i = 0; i < 10; i++) await put(r, `f${i}.js`, 'x');
  const c = await walk(r, { maxFiles: 3 });
  assert.equal(c.files.length, 3);
  assert.equal(c.truncated, true);
  assert.ok(!c.files.some((f) => f.rel.includes('node_modules')));
  await rm(r, { recursive: true, force: true });
});

test('walk does not follow symlinks', async () => {
  const r = await tmp('sym');
  const outside = await tmp('outside');
  await put(outside, 'secret.js', 'x');
  try {
    await symlink(outside, path.join(r, 'link'), 'junction');
  } catch {
    return; // cannot create symlinks here; skip
  }
  const c = await walk(r);
  assert.ok(!c.files.some((f) => f.rel.includes('secret.js')));
  await rm(r, { recursive: true, force: true });
  await rm(outside, { recursive: true, force: true });
});

test('map detects modules, cycles and stack', async () => {
  const r = await badFixture();
  const m = await buildMap(r);
  assert.ok(m.ecosystems.includes('TypeScript'));
  assert.ok(m.frameworks.includes('Express'));
  assert.ok(m.datastores.includes('PostgreSQL'));
  assert.ok(m.cycles.some((c) => c.includes('src/a') && c.includes('src/b')));
  await rm(r, { recursive: true, force: true });
});

test('audit finds seeded problems with evidence and redacted excerpts', async () => {
  const r = await badFixture();
  const res = await runAudit(r);
  const rules = new Set(res.findings.map((f) => f.rule));
  for (const want of ['AS-SEC-001', 'AS-SEC-003', 'AS-SEC-004', 'AS-SEC-005', 'AS-SEC-006', 'AS-ARC-001', 'AS-ARC-002', 'AS-OPS-003', 'AS-SUP-001', 'AS-SUP-002']) {
    assert.ok(rules.has(want), `missing ${want}; got ${[...rules].join(',')}`);
  }
  const json = JSON.stringify(findingsJson(res));
  assert.ok(!json.includes(FAKE_AWS), 'secret value leaked into report');
  for (const f of res.findings) assert.ok(f.evidence.length > 0);
  const sec1 = res.findings.find((f) => f.rule === 'AS-SEC-001');
  assert.equal(sec1.evidence[0].path, 'src/services/svc.ts');
  assert.equal(sec1.evidence[0].startLine, 1);
  assert.deepEqual(validateFindings(findingsJson(res)), []);
  const sarif = renderSarif(res);
  assert.equal(sarif.version, '2.1.0');
  await rm(r, { recursive: true, force: true });
});

test('audit on a clean small project has no high-severity findings', async () => {
  const r = await tmp('clean');
  await put(r, 'README.md', '# Clean\n');
  await put(r, 'package.json', JSON.stringify({ name: 'c', dependencies: { zod: '^3.0.0' } }));
  await put(r, 'package-lock.json', '{}');
  await put(r, 'src/app/index.ts', 'export const x = 1;\n');
  await put(r, 'test/app.test.ts', 'export {};\n');
  await put(r, '.github/workflows/ci.yml', 'name: ci\n');
  const res = await runAudit(r);
  assert.deepEqual(res.findings.filter((f) => ['critical', 'high'].includes(f.severity)), []);
  await rm(r, { recursive: true, force: true });
});

test('audit does not flag secrets inside test files or env lookups', async () => {
  const r = await tmp('fp');
  await put(r, 'src/x.ts', 'const k = process.env.API_KEY;\n');
  await put(r, 'test/x.test.ts', `const k = "${FAKE_AWS}";\n`);
  const res = await runAudit(r);
  assert.ok(!res.findings.some((f) => f.rule === 'AS-SEC-001'));
  await rm(r, { recursive: true, force: true });
});

test('install/uninstall roundtrip is idempotent and reversible', async () => {
  for (const host of HOSTS.map((h) => h.id)) {
    const t = await tmp(`inst-${host}`);
    await put(t, 'AGENTS.md', '# Mine\n');
    const plan = await planInstall(host, t);
    const dry = await install(plan, { dryRun: true });
    assert.equal(dry.written.length, 0);
    const res = await install(plan);
    assert.ok(res.written.length > 0, host);
    const again = await planInstall(host, t);
    assert.ok(again.files.every((f) => f.action === 'unchanged'), `${host} not idempotent`);
    const un = await uninstall(host, t);
    assert.ok(un.removed.length > 0);
    const left = await readFile(path.join(t, 'AGENTS.md'), 'utf8');
    assert.equal(left.trim(), '# Mine');
    await rm(t, { recursive: true, force: true });
  }
});

test('install refuses to overwrite foreign files without --force and backs up when forced', async () => {
  const t = await tmp('conflict');
  await put(t, '.claude/skills/architecture-audit/SKILL.md', 'mine');
  const plan = await planInstall('claude', t);
  const res = await install(plan);
  assert.ok(res.blocked.length > 0);
  assert.equal(await readFile(path.join(t, '.claude/skills/architecture-audit/SKILL.md'), 'utf8'), 'mine');
  const forced = await install(plan, { force: true });
  assert.ok(forced.backedUp.length > 0);
  await rm(t, { recursive: true, force: true });
});

test('uninstall keeps files the user modified', async () => {
  const t = await tmp('keep');
  await install(await planInstall('cursor', t));
  const f = path.join(t, '.cursor/skills/threat-modeling/SKILL.md');
  await writeFile(f, 'edited by user', 'utf8');
  const un = await uninstall('cursor', t);
  assert.ok(un.kept.some((k) => k.endsWith('threat-modeling/SKILL.md')));
  assert.ok(existsSync(f));
  await rm(t, { recursive: true, force: true });
});

test('copilot and claude agent profiles contain only supported frontmatter', async () => {
  const t = await tmp('fm');
  await install(await planInstall('copilot', t));
  const txt = await readFile(path.join(t, '.github/agents/prime.agent.md'), 'utf8');
  const fm = txt.split('---')[1];
  const keys = fm.split('\n').filter(Boolean).map((l) => l.split(':')[0]);
  assert.deepEqual(keys.sort(), ['description', 'tools']);
  await rm(t, { recursive: true, force: true });
});

test('mermaid checker flags bad diagrams', () => {
  assert.equal(checkMermaid('flowchart LR\n a["x"] --> b'), null);
  assert.ok(checkMermaid('nonsense\n a'));
  assert.ok(checkMermaid('flowchart LR\n a["x --> b'));
});

test('repository itself verifies (skills, agents, links)', async () => {
  const checks = await verifyProject(REPO);
  const bad = checks.filter((c) => !c.ok);
  assert.deepEqual(bad, []);
});

function run(args, cwd = REPO) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
}

test('cli: version, help, unknown command, model-only command exit codes', () => {
  assert.equal(run(['--version']).status, 0);
  assert.equal(run(['--help']).status, 0);
  assert.equal(run(['bogus']).status, 2);
  const m = run(['threat-model']);
  assert.equal(m.status, 3);
  assert.match(m.stdout, /No API call was made/);
});

test('cli: audit --json emits schema-valid output; --fail-on sets exit 1', async () => {
  const r = await badFixture();
  const res = run(['audit', r, '--json']);
  assert.equal(res.status, 0);
  assert.deepEqual(validateFindings(JSON.parse(res.stdout)), []);
  assert.equal(run(['audit', r, '--fail-on', 'high']).status, 1);
  assert.equal(run(['audit', r, '--fail-on', 'nope']).status, 2);
  await rm(r, { recursive: true, force: true });
});

test('cli: export writes files, honours --dry-run, blocks escaping --output', async () => {
  const r = await badFixture();
  assert.equal(run(['export', r, '--dry-run']).status, 0);
  assert.ok(!existsSync(path.join(r, 'docs/architecture/findings.json')));
  assert.equal(run(['export', r]).status, 0);
  assert.ok(existsSync(path.join(r, 'docs/architecture/findings.json')));
  assert.ok(existsSync(path.join(r, 'docs/architecture/findings.sarif')));
  assert.equal(run(['export', r, '--output', '../escape']).status, 2);
  const v = run(['verify', r]);
  assert.match(v.stdout, /findings:docs\/architecture\/findings.json/);
  await rm(r, { recursive: true, force: true });
});

test('cli: install blocked on conflict returns exit 1, doctor reports', async () => {
  const t = await tmp('cli-inst');
  assert.equal(run(['install', '--host', 'claude', '--target', t]).status, 0);
  assert.equal(run(['doctor', t]).status, 0);
  await writeFile(path.join(t, '.claude/skills/threat-modeling/SKILL.md'), 'drift', 'utf8');
  assert.equal(run(['doctor', t]).status, 1);
  assert.equal(run(['install']).status, 2);
  await rm(t, { recursive: true, force: true });
});

test('audit ignores rule text quoted inside html/json/markdown and fixture manifests (dogfooding regressions)', async () => {
  const r = await tmp('dogfood');
  await put(r, 'docs/page.html', '<code>rejectUnauthorized: false</code> and <code>privileged: true</code>');
  await put(r, 'out/report.json', '{"excerpt": "new https.Agent({ rejectUnauthorized: false })"}');
  await put(r, 'fixtures/x/Dockerfile', 'FROM node\n');
  await put(r, 'fixtures/x/package.json', JSON.stringify({ dependencies: { a: 'latest' } }));
  await put(r, 'src/a.ts', 'export {};\n');
  const rules = (await runAudit(r)).findings.map((f) => f.rule);
  for (const bad of ['AS-SEC-006', 'AS-IAC-001', 'AS-OPS-003', 'AS-SUP-002']) assert.ok(!rules.includes(bad), `${bad} should not fire`);
  await rm(r, { recursive: true, force: true });
});

test('adversarial inputs: long and pathological lines finish quickly (ReDoS guard)', async () => {
  const r = await tmp('redos');
  const evil = [
    'a'.repeat(1990),
    'SELECT ' + 'x '.repeat(900),
    'query(' + '`' + '$'.repeat(1800),
    '"'.repeat(1900),
    "'" + 'password'.repeat(200),
    'child_process ' + 'exec('.repeat(300),
    '-----BEGIN ' + 'RSA '.repeat(400),
    'import ' + "'../".repeat(600),
  ];
  await put(r, 'src/evil.ts', evil.join('\n') + '\n');
  await put(r, 'src/long.ts', 'x'.repeat(5000) + '\n');
  const t0 = performance.now();
  await runAudit(r);
  const ms = performance.now() - t0;
  assert.ok(ms < 3000, `audit took ${ms}ms on pathological lines`);
  await rm(r, { recursive: true, force: true });
});

test('hostile file names and binary content do not crash the scan', async () => {
  const r = await tmp('hostile');
  await put(r, 'src/we ird$(touch pwned).ts', 'export {};\n');
  await put(r, "src/q'uote.ts", 'export {};\n');
  await writeFile(path.join(r, 'src', 'bin.ts'), Buffer.from([0, 1, 2, 255, 0, 10]));
  await put(r, 'src/unicode-‮-name.ts', 'export {};\n');
  const res = await runAudit(r);
  assert.ok(Array.isArray(res.findings));
  assert.ok(!existsSync(path.join(r, 'pwned')), 'file names must never be executed');
  await rm(r, { recursive: true, force: true });
});

test('cursor agent profile contains only documented keys', async () => {
  const t = await tmp('cursor-fm');
  await install(await planInstall('cursor', t));
  const txt = await readFile(path.join(t, '.cursor/agents/prime.md'), 'utf8');
  const keys = txt.split('---')[1].split('\n').filter(Boolean).map((l) => l.split(':')[0]);
  assert.deepEqual(keys.sort(), ['description', 'name', 'readonly']);
  await rm(t, { recursive: true, force: true });
});

test('precision fixes from the real-world evaluation (each label from docs/proof/realworld/labels.json)', async () => {
  const r = await tmp('precision');
  const FAKE = ['AKIA', 'ABCDEFGHIJKLMNOP'].join('');
  // comments and docstrings must not trigger injection rules
  await put(r, 'src/a.ts', '/**\n * used with new Function(code)() at runtime\n */\n// eval(x) in a comment\nexport const ok = 1;\n');
  await put(r, 'src/b.py', 'def f():\n    """The Python ``eval()`` function is no longer used."""\n    return 1\n\ndef g():\n    """\n    eval(code) mentioned in a docstring\n    """\n    return 2\n');
  // dummy and non-secret assignments must not look like credentials
  await put(r, 'src/c.ts', "const a = { password: 'password' };\nconst b = { token: 'keyword.operator.class' };\nconst c = \"password = '$pass_new'\";\nconst d = { password: 'password123' };\n");
  // docs are skipped
  await put(r, 'docs/guide.rst', "run sqlcmd -P 'yourStrong(!)Password'\n");
  // vendored and minified files are skipped
  await put(r, 'static/js/lib.js', 'eval(a);\n');
  await put(r, 'src/min.js', 'x'.repeat(1200) + '\n' + 'eval(y)' + 'z'.repeat(1200) + '\n');
  // a real eval and a real key still fire
  await put(r, 'src/real.ts', `const k = "${FAKE}";\neval(userInput);\n`);
  // public web port is fine, SSH is not
  await put(r, 'infra/web.tf', 'resource "aws_security_group_rule" "web" {\n  from_port = 443\n  to_port = 443\n  cidr_blocks = ["0.0.0.0/0"]\n}\n');
  const res = await runAudit(r);
  const hits = res.findings.flatMap((f) => f.evidence.map((e) => `${f.rule}@${e.path}`));
  assert.deepEqual(hits.filter((h) => h.startsWith('AS-SEC-004')), ['AS-SEC-004@src/real.ts']);
  assert.ok(!hits.some((h) => h.startsWith('AS-SEC-001') && !h.endsWith('src/real.ts')), hits.join(','));
  assert.ok(hits.includes('AS-SEC-001@src/real.ts'));
  assert.ok(!hits.some((h) => h.startsWith('AS-IAC-001')));
  await put(r, 'infra/ssh.tf', 'resource "x" "ssh" {\n  from_port = 22\n  to_port = 22\n  cidr_blocks = ["0.0.0.0/0"]\n}\n');
  assert.ok((await runAudit(r)).findings.some((f) => f.rule === 'AS-IAC-001'));
  await rm(r, { recursive: true, force: true });
});

test('module cycles ignore tests, data-file imports and the root pseudo-module', async () => {
  const r = await tmp('cycles');
  await put(r, 'package.json', '{"name":"x"}');
  await put(r, 'index.js', "const a = require('./lib/a');\n");
  await put(r, 'lib/a.js', "const pkg = require('../package.json');\nconst r = require('../index');\n");
  await put(r, 'packages/p/src/x.ts', "export const x = 1;\n");
  await put(r, 'packages/q/src/y.ts', "import { x } from '../../p/src/x';\n");
  await put(r, 'packages/p/tests/t.spec.ts', "import { y } from '../../q/src/y';\n");
  const m = await buildMap(r);
  assert.deepEqual(m.cycles, []);
  await rm(r, { recursive: true, force: true });
});

test('round-2 precision fixes from the holdout batch', async () => {
  const r = await tmp('round2');
  // shell exec is reported as command execution, not as SQL
  await put(r, 'src/sh.js', "const cp = require('child_process');\ncp.exec('identify ' + url);\ncp.exec(`git tag ${tag}`);\n");
  // query() without SQL words is not SQL
  await put(r, 'src/q.js', "db.query(`${a} and ${b}`);\ndb.query('SELECT * FROM t WHERE id = ' + id);\n");
  // quoted eval in a description string, eval text generated into output, and type imports in comments
  await put(r, 'src/rule.js', "const d = { description: \"Disallow the use of `eval()`\" };\nconst out = `eval(${code})`;\n");
  await put(r, 'src/a/x.js', "/** @import X from \"../b/y\" */\nexport const x = 1;\n");
  await put(r, 'src/b/y.js', "import { x } from '../a/x.js';\nexport const y = x;\n");
  // test.js basename and dev-tooling Dockerfiles are not production code
  await put(r, 'tools/test.js', 'eval(a);\n');
  await put(r, '.devcontainer/Dockerfile', 'FROM node:22.11\n');
  const res = await runAudit(r);
  const by = (rule) => res.findings.filter((f) => f.rule === rule).flatMap((f) => f.evidence.map((e) => `${e.path}:${e.startLine}`));
  assert.deepEqual(by('AS-SEC-004').sort(), ['src/sh.js:2', 'src/sh.js:3']);
  assert.deepEqual(by('AS-SEC-005'), ['src/q.js:2']);
  assert.deepEqual(by('AS-ARC-001'), []);
  assert.deepEqual(by('AS-OPS-003'), []);
  await rm(r, { recursive: true, force: true });
});

test('verify=False on a JWT decode is not reported as disabled TLS verification', async () => {
  const r = await tmp('jwt');
  await put(r, 'app/a.py', 'decoded = jwt.decode(token, verify = False)\nclient = httpx.AsyncClient(verify=False)\n');
  const res = await runAudit(r);
  const lines = res.findings.filter((f) => f.rule === 'AS-SEC-006').flatMap((f) => f.evidence.map((e) => e.startLine));
  assert.deepEqual(lines, [2]);
  await rm(r, { recursive: true, force: true });
});

test('total-bytes budget truncates and reports it (memory bound)', async () => {
  const r = await tmp('bytes');
  for (let i = 0; i < 20; i++) await put(r, `f${i}.js`, 'x'.repeat(100 * 1024));
  const c = await walk(r, { maxTotalBytes: 550 * 1024 });
  assert.equal(c.truncated, true);
  assert.ok(c.files.length <= 6);
  await rm(r, { recursive: true, force: true });
});

test('HTML reports: both formats exist, hostile text is escaped, CSP present, filters and diagrams work offline', async () => {
  const r = await tmp('html');
  await put(r, 'package.json', '{"name":"x","dependencies":{"a":"latest"}}');
  await put(r, "src/x&y'z.js", 'eval(userInput); // "><script>alert(1)</script>\n');
  assert.equal(run(['export', r]).status, 0);
  const dir = path.join(r, 'docs/architecture');
  for (const f of ['index.html', 'audit-report.html', 'current-state.html', 'audit-report.md', 'current-state.md', 'findings.json', 'findings.sarif']) {
    assert.ok(existsSync(path.join(dir, f)), `missing ${f}`);
  }
  for (const f of ['index.html', 'audit-report.html', 'current-state.html']) {
    const h = await readFile(path.join(dir, f), 'utf8');
    assert.match(h, /<!doctype html>/i);
    assert.match(h, /Content-Security-Policy/);
    assert.ok(!/<script>alert\(1\)<\/script>/.test(h), `${f}: unescaped script`);
    assert.ok(!h.includes("x&y'z"), `${f}: unescaped path`);
  }
  const audit = await readFile(path.join(dir, 'audit-report.html'), 'utf8');
  assert.match(audit, /Dynamic code or shell execution/);
  assert.match(audit, /data-sev="high"/);
  const cli = run(['audit', r, '--format', 'html']);
  assert.equal(cli.status, 0);
  assert.match(cli.stdout, /<!doctype html>/i);
  assert.equal(run(['audit', r, '--format', 'pdf']).status, 2);
  assert.equal(run(['map', r, '--format', 'html']).status, 0);
  await rm(r, { recursive: true, force: true });
});

test('agent standard: all agents valid; validator rejects each violation; Claude profile uses documented keys', async () => {
  const { validateAgent } = await import('../dist/verify.js');
  const dir = path.join(REPO, 'agents');
  const { readdirSync } = await import('node:fs');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  assert.equal(files.length, 12);
  const colors = new Set();
  for (const f of files) {
    const txt = await readFile(path.join(dir, f), 'utf8');
    assert.deepEqual(validateAgent(txt), [], f);
    colors.add(/^color: (\w+)$/m.exec(txt)[1]);
  }
  assert.ok(colors.size >= 5, 'agents should use varied colors');
  const good = await readFile(path.join(dir, 'prime.md'), 'utf8');
  for (const [label, bad] of [
    ['description', good.replace('Use this agent when', 'This agent helps when')],
    ['model', good.replace('model: inherit', 'model: gpt')],
    ['color', good.replace('color: blue', 'color: pink')],
    ['name', good.replace('name: archsutra-prime', 'name: Prime_Agent')],
    ['second person', good.replace('You are ArchSutra Prime', 'I am ArchSutra Prime')],
    ['heading', good.replace('## Edge cases', '## Misc')],
  ]) assert.ok(validateAgent(bad).length > 0, `validator accepted bad ${label}`);
  const t = await tmp('claude-fm');
  await install(await planInstall('claude', t));
  const out = await readFile(path.join(t, '.claude/agents/prime.md'), 'utf8');
  const keys = out.split('---')[1].split('\n').filter(Boolean).map((l) => l.split(':')[0]);
  assert.deepEqual(keys.sort(), ['color', 'description', 'model', 'name', 'tools']);
  assert.match(out, /^tools: Read, Grep, Glob$/m);
  await rm(t, { recursive: true, force: true });
});
