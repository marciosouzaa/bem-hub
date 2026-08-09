$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$statePath = Join-Path $repoRoot ".local\whatsapp-tunnels\state.json"

if (-not (Test-Path $statePath)) {
  Write-Host "Nenhum state.json encontrado."
  exit 0
}

$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
foreach ($tunnel in $state.tunnels) {
  $process = Get-Process -Id $tunnel.pid -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $tunnel.pid -Force
    Write-Host "Parado: $($tunnel.name) pid=$($tunnel.pid)"
  }
}
