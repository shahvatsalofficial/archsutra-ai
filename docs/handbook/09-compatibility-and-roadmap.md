# Compatibility and roadmap

<!-- summary: Per-host support levels, what is verified, and the milestone plan with acceptance tests. -->

## 1. Support levels

| Level | Meaning |
|---|---|
| native | Host loads ArchSutra directly; verified in a live session |
| adapter | Files are written to the vendor-documented layout; **not yet smoke-tested live** |
| manual | Copy/paste fallback |
| experimental | Layout unconfirmed for the current host release |
| unsupported | Not supported |

## 2. Host matrix (v0.1.2)

| Host | Level | Skills path | Agents path | Verified | Not verified |
|---|---|---|---|---|---|
| Claude Code | adapter | `.claude/skills/<name>/SKILL.md` | `.claude/agents/<name>.md` | file generation; idempotent install; frontmatter | live discovery |
| Cursor | adapter | `.cursor/skills/<name>/SKILL.md` | `.cursor/agents/<name>.md` | file generation; frontmatter keys | live discovery |
| OpenAI Codex | adapter | `.agents/skills/<name>/SKILL.md` + `AGENTS.md` block | none | file generation | live discovery |
| GitHub Copilot | adapter | `.github/skills/<name>/SKILL.md` | `.github/agents/<name>.agent.md` | file generation; only `description`, `tools` | live behavior |
| Gemini CLI | adapter | `.gemini/skills/<name>/SKILL.md` | none | file generation; path confirmed in vendor docs (2026-11-01) | live discovery; the docs announce Antigravity CLI as successor |

All five layouts were checked against the vendors' current documentation on 2026-11-01 (see [smoke tests](../compatibility/smoke-tests/README.md)). Cursor, Copilot and Gemini also read `.agents/skills`, and Cursor and Copilot read `.claude/skills`: install **one** host per project to avoid duplicates. Layouts change; confirm against current docs.

## 3. Operating systems and runtimes

| Platform | Status |
|---|---|
| Ubuntu (latest), Node 20 and 22 | CI passes |
| Windows (latest), Node 20 and 22 | CI passes on the v0.1.0 commit; run locally on Windows 11 with Node 24 |
| macOS | not in CI. GitHub cancelled macOS jobs before a runner started (no steps ran). No Mac is available to re-check. v0.1.0 did pass on Node 20 and 22 before those cancellations |

## 4. Language support in analysis

| Language | Detected | Import graph | Notes |
|---|---|---|---|
| TypeScript, JavaScript | yes | yes (relative imports) | dynamic imports and path aliases may be missed |
| Python | yes | yes (absolute imports matching a module) | relative imports not graphed |
| Java, Kotlin, C#, Go, Rust, PHP, Ruby, Swift, Dart | yes | no | reported as a blind spot |

Line-based security rules apply to all recognised source extensions where noted in the [rule catalog](12-rule-catalog.md).

## 5. Roadmap

| Milestone | Scope | Acceptance test |
|---|---|---|
| v0.1 (done) | Skills, agents, CLI, adapters, CI, docs | `npm test` green on 3 OS; fixtures match expected rules |
| v0.1.1 (released) | Real-world evaluation and precision fixes, pinned actions, release/SBOM/attestation workflow, Scorecard, DCO, accessibility audit, coverage, benchmarks, governance | See [Trust and assurance](13-trust-and-assurance.md) |
| v0.1.2 | Dual-file reports (Markdown and HTML) for the audit set and for narrative skill output | `audit --output` writes both formats; `html <file.md>` renders narrative pages |
| v0.2 | Live smoke tests per host; upgrade verified hosts to `native`; matrix with versions | One issue-linked report per host with version and evidence |
| v0.3 | More analyzers (Java/Kotlin, C#, Go, Rust import graphs); fitness-function generator; rule suppression file | New fixtures with expected rules; precision/recall stays 1.00 on fixtures |
| v0.4 | Larger, multi-labeler corpus; recall estimate; comparison with other scanners published | At least 100 labeled findings by two labelers; first `comparison.yml` run reviewed |
| v0.5 | Optional local-model runtime and optional bring-your-own-key server, strictly opt-in, localhost by default | Security tests: unauthorized request rejected, no data leaves without opt-in |
| v1.0 | Stable CLI and schema, npm publication (after name and trademark checks), signed releases | Semantic-versioned contracts; provenance on release artifacts |

Principles for all future work: default stays keyless and offline; every new capability ships with tests and a documented limitation; no support claim without a verification record.

## 6. Known gaps (v0.1)

- No live host verification.
- No suppression/baseline mechanism for accepted findings.
- Module-level graph only; no function-level analysis.
- No runtime or cost evidence ingestion.
- Not published to the npm registry (install via `npx github:...`).
