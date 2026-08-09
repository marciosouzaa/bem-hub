$ErrorActionPreference = "Stop"

$commands = @"
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -NoRestart
Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart
wsl --set-default-version 2
Write-Host 'WSL habilitado. Reinicie o Windows, abra Docker Desktop e rode scripts/start-whatsapp-local.ps1.'
"@

Start-Process powershell.exe -Verb RunAs -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  $commands
)
