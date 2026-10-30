# Compatibility matrix

Levels: `native` (host loads ArchSutra directly, verified), `adapter` (files written to the vendor-documented layout, not yet smoke-tested in the live host), `manual` (copy-paste fallback), `experimental` (layout unconfirmed), `unsupported`.

| Host | Level | Skills path | Agents path | Verified how | Not verified |
|---|---|---|---|---|---|
| Claude Code | adapter | `.claude/skills/<name>/SKILL.md` | `.claude/agents/<name>.md` | file generation, idempotent install/uninstall tests | skill discovery in a live Claude Code session |
| Cursor | adapter | `.cursor/skills/<name>/SKILL.md` | none | file generation tests | discovery in live Cursor |
| OpenAI Codex | adapter | `.agents/skills/<name>/SKILL.md` + `AGENTS.md` block | none | file generation tests | discovery in live Codex |
| GitHub Copilot | adapter | `.github/skills/<name>/SKILL.md` | `.github/agents/<name>.agent.md` | file generation, frontmatter restricted to `description`, `tools` | live Copilot behaviour |
| Gemini CLI | experimental | `.gemini/skills/<name>/SKILL.md` | none | file generation tests | the path itself |

## Operating systems

| OS | Status |
|---|---|
| Windows 11, Node 24 | test suite passes locally (see CHANGELOG / README) |
| macOS, Linux | covered by the CI matrix in `.github/workflows/ci.yml`; results are on the Actions page, not claimed here |

## How to report a smoke test

Open an issue titled `Smoke test: <host> <version>` with: OS, host version, command run, whether the skill was discovered, and a screenshot or log. Verified reports upgrade a host to `native`.

Vendor docs: see `docs` links in `src/adapters.ts`. Check them at build time; layouts change.
