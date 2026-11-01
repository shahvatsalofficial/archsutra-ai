# Changelog

All notable changes follow [Semantic Versioning](https://semver.org/).

## 0.1.1 - 2026-11-01

Trust, accuracy and supply-chain release.

### Changed (behavior)
- Audit precision fixes driven by a hand-labeled evaluation on 52 public repositories (baseline precision 50%; 69% and 95% on repositories not used for tuning). Rules now ignore comments and docstrings, vendored and minified files, data tables, dummy credentials, test-named files, development-tooling Dockerfiles, data-file imports and the root pseudo-module in cycles, and public 80/443 listeners. Shell `exec` is reported under dynamic execution, not SQL. JWT `verify=False` is no longer reported as TLS.
- Scans are now also bounded by total bytes (120 MiB) and the text cache is capped.
- Gemini CLI adapter promoted to `adapter` (path confirmed in vendor docs); Cursor adapter now also writes `.cursor/agents`.

### Added
- Real-world evaluation harness, labels, summaries and a labeled-recall check (`scripts/realworld.mjs`, `scripts/labeled-recall.mjs`, `docs/proof/realworld/`).
- Benchmarks, coverage report, contrast checks, axe-core accessibility audit, ReDoS and hostile-input tests (28 tests).
- Workflows: release (tarball, CycloneDX SBOMs, checksums, provenance attestation), OpenSSF Scorecard, manual tool comparison; all actions pinned to SHAs; DCO check; coverage job.
- Governance, support, DCO, CODEOWNERS, issue templates, `security.txt`, good-first-issue backlog.
- Handbook chapters 13 to 16, name-clearance record, legal review brief, live smoke-test protocol.

## 0.1.0 - 2026-10-31

Initial release by Vatsal Shah.

- 5 portable skills: architecture-audit, architecture-design, architecture-modernization, threat-modeling, architecture-verification.
- 12 agent role contracts led by ArchSutra Prime.
- Deterministic CLI: `init`, `doctor`, `map`, `audit`, `verify`, `export`, `install`, `uninstall`, `hosts`.
- Audit rules for secrets, private keys, env files, injection sinks, TLS, IaC, containers, lockfiles, cycles, layering, CI, tests, docs, LLM-to-exec co-location.
- Outputs: Markdown, Mermaid, JSON (schema v1.0.0), SARIF 2.1.0.
- Host adapters: Claude Code, Cursor, Codex, Copilot (adapter level), Gemini CLI (experimental). Not yet smoke-tested in live hosts.

### Added after initial release (still 0.1.0)

- Labeled fixtures (`fixtures/`), evaluation script and test; real sample outputs in `examples/`; captured proof in `docs/proof/`.
- Handbook (12 documents) with generated HTML documentation site, sitemap, structured data.
- Legal and trust files: NOTICE, THIRD_PARTY_NOTICES, CITATION.cff, CodeQL, Dependabot, Pages workflow.
- Expanded README with proof, legal, FAQ and sample output.
