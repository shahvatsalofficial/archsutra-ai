# Finding seams

A seam is a place where you can change behavior without editing the code around it. Good seams are where a part can be replaced or extracted with the least coordination.

## Signals of a good seam

- **Few inbound dependencies.** Count how many other modules import it (`archsutra map` edges help). Fewer means safer to extract.
- **A narrow, stable interface.** A handful of functions or endpoints that rarely change.
- **Owned data.** The part reads and writes tables nobody else touches. Shared tables are the usual blocker.
- **A different rate of change or scaling need** from its neighbors.
- **A natural team boundary.**
- **Existing tests** or a contract that can be turned into tests quickly.

## Signals of a bad seam

- Circular dependencies with its neighbors (break the cycle first).
- Shared mutable state or a shared database table with several writers.
- Business rules spread across layers with no single home.
- Hidden consumers (batch jobs, reports, spreadsheets) that read its internals.

## Techniques

| Technique | Use when | Watch out for |
|---|---|---|
| Anti-corruption layer | The new part must talk to legacy concepts | Becomes permanent if no exit date is set |
| Branch by abstraction | Replacing an implementation behind an interface | Keep both implementations tested until removal |
| Strangler facade or routing | Moving traffic gradually by route or tenant | Decide how to route and how to roll back traffic |
| Parallel run (dual run) | High-risk logic: compare old and new outputs | Cost, side effects must be suppressed in the shadow path |
| Feature flags | Gradual rollout | Remove flags promptly; they are debt |
| Change data capture or events | Keeping new and old data in sync | Ordering, idempotency, lag monitoring |

## Output

For each candidate seam give: name, inbound dependency count, owned data, interface summary, risk (low, medium, high) with reason, and the first cheap experiment that would confirm it.
