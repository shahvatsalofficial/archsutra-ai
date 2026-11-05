# Audit categories

Work through these in order of likely risk for the system in front of you. For each, note the evidence you looked at, even when you find nothing.

| Category | What to look for | Typical evidence | Deterministic help |
|---|---|---|---|
| Structure and boundaries | Modules with unclear ownership; business logic in controllers; shared kitchen-sink modules | directory layout, import graph | `archsutra map` modules and edges |
| Dependency cycles | Modules that import each other directly or indirectly | import statements | rule AS-ARC-001 |
| Layering | Data or service code importing presentation code | imports across folders named controllers, services, repositories | rule AS-ARC-002 |
| Cohesion | Very large files that mix responsibilities | file length, change history if available | rule AS-ARC-003 |
| Data ownership and consistency | Two components writing the same table; multi-step writes without a transaction | schemas, ORM models, queries | none: read the code |
| API contracts | Breaking changes without versioning; inconsistent error semantics | OpenAPI, protobuf, handlers | none |
| Authentication and authorization | Missing checks on routes; trust in client-supplied identity | middleware, route definitions | none |
| Secrets and configuration | Credentials in source, committed env files, private keys | source files, `.env*` | rules AS-SEC-001, AS-SEC-002, AS-SEC-003 |
| Injection and unsafe execution | SQL built from strings, `eval`, shell commands with interpolation | handlers, data access | rules AS-SEC-004, AS-SEC-005 |
| Transport security | Disabled certificate verification | HTTP client configuration | rule AS-SEC-006 |
| Supply chain | No lockfile, unbounded version ranges, unpinned base images | manifests, Dockerfiles | rules AS-SUP-001, AS-SUP-002, AS-SUP-003 |
| Infrastructure | Wide ingress, privileged containers, root user | Terraform, Kubernetes, Dockerfile | rules AS-IAC-001, AS-OPS-003 |
| Delivery and quality | No CI, no tests, no review gate | workflows, test directories | rules AS-OPS-001, AS-OPS-002 |
| Observability and SLOs | No structured logs, metrics or alerts; no stated objectives | logging setup, dashboards as code | none |
| Resilience | Missing timeouts, retries without backoff, no back-pressure, no restore test | client code, queue consumers | none |
| Performance and capacity | N+1 queries, unbounded result sets, hot loops | data access code | none: needs measurements |
| Cost | Over-provisioned or always-on resources | IaC, autoscaling | none: needs billing data |
| AI and agent risks | Model output reaching an execution sink; tools with broad permissions | prompts, tool definitions | rule AS-AI-001 (co-location only) |
| Documentation | No ADRs, stale diagrams, no runbook | docs folders | rules AS-DOC-001, AS-DOC-002 |

## Categories the static scan cannot judge

Reliability, performance, scalability, data integrity and cost need runtime evidence (metrics, load tests, billing, incident history). Rate them `not assessed` unless the user supplies that evidence, and say what evidence would let you assess them.
