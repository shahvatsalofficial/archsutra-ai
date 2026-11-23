# Cheat sheet

<!-- summary: One page: every command, flag, exit code, output file, label and install path. -->

Print it, pin it, or keep this tab open.

## The five commands you will use most

```bash
npx archsutra-ai audit .                       # findings + scorecard, printed
npx archsutra-ai audit . --output arch-report  # full report set: HTML + Markdown + JSON + SARIF
npx archsutra-ai audit . --fail-on high        # CI gate (exit 1 on high or critical)
npx archsutra-ai drift . --baseline baseline/findings.json --fail-on high   # only NEW findings fail
npx archsutra-ai install --host claude --target .   # add skills and agents to your IDE
```

## All commands

| Command | What it does | Writes files? |
|---|---|---|
| `audit [path]` | Evidence-linked findings and scorecard | with `--output` |
| `map [path]` | Modules, imports, cycles, diagrams | with `--output` |
| `review [path]` | Audit evidence as a review starter | with `--output` |
| `design [path]` | Design starter from the module map; decisions stay `unknown` | with `--output` |
| `threat-model [path]` | STRIDE starter from security findings; the rest stays `unknown` | with `--output` |
| `modernize [path]` | One slice per finding; target architecture stays `unknown` | with `--output` |
| `cost [path]` | States that cost is not assessed | with `--output` |
| `drift` / `compare` | Diff two `findings.json` files, or a project against `--baseline` | no |
| `verify [path]` | Check skills, agents, links, diagrams, `findings.json` | no |
| `export [path]` | Write every report as Markdown and HTML | yes |
| `html <file.md>` | Render a Markdown report to a self-contained HTML page | yes (next to the file) |
| `install` / `uninstall` | Add or remove skills and agents (`--host`, `--target`) | yes |
| `doctor [path]` | Check Node, hosts, install drift | no |
| `hosts` | List adapters and support levels | no |
| `mcp` | MCP server on stdio (tools: audit, map, drift) | no |

None of them calls a model or the network.

## Flags

| Flag | Meaning |
|---|---|
| `--json` | Machine-readable output |
| `--format <md\|html>` | Stdout format for `audit` and `map` |
| `--output <dir>` | Write files into a folder **inside** the project |
| `--baseline <file>` | `findings.json` to diff against (`drift`, `compare`) |
| `--fail-on <sev>` | Exit 1 at or above `critical`, `high`, `medium` or `low` |
| `--host <id>` | `claude`, `cursor`, `codex`, `copilot`, `gemini` |
| `--target <dir>` | Project to install into |
| `--dry-run` | Show changes, write nothing |
| `--force` | Overwrite modified files (backups kept) |
| `--verbose` | Extra detail |

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success, or nothing at or above `--fail-on` |
| 1 | Finding at or above `--fail-on` (for `drift`: added), or install conflict, or failed `doctor` |
| 2 | Usage error |
| 4 | `verify` failed |
| 5 | Internal error |

## Files you get from `--output`

| File | For | Open it with |
|---|---|---|
| `index.html` | Start here | a browser |
| `audit-report.html` / `.md` | The findings | browser / pull request |
| `current-state.html` / `.md` | Stack, maps, diagrams, cycles | browser / pull request |
| `findings.json` | Scripts and `drift` baselines | your tooling |
| `findings.sarif` | GitHub code scanning | upload action |
| `architecture-register.json` | SHA-256 of every file | integrity checks |

## Claim labels

| Label | Meaning |
|---|---|
| `observed` | Seen in a file; cites `path:line` |
| `inferred` | Derived from observed facts; says from what |
| `proposed` | A recommendation, not a fact |
| `unknown` | Cannot be decided from the evidence; says what would settle it |

## Ratings

`strong` (no findings from the rules we have) · `adequate` (medium findings) · `weak` (high) · `critical` · `not assessed` (needs evidence a static scan cannot see).

## Severity guide

| Severity | Rough meaning |
|---|---|
| critical | Exploitable now with major impact (exposed secret, private key) |
| high | Serious weakness with a plausible exploit or outage |
| medium | Meaningful risk or debt |
| low | Hygiene |
| info | Observation |

## Where skills land per IDE

| Host | Skills | Agents |
|---|---|---|
| Claude Code | `.claude/skills/` | `.claude/agents/` |
| Cursor | `.cursor/skills/` | `.cursor/agents/` |
| OpenAI Codex | `.agents/skills/` | none (managed block in `AGENTS.md`) |
| GitHub Copilot | `.github/skills/` | `.github/agents/*.agent.md` |
| Gemini CLI | `.gemini/skills/` | none |

Install **one** host per project: several hosts also read `.agents/skills` and `.claude/skills`.

## The five skills

| Skill | Ask it when |
|---|---|
| `architecture-audit` | "Review this codebase" |
| `architecture-design` | "How should we build this?" |
| `architecture-modernization` | "How do we get off the legacy system safely?" |
| `threat-modeling` | "What could go wrong with this feature?" |
| `architecture-verification` | "Check this report before I send it" |

## Limits to remember

5 000 files · 512 KiB per file · 120 MiB total · 15 s traversal · lines over 2 000 characters skipped · symlinks never followed · writes only inside the project.

## Suppress a finding

`.archsutra/suppress.json`:

```json
{ "suppress": [ { "rule": "AS-SEC-006", "path": "src/dev.ts", "reason": "Dev only", "expires": "2027-03-31" } ] }
```

A row needs a `reason`; expired rows are ignored.
