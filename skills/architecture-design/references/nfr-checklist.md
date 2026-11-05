# Non-functional requirements checklist

Ask for each number. If the user does not know, record `unknown` and propose a default that they can accept or change.

| Area | Question | Example answer | Why it matters |
|---|---|---|---|
| Load | Peak requests per second, daily active users, growth per year | 50 rps peak, 5 000 DAU, 2x per year | Sizes compute and decides whether caching or queues are needed |
| Latency | p50 and p95 target per critical journey | p95 under 300 ms for search | Decides sync versus async, cache layers, data locality |
| Availability | Target and what a minute of downtime costs | 99.9% (43 min per month) | Decides redundancy, deployment strategy, on-call |
| Recovery | RTO and RPO | RTO 1 h, RPO 5 min | Decides backup frequency, replication, failover |
| Data | Volume now and in 3 years; retention; deletion rules | 200 GB, 7 years, delete on request | Decides store, partitioning, archival, privacy design |
| Consistency | Where must reads see the latest write? | account balance: yes; feed: no | Decides transactions, single writer, event design |
| Security | Data classes, identity model, threat actors | personal data, SSO, external attackers | Decides auth, encryption, boundaries, audit |
| Compliance | Regulations that apply (review reference only) | GDPR, payments | Decides residency, logging, vendor choices |
| Cost | Budget per month, who pays for what | 3 000 per month | Decides managed versus self-run, region count |
| Team | Size, skills, on-call capacity | 4 developers, no SRE | Decides how many moving parts are affordable |
| Delivery | Release frequency, environments, rollback needs | daily, 2 environments | Decides pipeline, feature flags, migrations |
| Operability | Who debugs at 3 am and with what? | developers with dashboards | Decides observability and runbooks |
| Integration | Systems to connect to and their limits | payment API, 100 rps cap | Decides retries, queues, adapters |
| Accessibility and i18n | Standards and languages | WCAG 2.2 AA, 3 languages | Decides front-end approach |

Record the answers in a table at the top of the design and refer to them by row in every later decision.
