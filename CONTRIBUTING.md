# Contributing to ArchSutra AI

Thanks for helping. Attribution: the project was created by Vatsal Shah; every contributor is credited through git history and release notes.

## Setup

```bash
git clone https://github.com/shahvatsalofficial/archsutra-ai
cd archsutra-ai
npm ci
npm test
```

## Ground rules

1. The CLI stays deterministic, offline and read-only by default.
2. **Sign off every commit** (`git commit -s`): we use the [Developer Certificate of Origin](DCO.md). CI checks pull requests.
3. Every new audit rule needs: a seeded true-positive test, a false-positive test, a `caveats` text, and evidence with `file:line`. Validate it on real repositories when you can (see the [contributor guide](docs/handbook/10-contributor-guide.md) and [real-world evaluation](docs/handbook/14-real-world-evaluation.md)).
4. Never print secret values. Use `redact()`.
5. Do not claim host support you have not tested. Add a row to [docs/compatibility/smoke-tests/README.md](docs/compatibility/smoke-tests/README.md) with the exact host version and evidence.
6. Keep `SKILL.md` files concise (<500 lines); put detail in `references/`.
7. Do not commit real or realistic-looking secrets, even in tests. Build fixtures at runtime.
8. Do not add runtime dependencies without a maintainer decision (an ADR).
9. Claims about accuracy, security or compliance need evidence in the pull request.

## Add an agent specialization

Copy an existing file in `agents/` and follow the agent standard in the [contributor guide](docs/handbook/10-contributor-guide.md): trigger-style `description`, `model`, `color`, read-only `tools`, a second-person body, and the headings Purpose, When to invoke, Required inputs, Tools and policy, Process, Outputs, Quality criteria, Edge cases, Escalation. `archsutra verify .` enforces them.

## Add a host adapter

Add a `HostSpec` in `src/adapters.ts` with the documented paths, link the vendor docs, start as `experimental`, and add the host to the install roundtrip test.

## Report a false positive or a miss

Use the [false-positive template](https://github.com/shahvatsalofficial/archsutra-ai/issues/new?template=false_positive.md). Accepted reports become labeled examples and regression tests, with credit.

## Pull requests

Small, focused PRs. Run `npm test` and `npm run verify`. Describe what changed and how you verified it.

## Good first issues

See [docs/community/good-first-issues.md](docs/community/good-first-issues.md).
