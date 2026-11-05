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
| `map [path]` | only with `--output` | no | Current-state report. With `--output`, writes `current-state.md` and `current-state.html`. Otherwise prints one format |
| `audit [path]` | only with `--output` | no | Run the rules. With `--output`, writes every report as Markdown and HTML (same set as `export`). Otherwise prints one format or JSON |
| `verify [path]` | no | no | Validate skills, agents, links, diagrams, `findings.json` |
| `export [path]` | yes (in `--output`) | no | Write the documentation set. Every human report is both Markdown and HTML |
| `html <file.md>` | yes | no | Render a narrative Markdown report to a self-contained HTML page (default: sibling `.html`) |
| `install` | yes | no | Install skills/agents for `--host` into `--target` |
| `uninstall` | yes | no | Remove files this tool installed |
| `hosts` | no | no | List adapters and support levels |
| `version` | no | no | Print version |
| `design`, `review`, `threat-model`, `modernize`, `compare`, `cost`, `drift` | no | **yes** | Exit 3 and point to the skill. No API call is made |

## Options

| Option | Applies to | Meaning |
|---|---|---|
| `--json` | most | Machine-readable output |
| `--format <md\|html>` | `audit`, `map` | Stdout format when not writing files (default `md`). Ignored for the file set: `--output` always writes both |
| `--dry-run` | `audit`, `map`, `export`, `html`, `install`, `uninstall` | Show what would change; write nothing |
| `--output <dir>` | `audit`, `map`, `export` | Directory inside the project (`export` default `docs/architecture`). `audit` writes the full set; `map` writes the current-state pair. Paths that escape the project are rejected |
| `--output <file.html>` | `html` | Destination HTML file. Default is the Markdown path with `.html` |
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
| `index.html` | HTML | Overview page linking every report (open this first in a browser) |
| `README.md` | Markdown | Index of the set |
| `current-state.md` / `current-state.html` | Markdown + Mermaid / HTML | Stack, C4-style context and module diagrams, module table, cycles, blind spots |
| `audit-report.md` / `audit-report.html` | Markdown / HTML | Summary, scorecard, findings, scope and blind spots. The HTML version has severity cards, a severity filter and collapsible findings |
| `findings.json` | JSON, schema 1.0.0 | Findings, scorecard, coverage, blind spots, failed checks |
| `findings.sarif` | SARIF 2.1.0 | One result per evidence location |
| `architecture-register.json` | JSON | Artifact list with SHA-256 hashes and timestamp |

Real examples: [`examples/brownfield-monolith/sample-output/`](../../examples/brownfield-monolith/sample-output/audit-report.md).

## Examples

```bash
archsutra audit . --output docs/architecture   # Markdown + HTML for every report; open index.html
archsutra audit . --fail-on high                    # CI gate; prints Markdown, writes nothing
archsutra audit . --json | jq '.findings[] | {id, severity, title}'
archsutra map . --output docs/architecture          # current-state.md and current-state.html
archsutra html docs/architecture/design.md          # HTML sibling for a narrative report
archsutra export . --output docs/architecture       # same file set as audit --output
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
| `docs/architecture/*` | `audit --output`, `map --output`, `export`, `html` | reports, each human page as `.md` and `.html` |
