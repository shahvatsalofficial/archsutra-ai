@echo off
rem Installs ArchSutra skills into the current project. Usage: install.cmd claude [--dry-run]
if "%~1"=="" (
  echo usage: install.cmd ^<claude^|cursor^|codex^|copilot^|gemini^> [--dry-run]
  exit /b 2
)
npx --yes github:shahvatsalofficial/archsutra-ai install --host %1 --target . %2
exit /b %ERRORLEVEL%
