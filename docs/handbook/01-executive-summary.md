# Executive summary

<!-- summary: The problem ArchSutra AI solves, what it delivers, what it costs, what it does not do, and the risks. -->

## The problem

Software architecture decays quietly. Dependencies tangle, boundaries blur, secrets leak, and the reasons behind decisions are forgotten. Traditional architecture reviews are expensive, infrequent and hard to reproduce. Generic AI assistants can discuss architecture, but they tend to guess: they invent components, cite no evidence, and give different answers each time.

## The solution

ArchSutra AI combines two things:

1. **Skills and agents** that an AI coding assistant loads. They define *how* to run an architecture audit, design, threat model or modernization plan, with a strict evidence discipline: every claim is tagged `observed`, `inferred`, `proposed` or `unknown`, and observed claims cite `file:line`.
2. **A deterministic CLI** that scans a repository offline and produces reproducible evidence: module map, dependency cycles, security and delivery findings, a scorecard, and reports in Markdown, Mermaid, JSON and SARIF.

The assistant's own model does the semantic reasoning. The CLI does the repeatable measuring. Neither needs an ArchSutra account or API key.

## Value

| Benefit | How it is delivered |
|---|---|
| Faster architecture reviews | One command produces a first-pass audit in seconds |
| Reproducible, auditable output | Stable finding IDs, evidence with file and line, versioned JSON schema |
| Lower cost | No server, no per-call fees from ArchSutra; uses the IDE you already pay for |
| Safe by default | Read-only, offline, redacted secrets, reversible installs |
| Works where developers work | Claude Code, Cursor, Codex, GitHub Copilot, Gemini CLI |
| Fits CI | `audit --fail-on high` gates pull requests; SARIF feeds code scanning |

## What it is not

- Not a certification, compliance attestation, or legal opinion.
- Not a replacement for a human architect or a penetration test.
- Not a runtime profiler: reliability, performance, scalability, data integrity and cost are marked **not assessed** unless evidence is supplied.
- Not (yet) validated inside each live AI IDE. See [compatibility](09-compatibility-and-roadmap.md).

## Status

Version 0.1.0 is released. It is implemented in TypeScript with zero runtime dependencies and has 20 automated tests that pass on Windows, macOS and Linux in CI. Evidence is in [Testing and proof](08-testing-and-proof.md).

## Cost and licensing

Free and open source under Apache-2.0. Running the CLI costs nothing. Using the skills consumes your AI IDE's normal usage allowance. Any future server or bring-your-own-key mode would call third-party model providers at the user's expense and is **not** part of v0.1.

## Key risks

| Risk | Impact | Mitigation | Owner |
|---|---|---|---|
| Heuristic rules produce false positives or miss issues | Wasted effort or false comfort | Each finding lists caveats and confidence; labeled-fixture evaluation; reports say absence of findings is not proof | Maintainers |
| Host IDE skill layouts change | Install writes to a stale path | Adapters labelled `adapter`/`experimental`; `doctor`; smoke-test issue template | Maintainers, community |
| Prompt injection from repository content | Agent follows hostile text | Skills treat repo content as data; agents are read-only; residual risk documented | Users, host vendors |
| Name collision or trademark claim on "ArchSutra" | Rebranding cost | No registration or clearance search done; npm and GitHub exact-name checks were clear on 2026-10-31 | Creator |
| Single-maintainer project | Bus factor | Open license, contributor docs, CI, full handbook | Creator |

## Decisions needed from the owner

1. Trademark clearance for "ArchSutra" before any commercial use or paid offering.
2. Whether to publish to the npm registry (names `archsutra-ai` and `archsutra` were unclaimed when checked).
3. Priorities for the next milestone (live host smoke tests, more language analyzers, optional model runtimes).

## Where to go next

- How it works: [Architecture](04-architecture.md)
- Try it: [User guide](05-user-guide.md)
- Trust it: [Security, privacy and legal](07-security-privacy-legal.md) and [Testing and proof](08-testing-and-proof.md)
