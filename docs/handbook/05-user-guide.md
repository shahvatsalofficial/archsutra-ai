# User guide

<!-- summary: Install, run your first audit, use the skills in your AI IDE, wire it into CI, and fix common problems. -->

## 1. Requirements

- Node.js 20 or newer (`node -v`).
- Git (only if you install from GitHub).
- Optional: one supported AI IDE to use the skills.

No account, API key, or network access is needed to run the CLI.

## 2. Run without installing

```bash
npx github:shahvatsalofficial/archsutra-ai audit .
```

The first run downloads and builds the package (a few seconds). Subsequent runs use the npx cache.

## 3. Your first audit

```bash
npx github:shahvatsalofficial/archsutra-ai audit .
```

You will see a summary, a scorecard and findings. Each finding shows severity, confidence, `file:line` evidence, impact, fix, how to verify and acceptance criteria.

For machine-readable output:

```bash
npx github:shahvatsalofficial/archsutra-ai audit . --json > findings.json
```

To see only the structure of the codebase:

```bash
npx github:shahvatsalofficial/archsutra-ai map .
```

## 4. Generate a documentation set

```bash
npx github:shahvatsalofficial/archsutra-ai export . --dry-run         # preview
npx github:shahvatsalofficial/archsutra-ai export . --output docs/architecture
```

Files written: `README.md`, `current-state.md`, `audit-report.md`, `findings.json`, `findings.sarif`, `architecture-register.json`.

## 5. Install the skills into your AI IDE

Choose your host: `claude`, `cursor`, `codex`, `copilot`, `gemini`.

```bash
npx github:shahvatsalofficial/archsutra-ai install --host claude --target . --dry-run
npx github:shahvatsalofficial/archsutra-ai install --host claude --target .
```

What happens:
1. A plan lists every file as `create`, `update`, `unchanged` or `conflict`.
2. Conflicts block the install unless you pass `--force`; forced overwrites are backed up in `.archsutra/backup/`.
3. A manifest with SHA-256 hashes is written to `.archsutra/install-manifest.json`.

Check health any time:

```bash
npx github:shahvatsalofficial/archsutra-ai doctor .
```

Remove what was installed (your edited files are kept):

```bash
npx github:shahvatsalofficial/archsutra-ai uninstall --host claude --target .
```

Add `.archsutra/` to `.gitignore` if you do not want the manifest and backups in version control. The installed skill and agent files themselves are normal project files and can be committed so the whole team shares them.

## 6. Use the skills

After installing, ask your assistant in natural language. Examples:

| Goal | Prompt |
|---|---|
| Full audit | "ArchSutra Prime: audit this repository's architecture. Establish what the code does first, give findings with file and line evidence, severity and confidence, prioritized fixes, ADR recommendations and a phased roadmap. Stay read-only and label unknowns." |
| Design | "Use architecture-design to design a multi-tenant invoicing service. Targets: 99.9% availability, p95 under 300 ms, 50 requests per second. EU data residency." |
| Modernize | "Use architecture-modernization to plan splitting this monolith. Keep the system live. Include rollback." |
| Threat model | "Use threat-modeling on the payment flow, including prompt-injection risks for the support chatbot." |
| Verify | "Use architecture-verification on docs/architecture before I merge." |

Tips:
- State numbers (users, latency, availability, budget). The skills mark missing numbers as `unknown` rather than inventing them.
- Ask for diagrams only where they help.
- Keep the assistant read-only unless you want changes.

## 7. Use in CI

GitHub Actions:

```yaml
name: architecture
on: [pull_request]
permissions:
  contents: read
  security-events: write
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npx --yes github:shahvatsalofficial/archsutra-ai audit . --fail-on high
      - run: npx --yes github:shahvatsalofficial/archsutra-ai export . --output arch-report
      - uses: github/codeql-action/upload-sarif@v3
        with: { sarif_file: arch-report/findings.sarif }
```

Pin the package to a commit or tag in production pipelines (`github:shahvatsalofficial/archsutra-ai#<tag>`).

## 8. Reading a finding

```text
AS-SEC-005#002  high  SQL built by string concatenation or interpolation
  Evidence:  [observed] src/services/user.ts:2
  Impact:    Possible SQL injection and unpredictable query plans.
  Fix:       Use parameterized queries ...
  Verify:    Search for the pattern again; add an injection test ...
  Caveats:   Heuristic. Interpolated values may be constants or already validated.
```

- **Confidence** says how sure the rule is, not how important the issue is.
- **Evidence kind**: `observed` (seen in a file), `inferred` (derived), `unknown` (absence of something, e.g. no CI).
- A finding is a **lead to verify**, not a verdict.

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Unknown command` | typo | `archsutra --help` |
| Exit code 3 on `design` or `threat-model` | command needs a model | use the skill in your AI IDE |
| `Blocked: N conflicting file(s)` | a file already exists | `--dry-run` to inspect; `--force` to overwrite with backup |
| Scan says TRUNCATED | repo larger than limits | run on a subdirectory, or see [technical spec](03-technical-specification.md#32-fsutilts) |
| No findings but you expect some | rule coverage is limited | see [rule catalog](12-rule-catalog.md) and the blind spots in the report |
| Skill not discovered in IDE | host layout changed or unsupported version | run `doctor`, check [compatibility](09-compatibility-and-roadmap.md), open a smoke-test issue |
| `npx` fails to build | Node < 20 or no Git | upgrade Node; install Git |
| PowerShell blocks `install.ps1` | execution policy | use `npx` directly instead |

## 10. Good practice

1. Run `audit` on a clean branch and commit the report as a baseline.
2. Fix critical and high findings first; record decisions as ADRs.
3. Add `--fail-on high` to CI after the baseline is clean.
4. Re-run after major refactors; compare findings by rule ID.
5. Never treat a clean report as a security sign-off.
