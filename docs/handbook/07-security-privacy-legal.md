# Security, privacy and legal

<!-- summary: Security model, privacy guarantees, license, trademarks, disclaimers, and what has not been checked. -->

> This document describes the project's design and intentions. It is **not legal advice**. For decisions with legal effect, consult a qualified lawyer.

## 1. Security model

| Principle | Implementation |
|---|---|
| Read-only by default | `audit`, `map`, `verify`, `doctor`, `init`, `hosts` never write. Writes happen only in `export`, `install`, `uninstall` |
| Containment | all writes use `safeJoin`; `--output` that escapes the project is rejected |
| No symlink following | `walk` skips symlinks; installer skips symlinks in canonical content |
| Bounded work | 5000 files, 512 KiB per file, 15 s; truncation is reported |
| Secret redaction | values never appear in reports or JSON; `.env` contents are not read into reports |
| No code execution | the CLI never executes code from the scanned repository |
| Reversible changes | install manifest with SHA-256; backups; uninstall keeps user-edited files |
| Least privilege agents | Claude agent profiles get `Read, Grep, Glob` only; Copilot agents `read`, `search` |
| Supply chain | zero runtime dependencies; Dependabot; CodeQL; CI blocks non-empty production dependencies |
| Prompt-injection stance | skills declare repository content as untrusted data; agents are read-only by default |

Full analysis: [threat model](../architecture/threat-model.md).

### Known limitations
- Prompt injection against the host model cannot be fully prevented by instructions. Keep agent permissions minimal and review proposed actions.
- Redaction is pattern-based and can miss unusual secret formats.
- Heuristic rules have false positives and false negatives.
- Adapter file layouts have not been smoke-tested in the live hosts.

### Reporting a vulnerability
Use GitHub private vulnerability reporting: https://github.com/shahvatsalofficial/archsutra-ai/security/advisories/new. See [SECURITY.md](../../SECURITY.md).

## 2. Privacy

- **Data collected by ArchSutra:** none. No telemetry, analytics, crash reports, or network calls from the CLI.
- **Where your code goes:** nowhere from the CLI. When you use the skills, your code and prompts are processed by **your AI IDE and its model provider** under that provider's terms. ArchSutra does not control or see that traffic.
- **What reports contain:** file paths, line numbers, short redacted excerpts, rule text. Review reports before publishing them; paths and excerpts can reveal internal structure.
- **Generated HTML docs:** the handbook site loads one script from the jsDelivr CDN to draw diagrams. That request exposes the visitor's IP address to the CDN operator, as any CDN request does. No analytics are included.

## 3. Licensing

- Project license: **Apache License 2.0** ([LICENSE](../../LICENSE)). Permits commercial use, modification, distribution, and patent use, with attribution, notice retention, and no trademark grant.
- [NOTICE](../../NOTICE) must be retained in redistributions.
- No runtime dependencies. Dev dependencies: TypeScript (Apache-2.0), @types/node (MIT). Details: [THIRD_PARTY_NOTICES](../../THIRD_PARTY_NOTICES.md).
- Contributions: under Apache-2.0 section 5 (inbound = outbound), unless stated otherwise.
- Referenced standards (OWASP, C4, SARIF, Mermaid, STRIDE, Agent Skills) are cited by name and link; no text is copied.
- Original content: the skills, agents, rules and documentation are original work by the creator and contributors.

## 4. Names, trademarks and affiliations

- "ArchSutra", "ArchSutra AI" and "ArchSutra Prime" are used by this project. **No trademark search or registration has been performed.** On 2026-10-31 the npm names `archsutra` and `archsutra-ai` were unclaimed and GitHub search found no other repository named `archsutra`. That is a spot check, not legal clearance. Do a proper search before any commercial launch, paid product or registration.
- Third-party names (Claude, Claude Code, Anthropic, Cursor, OpenAI, Codex, GitHub, GitHub Copilot, Google, Gemini, Node.js, npm, OWASP, Mermaid) belong to their owners. They appear only to describe compatibility (nominative use). This project is **not affiliated with, endorsed by, or sponsored by** any of them.

## 5. Disclaimers

- **No warranty.** Provided "AS IS" (Apache-2.0 sections 7 and 8).
- **No compliance claim.** Reports are review aids. They do not certify conformance with any law, regulation or standard (including GDPR, HIPAA, PCI DSS, SOC 2, ISO 27001, NIST, OWASP). Mentions of frameworks are references for human reviewers.
- **No security guarantee.** Absence of findings does not mean absence of vulnerabilities. Do not rely on this tool as the sole control.
- **Authorized use only.** Run the tool only on code you own or are authorized to review. The CLI does not scan networks or run exploits.
- **AI output.** Skill-driven results come from third-party models and can be wrong. Verify before acting; the skills instruct the model to cite evidence so you can.

## 6. Open legal and compliance checks (not done)

| Check | Status | Who |
|---|---|---|
| Trademark clearance for "ArchSutra" (target jurisdictions) | not done | creator / counsel |
| Contributor License Agreement or DCO policy | not adopted (Apache-2.0 inbound=outbound applies) | creator |
| Export-control review | not done; software uses no cryptography beyond SHA-256 hashing from Node | creator |
| Terms review of each AI IDE for redistributing skill files | not done | creator |
| Accessibility conformance statement for the HTML site | not formally audited; built to WCAG 2.2 AA design intent | creator |
