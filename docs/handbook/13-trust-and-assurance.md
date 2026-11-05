# Trust and assurance

<!-- summary: Every question a skeptical reader should ask, the evidence we have, and what is still open, with no rounding up. -->

An independent-style review of this project listed 15 gaps that stop people from trusting a young open-source tool. This page tracks each one. Status values: **Done** (evidence in the repository), **Partly** (some evidence, limits stated), **Pending** (cannot be done by the maintainer alone or needs a first run), **Not possible yet** (needs time or third parties).

| # | Gap | Status | Evidence and honest limits |
|---|---|---|---|
| 1 | Real-world accuracy | **Partly** | 52 public repositories, 98 labeled findings, three batches, precision with confidence intervals: [Real-world evaluation](14-real-world-evaluation.md). Single labeler, small samples, no recall on real code |
| 2 | Live proof in AI IDEs | **Pending** | Layouts checked against vendor docs on 2026-11-01; protocol and empty results log: [smoke tests](../compatibility/smoke-tests/README.md). Needs the owner or community with access to each IDE |
| 3 | Head-to-head comparison | **Pending** | Workflow and script ready ([`comparison.yml`](../../.github/workflows/comparison.yml), `scripts/compare.mjs`); first run needs the repository on GitHub with Actions. A plain-AI-prompt comparison is deliberately not offered (not reproducible) |
| 4 | CI confirmed on all platforms | **Partly** | the v0.1.0 matrix passed (6 jobs); Ubuntu and Windows pass on every later commit; on one later run three macOS jobs never got a runner and GitHub cancelled them (no steps ran), so macOS now runs in its own workflow (`ci-macos.yml`) and no longer affects the main CI result. A passing macOS run is still needed to re-confirm. Dependabot is now limited and grouped to stop queue floods. Needs a fresh green run after the next push |
| 5 | Signed releases, provenance, SBOM | **Partly** | Release workflow builds the tarball, CycloneDX SBOMs, SHA-256 checksums and a signed build-provenance attestation on every tag ([supply chain](15-supply-chain-and-release.md)). First attested release has not happened yet; not published to npm |
| 6 | OpenSSF Scorecard | **Partly** | [Workflow](../../.github/workflows/scorecard.yml) added (publishes results and SARIF). No score exists until it runs on GitHub; do not quote one |
| 7 | Pinned install and pinned actions | **Done** | README and user guide show tag-pinned `npx` usage; every GitHub Action in all workflows is pinned to a commit SHA with a version comment, kept fresh by Dependabot |
| 8 | Performance data | **Done** | [Benchmarks](../proof/benchmarks.md) (synthetic, 200 to 20 000 files) and real-repository timings in `docs/proof/realworld/results*.json`. Found and fixed a gap: added a total-bytes budget and cache cap so memory is bounded |
| 9 | Test coverage | **Done** | 92% lines, 81% branches, 91% functions over `dist/` ([report](../proof/coverage.txt)); CI prints coverage on every run. No threshold is enforced yet |
| 10 | Third-party review | **Not possible yet** | No external review exists. Added: pinned CodeQL, Scorecard, DCO, `security.txt`, ReDoS and hostile-input tests, and an open invitation in [SECURITY.md](../../SECURITY.md). Counts as done only after someone independent reports |
| 11 | Accessibility audit | **Partly** | axe-core on 19 pages x 2 themes: 0 violations after fixing 3 found issues; 22 contrast checks pass ([accessibility](../proof/accessibility.md)). No screen-reader test; no formal conformance claim |
| 12 | Project maturity signals | **Not possible yet** | Added governance, support, templates, CODEOWNERS, [good-first-issue backlog](../community/good-first-issues.md), Discussions. Stars, users and track record take time and cannot be manufactured |
| 13 | Trademark clearance | **Pending** | Informal checks recorded, no formal search: [name clearance](../legal/trademark-and-name-clearance.md). Needs an attorney |
| 14 | Contribution policy | **Done** | DCO adopted ([DCO.md](../../DCO.md)) with a CI check that every PR commit is signed off |
| 15 | Lawyer review | **Pending** | Review-ready brief prepared: [legal review brief](../legal/legal-review-brief.md). Owner must engage counsel |

## What a reader can verify in five minutes

1. `git clone` and `npm ci && npm test` (31 tests).
2. `node scripts/realworld.mjs report holdout2` reproduces the headline accuracy table from the committed samples and labels.
3. Read ten labels in `docs/proof/realworld/labels-holdout2.json` and open the cited lines.
4. `npm ls --omit=dev` shows no runtime dependencies.
5. Check the Actions page for the matrix, CodeQL and (after first run) Scorecard.

## Claims we deliberately do not make

- No certification of security, compliance or accuracy.
- No claim that "no findings" means "no problems".
- No claim of support in any AI IDE beyond "files written in the documented layout".
- No Scorecard number, star count or user count.
- No comparison win against other scanners.

## What would change these statuses

| To reach | Needs |
|---|---|
| Gap 2 Done | A passing smoke-test row per host |
| Gap 3 Done | One run of the comparison workflow, results reviewed by a human |
| Gap 4 Done | A green run of the full matrix on the latest commit |
| Gap 5 Done | Push a version tag; verify the attestation with `gh attestation verify` |
| Gap 6 Done | Scorecard run completes; link the public result |
| Gap 10 Done | An independent security review or audit report |
| Gap 13 and 15 Done | An attorney's written clearance and document review |
