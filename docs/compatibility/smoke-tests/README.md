# Live host smoke tests

<!-- summary: A step-by-step protocol to prove ArchSutra's skills load and work in each AI IDE, plus the results log. -->

The adapters write files in each vendor's documented layout (checked against the vendor docs on 2026-11-01; see the table below). **No live session has been recorded yet.** This page defines how to record one, and where results go. A host moves from `adapter` to `native` only after a passing record exists here.

## Documentation check (done)

| Host | Docs read (2026-11-01) | Confirmed | Notes |
|---|---|---|---|
| Claude Code | code.claude.com/docs/en/skills, /sub-agents | skills `.claude/skills/<name>/SKILL.md`; subagents `.claude/agents/*.md` with `name`, `description`, `tools` (comma list) | skills page partly summarized by the fetch tool |
| Cursor | cursor.com/docs/skills, /subagents | skills `.cursor/skills/` and `.agents/skills/`; subagents `.cursor/agents/` with `name`, `description`, `model`, `readonly`, `is_background` | Cursor also reads `.claude/skills` and `.codex/skills`: install one host per project to avoid duplicates |
| OpenAI Codex | learn.chatgpt.com/docs/build-skills, /agent-configuration/agents-md | skills `.agents/skills`; `AGENTS.md` discovery | docs moved from developers.openai.com (308 redirect) |
| GitHub Copilot | docs.github.com Copilot: about agent skills, create skills, custom agents configuration | skills `.github/skills`; agents `.github/agents/<name>.agent.md`; `description` required; `tools` list | also reads `.claude/skills` and `.agents/skills` |
| Gemini CLI | geminicli.com/docs/cli/skills, /creating-skills, /settings | skills `.gemini/skills` or `.agents/skills`; `skills.enabled` default true | site announces Antigravity CLI as successor (2026-06-18): re-verify |

## Protocol (about 10 minutes per host)

Prerequisites: the host installed and signed in with your own account; Node.js 20+; a throwaway copy of any small repository (for example `fixtures/brownfield-monolith` from this repo).

1. Record versions: host name and version, OS, `node -v`, `archsutra --version`.
2. In the repository copy run:
   ```bash
   npx github:shahvatsalofficial/archsutra-ai install --host <claude|cursor|codex|copilot|gemini> --target .
   ```
3. Start the host in that folder (restart it if it was open).
4. **Discovery check:** ask the host to list available skills or agents. Record whether `architecture-audit` (and, where supported, `archsutra-prime`) appear. Screenshot.
5. **Workflow check:** send this prompt unchanged:
   > ArchSutra Prime: audit this repository's architecture. Run `archsutra audit . --json` if you can, verify at least three findings by opening the cited file and line, and give a report with evidence labels. Stay read-only.
6. Pass criteria (all must hold):
   - skill discovered by name,
   - the response cites at least three real `file:line` locations that exist,
   - it labels claims `observed`/`inferred`/`proposed`/`unknown`,
   - it made no file changes,
   - it did not ask for any ArchSutra API key.
7. Uninstall and confirm cleanup:
   ```bash
   npx github:shahvatsalofficial/archsutra-ai uninstall --host <id> --target .
   ```
8. File the record: open a "Host smoke test report" issue, or add a row below by pull request, attaching the screenshot or transcript with secrets removed.

## Results log

| Host | Host version | OS | Date | Discovered | Workflow passed | Tester | Evidence |
|---|---|---|---|---|---|---|---|
| Claude Code | | | | | | | _pending_ |
| Cursor | | | | | | | _pending_ |
| OpenAI Codex | | | | | | | _pending_ |
| GitHub Copilot | | | | | | | _pending_ |
| Gemini CLI | | | | | | | _pending_ |

Why this is open: the maintainers can only test hosts they have access to. Every verified row builds trust for everyone.
