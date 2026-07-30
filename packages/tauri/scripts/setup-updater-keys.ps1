param([switch]$Force)
$keyFile = Join-Path $PSScriptRoot "..\src-tauri\updater-keys.json"
if ((Test-Path $keyFile) -and !$Force) {
  Write-Host "Keys already exist at $keyFile. Use -Force to regenerate."
  exit 0
}
npm run tauri signer generate -- -w $keyFile
Write-Host "Keys generated: $keyFile"
Write-Host "Add the public key to tauri.conf.json -> plugins.updater.pubkey"
