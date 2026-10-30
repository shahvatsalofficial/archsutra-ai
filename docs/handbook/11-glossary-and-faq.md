# Glossary and FAQ

<!-- summary: Definitions of terms and direct answers to the most common questions. -->

## Glossary

| Term | Meaning |
|---|---|
| Agent Skill | A folder with a `SKILL.md` (name, description, instructions) that an AI assistant loads on demand. Specification: agentskills.io |
| Agent role / sub-agent | A scoped persona with its own contract (for example Sentinel for security) that the host can delegate to |
| ArchSutra Prime | The orchestrating agent: scopes, delegates, synthesizes |
| Adapter | Code that renders canonical skills/agents into a host's folder layout |
| Evidence | A reference to where a claim comes from: `path:line` or a named document |
| observed / inferred / proposed / unknown | Claim labels. Observed = seen in source. Inferred = reasoned from observations. Proposed = recommended future design. Unknown = not determinable |
| Finding | A reported issue with ID, severity, confidence, evidence, fix |
| Severity | Impact if the finding is real: critical, high, medium, low, info |
| Confidence | How sure the rule is that it is real: high, medium, low |
| Scorecard | Ratings per quality area; `not assessed` when evidence is missing |
| Module | Top-level unit used for dependency analysis (see [technical spec](03-technical-specification.md)) |
| Cycle | Modules that depend on each other directly or indirectly |
| C4 model | Context, Container, Component, Code diagram hierarchy |
| ADR | Architecture Decision Record |
| HLD / LLD | High-level / low-level design |
| STRIDE | Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege |
| SARIF | Static Analysis Results Interchange Format, used by GitHub code scanning |
| Fitness function | An automated check that an architectural property still holds |
| BYOK | Bring your own key (user-supplied model provider credentials) |
| Prompt injection | Hostile text in data that tries to steer an AI agent |
| Blind spot | A known limit of what the analysis can see |

## FAQ

**What is ArchSutra AI?**
An open-source software architecture agent: Agent Skills plus a deterministic CLI that help AI coding assistants audit, design, threat-model and modernize software, with evidence for every claim.

**Do I need an API key?**
No. The CLI is offline. Inside a supported AI IDE the skills use that IDE's own model, so you need access to the IDE, not an ArchSutra key.

**Does it send my code anywhere?**
The CLI sends nothing anywhere. When you use the skills, your IDE's model provider processes your prompts and code under its own terms.

**Which AI tools work?**
Adapters exist for Claude Code, Cursor, OpenAI Codex, GitHub Copilot (adapter level) and Gemini CLI (experimental). Live verification is pending; see [compatibility](09-compatibility-and-roadmap.md).

**How is it different from asking an AI to review my code?**
It enforces a method: measured evidence first (module graph, rule findings with file and line), claim labels, mandatory caveats, a verification step, and a defined specialist team. It also gives repeatable results in CI.

**How is it different from SonarQube, Semgrep or CodeQL?**
Those are mature, deep analyzers. ArchSutra is a lightweight architecture-level reviewer plus an AI workflow; it complements them rather than replacing them. It emits SARIF so results can sit beside theirs.

**Can it replace an architect or a pen test?**
No. It accelerates review and documents evidence. Humans own decisions.

**Is it safe to run on my repo?**
Yes for the analysis commands: read-only, offline, no code execution, symlinks skipped, secrets redacted. `export`, `install` and `uninstall` write inside the project only, and `--dry-run` shows changes first.

**Why did it flag something that is fine?**
Rules are heuristics. Each finding lists caveats. Treat it as a lead to verify.

**Why is Reliability / Performance / Cost "not assessed"?**
A static scan cannot see runtime load, incidents or billing. The rating is honest rather than invented.

**Can I use it commercially?**
Yes under Apache-2.0 (keep the license and NOTICE). The project name has not been trademark-cleared; see [legal](07-security-privacy-legal.md).

**Does it certify compliance (GDPR, SOC 2, ...)?**
No. Never. It produces review aids only.

**How do I add a rule or a language?**
See the [contributor guide](10-contributor-guide.md).

**Where are the test results?**
[Testing and proof](08-testing-and-proof.md) and `docs/proof/`.

**Is it on npm?**
Not yet. Use `npx github:shahvatsalofficial/archsutra-ai ...`.

**Who made it?**
Created by Vatsal Shah, with Claude assisting in implementation. Contributors are credited in git history.
