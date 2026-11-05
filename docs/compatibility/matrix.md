# Compatibility matrix

Levels: `native` (host loads ArchSutra directly, verified in a live session), `adapter` (files written to the vendor-documented layout, checked against vendor docs, **not yet smoke-tested live**), `manual` (copy-paste fallback), `experimental` (layout unconfirmed), `unsupported`.

| Host | Level | Skills path | Agents path | Checked against docs | Verified by tests | Not verified |
|---|---|---|---|---|---|---|
| Claude Code | adapter | `.claude/skills/<name>/SKILL.md` | `.claude/agents/<name>.md` (`name`, `description`, `tools`) | 2026-11-01 | file generation, idempotent install, frontmatter keys | live discovery |
| Cursor | adapter | `.cursor/skills/<name>/SKILL.md` | `.cursor/agents/<name>.md` (`name`, `description`, `readonly`) | 2026-11-01 | file generation, frontmatter keys | live discovery |
| OpenAI Codex | adapter | `.agents/skills/<name>/SKILL.md` + `AGENTS.md` block | none | 2026-11-01 | file generation | live discovery |
| GitHub Copilot | adapter | `.github/skills/<name>/SKILL.md` | `.github/agents/<name>.agent.md` (`description`, `tools`) | 2026-11-01 | file generation, frontmatter keys | live behavior |
| Gemini CLI | adapter | `.gemini/skills/<name>/SKILL.md` | none | 2026-11-01 | file generation | live discovery; the docs site announces Antigravity CLI as successor, re-verify |

Overlap warning: Cursor and Copilot also read `.claude/skills` and `.agents/skills`; Gemini CLI reads `.agents/skills`; Cursor reads `.codex/skills`. Install **one** host per project to avoid the same skill appearing twice.

## Operating systems

| OS | Status |
|---|---|
| Windows and Linux (GitHub Actions, Node 20, 22, 24; Linux also newest Node) | typecheck, tests, verify and self-audit pass in CI on the v0.1.0 commit; re-confirm on the latest commit |
| Windows 11 with Node 24.15.0 and 26.13.0 (latest stable on 2026-11-01) | developer machine; typecheck, 28 tests, verify and self-audit pass on both |
| macOS | passed on the v0.1.0 commit (Node 20, 22); now in `ci-macos.yml` (`macos-14`, Node 24) because GitHub's macOS runners were unavailable and cancelled queued jobs; re-confirmation pending |

## Live smoke tests

Protocol and results log: [smoke tests](smoke-tests/README.md). All five rows are currently pending.

Vendor docs: links in `src/adapters.ts`. Check them at build time; layouts change.
