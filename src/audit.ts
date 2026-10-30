import path from 'node:path';
import { readLines, walk } from './fsutil.js';
import { buildMap, readJson } from './map.js';
import { detectSecrets, excerpt } from './redact.js';
import type { AuditResult, Corpus, Evidence, Finding, ScoreEntry, Severity, SourceFile } from './types.js';

type Draft = Omit<Finding, 'id' | 'status'>;

const CODE_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.java', '.kt', '.cs', '.go', '.rs', '.php', '.rb', '.swift', '.dart',
]);
const TEST_PATH = /(^|\/)(tests?|__tests__|spec|e2e|fixtures?)(\/|$)|\.(test|spec)\.[a-z]+$|_test\.(go|py)$/i;
const OWASP = 'https://owasp.org/Top10/';
const BASE64_LINE = /^[A-Za-z0-9+/=]{40,}$/;

function ev(f: SourceFile, line: number, text: string, kind: Evidence['kind'] = 'observed'): Evidence {
  return { path: f.rel, startLine: line, endLine: line, kind, excerpt: excerpt(text) };
}

interface LineRule {
  rule: string;
  re: RegExp;
  codeOnly?: boolean;
  skipTests?: boolean;
  make: (hits: Evidence[]) => Draft;
}

const LINE_RULES: LineRule[] = [
  {
    rule: 'AS-SEC-004',
    re: /\beval\s*\(|new\s+Function\s*\(|child_process[^\n]*\bexec(?:Sync)?\s*\(\s*[`"'][^`"']*(?:\$\{|["']\s*\+)|\bos\.system\s*\(|subprocess\.[a-z_]+\([^)]*shell\s*=\s*True/,
    codeOnly: true,
    skipTests: true,
    make: (hits) => ({
      rule: 'AS-SEC-004', title: 'Dynamic code or shell execution', category: 'security', severity: 'high', confidence: 'medium',
      evidence: hits,
      impact: 'If any input reaches these calls, an attacker can execute arbitrary code or commands.',
      whyItMatters: 'Injection (OWASP A03) frequently starts at eval/exec style sinks.',
      fix: 'Replace with a safe API (argument arrays, parsers, allowlists). Never build commands or code from strings that include external input.',
      verification: 'Trace data flow into each call; add a unit test with hostile input.',
      acceptanceCriteria: 'No eval/Function/shell-string execution remains, or each remaining use is documented with a proven constant input.',
      effort: 'M', ownerType: 'application developer',
      caveats: 'Pattern match only. The call may only receive constants; confirm by data-flow review.',
      references: [OWASP],
    }),
  },
  {
    rule: 'AS-SEC-005',
    re: /\b(?:query|execute|exec|raw|prepare)\s*\(\s*(?:`[^`]*\$\{|["'][^"']*["']\s*\+)|(?:SELECT\s[^;\n]{0,80}\sFROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b[^;\n]{0,100}(?:\$\{|["']\s*\+\s*\w|%s["']?\s*%\s*\w|\{\w+\}["']\s*\.format)/,
    codeOnly: true,
    skipTests: true,
    make: (hits) => ({
      rule: 'AS-SEC-005', title: 'SQL built by string concatenation or interpolation', category: 'security', severity: 'high', confidence: 'medium',
      evidence: hits,
      impact: 'Possible SQL injection and unpredictable query plans.',
      whyItMatters: 'Parameterized queries are the primary defence against injection (OWASP A03).',
      fix: 'Use parameterized queries or the ORM query builder. Allowlist any dynamic identifiers.',
      verification: 'Search for the pattern again; add an injection test (e.g. a quote character in input).',
      acceptanceCriteria: 'All queries with external input use bind parameters.',
      effort: 'M', ownerType: 'application developer',
      caveats: 'Heuristic. Interpolated values may be constants or already validated.',
      references: [OWASP, 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html'],
    }),
  },
  {
    rule: 'AS-SEC-006',
    re: /rejectUnauthorized\s*:\s*false|verify\s*=\s*False|InsecureSkipVerify\s*:\s*true|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0/,
    skipTests: true,
    make: (hits) => ({
      rule: 'AS-SEC-006', title: 'TLS certificate verification disabled', category: 'security', severity: 'high', confidence: 'high',
      evidence: hits,
      impact: 'Connections can be intercepted by a man-in-the-middle.',
      whyItMatters: 'Disabled verification removes the authenticity guarantee of TLS.',
      fix: 'Enable verification. For private CAs, trust the CA bundle explicitly instead of disabling checks.',
      verification: 'Connect to a host with an invalid cert and confirm the call fails.',
      acceptanceCriteria: 'No production code path disables certificate verification.',
      effort: 'S', ownerType: 'application developer',
      caveats: 'May be limited to a local dev profile; confirm it cannot reach production.',
      references: ['https://owasp.org/Top10/A02_2021-Cryptographic_Failures/'],
    }),
  },
  {
    rule: 'AS-IAC-001',
    re: /cidr_blocks\s*=\s*\[\s*"0\.0\.0\.0\/0"|privileged:\s*true|allowPrivilegeEscalation:\s*true|hostNetwork:\s*true/,
    skipTests: true,
    make: (hits) => ({
      rule: 'AS-IAC-001', title: 'Over-permissive infrastructure configuration', category: 'infrastructure', severity: 'medium', confidence: 'medium',
      evidence: hits,
      impact: 'Wide network exposure or container escape paths.',
      whyItMatters: 'Least privilege limits blast radius when a workload is compromised.',
      fix: 'Restrict CIDRs to required sources; drop privileged mode and unneeded capabilities.',
      verification: 'Run an IaC policy check (e.g. tfsec, checkov, kube-linter) and review the plan.',
      acceptanceCriteria: 'No 0.0.0.0/0 ingress on sensitive ports and no privileged containers without a documented exception.',
      effort: 'M', ownerType: 'platform / SRE',
      caveats: 'Public load balancers legitimately accept 0.0.0.0/0 on 80/443.',
      references: ['https://owasp.org/Top10/A05_2021-Security_Misconfiguration/'],
    }),
  },
];

const LAYERS = [
  { layer: 0, re: /(^|\/)(controllers?|routes?|handlers?|api|views?|pages|ui|web)(\/|$)/i },
  { layer: 1, re: /(^|\/)(services?|usecases?|application|domain)(\/|$)/i },
  { layer: 2, re: /(^|\/)(repositor(?:y|ies)|dao|db|database|models?|persistence|infra(?:structure)?)(\/|$)/i },
];

function layerOf(p: string): number {
  for (const l of LAYERS) if (l.re.test(p)) return l.layer;
  return -1;
}

/** A private-key header only counts when base64 key material follows, not when it is a pattern or doc string. */
function looksLikeRealKey(lines: string[], i: number): boolean {
  const next = (lines[i + 1] ?? '').trim();
  return BASE64_LINE.test(next) || /^Proc-Type:/.test(next) || /PRIVATE KEY-----(?:\\n|\s)*[A-Za-z0-9+/=]{40,}/.test(lines[i]);
}

export async function runAudit(root: string, corpusIn?: Corpus): Promise<AuditResult> {
  const corpus = corpusIn ?? (await walk(root));
  const map = await buildMap(root, corpus);
  const drafts: Draft[] = [];
  const failedChecks: string[] = [];
  const byRule = new Map<string, Evidence[]>();
  const push = (rule: string, e: Evidence): void => {
    const arr = byRule.get(rule) ?? [];
    arr.push(e);
    byRule.set(rule, arr);
  };

  const names = new Set(corpus.files.map((f) => f.rel));
  const hasFile = (re: RegExp): boolean => corpus.files.some((f) => re.test(f.rel));

  // ---- Line-based scans -------------------------------------------------
  const llmFiles: { f: SourceFile; line: number; text: string }[] = [];
  const dangerFiles = new Set<string>();
  for (const f of corpus.files) {
    const lines = await readLines(f);
    if (!lines) continue;
    const isCode = CODE_EXT.has(f.ext);
    const isTest = TEST_PATH.test(f.rel);
    const isDoc = f.ext === '.md' || f.ext === '.txt';
    if (isCode && lines.length > 1000 && !isTest) push('AS-ARC-003', { path: f.rel, startLine: 1, endLine: lines.length, kind: 'observed', excerpt: `${lines.length} lines` });

    for (let i = 0; i < lines.length; i++) {
      const text = lines[i];
      if (text.length > 2000) continue;
      if (!isTest && !isDoc) {
        for (const hit of detectSecrets(text)) {
          if (hit.kind === 'private-key') {
            if (looksLikeRealKey(lines, i)) push('AS-SEC-002', ev(f, i + 1, '-----BEGIN PRIVATE KEY----- [REDACTED]'));
          } else if (!/example|placeholder|changeme|your[_-]|xxxx|process\.env|os\.environ|getenv/i.test(text)) {
            push('AS-SEC-001', { ...ev(f, i + 1, text), excerpt: `${hit.kind}: ${excerpt(text, 80)}` });
          }
        }
      }
      for (const r of LINE_RULES) {
        if (r.codeOnly && !isCode) continue;
        if (r.skipTests && isTest) continue;
        if (isDoc) continue;
        if (r.re.test(text)) {
          push(r.rule, ev(f, i + 1, text));
          if (r.rule === 'AS-SEC-004') dangerFiles.add(f.rel);
        }
      }
      if (isCode && !isTest && /\b(?:openai|anthropic|chat\.completions|messages\.create|generateContent|ChatCompletion)\b/i.test(text)) {
        llmFiles.push({ f, line: i + 1, text });
      }
    }
  }

  for (const r of LINE_RULES) {
    const hits = byRule.get(r.rule);
    if (hits?.length) drafts.push(r.make(hits.slice(0, 10)));
  }

  const secretHits = byRule.get('AS-SEC-001');
  if (secretHits?.length) {
    drafts.push({
      rule: 'AS-SEC-001', title: 'Possible hard-coded credential', category: 'security', severity: 'critical', confidence: 'medium',
      evidence: secretHits.slice(0, 10),
      impact: 'A leaked credential gives direct access to the protected system and lives forever in git history.',
      whyItMatters: 'Secrets in source are the most common cause of avoidable breaches.',
      fix: 'Revoke and rotate the credential first. Load it from environment variables or a secret manager. Purge history only after rotation.',
      verification: 'Run a dedicated scanner (e.g. gitleaks) over full history; confirm the old credential is revoked.',
      acceptanceCriteria: 'No credentials in the working tree or history; rotation recorded.',
      effort: 'S', ownerType: 'application developer + security',
      caveats: 'Pattern match. Values are redacted in this report. Test fixtures and docs are skipped.',
      references: ['https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/'],
    });
  }
  const keyHits = byRule.get('AS-SEC-002');
  if (keyHits?.length) {
    drafts.push({
      rule: 'AS-SEC-002', title: 'Private key material committed', category: 'security', severity: 'critical', confidence: 'high',
      evidence: keyHits.slice(0, 10),
      impact: 'Anyone with repository read access can impersonate the key owner.',
      whyItMatters: 'Private keys must never leave their trust boundary.',
      fix: 'Treat the key as compromised: rotate it, remove the file, and store keys in a secret manager.',
      verification: 'Confirm the old key no longer authenticates; re-scan history.',
      acceptanceCriteria: 'No private key files in the repository; the replaced key is revoked.',
      effort: 'S', ownerType: 'security',
      caveats: 'A public documentation sample key may trigger this; verify it is not used anywhere.',
      references: [],
    });
  }
  const archBig = byRule.get('AS-ARC-003');
  if (archBig?.length) {
    drafts.push({
      rule: 'AS-ARC-003', title: 'Very large source files (low cohesion risk)', category: 'maintainability', severity: 'low', confidence: 'medium',
      evidence: archBig.slice(0, 10),
      impact: 'Large files attract unrelated changes, raise merge conflicts, and are hard to test.',
      whyItMatters: 'Cohesion is a leading indicator of change cost.',
      fix: 'Split by responsibility along existing seams; add characterization tests first.',
      verification: 'Track file length and change frequency before and after.',
      acceptanceCriteria: 'No production source file above 1000 lines without a recorded exception.',
      effort: 'M', ownerType: 'application developer',
      caveats: 'Generated code and data tables are legitimately large.',
      references: [],
    });
  }

  // ---- Committed .env files --------------------------------------------
  const envFiles = corpus.files.filter((f) => /(^|\/)\.env(\.[^/]+)?$/.test(f.rel) && !/\.(example|sample|template)$/.test(f.rel));
  if (envFiles.length) {
    drafts.push({
      rule: 'AS-SEC-003', title: 'Environment file present in repository tree', category: 'security', severity: 'high', confidence: 'medium',
      evidence: envFiles.slice(0, 10).map((f) => ({ path: f.rel, kind: 'observed' as const, excerpt: '(contents not read into report)' })),
      impact: 'Environment files usually hold credentials.',
      whyItMatters: 'Config with secrets must stay out of version control.',
      fix: 'Add to .gitignore, commit a .env.example with placeholders, rotate any real values.',
      verification: '`git ls-files | grep .env` returns only example files.',
      acceptanceCriteria: 'Only *.example env files are tracked.',
      effort: 'S', ownerType: 'application developer',
      caveats: 'The file may be untracked on disk; this scan reads the working tree, not git state.',
      references: [],
    });
  }

  // ---- Architecture: cycles and layering --------------------------------
  if (map.cycles.length) {
    const evid: Evidence[] = [];
    for (const comp of map.cycles) {
      for (const e of map.edges) if (comp.includes(e.from) && comp.includes(e.to)) evid.push(e.example);
    }
    drafts.push({
      rule: 'AS-ARC-001', title: `Circular dependency between modules (${map.cycles.map((c) => c.join(' <-> ')).join('; ')})`,
      category: 'architecture', severity: 'medium', confidence: 'high',
      evidence: evid.slice(0, 10),
      impact: 'Cyclic modules cannot be understood, tested, versioned or deployed independently.',
      whyItMatters: 'Acyclic dependencies keep change local and make extraction (e.g. to a service) feasible.',
      fix: 'Extract the shared concept into a lower-level module or invert one dependency behind an interface.',
      verification: 'Re-run `archsutra map`; cycles list must be empty. Add the check to CI.',
      acceptanceCriteria: 'archsutra map reports zero module cycles.',
      effort: 'M', ownerType: 'tech lead',
      caveats: 'Module = top-level directory heuristic; a cycle between sub-folders of one deliberate unit may be acceptable.',
      references: ['https://en.wikipedia.org/wiki/Acyclic_dependencies_principle'],
    });
  }

  const layerEvidence: Evidence[] = [];
  for (const f of corpus.files) {
    if (!CODE_EXT.has(f.ext) || TEST_PATH.test(f.rel)) continue;
    const from = layerOf(f.rel);
    if (from < 1) continue;
    const lines = await readLines(f);
    if (!lines) continue;
    lines.forEach((text, i) => {
      const m = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)(['"])(\.{1,2}\/[^'"]*)\1/.exec(text);
      if (!m) return;
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(f.rel), m[2]));
      const to = layerOf(target);
      if (to >= 0 && to < from) layerEvidence.push(ev(f, i + 1, text));
    });
  }
  if (layerEvidence.length) {
    drafts.push({
      rule: 'AS-ARC-002', title: 'Lower layer depends on a higher layer', category: 'architecture', severity: 'medium', confidence: 'medium',
      evidence: layerEvidence.slice(0, 10),
      impact: 'Data or service code that imports presentation code inverts the intended dependency direction and blocks reuse.',
      whyItMatters: 'Layer direction is what keeps business and data logic independent of delivery mechanisms.',
      fix: 'Move shared types down, or introduce an interface owned by the lower layer and implemented above.',
      verification: 'Add a dependency-direction fitness test (e.g. dependency-cruiser, ArchUnit) and run it in CI.',
      acceptanceCriteria: 'No import from data/service layers into presentation layers.',
      effort: 'M', ownerType: 'tech lead',
      caveats: 'Layers are inferred from folder names (controllers, services, repositories...). Verify your real layering.',
      references: ['https://c4model.com/'],
    });
  }

  // ---- Operations and delivery -----------------------------------------
  const hasCi = hasFile(/^\.github\/workflows\/|^\.gitlab-ci\.yml$|^azure-pipelines\.yml$|^Jenkinsfile$|^\.circleci\//);
  const hasTests = corpus.files.some((f) => TEST_PATH.test(f.rel));
  const codeCount = corpus.files.filter((f) => CODE_EXT.has(f.ext)).length;
  if (codeCount > 0 && !hasCi) {
    drafts.push({
      rule: 'AS-OPS-001', title: 'No CI pipeline configuration found', category: 'operability', severity: 'medium', confidence: 'medium',
      evidence: [{ path: '.', kind: 'unknown', excerpt: 'No GitHub Actions, GitLab CI, Azure Pipelines, Jenkins or CircleCI files found' }],
      impact: 'Regressions and architecture drift are not caught automatically.',
      whyItMatters: 'Automated gates are the cheapest enforcement of architectural rules.',
      fix: 'Add CI that builds, tests, lints and runs dependency/secret scans on every pull request.',
      verification: 'Open a PR and confirm the pipeline runs.',
      acceptanceCriteria: 'A required status check runs build + tests on every PR.',
      effort: 'S', ownerType: 'DevOps',
      caveats: 'CI may live outside this repository.',
      references: [],
    });
  }
  if (codeCount > 0 && !hasTests) {
    drafts.push({
      rule: 'AS-OPS-002', title: 'No test files found', category: 'maintainability', severity: 'medium', confidence: 'medium',
      evidence: [{ path: '.', kind: 'unknown', excerpt: 'No test/, tests/, __tests__, *.test.*, *.spec.* or *_test.* files found' }],
      impact: 'Refactoring and modernization are high-risk without a safety net.',
      whyItMatters: 'Tests are the precondition for safe evolution.',
      fix: 'Add characterization tests around critical paths before changing them.',
      verification: 'Run the suite in CI and track coverage trend.',
      acceptanceCriteria: 'Critical user journeys have automated tests that run in CI.',
      effort: 'L', ownerType: 'application developer',
      caveats: 'Tests may live in another repository.',
      references: [],
    });
  }
  for (const f of corpus.files.filter((x) => /(^|\/)Dockerfile(\.[\w.-]+)?$/.test(x.rel))) {
    const lines = (await readLines(f)) ?? [];
    const users = lines.filter((l) => /^\s*USER\s+/i.test(l));
    const last = users[users.length - 1] ?? '';
    if (!users.length || /^\s*USER\s+(root|0)\b/i.test(last)) {
      push('AS-OPS-003', { path: f.rel, startLine: 1, endLine: Math.max(1, lines.length), kind: 'observed', excerpt: users.length ? last.trim() : 'no USER instruction' });
    }
    if (lines.some((l) => /^\s*FROM\s+\S+:latest\b|^\s*FROM\s+[^:\s@]+\s*(?:AS\s+\S+)?$/i.test(l))) {
      push('AS-SUP-003', { path: f.rel, kind: 'observed', excerpt: 'base image not pinned to a version or digest' });
    }
  }
  if (byRule.get('AS-OPS-003')?.length) {
    drafts.push({
      rule: 'AS-OPS-003', title: 'Container runs as root', category: 'security', severity: 'medium', confidence: 'high',
      evidence: byRule.get('AS-OPS-003')!.slice(0, 10),
      impact: 'A compromised process has root inside the container, easing escape and file tampering.',
      whyItMatters: 'Non-root containers are baseline hardening.',
      fix: 'Create an unprivileged user and add `USER <name>` before the entrypoint.',
      verification: '`docker run --rm image id` shows a non-zero uid.',
      acceptanceCriteria: 'Final image stage runs as a non-root user.',
      effort: 'S', ownerType: 'DevOps',
      caveats: 'Some build-only stages legitimately use root; only the final stage matters.',
      references: ['https://docs.docker.com/build/building/best-practices/#user'],
    });
  }
  if (byRule.get('AS-SUP-003')?.length) {
    drafts.push({
      rule: 'AS-SUP-003', title: 'Container base image not pinned', category: 'supply-chain', severity: 'low', confidence: 'medium',
      evidence: byRule.get('AS-SUP-003')!.slice(0, 10),
      impact: 'Builds are not reproducible and can silently pick up a compromised or breaking image.',
      whyItMatters: 'Pinning is a core supply-chain control.',
      fix: 'Pin to a specific version tag, ideally with a digest, and update via automated PRs.',
      verification: 'Rebuild twice and compare image digests.',
      acceptanceCriteria: 'All FROM lines specify an explicit version or digest.',
      effort: 'S', ownerType: 'DevOps',
      caveats: 'Multi-stage references to earlier stages are not images.',
      references: [],
    });
  }

  // ---- Supply chain -----------------------------------------------------
  const lockNames = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb', 'bun.lock'];
  const unlocked: Evidence[] = [];
  const latest: Evidence[] = [];
  for (const f of corpus.files.filter((x) => path.posix.basename(x.rel) === 'package.json')) {
    const dir = path.posix.dirname(f.rel);
    const hasLock = lockNames.some((l) => names.has(dir === '.' ? l : `${dir}/${l}`)) || (dir !== '.' && lockNames.some((l) => names.has(l)));
    const pkg = await readJson(f.abs);
    if (!pkg) {
      failedChecks.push(`Could not parse ${f.rel}`);
      continue;
    }
    const deps = { ...(pkg.dependencies as object | undefined), ...(pkg.devDependencies as object | undefined) } as Record<string, string>;
    if (!hasLock && Object.keys(deps).length) unlocked.push({ path: f.rel, kind: 'observed', excerpt: 'no lockfile next to or above this package.json' });
    for (const [n, v] of Object.entries(deps)) if (v === 'latest' || v === '*') latest.push({ path: f.rel, kind: 'observed', excerpt: `${n}: ${v}` });
  }
  if (unlocked.length) {
    drafts.push({
      rule: 'AS-SUP-001', title: 'Dependency manifest without lockfile', category: 'supply-chain', severity: 'medium', confidence: 'high',
      evidence: unlocked.slice(0, 10),
      impact: 'Installs are not reproducible; a compromised new release can enter automatically.',
      whyItMatters: 'Lockfiles pin the exact dependency tree that was tested.',
      fix: 'Commit the lockfile and install with `npm ci` (or equivalent) in CI.',
      verification: 'CI uses a frozen/locked install.',
      acceptanceCriteria: 'Every manifest has a committed lockfile.',
      effort: 'S', ownerType: 'application developer',
      caveats: 'Workspaces may keep a single lockfile at the repo root (checked).',
      references: [],
    });
  }
  if (latest.length) {
    drafts.push({
      rule: 'AS-SUP-002', title: 'Unpinned dependency ranges ("latest" or "*")', category: 'supply-chain', severity: 'medium', confidence: 'high',
      evidence: latest.slice(0, 10),
      impact: 'Any future release, including a malicious one, is accepted.',
      whyItMatters: 'Unbounded ranges defeat review and reproducibility.',
      fix: 'Use a bounded semver range and rely on the lockfile plus automated update PRs.',
      verification: 'Manifest scan shows no "latest" or "*".',
      acceptanceCriteria: 'No dependency uses latest or *.',
      effort: 'S', ownerType: 'application developer',
      caveats: 'None known.',
      references: [],
    });
  }

  // ---- AI / agent risks -------------------------------------------------
  if (llmFiles.length && dangerFiles.size) {
    const both = llmFiles.filter((l) => dangerFiles.has(l.f.rel));
    if (both.length) {
      drafts.push({
        rule: 'AS-AI-001', title: 'LLM call in the same file as dynamic code or shell execution', category: 'ai-security', severity: 'high', confidence: 'low',
        evidence: both.slice(0, 5).map((b) => ev(b.f, b.line, b.text, 'inferred')),
        impact: 'Model output (which can be steered by prompt injection) may reach an execution sink.',
        whyItMatters: 'LLM output must be treated as untrusted input (OWASP LLM Top 10).',
        fix: 'Never execute model output directly. Use allowlisted tools with schema-validated arguments, sandboxing and human approval for side effects.',
        verification: 'Red-team with injected instructions in retrieved content; confirm no unapproved side effect.',
        acceptanceCriteria: 'No path from model output to eval/exec without validation and approval.',
        effort: 'M', ownerType: 'AI engineer + security',
        caveats: 'Co-location only; data flow is not proven.',
        references: ['https://genai.owasp.org/llm-top-10/'],
      });
    }
  }

  // ---- Documentation ----------------------------------------------------
  const hasReadme = hasFile(/^readme(\.\w+)?$/i);
  const hasAdr = hasFile(/(^|\/)(adr|adrs|decisions)\/.*\.md$/i);
  if (codeCount > 0 && !hasReadme) {
    drafts.push({
      rule: 'AS-DOC-001', title: 'No README at repository root', category: 'developer-experience', severity: 'low', confidence: 'high',
      evidence: [{ path: '.', kind: 'observed', excerpt: 'README* not found' }],
      impact: 'New contributors cannot find purpose, setup, or architecture overview.',
      whyItMatters: 'Docs drift starts when the entry point is missing.',
      fix: 'Add a README with purpose, setup, run, test, and an architecture section.',
      verification: 'A new developer runs the project from the README alone.',
      acceptanceCriteria: 'README exists and setup steps were validated on a clean machine.',
      effort: 'S', ownerType: 'tech lead', caveats: 'None known.', references: [],
    });
  }
  if (codeCount > 200 && !hasAdr) {
    drafts.push({
      rule: 'AS-DOC-002', title: 'No architecture decision records found', category: 'governance', severity: 'info', confidence: 'medium',
      evidence: [{ path: '.', kind: 'unknown', excerpt: 'No adr/, adrs/ or decisions/ markdown found' }],
      impact: 'The reasons behind significant decisions are lost, inviting re-litigation.',
      whyItMatters: 'ADRs make trade-offs reviewable and keep architecture knowledge durable.',
      fix: 'Record significant existing decisions as ADRs (see skills/architecture-design/references/adr-template.md).',
      verification: 'Each major technology choice has an ADR.',
      acceptanceCriteria: 'ADR directory exists and new decisions land with a PR.',
      effort: 'S', ownerType: 'architect', caveats: 'Decisions may be tracked in a wiki.', references: ['https://adr.github.io/'],
    });
  }

  // ---- Assign stable IDs ------------------------------------------------
  const sevOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  drafts.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity] || a.rule.localeCompare(b.rule));
  const findings: Finding[] = drafts.map((x, i) => ({ ...x, id: `${x.rule}#${String(i + 1).padStart(3, '0')}`, status: 'open' as const }));

  return { map, findings, scorecard: scorecard(findings, codeCount), failedChecks };
}

function scorecard(findings: Finding[], codeCount: number): ScoreEntry[] {
  const cats: Record<string, string[]> = {
    Security: ['security', 'ai-security'],
    Maintainability: ['maintainability', 'architecture'],
    Operability: ['operability', 'infrastructure'],
    'Supply chain': ['supply-chain'],
    'Developer experience': ['developer-experience', 'governance'],
  };
  const out: ScoreEntry[] = [];
  for (const [label, keys] of Object.entries(cats)) {
    if (codeCount === 0) {
      out.push({ category: label, rating: 'not assessed', basis: 'No source files recognised.' });
      continue;
    }
    const fs = findings.filter((f) => keys.includes(f.category));
    const crit = fs.filter((f) => f.severity === 'critical').length;
    const high = fs.filter((f) => f.severity === 'high').length;
    const med = fs.filter((f) => f.severity === 'medium').length;
    const rating: ScoreEntry['rating'] = crit ? 'critical' : high ? 'weak' : med ? 'adequate' : 'strong';
    out.push({ category: label, rating, basis: `${fs.length} finding(s): ${crit} critical, ${high} high, ${med} medium. Rule coverage only; absence of findings is not proof of quality.` });
  }
  for (const label of ['Reliability', 'Performance', 'Scalability', 'Data integrity', 'Cost']) {
    out.push({ category: label, rating: 'not assessed', basis: 'Needs runtime, load, data or billing evidence the static scan cannot observe. Use the architecture-audit skill with the maintainer.' });
  }
  return out;
}
