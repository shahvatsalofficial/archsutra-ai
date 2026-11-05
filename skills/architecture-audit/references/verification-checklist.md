# Verifying a finding before you report it

Scanners and your own pattern matching produce leads. Run each lead through these questions. A finding that fails a question is dropped or downgraded, and that is the correct outcome.

1. **Is the location real?** Open the file at the cited lines. Does the code say what the finding claims?
2. **Is it executable code?** Reject matches inside comments, docstrings, documentation, generated or vendored files, minified bundles, and test data.
3. **Is it the right claim?** Shell command interpolation is not SQL injection; `verify=False` on a JWT decode is not disabled TLS; a mention of `eval()` in a description string is not a call.
4. **Is the value a real secret?** `password: 'password'`, option names, template text, example keys and public identifiers (such as search-only or browser keys) are not credentials. A committed private key is a finding even if it is a test key; say so.
5. **Can attacker-influenced input reach it?** If the interpolated value is a constant, an internal identifier or already escaped, the pattern is real but the risk is low. Report it as low confidence or as hardening.
6. **Would the owners act on it?** Dev containers, benchmarks, examples and intentionally vulnerable training code are valid matches that rarely need action. Say so in the caveats.
7. **Is the severity honest?** Severity is impact if true. Confidence is how sure you are that it is true. Keep them separate.

Record what you checked in the finding's caveats, for example "interpolated value is a table name returned by `quote_name`; low risk".

## Measured context

On 52 public repositories, hand-labeled: baseline precision 50%, then 69% and 95% on unseen batches after rule fixes. About half of valid findings were not worth acting on. Do not repeat these numbers as a guarantee; they come from small samples and one labeler. Use them to remind yourself that verification is not optional.
