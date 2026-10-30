# RFC 0001: ArchSutra AI v0.1

Author: Vatsal Shah. Status: accepted for v0.1.

## Goal

Give any developer an evidence-first architecture reviewer that runs on the AI IDE they already use, with no extra API key, plus deterministic tooling that works offline.

## Scope (v0.1)

- Five canonical skills and twelve agent role contracts.
- Deterministic CLI: map, audit, verify, export, install, uninstall, doctor, init, hosts.
- Adapters for Claude Code, Cursor, Codex, Copilot, Gemini CLI.
- Outputs: Markdown, Mermaid, JSON, SARIF.

## Non-goals (v0.1)

- Server mode, BYOK provider runtime, local-model runtime (planned, strictly opt-in, separate from the keyless path).
- Semantic analysis inside the CLI. Only the IDE model reasons.
- Compliance or certification claims.
- Languages beyond JS/TS/Python import graphs.

## Design

1. One canonical source (`skills/`, `agents/`); adapters render host layouts.
2. CLI emits findings with stable IDs and evidence; skills consume them and add judgement.
3. Honest capability labels; no host is called `native` until smoke-tested.
4. Security by default: read-only, no network, redaction, bounded scans, reversible installs.

## Milestones

| Milestone | Acceptance test |
|---|---|
| v0.1 | `npm test` green on 3 OS in CI; audit of fixture repos matches expected rule IDs |
| v0.2 | Live smoke test report per host; compatibility matrix upgrades |
| v0.3 | More language analyzers; fitness-function generator |
| v0.4 | Optional local-model and BYOK server, off by default |

## Open questions

- Final npm package name and scope (check availability before publishing).
- Trademark check for "ArchSutra" before any commercial use (release-blocking business check; not performed).
