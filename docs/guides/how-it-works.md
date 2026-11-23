# How it works, in pictures

<!-- summary: Seven diagrams that explain ArchSutra end to end: the pipeline, the three layers, evidence labels, a scan from the inside, how scores are decided, the install lifecycle and the trust boundaries. -->

You can use ArchSutra without reading this page. Read it when you want to know *why* the output looks the way it does and *how far to trust it*. Each picture answers one question.

## 1. The big picture: who does what?

![ArchSutra pipeline: your repository is scanned read-only by the CLI, which produces evidence; your IDE model, guided by ArchSutra skills, verifies the evidence and writes the report](../assets/charts/pipeline.svg)

Two parts, two jobs:

- The **CLI** is a measuring tool. It always gives the same answer for the same input, runs offline and never calls a model. That makes it testable and safe in CI.
- The **skills and agents** are a method for your IDE's model. They stop the model from guessing and make it check its own work.

Neither needs an ArchSutra account or key.

## 2. Three layers, three kinds of trust

```mermaid
flowchart TB
  subgraph L1["Layer 1: Evidence (deterministic)"]
    direction LR
    w["Walk files<br/>bounded, no symlinks"] --> m["Map modules<br/>and imports"] --> r["Apply 19 rules<br/>with redaction"]
  end
  subgraph L2["Layer 2: Reasoning (your IDE model)"]
    direction LR
    v["Verify each finding<br/>at file and line"] --> j["Judge impact<br/>and trade-offs"] --> p["Plan: roadmap,<br/>ADRs, designs"]
  end
  subgraph L3["Layer 3: Delivery"]
    direction LR
    h["HTML for people"] --- md["Markdown for PRs"] --- js["JSON and SARIF<br/>for tools"]
  end
  L1 --> L2 --> L3
```

How much to trust each layer:

| Layer | Reproducible? | Can be wrong? | How we limit that |
|---|---|---|---|
| 1. Evidence | Yes, byte for byte | Yes, rules are heuristics | Measured on real repositories; every finding lists caveats |
| 2. Reasoning | No, models vary | Yes | Skills require citing evidence and labeling claims |
| 3. Delivery | Yes | Only if layers 1 or 2 were | Escaped output; sources linked |

## 3. Every claim wears a label

```mermaid
flowchart TD
  c(["A claim in a report"]) --> q1{"Did the tool or reviewer<br/>see it in a file?"}
  q1 -- Yes --> obs["observed<br/>cites path and line"]
  q1 -- No --> q2{"Derived from observed facts<br/>by reasoning?"}
  q2 -- Yes --> inf["inferred<br/>says what it was derived from"]
  q2 -- No --> q3{"A recommendation<br/>for the future?"}
  q3 -- Yes --> prop["proposed"]
  q3 -- No --> unk["unknown<br/>and what would settle it"]
```

> **Why it matters.** Most bad architecture advice is a guess presented as a fact. Labels let you see the difference at a glance, and they let a reviewer challenge exactly the part that is shaky.

## 4. A scan from the inside

```mermaid
sequenceDiagram
  participant U as You or CI
  participant C as archsutra CLI
  participant F as File walker
  participant M as Mapper
  participant R as Rules
  participant O as Output
  U->>C: archsutra audit . --output report
  C->>F: Walk with limits (5000 files, 512 KiB each, 120 MiB total)
  F-->>C: Files (symlinks skipped, truncation flagged)
  C->>M: Build module graph from imports
  M-->>C: Modules, edges, cycles
  C->>R: Run 19 rules (comments, tests, vendored code masked)
  R-->>C: Findings with redacted excerpts
  C->>C: Apply .archsutra/suppress.json (needs a reason)
  C->>O: Write HTML, Markdown, JSON, SARIF
  O-->>U: Exit code 0, or 1 if --fail-on is met
```

Three details worth knowing:

- **Limits are always reported.** If a repository is too big, the report says TRUNCATED. It never silently scans half.
- **Noise is filtered before you see it.** Comments, docstrings, test files, vendored libraries, minified bundles and dummy values are ignored. That is what raised measured precision from 50% to 69% and 95% ([evidence](evidence-at-a-glance.md)).
- **Suppression needs a reason.** A row without a reason in `.archsutra/suppress.json` is ignored, and expired rows stop applying.

## 5. How a rating is decided

```mermaid
flowchart TD
  cat(["A scorecard category,<br/>for example Security"]) --> e{"Is there evidence<br/>this tool can see?"}
  e -- No --> na["not assessed"]
  e -- Yes --> c1{"Any critical finding?"}
  c1 -- Yes --> crit["critical"]
  c1 -- No --> c2{"Any high finding?"}
  c2 -- Yes --> weak["weak"]
  c2 -- No --> c3{"Any medium finding?"}
  c3 -- Yes --> adq["adequate"]
  c3 -- No --> strong["strong<br/>(for the rules we have)"]
```

Reliability, performance, scalability, data integrity and cost are **always** `not assessed` from a static scan: they need traffic, incidents, data volumes or billing. A `strong` rating means "no findings from these 19 rules", which is not the same as "no problems".

## 6. Install lifecycle: safe, reversible, never destructive

```mermaid
stateDiagram-v2
  [*] --> Planned: install --dry-run
  Planned --> Installed: install (writes files and a SHA-256 manifest)
  Planned --> Blocked: a file exists that we did not install
  Blocked --> Installed: install --force (originals backed up)
  Installed --> Modified: you edit an installed file
  Modified --> Installed: install --force (backup kept)
  Installed --> Removed: uninstall
  Modified --> Removed: uninstall (your edited file is kept)
  Removed --> [*]
```

The manifest at `.archsutra/install-manifest.json` records a hash of every file it wrote. `uninstall` deletes a file only if its hash still matches, so your edits are never lost.

## 7. Trust boundaries: what can touch what

```mermaid
flowchart LR
  subgraph U["Untrusted"]
    repo["Your repository content<br/>(code, comments, READMEs)"]
  end
  subgraph T["Trusted and hashed"]
    skills["ArchSutra skills and agents"]
  end
  subgraph P["Local process"]
    cli["archsutra CLI"]
  end
  repo -->|"read only, bounded"| cli
  cli -->|"writes only inside the project"| out["Reports and installed files"]
  skills --> ide["Your IDE model"]
  repo -. "may contain text aimed at an AI" .-> ide
  ide -->|"read-only tools by default"| repo
```

The dotted line is the real risk: text inside a repository can try to instruct an AI. ArchSutra's answer is layered: skills declare repository content to be data, agents get read-only tools, and the CLI never executes anything it reads. Residual risk is documented in the [threat model](../architecture/threat-model.md).

## Keep going

- Use it on something real: [Real-world scenarios](real-world-scenarios.md)
- The full reasoning behind the design: [Architecture](../handbook/04-architecture.md)
- Every rule: [Rule catalog](../handbook/12-rule-catalog.md)
