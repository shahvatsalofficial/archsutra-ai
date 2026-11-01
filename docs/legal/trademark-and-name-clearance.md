# Name and trademark clearance

<!-- summary: What was checked about the name "ArchSutra", what was not, the informal results, and the steps still needed before commercial use. -->

> This is a record of informal checks by the maintainers. It is **not a trademark search, clearance opinion, or legal advice.** Only a qualified trademark attorney, using professional search tools, can clear a name.

## Status

| Item | Status |
|---|---|
| Formal trademark search (USPTO, EUIPO, WIPO Global Brand Database, IP India) | **Not done** |
| Attorney clearance opinion | **Not done** |
| Trademark application filed | **No** |
| Informal web and registry spot checks | Done on 2026-10-31 and 2026-11-01 (below) |
| Domain name | None registered for this project; the site is served from GitHub Pages |

## Informal checks performed

| Check | Date | Result |
|---|---|---|
| npm registry: package `archsutra` | 2026-10-31 | not found (name unclaimed) |
| npm registry: package `archsutra-ai` | 2026-10-31 | not found (name unclaimed) |
| GitHub repository search for `archsutra` | 2026-10-31 | only this project |
| Web search: "ArchSutra" with software, company, trademark | 2026-11-01 | no product, company or trademark record named ArchSutra surfaced; only look-alike names |
| Web search: "Arch Sutra" / "ArchSutra AI" architecture software | 2026-11-01 | no product by either name; the word "Archisutra" appears as a cultural term |

Look-alike names seen in results (not conflicts by themselves, but show a crowded "Arch" naming space in architecture software): Arch Synth, ARCHITEChTURES, Archi Automate (Archi Systems AS), ArchtSoft, ArchiMate (a modeling language, unrelated).

**Limits of these checks:** general web search does not index trademark registers completely; unregistered (common-law) use is invisible to it; similarity analysis (sound, meaning, goods and services) was not performed.

## What "clear" would require

1. Professional search in the jurisdictions where you will operate, covering identical and similar marks in:
   - Nice class 9 (downloadable software) and class 42 (software as a service, software development, technical consulting),
   - class 35 and 41 if you plan consulting or training.
2. Review of phonetic and visual similarity (for example "Archisutra", "Arch Sutra", "ArchSutr") and meaning ("sutra" is a common word in several languages).
3. A written opinion on risk, and a decision: proceed, modify, or rename.
4. If proceeding, file applications in the chosen jurisdictions and monitor for oppositions.
5. Domain and social handle availability checks for the final name.

## Risk-reduction already in place

- Third-party trademarks are used only to describe compatibility, with a non-affiliation notice (`NOTICE`, README, site footer).
- The package and repository name `archsutra-ai` is descriptive and easy to change; code and docs do not embed the name in ways that block a rename (`package.json`, `CITATION.cff`, `scripts/build-docs.mjs`, docs).
- The license (Apache-2.0, section 6) grants no trademark rights to others.

## If a rename becomes necessary

Search-and-replace the product name in: `package.json`, `README.md`, `llms.txt`, `CITATION.cff`, `NOTICE`, `docs/**`, `skills/**` (descriptions), `agents/**`, `src/cli.ts` help text, the `archsutra` binary name, `.archsutra/` directory name used by the installer (provide a migration), and the GitHub repository (GitHub redirects the old URL).
