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

## 2. Host matrix (v0.1.3)

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
| Ubuntu (latest), Node 20, 22, 24, and the newest Node | CI passes |
| Windows (latest), Node 20, 22, and 24 | CI passes |
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
| v0.1 (done) | Skills, agents, CLI, adapters, CI, docs | `npm test` green; fixtures match expected rules. The written acceptance said 3 OS. macOS left CI in 0.1.3 after GitHub cancelled those jobs before a runner started |
| v0.1.1 (released) | Real-world evaluation and precision fixes, pinned actions, release/SBOM/attestation workflow, Scorecard, DCO, accessibility audit, coverage, benchmarks, governance | See [Trust and assurance](13-trust-and-assurance.md) |
| v0.1.2 (released, git tag) | Dual-file reports (Markdown and HTML) for the audit set and for narrative skill output | `audit --output` writes both formats; `html <file.md>` renders narrative pages. GitHub release has SBOM, checksums, and 2 attestations. Bin name is only `archsutra` |
| v0.1.3 (on npm and on `main`, no git tag) | Second bin `archsutra-ai` so Windows `npx` runs; macOS workflow removed; creator URL `https://shahvatsal.com` | npm `bin` lists both commands. npm `gitHead` is `4a7ab27`, not the docs commit. No Actions provenance |
| v0.2 | Live smoke tests per host; upgrade verified hosts to `native`; matrix with versions | One issue-linked report per host with version and evidence |
| v0.3 | More analyzers (Java/Kotlin, C#, Go, Rust import graphs); fitness-function generator; rule suppression file | New fixtures with expected rules; precision/recall stays 1.00 on fixtures |
| v0.4 | Larger, multi-labeler corpus; recall estimate; comparison with other scanners published | At least 100 labeled findings by two labelers; first `comparison.yml` run reviewed |
| v0.5 | Optional local-model runtime and optional bring-your-own-key server, strictly opt-in, localhost by default | Security tests: unauthorized request rejected, no data leaves without opt-in |
| v1.0 | Stable CLI and schema. npm publish from Actions with provenance, same digest as the GitHub release. `archsutra-ai@0.1.2` and `@0.1.3` already exist; `0.1.3` cannot be republished | Semantic-versioned contracts; provenance on the npm tarball and the GitHub release |

Principles for all future work: default stays keyless and offline; every new capability ships with tests and a documented limitation; no support claim without a verification record.

## 6. Known gaps (v0.1.3)

- No live host verification. All five IDEs are `adapter`.
- No suppression or baseline file for accepted findings.
- Module-level graph only. No function-level analysis. Path aliases, dynamic import, and dependency injection are missed. Python relative imports are not graphed. Java, Kotlin, C#, Go, Rust, PHP, Ruby, Swift, and Dart are detected and not graphed.
- No runtime or cost evidence ingestion. Those scorecard rows stay `not assessed`.
- `design`, `review`, `threat-model`, `modernize`, `compare`, `cost`, and `drift` exit 3. Skills only.
- No MCP server. The keyword `mcp` in `package.json` is not an implementation.
- Comparison workflow against Semgrep has never run. `docs/proof/comparison/` does not exist.
- Recall on real repositories is not measured. One labeler. Best published actionable rate is 52% (n=21).
- No `v0.1.3` git tag. npm `0.1.3` has no provenance and its `gitHead` is `4a7ab27`. `release.yml` does not publish npm.
- OpenSSF Scorecard **5.7 / 10** (2026-11-06). Branch protection 0, code review 0, Signed-Releases 0 (Scorecard does not credit the v0.1.2 GitHub attestations), packaging -1, fuzzing 0, Best Practices badge 0.
- macOS is not in CI.
- HTML Mermaid loads from `cdn.jsdelivr.net`. Offline, the diagram source stays visible and is not drawn.
- Coverage is reported (92% lines) and not enforced as a CI threshold.
- Docs accessibility: axe-core clean on the measured set. No screen-reader pass.
- Formal trademark search and lawyer review are not done. npm name `archsutra` (no `-ai`) was still unclaimed on 2026-11-06.
