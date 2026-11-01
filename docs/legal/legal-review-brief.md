# Legal review brief

<!-- summary: A ready-to-send package for a lawyer: what to review, the questions to answer, and the documents involved. -->

Purpose: give a qualified lawyer everything needed to review ArchSutra AI quickly. Nothing here has been reviewed by counsel yet.

## Project in one paragraph

ArchSutra AI is an open-source (Apache-2.0) tool: Agent Skill files plus a command-line program that statically analyzes source code locally and writes reports. It makes no network calls and sends no data. When users load the skill files into third-party AI coding assistants, those assistants process the user's code under their own terms. The project is currently free; any commercial offering (paid support, hosted service, consulting) is undecided.

## Documents to review

| Document | Question for counsel |
|---|---|
| `LICENSE`, `NOTICE`, `THIRD_PARTY_NOTICES.md` | Are notices complete and the license choice (Apache-2.0) consistent with all content, including generated documentation and fixtures? |
| `README.md`, `docs/handbook/07-security-privacy-legal.md`, site footer | Are the disclaimers (no warranty, no compliance claim, no legal advice, authorized use only) adequate and not misleading? |
| `docs/legal/trademark-and-name-clearance.md` | Perform clearance for "ArchSutra", "ArchSutra AI", "ArchSutra Prime"; advise on filing strategy |
| Use of third-party names (Claude, Cursor, OpenAI, Codex, GitHub, Copilot, Google, Gemini) | Is nominative use as written acceptable? Any vendor brand guidelines to follow? |
| `docs/proof/realworld/**` | The evaluation stores short, redacted excerpts and file paths from public third-party repositories (with repository name and commit). Is this fair use / acceptable? Should attribution or licenses be added? |
| `fixtures/**` | Original synthetic code; confirm no third-party material |
| `DCO.md`, `CONTRIBUTING.md` | DCO instead of CLA: sufficient for the intended future (dual licensing is not planned)? |
| `SECURITY.md`, `docs/.well-known/security.txt` | Is the disclosure policy adequate; any safe-harbor wording to add? |
| `docs/handbook/07-*` section 2 | Privacy statement accuracy: the CLI collects nothing; the docs site loads one CDN script (jsDelivr) which exposes visitor IPs to the CDN. Is a cookie or privacy notice required for the site? |
| Reports produced by the tool | Output may contain file paths and short excerpts of the user's code. Any notice needed in the report header beyond the current "review aid only" text? |

## Specific questions

1. Is a warranty disclaimer plus "not legal/security/compliance advice" enough to limit liability if a user relies on a report?
2. Does generating findings that mention frameworks (OWASP, NIST, GDPR, etc.) create any implied-certification risk? Suggested wording?
3. Export controls: the software uses only hashing (SHA-256) from the Node.js standard library. Any classification or notice needed?
4. If paid support or a hosted service is added later: terms of service, privacy policy, data-processing agreement, and liability caps to prepare.
5. Software published to a registry (npm) under the maintainer's personal name vs. an entity: recommend a structure?
6. Accessibility law exposure for the public documentation site (WCAG 2.2 AA is the design target; a formal audit has not been done).

## Facts counsel may need

- Maintainer: Vatsal Shah (individual); no company entity exists for the project. Jurisdiction: to be stated by the owner.
- Repository: https://github.com/shahvatsalofficial/archsutra-ai (public, Apache-2.0).
- Runtime dependencies: none. Dev dependencies: TypeScript (Apache-2.0), @types/node (MIT).
- Telemetry, accounts, payments, user data stored by the project: none.
- AI-generated content: parts of the code and documentation were written with an AI assistant (Claude) under the maintainer's direction and review. Counsel may wish to address copyright authorship and provenance statements.

## Status

| Step | Status |
|---|---|
| Brief prepared | Done |
| Counsel engaged | Not yet (owner action) |
| Opinion received | Not yet |
