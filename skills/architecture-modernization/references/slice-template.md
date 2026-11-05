# Migration slice template

Copy once per slice. A slice must be shippable on its own and reversible.

```text
Slice N: <short name>
Outcome served: <which measurable outcome, with the number>
Scope: <what moves or changes, and what explicitly does not>
Depends on: <slices or tasks that must land first>

Interop while both exist:
  - routing / facade: <how requests choose old or new>
  - data: <expand, migrate, contract steps; who writes where; how consistency is kept>
  - consumers: <who is affected, how they are notified, deprecation date>

Safety net:
  - characterization tests: <what behavior is pinned>
  - contract tests: <which boundaries>
  - parallel run or shadow comparison: <yes/no, what is compared>

Rollout:
  - steps: <canary, percentage, tenant by tenant>
  - monitoring: <metrics and alert thresholds that mean stop>

Rollback:
  - how: <exact steps>
  - tested on: <date or "not yet: slice not ready">
  - point of no return: <step after which rollback is not possible> gated by <approval>

Verification (observable): <what proves it worked, with numbers>
Exit criteria: <old path deleted, flags removed, docs updated>
Risks: <top 2 with mitigation>
Effort: S / M / L
```

## Example (abridged)

```text
Slice 2: Extract invoicing PDF rendering
Outcome served: cut p95 checkout latency from 2.1 s to under 1.0 s
Scope: PDF generation moves to a worker behind a queue; invoice data model unchanged
Rollback: flag routes rendering back to the in-process path; tested in staging on 2026-03-02
Point of no return: deleting the in-process renderer (needs two weeks of clean metrics)
```
