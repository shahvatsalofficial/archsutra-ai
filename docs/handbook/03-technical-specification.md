# Technical specification

<!-- summary: Module-by-module description of the implementation, data structures, algorithms, limits and extension points. -->

## 1. Stack

| Aspect | Choice |
|---|---|
| Language | TypeScript 5.x, `strict: true` |
| Module system | ESM (`"type": "module"`, `NodeNext`) |
| Runtime | Node.js >= 20 |
| Runtime dependencies | none |
| Dev dependencies | `typescript`, `@types/node` |
| Test runner | built-in `node --test` |
| Build | `tsc` to `dist/`; `prepare` builds on install from Git |
| Entry point | `dist/cli.js` (bin `archsutra`) |

## 2. Repository layout

```text
src/            TypeScript source (8 modules + cli)
skills/         canonical Agent Skills (SKILL.md + references/)
agents/         canonical agent role contracts
schemas/        findings.schema.json
templates/      ADR template
fixtures/       labeled fixtures for evaluation (brownfield-monolith, clean-service)
examples/       committed sample outputs
scripts/        eval.mjs, build-docs.mjs
test/           archsutra.test.mjs, eval.test.mjs
docs/           handbook (source), generated HTML site, RFC, ADRs, proof
install/        thin install.sh / install.ps1 / install.cmd wrappers around npx
.github/        CI, CodeQL, Pages, templates, Dependabot
```

## 3. Modules

### 3.1 `types.ts`
Shared types: `Finding`, `Evidence`, `Corpus`, `ArchMap`, `AuditResult`, `ScoreEntry`, `Severity`, `Confidence`, `EvidenceKind`.

### 3.2 `fsutil.ts`
- `walk(root, opts)`: breadth-limited recursive directory read. Skips ignored directories (`node_modules`, `.git`, `dist`, `build`, `target`, `vendor`, `.venv`, `coverage`, `.terraform`, ...), binary extensions, files over `maxFileBytes`, and **all symlinks** (uses `Dirent.isSymbolicLink`, never `stat` on links). Stops at `maxFiles` or `timeBudgetMs` and sets `truncated`.
- `safeJoin(root, rel)`: resolves and rejects any path outside `root`.
- `readLines(file)`: reads once, caches, returns `null` for binary (NUL byte) or unreadable files.

Defaults: 5000 files, 512 KiB per file, 15 000 ms.

### 3.3 `redact.ts`
Pattern set: AWS access key, GitHub tokens (`gh[pousr]_`, `github_pat_`), `sk-` style keys, Slack tokens, Google API keys, private key headers, and quoted credential assignments (`password`, `secret`, `api_key`, `token`, `access_key`). `detectSecrets(line)` returns kinds only. `redact(text)` masks values. `excerpt(line, max)` redacts then truncates. Every evidence excerpt goes through `excerpt`.

### 3.4 `map.ts`
- `moduleOf(rel)`: module name is `group/name` for `packages|apps|services|libs|modules|internal|cmd`, `src/name` for `src/<dir>/...`, else the top directory, else `(root)`.
- Imports: JS/TS relative specifiers via regex on `from`, `import()`, `require()`; Python absolute imports whose first segment matches a module. Edges are aggregated per module pair with a count and a first-seen example (path, line, redacted excerpt).
- `findCycles`: Tarjan strongly connected components; components with more than one module are cycles.
- Manifest parsing: `package.json` (frameworks, datastores, main), `requirements.txt` and `pyproject.toml` (package names).
- Output `ArchMap` includes ecosystems (sorted by file count), frameworks, datastores, infra, entry points, modules (sorted by lines), edges, cycles, blind spots, coverage.

### 3.5 `audit.ts`
Single pass over files for line rules, then structural checks. Rule evaluation order is irrelevant; findings are sorted by severity then rule ID, and IDs are assigned as `<RULE>#<NNN>` by final position. Full rule list: [rule catalog](12-rule-catalog.md).

Design notes:
- Test and fixture paths (`test/`, `tests/`, `__tests__/`, `fixtures/`, `*.test.*`, `*.spec.*`, `*_test.go|py`) are excluded from injection, TLS, IaC and secret rules to reduce false positives.
- Documentation files (`.md`, `.txt`) are excluded from line rules.
- A private-key header counts only when base64 key material follows, so documentation strings and regex literals do not trigger it.
- Credential lines containing `example`, `placeholder`, `changeme`, `your_`, `xxxx`, `process.env`, `os.environ` or `getenv` are ignored.
- Scorecard: `critical` if any critical, `weak` if any high, `adequate` if any medium, else `strong`; Reliability, Performance, Scalability, Data integrity and Cost are always `not assessed`.

