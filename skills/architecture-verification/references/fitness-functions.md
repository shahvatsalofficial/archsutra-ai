# Fitness functions

A fitness function is a check that fails the build when an architecture rule is broken. Propose one only for a rule the report actually relies on, and say whether it runs today.

## Shape

| Field | What to write |
|---|---|
| Rule | The architecture rule, in one line |
| Check | The command or test that fails when the rule breaks |
| Where it runs | CI job, or "not automated" |
| Exists today | yes or no, with the file or command if yes |

## What ArchSutra already runs

These are structural. They do not prove the architecture is sound.

| Rule | Check | Exists today |
|---|---|---|
| Skills and agents match the contract | `archsutra verify` | yes |
| Relative links in Markdown resolve | `archsutra verify` | yes |
| Mermaid blocks are structurally plausible | `archsutra verify` | yes |
| `findings.json` matches schema 1.0.0 | `archsutra verify` | yes |
| No high-severity audit finding in this repo | `archsutra audit . --fail-on high` | yes, in CI for this repository |

## What to propose when the report needs it

| Rule the report uses | A check worth proposing | Exists in ArchSutra today |
|---|---|---|
| No import cycles | Fail CI when `archsutra map` reports a cycle, or use dependency-cruiser / ArchUnit | the map detects cycles; a failing gate is not generated for the user's repo |
| Dependencies point the right way | A layer test: `db` must not import `api` | detection only (`AS-ARC-002`); no generated test |
| Forbidden imports | A test that fails if a named module imports a named package | no |
| A security rule stays fixed | `archsutra audit . --fail-on <severity>` in the user's CI | the command exists; wiring it is the user's change |

Say "not automated" when the row is only a proposal. Do not describe a proposed check as already running.
