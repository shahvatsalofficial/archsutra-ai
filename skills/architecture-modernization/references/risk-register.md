# Migration risk register

| ID | Risk | Likelihood | Impact | Early signal | Cheapest early test | Owner | Mitigation | Status |
|---|---|---|---|---|---|---|---|---|
| M1 | Hidden consumers of the old database | medium | high | unknown reports or jobs reading tables | query logs for 2 weeks; ask finance and data teams | tech lead | views or an API as the only access path before the move | open |
| M2 | Data quality worse than assumed | high | medium | nulls, duplicates, orphan rows in a sample | profile 5% of the data before designing the migration | data owner | cleansing step with counts and a reject file | open |
| M3 | Team capacity drops during migration | medium | high | velocity falls, slices slip | track slice lead time from the first slice | manager | limit work in progress; stop adding scope | open |
| M4 | Vendor limit blocks the target | low | high | quota or throttling in a load test | load test the riskiest path first | architect | alternative provider or batching | open |
| M5 | Rollback not actually possible | medium | high | rollback step never exercised | rehearse rollback in staging per slice | tech lead | block rollout until rehearsed | open |

Rules: rate likelihood and impact with reasons, not feelings; every risk gets a cheap test that can be run early; review the register at each slice boundary.
