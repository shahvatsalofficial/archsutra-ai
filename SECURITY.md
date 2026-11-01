# Security Policy

## Reporting a vulnerability

Use GitHub's private vulnerability reporting: **Security tab -> Report a vulnerability** on
https://github.com/shahvatsalofficial/archsutra-ai/security/advisories/new

Please include affected version, reproduction steps and impact. Do not open a public issue for undisclosed vulnerabilities. A machine-readable contact is published at `/.well-known/security.txt` on the documentation site.

Target response times (best effort, maintained by volunteers): acknowledgement within 7 days, status update within 30 days, coordinated disclosure after a fix is released or 90 days, whichever is first. Reporters are credited unless they prefer otherwise.

## Supported versions

Only the latest `0.x` release receives fixes.

## Security model

- The CLI is read-only except `export`, `install` and `uninstall`, which write only inside the chosen project directory.
- No network access, telemetry or model calls.
- Symlinks are not followed. All writes go through a path-containment check.
- Scans are bounded by file count, per-file size, total bytes and time; pathological lines are skipped.
- Findings never contain secret values; excerpts are redacted.
- Installs record SHA-256 hashes; `uninstall` leaves user-modified files in place.
- Releases carry SBOMs, checksums and a signed build-provenance attestation; GitHub Actions are pinned to commit SHAs. See `docs/handbook/15-supply-chain-and-release.md`.

## Independent review

No independent security review or audit of this project has been performed. **One is welcome.** If you review the code, please tell us what you covered and found, by advisory if it is a vulnerability or by issue if it is not. Scope that matters most: path handling in `src/fsutil.ts` and `src/adapters.ts`, regular expressions in `src/audit.ts` and `src/redact.ts`, and the install/uninstall logic.

## Out of scope

Findings produced by ArchSutra are heuristic review aids, not proof of absence of vulnerabilities and not a compliance attestation. Reports about the intentionally vulnerable sample repositories used in the evaluation are out of scope.

## Responsible use

Run ArchSutra only on code you are authorized to review.
