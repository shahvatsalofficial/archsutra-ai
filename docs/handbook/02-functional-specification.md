# Functional specification

<!-- summary: Requirement-level description of every capability, actor, input, output and acceptance test. -->

## 1. Purpose and scope

ArchSutra AI helps people understand and improve the architecture of a software system. It covers **audit** of existing code, **design** of new systems, **modernization** planning, **threat modeling** and **verification** of architecture documents.

In scope for v0.1: deterministic repository analysis, skill and agent content, installation into five AI IDEs, report export. Out of scope: server mode, model-provider runtime, local-model runtime, languages beyond import graphs for JS/TS/Python, runtime profiling. See the [RFC](../rfc/0001-archsutra-v0.1.md).

## 2. Actors

| Actor | Goal |
|---|---|
| Developer | Understand and audit a repository quickly |
| Architect / tech lead | Produce evidence-backed reviews, ADRs and roadmaps |
| Security reviewer | Find injection, secret, TLS and container risks; threat model |
| Engineering manager | See prioritized risks and a phased plan |
| CI system | Gate pull requests on architecture and security findings |
| AI IDE (Claude Code, Cursor, Codex, Copilot, Gemini CLI) | Load skills/agents and reason with its own model |
| Contributor | Add rules, agents, adapters |

## 3. Functional requirements

IDs are stable. "Status" is implemented and tested (**T**), implemented not live-verified (**I**), or planned (**P**).

### 3.1 Repository analysis (CLI)

| ID | Requirement | Status |
|---|---|---|
| F-01 | Walk a repository with limits (5000 files, 512 KB per file, 15 s), skipping ignored directories, binaries and symlinks, and report truncation | T |
| F-02 | Detect ecosystems from manifests and file extensions (TypeScript, JavaScript, Python, Java, Kotlin, C#, Go, Rust, PHP, Ruby, Swift, Dart) | T |
| F-03 | Detect frameworks and datastores from dependency manifests | T |
| F-04 | Detect infrastructure files (Docker, Compose, Terraform, Kubernetes/Helm, GitHub Actions) | T |
| F-05 | Build a module-level dependency graph from relative imports (JS/TS) and package imports (Python) | T |
| F-06 | Detect dependency cycles between modules (Tarjan SCC) | T |
| F-07 | List blind spots explicitly in every output | T |

### 3.2 Audit

| ID | Requirement | Status |
|---|---|---|
| F-10 | Evaluate 19 rules (see [rule catalog](12-rule-catalog.md)) and emit findings | T |
| F-11 | Each finding has stable ID, title, category, severity, confidence, evidence (path, line, kind, redacted excerpt), impact, why it matters, fix, verification, acceptance criteria, effort, owner type, caveats, references | T |
| F-12 | Never include secret values in any output | T |
| F-13 | Produce a scorecard; categories without evidence are `not assessed` | T |
| F-14 | `--fail-on <severity>` returns exit code 1 when a finding meets the threshold | T |

### 3.3 Reporting and export

| ID | Requirement | Status |
|---|---|---|
| F-20 | Render `audit-report.md`, `current-state.md` (with Mermaid context and container diagrams), `README.md` | T |
| F-21 | Render `findings.json` conforming to schema v1.0.0 | T |
| F-22 | Render `findings.sarif` (SARIF 2.1.0) | T |
| F-23 | Render `architecture-register.json` with SHA-256 per artifact | T |
| F-24 | `--dry-run` writes nothing; `--output` cannot escape the project | T |

### 3.4 Verification

| ID | Requirement | Status |
|---|---|---|
| F-30 | Validate skills (name equals directory, kebab-case, description 1-1024 chars, body under 500 lines) | T |
| F-31 | Validate agents have the required headings | T |
| F-32 | Check that relative Markdown links resolve | T |
| F-33 | Check Mermaid blocks for known diagram type and balanced brackets (structural only, not rendered) | T |
| F-34 | Validate any `findings.json` found | T |

### 3.5 Installation

| ID | Requirement | Status |
|---|---|---|
| F-40 | Plan an install per host: create, update, unchanged, conflict | T |
| F-41 | Refuse to overwrite files not installed by ArchSutra without `--force`; back up when forced | T |
| F-42 | Record SHA-256 in `.archsutra/install-manifest.json`; make install idempotent | T |
| F-43 | Uninstall removes only unmodified installed files and the managed `AGENTS.md` block | T |
| F-44 | `doctor` reports Node version, detected hosts, drift, missing files | T |
| F-45 | Write only supported frontmatter for Claude and Copilot agent files | T |
| F-46 | Skills load and run inside each live host | I (not verified) |

### 3.6 AI-assisted workflows (skills)

| ID | Workflow | Skill | Needs model |
|---|---|---|---|
| F-50 | Audit existing system | `architecture-audit` | yes (IDE) |
| F-51 | Design new system | `architecture-design` | yes |
| F-52 | Modernization / migration plan | `architecture-modernization` | yes |
| F-53 | Threat model (STRIDE, LLM/agent threats) | `threat-modeling` | yes |
| F-54 | Verify architecture artifacts | `architecture-verification` | yes |
| F-55 | CLI refuses to fake model-dependent commands (`design`, `review`, `threat-model`, `modernize`, `compare`, `cost`, `drift`) and exits 3 | | no |

### 3.7 Agent team

Twelve roles with a fixed contract (purpose, when to invoke, inputs, tools and policy, outputs, quality criteria, escalation): Prime, Atlas, Blueprint, Sentinel, Cloud, Data, Nexus, Neural, Scale, Ledger, Forge, Verify. Prime orchestrates; if the host cannot spawn subagents, Prime performs specialist reviews sequentially.

## 4. Non-functional requirements

| ID | Attribute | Requirement | Evidence |
|---|---|---|---|
| N-01 | Privacy | No network calls or telemetry in the CLI | code review; no network imports; [threat model](../architecture/threat-model.md) |
| N-02 | Safety | Read-only except `export`, `install`, `uninstall`, inside the project | tests T1, T5 |
| N-03 | Performance | Bounded by file count, size and time | test `walk ... respects file limit` |
| N-04 | Portability | Windows, macOS, Linux; Node 20+ | CI matrix |
| N-05 | Supply chain | Zero runtime dependencies | CI `npm ls --omit=dev` |
| N-06 | Determinism | Same input, same findings and IDs | repeated eval runs |
| N-07 | Accessibility (docs site) | Semantic HTML, keyboard navigation, contrast, reduced motion | [site notes](04-architecture.md#documentation-site) |

## 5. Primary scenarios

**S1. First audit.** A developer runs `archsutra audit .`. They see a summary, scorecard and findings with `file:line`. Exit code 0.

**S2. CI gate.** A pipeline runs `archsutra audit . --fail-on high`. A high finding returns exit code 1 and fails the job. SARIF can be uploaded to GitHub code scanning.

**S3. Deep review in an IDE.** A user installs the skills, then asks ArchSutra Prime for a full audit. The assistant runs `archsutra audit . --json`, verifies each finding by reading the cited lines, adds architecture reasoning, diagrams, ADR recommendations and a roadmap.

**S4. Safe adoption.** A team runs `install --dry-run`, reviews the plan, installs, later edits a skill, and `uninstall` leaves their edit in place.

## 6. Acceptance tests

Each requirement marked **T** maps to an automated test in `test/archsutra.test.mjs` or `test/eval.test.mjs`. The mapping is in [Testing and proof](08-testing-and-proof.md#requirement-to-test-map).
