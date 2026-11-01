# Real-world evaluation

<!-- summary: How ArchSutra's findings were measured on 52 public repositories, the honest results, what was fixed because of them, and the limits. -->

This is the evidence behind the accuracy claims. It replaces the earlier fixture-only numbers, which were a regression guarantee and not an accuracy estimate.

## Summary

| Batch | Purpose | Repos | Findings | Sampled and labeled | Precision (95% CI) | Actionable (95% CI) |
|---|---|---|---|---|---|---|
| tuning, **v0.1.0 baseline** | find problems | 24 | 91 | 48 | **50%** (36 to 64) | 29% (18 to 43) |
| holdout, after round-1 fixes | first unseen test | 14 | 48 | 29 | **69%** (51 to 83) | 34% (20 to 53) |
| holdout2, after round-2 fixes | final unseen test | 14 | 40 | 21 | **95%** (77 to 99) | 52% (32 to 72) |

- **Precision** = the code at the cited location is a genuine instance of what the rule claims.
- **Actionable** = a maintainer of that project would plausibly change something. Many genuine matches are intentional, low-risk or by design (for example `eval` of a developer-typed value in a migration tool). This is the number to keep in mind when reading a report: **roughly half of the valid findings need no action.**
- Critical and high findings only: baseline 52% (34 to 69), holdout 50% (27 to 73), holdout2 90% (60 to 98).
- Confidence intervals are Wilson 95% intervals. Samples are small, so intervals are wide.

Full tables: [`docs/proof/realworld/`](../proof/realworld/summary.md) (`summary.md`, `summary-holdout.md`, `summary-holdout2.md`), per-repository timings in `results*.json`, every label with its reason in `labels*.json`.

## What the progression means

The jump from 50% to 95% is **partly an artifact of fixing**. Each round of fixes was designed from the false positives of the previous batch, so the first batch is the honest "before", the second is a fair unseen test of round 1, and the third is a fair unseen test of round 2. The third batch also contains a different mix of repositories (fewer very tangled monorepos, which produced many cycle findings), so the improvement is not purely from the fixes. Treat **roughly 70% to 95% precision on unseen repositories, with about half of valid findings actionable** as the honest range, not a single number.

The most recent fix (JWT `verify=False` no longer reported as TLS verification) came from a holdout2 finding and has **not** been re-measured on new data.

## Method

1. **Repositories.** 52 public repositories chosen before running anything: mature frameworks and libraries (Express, Django, Flask, Vue, webpack, ...) and deliberately vulnerable training apps (NodeGoat, Juice Shop, DVWA, WebGoat, terragoat, ...). The full list with batch assignment is in `scripts/realworld-repos.json`. Languages: JS/TS, Python, Java, PHP, Ruby, Go, Terraform, Kubernetes/Shell.
2. **Acquisition.** Shallow `git clone --depth 1` into a temporary directory. Commit SHAs are recorded in `results*.json`. Code is only read, never executed.
3. **Run.** The CLI audit (`runAudit`) on each repository. Timings recorded.
4. **Sampling.** Stratified, deterministic (seeded) sample: up to 4 findings per rule per repository kind (6 for secrets) among findings that have a concrete file and line. Findings that are absences (no CI, no tests, no lockfile) have no line to check and are not sampled.
5. **Labeling.** Each sampled finding was labeled `valid`, `false_positive` or `unclear` by reading the cited line in context, with a written reason. `unclear` items are excluded from precision.
6. **Reporting.** `node scripts/realworld.mjs report [batch]` joins samples with labels and prints precision with Wilson intervals.

Reproduce:

```bash
npm ci && npm run build
node scripts/realworld.mjs run "$TMPDIR/rw" tuning            # 24 repos (baseline needs the v0.1.0 build)
node scripts/realworld.mjs run "$TMPDIR/rw" holdout holdout
node scripts/realworld.mjs run "$TMPDIR/rw" holdout2 holdout2
node scripts/realworld.mjs report holdout2
node scripts/labeled-recall.mjs "$TMPDIR/rw"
```

The baseline sample can be regenerated exactly with `ARCHSUTRA_DIST=<path to a v0.1.0 build>`; repositories move on, so fetch the recorded commits for exact reproduction.

## Limitations (read these)

1. **Single labeler.** Labels were assigned by one reviewer (an AI model reading the cited code), not by independent humans. It can be wrong and may be biased toward the rules' own definitions. Labels are published so anyone can challenge them by pull request.
2. **Small samples.** 21 to 48 labeled findings per batch; intervals are wide.
3. **Recall is not measured on real code.** No ground truth exists for "all issues in these repositories". Only the retention of labeled true positives after fixes was checked (below).
4. **Sampling excludes absence findings** (no CI/tests/lockfile/README), which are mostly reliable but not evaluated here.
5. **Rule fixes were designed on the tuning and holdout false positives**; the final numbers are not independent of the maintainers' choices.
6. **Vulnerable-by-design repositories** inflate the true-positive share of security findings relative to normal projects.

## Retention of labeled true positives

After the fixes, the current build was re-run on the same repositories and every `valid`-labeled finding was looked up again (`scripts/labeled-recall.mjs`, output in `docs/proof/realworld/labeled-recall.json`):

| Measure | Result |
|---|---|
| Labeled valid findings still reported | **59 of 64** (92%) |
| Labeled false positives now suppressed | 33 of 34 |

The 5 valid findings no longer reported are deliberate trade-offs: a key literal inside a code comment, two development-container Dockerfiles, one CI-only Dockerfile, and one SQL-concatenation line that no longer matches the narrower SQL rule. The one remaining false positive is a test constant in a CI workflow file.

## What changed in the rules because of this

| Problem found | Fix |
|---|---|
| Secrets rule fired on dummy values, option names, template text, doc files | value plausibility check (length, character classes, dummy list, interpolation), skip comments, vendored/minified files, `.rst`/`.html` docs |
| Cycle rule fired on "(root)" files, data-file imports (`package.json`), test imports, comment-only imports | ignore the root pseudo-module, non-code import targets, test files and commented lines |
| Large-file rule fired on vendored libraries and data tables | skip vendored paths, minified and third-party-headed files, literal-only files |
| Injection rules fired on comments, docstrings, text in backticks, generated code strings | comment and docstring mask; ignore `` `eval(` `` |
| Shell `exec` reported as SQL | SQL rule requires SQL keywords; interpolated `exec` is reported under dynamic execution when `child_process` is used |
| Public 80/443 flagged as over-permissive | port-aware `0.0.0.0/0` check |
| Dev-tooling Dockerfiles flagged | skip `.devcontainer`, `.github`, `.gitpod` |
| `test.js`/`test.ts` not recognised as tests | basename test/spec recognised |
| JWT `verify=False` reported as TLS | exclude lines mentioning jwt/decode/signature |

Each fix has a regression test in `test/archsutra.test.mjs`.

## Comparison with other tools

A manual workflow (`.github/workflows/comparison.yml`, `scripts/compare.mjs`) runs ArchSutra and a pinned Semgrep on the same repositories and reports overlap. **It has not been run yet**; results will be published in `docs/proof/comparison/` after the first run. A comparison against "a plain AI prompt" is not offered because it cannot be made reproducible. See [Trust and assurance](13-trust-and-assurance.md).
