# Contributor guide

<!-- summary: How to set up, extend and release ArchSutra AI; coding rules and review checklist. -->

Short rules are in [CONTRIBUTING.md](../../CONTRIBUTING.md). This is the detailed version.

## 1. Setup

```bash
git clone https://github.com/shahvatsalofficial/archsutra-ai
cd archsutra-ai
npm ci
npm test
```

Windows, macOS and Linux are supported. Use Node 20 or newer.

## 2. Principles

1. Deterministic, offline, read-only by default.
2. Evidence over opinion: every finding cites a location or says it is `unknown`.
3. Never print secrets. Route excerpts through `excerpt()`.
4. Honesty over marketing: support levels, caveats, `not assessed`.
5. Small modules; no new runtime dependency without a maintainer decision.
6. Tests with every behavior change.

## 3. Add an audit rule

1. Pick an ID: `AS-<AREA>-<NNN>` (`SEC`, `ARC`, `OPS`, `SUP`, `IAC`, `AI`, `DOC`).
2. Implement in `src/audit.ts` (line rule in `LINE_RULES`, or a structural check). Fill every Finding field, including `caveats`.
3. Decide test-path behavior (`skipTests`) and doc-file behavior.
4. Add a seeded case to `fixtures/brownfield-monolith` and its `expected.json`, or a new fixture; ensure `clean-service` still yields none.
5. Add a unit test for the true positive and one for a likely false positive.
6. Document in `docs/handbook/12-rule-catalog.md`.
7. Run `npm test`; precision and recall on fixtures must stay 1.00.

Avoid committing realistic secrets in fixtures. Build such strings at runtime inside tests (see `FAKE_AWS`), otherwise GitHub push protection may block the push.

## 4. Add an agent role

Copy an existing file in `agents/`. Keep frontmatter `name: archsutra-<id>` and a one-line `description`. Required headings: Purpose, When to invoke, Required inputs, Tools and policy, Outputs, Quality criteria, Escalation. Keep it read-only. `archsutra verify .` enforces the structure.

## 5. Add or change a skill

`skills/<kebab-name>/SKILL.md` with frontmatter `name` (equal to the directory), `description` (1-1024 characters, say what and when), optional `license`. Keep the body under 500 lines; move detail to `references/`. Follow the [Agent Skills specification](https://agentskills.io/specification).

## 6. Add a host adapter

1. Read the vendor's current documentation. Record the URL.
2. Add a `HostSpec` to `HOSTS` (start as `experimental`).
3. If the host needs a custom agent format, extend `renderAgent` and emit **only** documented keys.
4. The roundtrip test iterates all hosts automatically; add host-specific assertions if needed.
5. Update the compatibility matrix with what you actually tested.

## 7. Code style

- TypeScript strict; no `any` unless interfacing with parsed JSON.
- Prefer pure functions and explicit return types on exports.
- Comments explain *why*; keep them sparse.
- No network, no `child_process` in the CLI.

## 8. Pull request checklist

- [ ] `npm test` passes locally
- [ ] `npm run verify` passes
- [ ] New behavior has tests, including a negative case
- [ ] No secrets, no realistic secret-like strings committed
- [ ] Docs updated (handbook, matrix, rule catalog, changelog)
- [ ] Support claims match verification evidence

## 9. Release process (maintainers)

1. Update `CHANGELOG.md` and `package.json` version (semantic versioning).
2. `npm test`, `npm run verify`, `node scripts/eval.mjs`, `node scripts/build-docs.mjs`.
3. Regenerate proof files under `docs/proof/` and sample outputs.
4. Commit, push, wait for the 6-job CI matrix.
5. Tag `vX.Y.Z` and create a GitHub release with notes copied from the changelog.
6. (Future) publish to npm after name and trademark checks.

## 10. Regenerating the documentation site

Handbook Markdown in `docs/handbook/` is the source. Run:

```bash
node scripts/build-docs.mjs
```

This writes `docs/index.html`, `docs/handbook/*.html`, `docs/assets/`, `sitemap.xml` and `robots.txt`. The `pages.yml` workflow deploys `docs/` to GitHub Pages on push.

## 11. Governance

Maintainer: Vatsal Shah. Decisions are made in issues and pull requests, recorded as ADRs when significant (`docs/decisions/`, template in `templates/adr.md`). Contributors are credited through git history and release notes. Conduct: [Code of Conduct](../../CODE_OF_CONDUCT.md).
