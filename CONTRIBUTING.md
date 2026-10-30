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
2. Every new audit rule needs: a seeded true-positive test, a false-positive test, a `caveats` text, and evidence with `file:line`.
3. Never print secret values. Use `redact()`.
4. Do not claim host support you have not tested. Update [docs/compatibility/matrix.md](docs/compatibility/matrix.md) with the exact host version and what you ran.
5. Keep `SKILL.md` files concise (<500 lines); put detail in `references/`.
6. Do not commit real or realistic-looking secrets, even in tests. Build fixtures at runtime.

## Add an agent specialization

Copy an existing file in `agents/`, keep the required headings (Purpose, When to invoke, Required inputs, Tools and policy, Outputs, Quality criteria, Escalation). `archsutra verify .` enforces them.

## Add a host adapter

Add a `HostSpec` in `src/adapters.ts` with the documented paths, link the vendor docs, start as `experimental`, and add the host to the install roundtrip test.

## Pull requests

Small, focused PRs. Run `npm test` and `npm run verify`. Describe what changed and how you verified it.

## Good first issues

New analyzer rule, new language import graph, fixture repos, docs fixes, host smoke-test reports.