### 3.6 `report.ts`
Pure functions that render Markdown, Mermaid (`flowchart`), findings JSON (`schemaVersion: "1.0.0"`), SARIF 2.1.0 (rule list plus one result per evidence location, severity mapped critical/high to `error`, medium to `warning`, low/info to `note`), and the artifact register with SHA-256.

### 3.7 `verify.ts`
Parses frontmatter (simple `key: value`), validates skills and agents, resolves relative links outside code fences, checks Mermaid structure, validates `findings.json`.

### 3.8 `adapters.ts`
- `HOSTS`: declarative host table (skills directory, agents directory and suffix, `AGENTS.md` block flag, notes, docs link, support level).
- `planInstall`: loads canonical content, renders per-host agent files, classifies each target file as create / update / unchanged / conflict using the install manifest hashes.
- `install`: writes files, backs up conflicts under `.archsutra/backup/<timestamp>/`, updates the manifest.
- `uninstall`: removes a file only if its current SHA-256 equals the recorded one; prunes empty directories; removes the managed block in `AGENTS.md` delimited by `<!-- archsutra:begin -->` and `<!-- archsutra:end -->`.
- `doctor`: Node version, target existence, detected hosts, manifest drift/missing, canonical skills present, duplicate `AGENTS.md` blocks.
- `renderAgent`: Claude gets `name`, `description`, `tools: Read, Grep, Glob`. Copilot gets `description` and `tools: ['read', 'search']`. No other keys are ever written.

### 3.9 `cli.ts`
Hand-written argument parser (flags with values: `output`, `host`, `target`, `fail-on`). Commands dispatch to the modules above. Exit codes: 0 ok, 1 findings or conflict or failed doctor, 2 usage, 3 needs a model, 4 verification failed, 5 internal error. See the [CLI reference](06-cli-reference.md).

## 4. Data formats

### 4.1 Finding (JSON)

```json
{
  "id": "AS-SEC-006#003",
  "rule": "AS-SEC-006",
  "title": "TLS certificate verification disabled",
  "status": "open",
  "category": "security",
  "severity": "high",
  "confidence": "high",
  "evidence": [{ "path": "src/services/http.ts", "startLine": 2, "endLine": 2, "kind": "observed", "excerpt": "..." }],
  "impact": "...", "whyItMatters": "...", "fix": "...", "verification": "...",
  "acceptanceCriteria": "...", "effort": "S", "ownerType": "application developer",
  "caveats": "...", "references": ["https://owasp.org/Top10/..."]
}
```

Schema: [`schemas/findings.schema.json`](../../schemas/findings.schema.json). Stable key is `rule`; the numeric suffix reflects position in one run and may change between runs.

### 4.2 Install manifest

```json
{ "version": 1, "installs": { "claude": { "files": { ".claude/skills/threat-modeling/SKILL.md": "<sha256>" }, "agentsMd": false, "at": "<ISO time>" } } }
```

## 5. Algorithms and complexity

| Step | Complexity | Notes |
|---|---|---|
| Walk | O(files) | bounded by `maxFiles` |
| Line scan | O(total lines x rules) | lines over 2000 chars skipped |
| Import graph | O(lines) | regex per line |
| Cycle detection | O(V + E) | Tarjan on module graph |
| Install planning | O(files in skills + agents) | hashes only changed targets |

Memory: file contents are cached per run (bounded by 5000 x 512 KiB worst case, in practice far less). `clearTextCache` exists for long-lived processes.

## 6. Error handling

- Unreadable directories/files are skipped silently and do not abort the scan.
- Unparseable `package.json` is reported in `failedChecks`.
- Fatal errors print `archsutra: <message>` and return exit code 5; `--verbose` adds the stack.

## 7. Extension points

| To add | Touch | Required tests |
|---|---|---|
| Audit rule | `src/audit.ts` (and [rule catalog](12-rule-catalog.md)) | seeded true positive, false-positive case, fixture expectation |
| Language import graph | `src/map.ts` | map test with cycle |
| Host adapter | `HOSTS` in `src/adapters.ts` | install/uninstall roundtrip (automatic for every host) |
| Agent | `agents/<id>.md` | `verify` enforces headings |
| Skill | `skills/<name>/SKILL.md` | `verify` enforces frontmatter |
| Output format | `src/report.ts` and `export` in `src/cli.ts` | schema/structure test |

## 8. Build, test, release

```bash
npm ci
npm run typecheck
npm test            # build + node --test (20 tests)
npm run verify      # archsutra verify .
node scripts/eval.mjs
node scripts/build-docs.mjs
```

CI runs the same on Ubuntu, Windows and macOS for Node 20 and 22, then a self-audit with `--fail-on high` and a check that production dependencies are empty.
