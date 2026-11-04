# ArchSutra AI Handbook

<!-- summary: Start here. Map of every document, who it is for, and the facts that never change. -->

This handbook is the complete reference for **ArchSutra AI** (v0.1.1): what it is, what it does, how it is built, how to use it, how far you can trust it, and where it is going. It is written so that a new engineer, an executive, an auditor, or a future maintainer can understand the whole system without asking anyone.

> **One-sentence summary.** ArchSutra AI is an open-source set of portable Agent Skills and a deterministic, offline CLI that give AI coding assistants (Claude Code, Cursor, Codex, GitHub Copilot, Gemini CLI) an evidence-first way to design, audit, threat-model and modernize software architecture, with no extra API key.

## Choose your path

| You are | Read first | Then |
|---|---|---|
| Executive or sponsor | [Executive summary](01-executive-summary.md) | [Trust and assurance](13-trust-and-assurance.md), [Security, privacy and legal](07-security-privacy-legal.md), [Roadmap](09-compatibility-and-roadmap.md) |
| Product or functional owner | [Functional specification](02-functional-specification.md) | [User guide](05-user-guide.md) |
| Architect | [Architecture](04-architecture.md) | [Technical specification](03-technical-specification.md), [ADRs](../decisions/ADR-0001-deterministic-cli-plus-ide-skills.md) |
| Developer or contributor | [Technical specification](03-technical-specification.md) | [Contributor guide](10-contributor-guide.md), [CLI reference](06-cli-reference.md) |
| User of the tool | [User guide](05-user-guide.md) | [CLI reference](06-cli-reference.md), [FAQ](11-glossary-and-faq.md) |
| Security reviewer or auditor | [Trust and assurance](13-trust-and-assurance.md) | [Real-world evaluation](14-real-world-evaluation.md), [Security, privacy and legal](07-security-privacy-legal.md), [Supply chain](15-supply-chain-and-release.md), [Threat model](../architecture/threat-model.md) |
| Lawyer | [Legal review brief](../legal/legal-review-brief.md) | [Name clearance](../legal/trademark-and-name-clearance.md), [Security, privacy and legal](07-security-privacy-legal.md) |

## Document list

| # | Document | Purpose |
|---|---|---|
| 01 | [Executive summary](01-executive-summary.md) | Problem, solution, value, risks, decisions needed |
| 02 | [Functional specification](02-functional-specification.md) | What the system does, requirement by requirement |
| 03 | [Technical specification](03-technical-specification.md) | How it is built: modules, data structures, algorithms, limits |
| 04 | [Architecture](04-architecture.md) | C4 views, data flow, trust boundaries, decisions, quality attributes |
| 05 | [User guide](05-user-guide.md) | Install, first audit, workflows, CI use, troubleshooting |
| 06 | [CLI reference](06-cli-reference.md) | Every command, flag, exit code, output file and schema |
| 07 | [Security, privacy and legal](07-security-privacy-legal.md) | Security model, privacy, licensing, trademarks, disclaimers |
| 08 | [Testing and proof](08-testing-and-proof.md) | Test results, CI evidence, sample outputs, fixtures |
| 09 | [Compatibility and roadmap](09-compatibility-and-roadmap.md) | Host matrix, verification status, milestones |
| 10 | [Contributor guide](10-contributor-guide.md) | Add rules, agents, adapters; release process |
| 11 | [Glossary and FAQ](11-glossary-and-faq.md) | Terms and the questions people ask most |
| 12 | [Audit rule catalog](12-rule-catalog.md) | Every rule: what it detects, why, limits, fix |
| 13 | [Trust and assurance](13-trust-and-assurance.md) | The register of every trust gap and its honest status |
| 14 | [Real-world evaluation](14-real-world-evaluation.md) | Precision measured on 52 public repositories |
| 15 | [Supply chain and release](15-supply-chain-and-release.md) | SBOM, provenance, pinning, release and verification steps |
| 16 | [Performance and quality metrics](16-performance-and-quality-metrics.md) | Speed, memory, coverage, robustness |

Also: [Live smoke tests](../compatibility/smoke-tests/README.md), [Accessibility audit](../proof/accessibility.md), [Good first issues](../community/good-first-issues.md), [Name clearance](../legal/trademark-and-name-clearance.md), [Legal review brief](../legal/legal-review-brief.md).

## Facts at a glance

| Item | Value |
|---|---|
| Version | 0.1.1 |
| Creator | Vatsal Shah ([@shahvatsalofficial](https://github.com/shahvatsalofficial)) |
| License | Apache-2.0 |
| Language / runtime | TypeScript (strict, ESM), Node.js 20+ |
| Runtime dependencies | 0 |
| Skills / agents | 5 skills, 12 agent roles |
| Audit rules | 19 |
| Automated tests | 29 |
| Test coverage | 92% lines, 81% branches, 91% functions |
| CI | Ubuntu, Windows, macOS x Node 20, 22; CodeQL; DCO check |
| Real-world evaluation | 52 repositories, 98 labeled findings; precision 50% (baseline), 69% and 95% (unseen batches) |
| Network use by the CLI | none |
| Model calls by the CLI | none |
| Repository | https://github.com/shahvatsalofficial/archsutra-ai |

## Honesty policy

Every statement in this handbook is one of: **implemented and tested**, **implemented but not yet verified in a live host**, or **planned**. Where a claim is not verified it says so. If you find a statement that is not true, open an issue; that is a bug.
