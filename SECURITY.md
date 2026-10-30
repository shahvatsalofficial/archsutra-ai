# Security Policy

## Reporting a vulnerability

Use GitHub's private vulnerability reporting: **Security tab -> Report a vulnerability** on
https://github.com/shahvatsalofficial/archsutra-ai/security/advisories/new

Please include affected version, reproduction steps and impact. Do not open a public issue for undisclosed vulnerabilities.

Target response times (best effort, maintained by volunteers): acknowledgement within 7 days, status update within 30 days.

## Supported versions

Only the latest `0.x` release receives fixes.

## Security model

- The CLI is read-only except for `export`, `install` and `uninstall`, which write only inside the chosen project directory.
- No network access, telemetry or model calls.
- Symlinks are not followed. All writes go through a path-containment check.
- Findings never contain secret values; excerpts are redacted.
- Installs record SHA-256 hashes; `uninstall` leaves user-modified files in place.

## Out of scope

Findings produced by ArchSutra are heuristic review aids, not proof of absence of vulnerabilities and not a compliance attestation.

## Responsible use

Run ArchSutra only on code you are authorized to review.
