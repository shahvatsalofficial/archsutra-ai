# Installs ArchSutra skills into the current project.
# Usage: .\install.ps1 -HostName claude [-DryRun]
param(
  [Parameter(Mandatory = $true)][ValidateSet('claude', 'cursor', 'codex', 'copilot', 'gemini')][string]$HostName,
  [switch]$DryRun
)
$NpxArgs = @('--yes', 'github:shahvatsalofficial/archsutra-ai', 'install', '--host', $HostName, '--target', '.')
if ($DryRun) { $NpxArgs += '--dry-run' }
& npx @NpxArgs
exit $LASTEXITCODE
