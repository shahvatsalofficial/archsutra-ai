# Worked example (abridged)

Input: a small layered Node.js monolith with a Postgres dependency. The CLI reported 12 findings. After verification the report keeps the ones below.

## Summary

12 findings: 0 critical, 3 high, 7 medium, 2 low. Security `weak`. Maintainability `adequate`. Reliability, performance, scalability, data integrity and cost: `not assessed` (no runtime evidence supplied).

## Finding, as written for the reader

**AS-SEC-005#002: SQL built by string interpolation.** Severity high, confidence medium.

- Evidence (`observed`): `src/services/user.ts:2`, a template literal passed to `db.query` that contains `${id}`.
- Impact: if `id` comes from a request, an attacker can alter the query.
- Verified: `lookup(db, id, expr)` is exported and called from `src/api/routes.ts:2` with a route parameter (`observed`), so the input is externally influenced.
- Fix: pass `id` as a bound parameter: `db.query('SELECT * FROM users WHERE id = $1', [id])`.
- Verification: add a test that sends `1 OR 1=1`; the query must return no rows and must not throw a syntax error.
- Acceptance: no query in `src/` builds SQL from interpolated request data.
- Caveats: only this call site was checked in depth; other call sites were found by pattern only.

## Finding that was dropped

A comment line mentioning `eval()` in `docs/`: not executable code (check 2 of the verification checklist).

## Roadmap excerpt

1. Parameterize queries (S, removes the highest-impact finding).
2. Break the `src/api` and `src/db` cycle by moving shared types down (M; do this before splitting modules).
3. Add CI with tests and `archsutra audit --fail-on high` (S; protects the first two).
4. ADR recommended: "Where does validation live?" (the audit found it in three places).

## Unknowns and unverified

Production topology, traffic, data volumes, incident history. Diagrams were not rendered.
