# Benchmarks (synthetic repositories)

Environment: win32 10.0.26300, 14 CPU (Intel(R) Core(TM) Ultra 7 155U), 31 GB RAM, Node v24.15.0. Reproduce: `node scripts/bench.mjs`.

| Case | Files generated | Files scanned | Truncated | Time (ms) | Peak RSS (MB) |
|---|---|---|---|---|---|
| small | 200 | 201 | false | 674 | 57 |
| medium | 1000 | 1001 | false | 1768 | 94 |
| at default limit | 5000 | 5000 | true | 15189 | 233 |
| over limit (20k files, truncated) | 20000 | 5000 | true | 8672 | 234 |

Synthetic files are uniform, so real repositories differ. See `docs/proof/realworld/results.json` for timings on real projects. The scan is bounded by design (5000 files, 512 KiB per file, 120 MiB total, 15 s traversal); the over-limit case demonstrates truncation is reported rather than silent.
