param(
  [switch]$IncludeBemHub,
  [switch]$UpdateEnvLocal
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$logDir = Join-Path $repoRoot ".local\whatsapp-tunnels"
$statePath = Join-Path $logDir "state.json"
$utf8NoBom = New-Object System.Text.UTF8Encoding -ArgumentList $false
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Get-CloudflaredPath {
  $command = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $candidates = @(
    "C:\Program Files (x86)\cloudflared\cloudflared.exe",
    "C:\Program Files\cloudflared\cloudflared.exe"
  )
  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) { return $candidate }
  }
  throw "cloudflared nao encontrado."
}

function Read-TunnelUrl([string]$Path) {
  if (-not (Test-Path $Path)) { return $null }
  $text = Get-Content -LiteralPath $Path -Raw
  $match = [regex]::Match($text, "https://[-a-z0-9]+\.trycloudflare\.com")
  if ($match.Success) { return $match.Value }
  return $null
}

function Start-Tunnel([string]$Name, [string]$TargetUrl) {
  $errLog = Join-Path $logDir "$Name.err.log"
  $outLog = Join-Path $logDir "$Name.out.log"
  Remove-Item -LiteralPath $errLog, $outLog -ErrorAction SilentlyContinue

  $process = Start-Process -FilePath $script:cloudflared -ArgumentList @(
    "tunnel",
    "--url",
    $TargetUrl,
    "--no-autoupdate"
  ) -RedirectStandardError $errLog -RedirectStandardOutput $outLog -WindowStyle Hidden -PassThru

  $url = $null
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    $url = Read-TunnelUrl $errLog
    if ($url) { break }
    if ($process.HasExited) { throw "Tunnel $Name encerrou antes de publicar URL. Veja $errLog" }
  }
  if (-not $url) { throw "Tunnel $Name nao publicou URL em tempo util. Veja $errLog" }

  [pscustomobject]@{
    name = $Name
    pid = $process.Id
    target = $TargetUrl
    url = $url
    errorLog = $errLog
    outputLog = $outLog
  }
}

function Set-EnvLine([string]$Path, [string]$Key, [string]$Value) {
  $line = "$Key=$Value"
  if (Test-Path $Path) {
    $lines = [System.Collections.Generic.List[string]](Get-Content -LiteralPath $Path)
  } else {
    $lines = [System.Collections.Generic.List[string]]::new()
  }

  $found = $false
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^\s*$([regex]::Escape($Key))=") {
      $lines[$i] = $line
      $found = $true
      break
    }
  }
  if (-not $found) { $lines.Add($line) }
  [System.IO.File]::WriteAllLines($Path, [string[]]$lines, $script:utf8NoBom)
}

$script:cloudflared = Get-CloudflaredPath
$tunnels = @()
$tunnels += Start-Tunnel "wuzapi" "http://127.0.0.1:8081"
$tunnels += Start-Tunnel "evolution" "http://127.0.0.1:8082"
if ($IncludeBemHub) {
  $tunnels += Start-Tunnel "bem-hub" "http://127.0.0.1:3000"
}

$state = [pscustomobject]@{
  startedAt = (Get-Date).ToString("o")
  tunnels = $tunnels
}
[System.IO.File]::WriteAllText($statePath, ($state | ConvertTo-Json -Depth 5), $utf8NoBom)

if ($UpdateEnvLocal) {
  $envLocal = Join-Path $repoRoot ".env.local"
  Set-EnvLine $envLocal "WHATSAPP_MANAGED_PROVISIONING_ENABLED" "true"
  Set-EnvLine $envLocal "WUZAPI_MANAGED_BASE_URL" (($tunnels | Where-Object name -eq "wuzapi").url)
  Set-EnvLine $envLocal "WUZAPI_LOCAL_ENV_FILE" "C:\repos\wuzapi\.env"
  Set-EnvLine $envLocal "EVOLUTION_MANAGED_BASE_URL" (($tunnels | Where-Object name -eq "evolution").url)
  Set-EnvLine $envLocal "EVOLUTION_LOCAL_ENV_FILE" "C:\repos\evolution-api\.env"
  if ($IncludeBemHub) {
    Set-EnvLine $envLocal "APP_BASE_URL" (($tunnels | Where-Object name -eq "bem-hub").url)
  }
}

$tunnels | Select-Object name, target, url, pid | Format-Table -AutoSize
Write-Host "Estado: $statePath"
