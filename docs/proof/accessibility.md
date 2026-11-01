# Accessibility audit of the documentation site

Method: axe-core 4.10.2 (tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice) run inside a real browser (the Claude desktop app's built-in Chromium-based browser pane) against every generated page, at 1280 px width, in both light and dark themes.

Date: 2026-11-01. Pages: 19 (landing, 13 handbook pages, 5 reference pages). Runs: 38 (19 pages x 2 themes).

## Result

| | First run (before fixes) | Final run |
|---|---|---|
| Runs completed | 25 of 38 (browser pane throttled timers) | 38 of 38 |
| Violations | 3 rule types | **0** |
| Passed checks (sum over runs) | 1135 | 1642 |
| Incomplete checks | color-contrast (needs manual review) | color-contrast (needs manual review) |

### Issues found by the first run and fixed

| Rule (impact) | Cause | Fix |
|---|---|---|
| landmark-unique (moderate) | Every table wrapper used the same `aria-label="Table"` | Unique label per table: `Table N: <section heading>` |
| scrollable-region-focusable (serious) | Scrollable code blocks were not keyboard reachable | `tabindex="0"` on code `<pre>` |
| color-contrast (serious) | Mermaid edge labels on the default theme | Explicit Mermaid theme variables for light and dark |

## Manual contrast check of design tokens

axe reports contrast as "incomplete" where it cannot compute a background (for example gradients and SVG). Token pairs were computed directly with the WCAG formula by `scripts/contrast.mjs`; all 22 checks pass.

| Pair | Light | Dark | Required |
|---|---|---|---|
| Body text on page background | 17.2 | 16.1 | 4.5 |
| Muted text on page background | 6.3 | 8.3 | 4.5 |
| Muted text on card surface | 6.5 | 7.7 | 4.5 |
| Link/accent on background | 7.7 | 8.8 | 4.5 |
| Current-page nav text on accent tint | 6.7 | 7.0 | 4.5 |
| Primary button text on accent | 7.9 | 8.8 | 4.5 |
| Focus ring against background (non-text) | 7.7 | 8.8 | 3.0 |

Full table: [contrast.json](contrast.json).

## Built-in accessibility features

Skip link; semantic landmarks (`header`, `nav`, `main`, `aside`, `footer`); one `h1` per page; keyboard-reachable tables and code blocks; visible `:focus-visible` outline; `prefers-reduced-motion`; `prefers-color-scheme` plus a manual toggle; responsive layout down to 320 px; print stylesheet; diagrams have a caption and fall back to readable source text.

## Not covered (be aware)

- Automated checks find roughly a third to a half of WCAG issues; manual testing is needed for the rest.
- No screen-reader walkthrough (NVDA, JAWS, VoiceOver) has been done yet. Good first issue: see `docs/community/good-first-issues.md`.
- Rendered diagrams (SVG from Mermaid) are not described by text alternatives beyond their captions and the surrounding prose.
- No formal VPAT or conformance statement. The design target is WCAG 2.2 AA; conformance is not claimed.

## Reproduce

Serve `docs/` locally (any static server), open a page, inject axe-core from a CDN, and run `axe.run()` with the tags above. The contrast table: `node scripts/contrast.mjs`.
