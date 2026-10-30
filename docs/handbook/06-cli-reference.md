# CLI reference

<!-- summary: Every command, option, exit code and output file of the archsutra CLI. -->

```text
archsutra <command> [path] [options]
```

`path` defaults to the current directory.

## Commands

| Command | Writes files? | Needs model? | Description |
|---|---|---|---|
| `init [path]` | no | no | Detect the project and AI hosts; print an install plan per detected host |
| `doctor [path]` | no | no | Check Node, hosts, install drift, duplicate `AGENTS.md` blocks |
| `map [path]` | no | no | Print current-state report: stack, modules, dependencies, cycles, blind spots, Mermaid diagrams |
| `audit [path]` | no | no | Run the rules; print the report or JSON |
| `verify [path]` | no | no | Validate skills, agents, links, diagrams, `findings.json` |
| `export [path]` | yes (in `--output`) | no | Write the documentation set |
| `install` | yes | no | Install skills/agents for `--host` into `--target` |
| `uninstall` | yes | no | Remove files this tool installed |
| `hosts` | no | no | List adapters and support levels |
| `version` | no | no | Print version |
| `design`, `review`, `threat-model`, `modernize`, `compare`, `cost`, `drift` | no | **yes** | Exit 3 and point to the skill. No API call is made |

## Options

| Option | Applies to | Meaning |
|---|---|---|
| `--json` | most | Machine-readable output |
| `--dry-run` | `export`, `install`, `uninstall` | Show what would change; write nothing |
| `--output <dir>` | `export` | Output directory inside the project (default `docs/architecture`); paths that escape the project are rejected |
| `--host <id>` | `install`, `uninstall` | `claude`, `cursor`, `codex`, `copilot`, `gemini` |
| `--target <dir>` | `install`, `uninstall` | Project to modify (default `.`) |
| `--force` | `install` | Overwrite conflicting files after backing them up |
| `--fail-on <sev>` | `audit` | Exit 1 if any finding is at or above `critical`, `high`, `medium` or `low` |
| `--verbose` | all | Extra detail; stack trace on internal error |
| `--version`, `--help` | all | |

## Exit codes

| Code | Name | When |
|---|---|---|
| 0 | ok | success |
| 1 | findings | `--fail-on` threshold met, install blocked by conflict, or `doctor` found a problem |
| 2 | usage | unknown command, missing `--host`, invalid `--fail-on`, `--output` escaping the project |
| 3 | needs model | a model-dependent command was invoked in the CLI |
| 4 | verify failed | at least one `verify` check failed |
| 5 | error | unexpected internal error |

## Output files from `export`

| File | Format | Contents |
|---|---|---|
| `README.md` | Markdown | Index of the set |
| `current-state.md` | Markdown + Mermaid | Stack, C4-style context and module diagrams, module table, cycles, blind spots |
| `audit-report.md` | Markdown | Summary, scorecard, findings, scope and blind spots |
| `findings.json` | JSON, schema 1.0.0 | Findings, scorecard, coverage, blind spots, failed checks |
| `findings.sarif` | SARIF 2.1.0 | One result per evidence location |
| `architecture-register.json` | JSON | Artifact list with SHA-256 hashes and timestamp |

Real examples: [`examples/brownfield-monolith/sample-output/`](../../examples/brownfield-monolith/sample-output/audit-report.md).

## Examples

```bash
archsutra audit . --fail-on high              # CI gate
archsutra audit . --json | jq '.findings[] | {id, severity, title}'
archsutra export . --output docs/architecture
archsutra install --host copilot --target . --dry-run
archsutra install --host codex --target .
archsutra uninstall --host codex --target .
archsutra verify .
```

## Environment

None required. The CLI reads no environment variables and sends no data anywhere.

## Files created in your project

| Path | Created by | Purpose |
|---|---|---|
| `.archsutra/install-manifest.json` | `install` | hashes of installed files |
| `.archsutra/backup/<time>/...` | `install --force` | originals of overwritten files |
| host folders (`.claude/`, `.cursor/`, `.agents/`, `.github/`, `.gemini/`) | `install` | skills and agents |
| `AGENTS.md` (managed block) | `install --host codex` | pointer to the skills |
| `docs/architecture/*` | `export` | reports |
