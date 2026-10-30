# Third-party notices

## Runtime dependencies

None. `npm ls --omit=dev` is empty and CI enforces it. The published package ships only this repository's own code.

## Development-only dependencies (not shipped to users of the CLI)

| Package | License | Purpose |
|---|---|---|
| typescript | Apache-2.0 | compile `src/` to `dist/` |
| @types/node | MIT | Node.js type definitions |

Transitive dependencies of these packages are listed in `package-lock.json`.

## Referenced standards and projects (not bundled)

OWASP Top 10, OWASP ASVS, OWASP Top 10 for LLM Applications, C4 model, ADR (Michael Nygard), Mermaid, SARIF 2.1.0, Agent Skills specification, STRIDE. Referenced by name and link for review guidance. Their content is not copied. Each remains the property of its owners.

## Optional CDN script in generated HTML docs

The HTML handbook loads `mermaid` (MIT) from the jsDelivr CDN at a pinned version, only to draw diagrams in the browser. Without network access the diagram source is shown as text.
