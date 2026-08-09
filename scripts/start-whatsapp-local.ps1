param(
  [switch]$IncludeBemHubTunnel,
  [switch]$UpdateEnvLocal
)

$ErrorActionPreference = "Stop"

function Refresh-Path {
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
    [System.Environment]::GetEnvironmentVariable("Path", "User")
}

function Wait-Docker {
  for ($i = 0; $i -lt 90; $i++) {
    docker info *> $null
    if ($LASTEXITCODE -eq 0) { return }
    Start-Sleep -Seconds 2
  }
  throw "Docker daemon nao respondeu. Abra Docker Desktop apos habilitar WSL e tente de novo."
}

Refresh-Path

$dockerDesktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
if (Test-Path $dockerDesktop) {
  Start-Process -FilePath $dockerDesktop -WindowStyle Hidden
}

Wait-Docker

Push-Location "C:\repos\wuzapi"
powershell -ExecutionPolicy Bypass -File ".\setup-local.ps1"
docker compose -f ".\docker-compose.local.yml" up -d --build
Pop-Location

Push-Location "C:\repos\evolution-api"
powershell -ExecutionPolicy Bypass -File ".\setup-local.ps1"
docker compose -f ".\docker-compose.local.yml" up -d
Pop-Location

& (Join-Path $PSScriptRoot "start-whatsapp-tunnels.ps1") `
  -IncludeBemHub:$IncludeBemHubTunnel `
  -UpdateEnvLocal:$UpdateEnvLocal
