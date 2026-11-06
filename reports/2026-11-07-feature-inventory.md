# Report 2 — feature inventory

Auditor date: 2026-11-07. Same scope as report 1: ArchSutra AI, npm `archsutra-ai@0.1.3`, git at the docs correction, Scorecard **5.7 / 10** on 2026-11-06.

Report 1 is the gap audit. This file carries the same gaps, the same shipped list, and the same missing list. Nothing in one report is absent from the other.

Uniqueness is not another scanner. Semgrep, CodeQL, and dependency-cruiser already beat 19 line rules at dataflow and import graphs. The claim worth keeping is an evidence-labeled architecture review that a deterministic CLI can gate, plus skills that refuse to invent a component the CLI did not see.

## Shipped and tested

| Feature | Where | Limit that is still true |
|---|---|---|
| Offline read-only scan, file / byte / time budgets | `map`, `audit` | Truncation is reported, not hidden |
| Module graph, cycles, layering | `AS-ARC-001`, `AS-ARC-002` | Module level only |
| 19 rules, stable IDs, severity, confidence, redacted evidence | rule catalog | Line rules, not taint |
| Scorecard stays `not assessed` without evidence | audit output | Reliability, performance, scalability, data integrity, cost |
| Markdown + HTML, `findings.json`, SARIF 2.1.0, SHA-256 register | `audit --output`, `export` | SARIF is not uploaded by a first-party Action |
| Narrative HTML, `javascript:` and `data:` left as text | `html` | Mermaid render needs `cdn.jsdelivr.net` |
| Install for 5 IDEs, manifest, backup, reversible uninstall | `install`, `uninstall` | Live discovery not tested |
| `verify` | skills, agents, links, Mermaid structure, findings schema | Mermaid is not executed |
| `doctor`, `init`, `hosts` | CLI | Hosts report `adapter`, not `native` |
| Model commands exit 3 | `design`, `review`, `threat-model`, `modernize`, `compare`, `cost`, `drift` | No engine behind the names |
| 5 skills, 12 agent prompts | `skills/`, `agents/` | Prompts. Host must spawn them |
| CI | Ubuntu and Windows, Node 20, 22, 24, plus Ubuntu on current Node | macOS absent |
| CodeQL, DCO, Dependabot, Scorecard workflow, docs site | `.github/workflows` | Scorecard score is 5.7, not a pass |
| Precision on 52 public repositories, 50% baseline published | handbook 14 | One labeler. Recall not measured |
| Zero runtime dependencies | `package.json` | Dev dependencies exist and are locked |
| npm package with both bin names | `archsutra-ai@0.1.3` | No tag, no provenance, `gitHead` `4a7ab27` |
| GitHub release attestation | `v0.1.2` only | Scorecard Signed-Releases is 0. Windows bin missing on that tag |

## Partial

| Feature | Have | Missing |
|---|---|---|
| npm | `0.1.2` and `0.1.3` on the registry. `0.1.3` has both bins | No `v0.1.3` tag. Dirty-tree `gitHead`. No provenance. `release.yml` does not publish. `0.1.3` cannot be replaced |
| Signed release | v0.1.2 tarball, SBOMs, checksums, 2 GitHub attestations | Scorecard does not count them. npm artifacts unsigned |
| Scorecard | 5.7 / 10 published 2026-11-06, now quoted in the trust page | Branch protection 0, code review 0, Signed-Releases 0, Maintained 0, CII badge 0, fuzzing 0, contributors 0, packaging -1, pinned dependencies 7, CI-Tests -1 |
| IDE support | Adapters write vendor paths. Checked against vendor docs on 2026-11-01 | No live session. Not `native` |
| Languages | 11 ecosystems detected | Import graph for 2. Nine are an explicit blind spot. Python relative imports, TS path aliases, dynamic import, and DI missed |
| Security analysis | 19 rules, comment-aware after 0.1.1 | No taint, CVE database, or license policy. Recall unpublished. Actionable rate 52% on the best batch (n=21) |
| SARIF | File written | No maintained Action. User guide upload step is an illustration and says so |
| Diagrams | Mermaid source in HTML | Render needs the network. Offline is source only |
| Comparison | Workflow + `scripts/compare.mjs` vs Semgrep 1.183.0 | Zero runs. No overlap numbers |
| Fitness functions | Reference note | No generator, no CI gate |
| Design, threat model, cost, drift, modernization | Skills and prompts | CLI exits 3. Quality depends on the IDE model. Untested live |
| Docs | Stats, npm status, Scorecard, pins, handbook version, trademark rows corrected in this change | Public site updates only after the docs workflow runs on the pushed commit |
| Workspace stub | `e:\Ai-Agents\package.json` marked `"private": true` | File is outside the product git repo. npm name `archsutra` was still free on 2026-11-06 |

