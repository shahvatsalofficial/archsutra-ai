# ADR-0001: Deterministic CLI plus IDE-native skills

- Status: accepted
- Date: 2026-10-31
- Deciders: Vatsal Shah

## Context

Users want AI architecture review without managing another API key. Shell scripts cannot call an IDE's authenticated model, and scraping IDE credentials is unsafe and unsupported.

## Options

1. Server that calls provider APIs (needs keys, costs money, uploads code).
2. Skills only (no reproducible evidence, hard to test).
3. Skills for reasoning plus a deterministic CLI for evidence.

## Decision

Option 3. Skills run on the IDE's model through its documented skill mechanism. The CLI produces reproducible, testable evidence and never calls a model.

## Consequences

- Positive: no extra key, offline, testable, safe by default.
- Negative: semantic workflows only work inside a supporting IDE; CLI rules are heuristic.
- Revisit when a host exposes a supported programmatic inference API, or when opt-in server mode is built.
