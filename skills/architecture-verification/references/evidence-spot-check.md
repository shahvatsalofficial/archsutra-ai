# Evidence spot-check procedure

For each sampled finding:

1. Write the claim in one sentence ("`src/services/user.ts:2` builds SQL from `${id}`").
2. Open the file at the cited lines with 3 lines of context. Confirm the file exists, the line numbers are right and the code matches the claim.
3. Classify:
   - **Confirmed**: the code does what the finding says.
   - **Confirmed, lower risk**: real pattern, but the input is constant, internal or escaped. Lower confidence or severity and add a caveat.
   - **Wrong claim**: real code, wrong category (for example shell interpolation reported as SQL). Correct the finding or remove it.
   - **Not code**: comment, docstring, documentation, generated, vendored or test data. Remove it.
   - **Cannot reproduce**: file or line missing. Mark `unknown` or remove it.
4. Record the result next to the finding id.

## Sampling

- Check every critical and high finding if there are fewer than ten; otherwise at least five, chosen to cover each rule or category at least once.
- Add two medium or low findings picked at random (not the easiest ones).
- If more than one in five sampled findings fails, widen the sample to all findings of the failing rule and tell the reader that the rule is noisy here.

## Report line format

```text
AS-SEC-005#002  confirmed         src/services/user.ts:2  call site passes request.params.id
AS-SEC-004#001  lower risk        src/lib/xml.ts:12       new Function with constant string; confidence lowered to low
AS-ARC-001#004  not code          docs/guide.md:9         diagram text, removed
```

## Common traps

- Line numbers shift when the file changed after the scan: search for the code, do not trust the number blindly.
- The same line can be flagged by two rules; keep the one that states the real problem.
- Counts in the summary (for example "12 findings") must be recomputed after removals.
