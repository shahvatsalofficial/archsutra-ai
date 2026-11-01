# Audit rule catalog

<!-- summary: All 19 audit rules: what each detects, severity, confidence, false-positive notes and how to fix. -->

Severity and confidence are the defaults emitted by the rule. IDs are stable; the `#NNN` suffix in a finding is positional per run.

| Rule | Title | Severity | Confidence | Category |
|---|---|---|---|---|
| AS-SEC-001 | Possible hard-coded credential | critical | medium | security |
| AS-SEC-002 | Private key material committed | critical | high | security |
| AS-SEC-003 | Environment file present in repository tree | high | medium | security |
| AS-SEC-004 | Dynamic code or shell execution | high | medium | security |
| AS-SEC-005 | SQL built by string concatenation or interpolation | high | medium | security |
| AS-SEC-006 | TLS certificate verification disabled | high | high | security |
| AS-IAC-001 | Over-permissive infrastructure configuration | medium | medium | infrastructure |
| AS-ARC-001 | Circular dependency between modules | medium | high | architecture |
| AS-ARC-002 | Lower layer depends on a higher layer | medium | medium | architecture |
| AS-ARC-003 | Very large source files | low | medium | maintainability |
| AS-OPS-001 | No CI pipeline configuration found | medium | medium | operability |
| AS-OPS-002 | No test files found | medium | medium | maintainability |
| AS-OPS-003 | Container runs as root | medium | high | security |
| AS-SUP-001 | Dependency manifest without lockfile | medium | high | supply-chain |
| AS-SUP-002 | Unpinned dependency ranges (`latest`, `*`) | medium | high | supply-chain |
| AS-SUP-003 | Container base image not pinned | low | medium | supply-chain |
| AS-AI-001 | LLM call co-located with dynamic code execution | high | low | ai-security |
| AS-DOC-001 | No README at repository root | low | high | developer-experience |
| AS-DOC-002 | No architecture decision records (only if more than 200 source files) | info | medium | governance |

## Details

### AS-SEC-001 Possible hard-coded credential
- **Detects:** AWS access key IDs, GitHub tokens, `sk-` style keys, Slack tokens, Google API keys, and quoted `password|secret|api_key|token|access_key` assignments of 8+ characters.
- **Skips:** test and fixture paths, doc files (`.md`, `.txt`, `.rst`, `.adoc`, `.html`), comments and docstrings, vendored or minified files, dummy values (`password`, `secret`, `changeme`, ...), values with interpolation, dotted identifiers, and lines that mention example/placeholder/changeme/your_/xxxx or read `process.env`, `os.environ`, `getenv`.
- **Output:** kind and a redacted excerpt. The value is never printed.
- **Fix:** revoke and rotate first; then move to a secret manager or environment; purge history only after rotation.
- **Limits:** misses unusual formats; may flag test-like values outside test paths.

### AS-SEC-002 Private key material committed
- **Detects:** a `BEGIN ... PRIVATE KEY` header followed by base64 key material (next line, or on the same line). Regex literals and docs that merely mention the header do not trigger.
- **Fix:** treat as compromised; rotate; remove.

### AS-SEC-003 Environment file in tree
- **Detects:** `.env`, `.env.*` files not named `*.example`, `*.sample`, `*.template`. Contents are never read into the report.
- **Limits:** reads the working tree, not git tracking; a git-ignored local `.env` is still listed.

### AS-SEC-004 Dynamic code or shell execution
- **Detects:** `eval(` and `new Function(` (not when quoted in backticks), `child_process`-style `exec`/`execSync` with interpolated or concatenated strings (only in files that use `child_process`, `shelljs` or `execa`), `os.system(`, Python `subprocess` with `shell=True`.
- **Skips:** tests, docs, non-code files.
- **Fix:** argument arrays, parsers, allowlists.
- **Limits:** cannot prove tainted input.

