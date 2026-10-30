# Example: brownfield monolith

A small layered monolith with deliberate problems, used to demonstrate ArchSutra AI and to evaluate its rules.

- Source: [`fixtures/brownfield-monolith`](../../fixtures/brownfield-monolith)
- Expected rule IDs: [`expected.json`](../../fixtures/brownfield-monolith/expected.json)
- Real tool output: [`sample-output/`](sample-output/audit-report.md)

Reproduce:

```bash
npm ci && npm run build
node dist/cli.js audit fixtures/brownfield-monolith
node dist/cli.js map fixtures/brownfield-monolith
node scripts/eval.mjs
```

The clean counter-example is [`fixtures/clean-service`](../../fixtures/clean-service) (expected: no findings).
