# Supply chain and release

<!-- summary: How releases are built, signed and attested, how to verify them, and which supply-chain controls exist. -->

## Controls

| Control | Where | Status |
|---|---|---|
| Zero runtime dependencies | `package.json`; CI step `npm ls --omit=dev` | enforced in CI |
| Lockfile and clean installs | `package-lock.json`; CI uses `npm ci` | enforced |
| GitHub Actions pinned to commit SHAs | all files in `.github/workflows/` (version in a comment) | done |
| Least-privilege workflow permissions | `permissions: contents: read` by default; elevated only per job | done |
| Dependency updates | Dependabot (weekly, grouped, major TypeScript and Node typings bumps ignored) | configured |
| Static analysis | CodeQL (JavaScript/TypeScript) on push, PR and weekly | configured |
| Project health score | OpenSSF Scorecard workflow, results published | configured; no score yet |
| Developer Certificate of Origin | CI job `dco` on pull requests | configured |
| SBOM | CycloneDX JSON for production and full dependency sets, attached to each release | on release |
| Checksums | `SHA256SUMS` over the tarball and SBOMs | on release |
| Build provenance attestation | `actions/attest` signs the tarball with GitHub's Sigstore-based keyless signing | on release |
| Secret scanning | GitHub secret scanning and push protection (public repositories); our own audit finds no secrets in the tree | enabled by GitHub |
| Vulnerability reporting | GitHub private advisories; `security.txt` | configured |

## Release procedure

1. Update `CHANGELOG.md` and the version in `package.json`, `CITATION.cff`, `llms.txt` and the docs (`node scripts/build-docs.mjs` reads the version).
2. Run `npm test`, `npm run verify`, `node scripts/eval.mjs`, `node scripts/labeled-recall.mjs <workdir>`, `node scripts/bench.mjs`, `node scripts/build-docs.mjs`.
3. Commit with sign-off (`git commit -s`), push, wait for the CI matrix and CodeQL.
4. Tag and push the tag:
   ```bash
   git tag -s vX.Y.Z -m "ArchSutra AI vX.Y.Z"   # or an unsigned annotated tag: git tag -a
   git push origin vX.Y.Z
   ```
5. The `Release` workflow runs tests again, then publishes the release with the tarball, `sbom-production.cdx.json`, `sbom-full.cdx.json`, `SHA256SUMS` and the attestation.
6. Verify (see below) and update `docs/handbook/13-trust-and-assurance.md`.

## Verify a release

```bash
# download the release assets, then:
sha256sum -c SHA256SUMS
gh attestation verify archsutra-ai-X.Y.Z.tgz --repo shahvatsalofficial/archsutra-ai
```

A successful `gh attestation verify` proves the tarball was built by the repository's `Release` workflow at the tagged commit.

## Using the tool safely

- Prefer a pinned reference, not the moving default branch:
  ```bash
  npx github:shahvatsalofficial/archsutra-ai#v0.1.1 audit .
  ```
  Even better, pin a full commit SHA: `npx github:shahvatsalofficial/archsutra-ai#<40-char sha> audit .`.
- `npx github:...` builds from source on your machine (`prepare` runs `tsc`); that requires the dev dependencies (TypeScript) to be installed during the build, which come from the lockfile.
- The release tarball can be inspected before running: `tar -tzf archsutra-ai-X.Y.Z.tgz`.

## Not yet done

| Item | Why |
|---|---|
| Publish to npm | Needs an npm account and a name decision; then use `npm publish --provenance` from the release workflow |
| Signed git tags | Needs the maintainer's signing key |
| Reproducible build verification | The TypeScript build is deterministic in practice but not independently verified |
| SLSA level claim | Provenance exists only after the first tagged release; no level is claimed |
