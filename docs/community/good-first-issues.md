# Good first issues (ready to file)

<!-- summary: A starter backlog of well-scoped tasks for new contributors, each with an acceptance test. -->

Each item is small, has a clear test, and matches a known limitation. Open them as GitHub issues with the labels `good first issue` and `help wanted`.

| # | Title | Area | Acceptance test |
|---|---|---|---|
| 1 | Smoke test report: Claude Code | compatibility | Row added to `docs/compatibility/smoke-tests/README.md` with version and evidence |
| 2 | Smoke test report: Cursor | compatibility | same |
| 3 | Smoke test report: OpenAI Codex | compatibility | same |
| 4 | Smoke test report: GitHub Copilot | compatibility | same |
| 5 | Smoke test report: Gemini CLI or Antigravity CLI | compatibility | same; note the successor tool status |
| 6 | Go import graph (`import "..."` of module-internal packages) | analyzer | Fixture with a Go cycle is reported by `AS-ARC-001` |
| 7 | Java/Kotlin import graph | analyzer | Fixture with a package cycle is reported |
| 8 | C# `using` graph | analyzer | Fixture with a namespace cycle is reported |
| 9 | Rust `mod`/`use crate::` graph | analyzer | Fixture with a module cycle is reported |
| 10 | Suppression file (`.archsutraignore` or inline `archsutra-ignore: AS-SEC-005 reason`) | feature | Test: suppressed finding disappears; suppression without a reason is rejected |
| 11 | Baseline mode: report only findings that are new since a saved `findings.json` | feature | Test with two runs |
| 12 | Port-aware `AS-IAC-001` for Kubernetes `Service` and `Ingress` | rule | Fixture: public 443 not flagged, public 22 flagged |
| 13 | Rule: missing `HEALTHCHECK` in Dockerfile (info) | rule | True-positive and false-positive tests |
| 14 | Rule: GitHub Actions `pull_request_target` with checkout of PR head | rule | Fixture and test |
| 15 | Rule: GitHub Actions using unpinned `uses:` references | rule | Fixture and test |
| 16 | Label 20 more real findings and open a PR adding them to `docs/proof/realworld/` | evaluation | `node scripts/realworld.mjs report` reproduces numbers |
| 17 | Add 5 more repositories to a new holdout batch and label the sample | evaluation | New `labels-<batch>.json` and summary |
| 18 | Translate the README summary into another language | docs | Link from README, no claim differs from English |
| 19 | Screen-reader pass of the docs site (NVDA or VoiceOver) | accessibility | Notes added to `docs/proof/accessibility.md` |
| 20 | Add an `--format sarif` option to `audit` | feature | `audit --format sarif` equals `export` SARIF output |

When filing, link this page and the contributor guide (`docs/handbook/10-contributor-guide.md`).
