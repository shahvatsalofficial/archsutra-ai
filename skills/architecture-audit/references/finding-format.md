# Finding format

| Field | Rule |
|---|---|
| id | `AS-<AREA>-<NNN>#<seq>` stable per rule |
| severity | critical, high, medium, low, info |
| confidence | high (proven by code), medium (pattern + context), low (co-location or inference) |
| evidence | `path:startLine-endLine` plus kind: observed, inferred, unknown |
| fix | specific change, plus a safer alternative when one exists |
| verification | how to prove the fix (test, command, tool) |
| acceptance | observable pass condition |

Severity guide: critical = exploitable now with major impact; high = serious weakness with plausible exploit or outage; medium = meaningful risk or debt; low = hygiene; info = observation.
