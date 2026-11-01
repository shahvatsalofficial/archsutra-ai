# Real-world evaluation summary (holdout, holdout)

Repositories audited: 14 of 14. Total findings: 48. Sampled findings with a concrete line: 30. Labeled (excluding unclear): 29.

- **Precision** (code genuinely matches the rule): 69% (95% CI 51% to 83%, n=29).
- **Actionable** (a maintainer would plausibly act): 34% (95% CI 20% to 53%, n=29).
- **Critical and high only:** 50% (95% CI 27% to 73%, n=14).

| Rule | Severity | Labeled | Valid | False positive | Precision | 95% CI |
|---|---|---|---|---|---|---|
| AS-ARC-001 | medium | 2 | 1 | 1 | 50% | 9% to 91% |
| AS-ARC-003 | low | 5 | 4 | 1 | 80% | 38% to 96% |
| AS-IAC-001 | medium | 2 | 2 | 0 | 100% | 34% to 100% |
| AS-OPS-003 | medium | 6 | 6 | 0 | 100% | 61% to 100% |
| AS-SEC-001 | critical | 5 | 4 | 1 | 80% | 38% to 96% |
| AS-SEC-002 | critical | 2 | 2 | 0 | 100% | 34% to 100% |
| AS-SEC-004 | high | 4 | 1 | 3 | 25% | 5% to 70% |
| AS-SEC-005 | high | 3 | 0 | 3 | 0% | 0% to 56% |

Per-repository results: [results-holdout.json](results-holdout.json). Labels with reasons: [labels-holdout.json](labels-holdout.json).