## Full gap register (same rows as report 1)

### Release

- No `v0.1.3` tag, SBOM, checksums, or attestation.
- npm `0.1.3` `gitHead` is `4a7ab27`, a commit that still says version `0.1.2`.
- Laptop publish. No npm provenance. Actions do not publish.
- `v0.1.2` is the attested release and its bin is only `archsutra`. Windows `npx archsutra-ai` fails on that version with `'archsutra' is not recognized`.
- Docs and examples now pin `archsutra-ai@0.1.3` and state that split.

### Scorecard zeros that are still zero

Branch-Protection 0. Code-Review 0 (0/12 approved changesets). Signed-Releases 0 despite 2 GitHub attestations. Maintained 0 because the repository is under 90 days. CII-Best-Practices 0. Fuzzing 0. Contributors 0. Packaging -1. Pinned-Dependencies 7. CI-Tests -1 because there was no pull request to observe.

### Analysis limits that are still limits

- Exit 3: `design`, `review`, `threat-model`, `modernize`, `compare`, `cost`, `drift`.
- No MCP server. Keyword only.
- Comparison workflow never run.
- No live IDE proof.
- No suppression or baseline.
- No custom rules file.
- No monorepo or workspace boundaries.
- No OpenAPI or event extraction.
- No runtime or cost intake.
- No function-level edges.
- Coverage reported, not enforced.
- No screen-reader pass.
- macOS not in CI.
- Formal trademark search not done. Lawyer not engaged.
- Parent stub must stay private.

### Doc claims that were false, and are now corrected

30 tests and 3 OS. "Not published to npm." "Do not quote a Scorecard score." "First attested release has not happened." Handbook titled v0.1.2. Pins to `v0.1.2` and `v0.1.1`. Trademark table frozen on 2026-10-31. Roadmap and supply-chain pages that still described npm as a future decision. Those sources were edited. `node scripts/build-docs.mjs` regenerates the HTML.

## Missing, in the order that makes the product hard to copy

1. **Live host proof.** One recorded session per IDE: version, skill discovered, agent spawned or the documented fallback, files written.
2. **Architecture drift.** Diff two audits. Fail CI on regression. `drift` already exits 3.
3. **Baseline and suppression.** Accepted `rule + path`, reason, expiry. Without it, `--fail-on high` is unused on noisy repos, and the 52% actionable rate is the adoption blocker.
4. **Fitness functions from the audit.** Executable import boundaries and banned edges in CI. This is the piece ArchUnit and dependency-cruiser do not frame as an evidence-labeled architecture gate.
5. **Graphs for Java, Kotlin, C#, Go, and Rust,** plus TypeScript path aliases.
6. **Call and wiring edges.** Function calls, dynamic `import()`, documented DI limit.
7. **Second labeler and recall.** At least 100 findings, two humans, recall on a seeded corpus. Publish the misses.
8. **Run `comparison.yml`.** One table: ArchSutra only, Semgrep only, both. No win before the file exists.
9. **One release object.** `v0.1.4` or later. Actions `npm publish --provenance`. Same digest on the GitHub release. Leave `0.1.3` alone.
10. **Branch protection and a required review.**
11. **MCP server.** Local `audit` and `map`. Offline. No API key.
12. **GitHub Action.** Audit, upload SARIF, short pull-request summary.
13. **Custom rules** in the findings schema.
14. **Monorepo boundaries** for npm, pnpm, Maven, and Gradle.
15. **Contract extraction** for Nexus.
16. **Optional local runtime and cost files.** Opt-in. Offline.
17. **Bundled diagram renderer.** No `cdn.jsdelivr.net`.
18. **Screen-reader pass** on `audit-report.html`.
19. **Trademark attorney and counsel** before any paid tier.

## What not to build

A vulnerability database, a hosted multi-tenant scanner, or a general SAST clone. The defensible product is the labeled architecture gate.

## What this inventory did not do

Did not re-run the 52-repository labels. Did not smoke-test IDEs. Did not publish `0.1.4`. Did not add the missing analyzers in this change. Doc corrections only. Product gaps stay open on purpose.