### AS-SEC-005 SQL string building
- **Detects:** `query|execute|raw|prepare(` called with a template literal containing `${` or string concatenation and the line contains SQL words (select/insert/update/delete/create/drop/alter plus from/into/set/table/where/values); and uppercase SQL statements (`SELECT .. FROM`, `INSERT INTO`, `UPDATE .. SET`, `DELETE FROM`) combined with interpolation or concatenation on the same line.
- **Fix:** bind parameters.
- **Limits:** line-based; multi-line queries can be missed; interpolated identifiers that are already quoted or escaped are still reported (valid pattern, often not actionable).

### AS-SEC-006 TLS verification disabled
- **Detects:** `rejectUnauthorized: false`, `verify=False`, `InsecureSkipVerify: true`, `NODE_TLS_REJECT_UNAUTHORIZED=0` in code files (lines mentioning jwt, decode or signature are excluded: they disable signature checks, not TLS).
- **Limits:** may be a dev-only profile.

### AS-IAC-001 Over-permissive infrastructure
- **Detects:** Terraform `cidr_blocks = ["0.0.0.0/0"]`; Kubernetes `privileged: true`, `allowPrivilegeEscalation: true`, `hostNetwork: true`. Only `.tf`, `.hcl`, `.yaml`, `.yml` files; `0.0.0.0/0` is ignored when the surrounding ports are only 80/443.
- **Limits:** development containers that need privileged mode are still reported.

### AS-ARC-001 Circular dependency
- **Detects:** strongly connected components of size > 1 in the module graph. Test files, comment-only imports, imports of data files and the `(root)` pseudo-module are ignored.
- **Limits:** module = top-level directory heuristic; large frameworks can show wide cycles that are real but not actionable.

### AS-ARC-002 Layer inversion
- **Detects:** a file in a service/domain layer importing from presentation, or a data/persistence layer importing from service or presentation, using folder-name conventions (controllers/routes/handlers/api/views/pages/ui/web; services/usecases/application/domain; repositories/dao/db/database/models/persistence/infrastructure).
- **Limits:** relies on naming conventions.

### AS-ARC-003 Very large files
- **Detects:** non-test source files over 1000 lines, excluding vendored, minified, third-party-headed and literal-only data files.
- **Limits:** generated code that is not recognised.

### AS-OPS-001 No CI
- **Detects:** none of GitHub Actions, GitLab CI, Azure Pipelines, Jenkinsfile, CircleCI. Evidence kind is `unknown`.

### AS-OPS-002 No tests
- **Detects:** no `test/`, `tests/`, `__tests__`, `spec`, `e2e`, `*.test.*`, `*.spec.*`, `*_test.go|py`. Evidence kind is `unknown`.

### AS-OPS-003 Container runs as root
- **Detects:** a Dockerfile with no `USER`, or whose last `USER` is root/0. Test paths and developer-tooling folders (`.devcontainer`, `.github`, `.gitpod`) are skipped.

### AS-SUP-001 Missing lockfile
- **Detects:** `package.json` with dependencies and no `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock(b)` beside it or at the root.

### AS-SUP-002 Unpinned ranges
- **Detects:** dependency version `latest` or `*` in `package.json`.

### AS-SUP-003 Unpinned base image
- **Detects:** `FROM image:latest` or `FROM image` without tag or digest.

### AS-AI-001 LLM plus execution sink
- **Detects:** a file that both calls an LLM API (OpenAI/Anthropic-style identifiers) and contains an AS-SEC-004 sink. Confidence is `low` because data flow is not proven.
- **Fix:** never execute model output; allowlisted tools with validated arguments, sandboxing, human approval.

### AS-DOC-001 / AS-DOC-002 Documentation gaps
- **Detects:** missing README; missing ADR directory in large codebases.

## What the audit does not do

It does not execute code, query live systems, scan networks, inspect cloud accounts, read git history, or assess runtime behavior. Use the skills and your own judgment to cover those areas.
