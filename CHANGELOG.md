# Changelog

All notable changes follow [Semantic Versioning](https://semver.org/).

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
