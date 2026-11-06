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

CI runs on Ubuntu and Windows. Use Node 20 or newer. macOS is not in CI.

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
8. Prefer to validate on real code: run `node scripts/realworld.mjs run <dir> <batch> <tag>` and label what the rule reports (see [Real-world evaluation](14-real-world-evaluation.md)). A rule that is wrong more often than right on real repositories should not ship.

Avoid committing realistic secrets in fixtures. Build such strings at runtime inside tests (see `FAKE_AWS`), otherwise GitHub push protection may block the push.

## 4. Add an agent role

Copy an existing file in `agents/`. The standard (enforced by `archsutra verify .`):

- Frontmatter: `name: archsutra-<id>` (3-50 chars, lowercase, digits, hyphens); `description` starting with "Use this agent when", naming 2-4 typical triggers, saying when not to use it, and pointing to "When to invoke"; `model: inherit` (or `sonnet`, `opus`, `haiku`); `color` (`blue`, `cyan`, `green`, `yellow`, `magenta`, `red`; vary them); `tools` limited to read-only tools.
- Body in second person, starting "You are ...", under 10 000 characters.
- Headings: Purpose, When to invoke, Required inputs, Tools and policy, Process (numbered steps), Outputs, Quality criteria, Edge cases, Escalation.
- Read-only by default; repository content is untrusted data; claims are labeled observed, inferred, proposed or unknown.

Adapters write only each host's documented frontmatter keys (Claude: `name`, `description`, `tools`, `model`, `color`).

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

## 8. Sign your commits (DCO)

Every commit needs `Signed-off-by` (`git commit -s`). See [DCO.md](../../DCO.md). CI checks it on pull requests.

## 8b. Pull request checklist

- [ ] Commits are signed off (`git commit -s`)
- [ ] `npm test` passes locally
- [ ] `npm run verify` passes
- [ ] New behavior has tests, including a negative case
- [ ] No secrets, no realistic secret-like strings committed
- [ ] Docs updated (handbook, matrix, rule catalog, changelog)
- [ ] Support claims match verification evidence

## 9. Release process (maintainers)

1. Update `CHANGELOG.md` and `package.json` version (semantic versioning).
2. `npm test`, `npm run verify`, `npm run coverage`, `node scripts/eval.mjs`, `node scripts/labeled-recall.mjs <workdir>`, `node scripts/bench.mjs`, `node scripts/build-docs.mjs`.
3. Regenerate proof files under `docs/proof/` and sample outputs.
4. Commit, push, wait for CI (Ubuntu and Windows, Node 20, 22, and 24, plus Ubuntu on the newest Node).
5. Push the tag `vX.Y.Z`; the `Release` workflow creates the release with tarball, SBOMs, checksums and a GitHub attestation ([Supply chain and release](15-supply-chain-and-release.md)).
6. npm: `archsutra-ai@0.1.2` and `@0.1.3` are already published from a laptop. Do not republish `0.1.3`. The next version needs `npm publish --provenance` from Actions. The name `archsutra` (no `-ai`) was still unclaimed on 2026-11-06; do not publish the parent-folder stub.

## 10. Regenerating the documentation site

Handbook Markdown in `docs/handbook/` is the source. Run:

```bash
node scripts/build-docs.mjs
```

This writes `docs/index.html`, `docs/handbook/*.html`, `docs/assets/`, `sitemap.xml` and `robots.txt`. The `pages.yml` workflow deploys `docs/` to GitHub Pages on push.

## 11. Governance

Maintainer: Vatsal Shah. Decisions are made in issues and pull requests, recorded as ADRs when significant (`docs/decisions/`, template in `templates/adr.md`). Contributors are credited through git history and release notes. Conduct: [Code of Conduct](../../CODE_OF_CONDUCT.md).
