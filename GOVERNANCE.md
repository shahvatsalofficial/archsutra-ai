# Governance

## Roles

| Role | Who | Responsibilities |
|---|---|---|
| Creator and lead maintainer | [Vatsal Shah](https://shahvatsal.com) | Direction, releases, final decisions, security response |
| Maintainer | Invited after sustained, high-quality contributions | Review and merge pull requests, triage issues |
| Contributor | Anyone | Issues, pull requests, smoke-test reports, docs, labeled data |

## How decisions are made

1. Discuss in an issue or GitHub Discussion. Small changes go straight to a pull request.
2. Significant or hard-to-reverse decisions are written as an ADR in `docs/decisions/` (template: `templates/adr.md`) and linked from the pull request.
3. The lead maintainer decides when there is no consensus, and records the reasoning in the ADR.
4. Changes to claims (support levels, accuracy, compliance wording) require evidence in the pull request. See the honesty rules in `CONTRIBUTING.md`.

## Becoming a maintainer

After several merged pull requests of good quality and constructive reviews, the lead maintainer may invite you. Maintainers can be removed for inactivity (12 months) or breaches of the Code of Conduct.

## Releases

Semantic versioning. Tag `vX.Y.Z`; the release workflow builds, tests, packs, creates SBOMs and checksums, and attests provenance. See `docs/handbook/15-supply-chain-and-release.md`.

## Continuity

All project knowledge lives in the repository (handbook, ADRs, RFC). The license (Apache-2.0) allows anyone to fork and continue the project.

## Conduct and security

[Code of Conduct](CODE_OF_CONDUCT.md). Vulnerabilities: [SECURITY.md](SECURITY.md).
