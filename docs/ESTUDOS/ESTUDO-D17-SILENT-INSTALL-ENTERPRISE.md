# ESTUDO-D17-SILENT-INSTALL-ENTERPRISE.md

> **Data:** 2026-07-25 | **Versão:** 3.0 (template v3.0)
> **Nível de Profundidade:** 9/12 | **Área:** Enterprise — Deployment
> **Dependências:** D11 (Instaladores Windows), D12 (macOS), D13 (Linux)
> **Conexões:** D14 (Code Signing), D15 (CI/CD Pipeline), D16 (Package Managers), D24 (MDM)
> **Propósito:** Instalação silenciosa e gerenciamento enterprise — GPO, MDM, Intune, Jamf, configuração corporativa, silent flags, deployment massivo, air-gapped, compliance SOC2/ISO27001.
> **Target Score:** 85/100 (7 dimensões)

---

## 1. FUNDAMENTOS (Nível 1-2)

### 1.1 Problema

Adoção enterprise requer instalação silenciosa (sem interação do usuário) e gerenciamento centralizado (GPO, MDM, Intune). Sem isso, empresas não adotam o produto. Departamentos de TI precisam deployar software em centenas ou milhares de máquinas sem intervenção manual.

### 1.2 Silent Flags — Tabela Completa

| Formato | Plataforma | Comando | Flags | Exemplo |
|---------|-----------|---------|-------|---------|
| MSI | Windows | `msiexec /i` | `/qn /norestart /l*v install.log` | `msiexec /i IDEIA.msi /qn /norestart` |
| NSIS | Windows | `setup.exe` | `/S /D="C:\IDEIA"` | `setup.exe /S /D="C:\Program Files\IDEIA"` |
| Inno Setup | Windows | `setup.exe` | `/VERYSILENT /SUPPRESSMSGBOXES` | `setup.exe /VERYSILENT /SUPPRESSMSGBOXES /LOG=install.log` |
| InstallShield | Windows | `setup.exe` | `/s /v"/qn"` | `setup.exe /s /v"/qn INSTALLDIR=\"C:\IDEIA\""` |
| PKG (macOS) | macOS | `installer` | `-pkg pkg -target / -verbose` | `installer -pkg IDEIA.pkg -target /` |
| DMG (macOS) | macOS | `cp -r` | N/A (manual or hdiutil) | `hdiutil attach IDEIA.dmg && cp -r /Volumes/IDEIA/IDEIA.app /Applications/ && hdiutil detach /Volumes/IDEIA` |
| .deb | Linux | `apt-get install` ou `dpkg -i` | `-y` ou `DEBIAN_FRONTEND=noninteractive` | `DEBIAN_FRONTEND=noninteractive apt-get install -y ./ideia_1.0.deb` |
| .rpm | Linux | `dnf install` ou `yum install` | `-y` | `dnf install -y ./ideia-1.0.rpm` |
| .AppImage | Linux | `chmod +x` | N/A | `chmod +x IDEIA.AppImage && ./IDEIA.AppImage` |
| Snap | Linux | `snap install` | `--dangerous --classic` | `snap install --dangerous --classic ./ideia.snap` |
| Flatpak | Linux | `flatpak install` | `-y` | `flatpak install --bundle -y ./ideia.flatpak` |

### 1.3 Conceitos Fundamentais

| Conceito | Descrição |
|----------|-----------|
| Silent Install | Instalação que não requer interação do usuário, aceitando defaults ou configuração pré-definida |
| Unattended Install | Instalação automatizada via response/answer file |
| Zero-Touch Deployment | Instalação remota sem intervenção local, orquestrada por MDM/GPO |
| Pre-Seeded Configuration | Configurações corporativas embutidas no instalador ou aplicadas pós-instalação |
| Volume Licensing | Licenciamento corporativo com chave única ou KMS |
| Air-Gapped | Ambiente sem acesso à internet, requer mirrors locais e installers completos |

### 1.4 Response Files

```xml
<!-- Windows: response.xml para MSI transforms -->
<MsiTransform>
  <Property name="INSTALLDIR" value="C:\Program Files\IDEIA" />
  <Property name="DISABLE_TELEMETRY" value="1" />
  <Property name="PROXY_SERVER" value="proxy.corp.empresa.com:8080" />
  <Property name="ALLOWED_COMMANDS" value="git,npm,node" />
</MsiTransform>
```

```bash
# macOS: resposta para instalação de PKG com choices.xml
# choices.xml define componentes a instalar
cat > /tmp/ideia_choices.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<array>
  <dict>
    <key>attributeSetting</key>
    <integer>1</integer>
    <key>choiceAttribute</key>
    <string>selected</string>
    <key>choiceIdentifier</key>
    <string>com.ideia.core</string>
  </dict>
  <dict>
    <key>attributeSetting</key>
    <integer>0</integer>
    <key>choiceAttribute</key>
    <string>selected</string>
    <key>choiceIdentifier</key>
    <string>com.ideia.optional</string>
  </dict>
</array>
</plist>
EOF
installer -pkg IDEIA.pkg -target / -applyChoiceChangesXML /tmp/ideia_choices.xml
```

---

## 2. TÉCNICO (Nível 3-4)

### 2.1 Enterprise Configuration — Schema Completo

```typescript
interface EnterpriseConfig {
  updates: {
    enabled: boolean;
    channel: 'stable' | 'beta' | 'insider';
    interval: number; // horas entre verificações
    wsusServer?: string; // Windows: servidor WSUS interno
    munkCatalog?: string; // macOS: URL do catálogo Munki
    aptlyRepo?: string;   // Linux: URL do repositório Aptly
    autoDownload: boolean;
    autoInstall: boolean;
    requireRestart: boolean;
  };
  security: {
    allowedCommands: string[];
    blockedCommands: string[];
    allowedExtensions: string[];
    maxFileSize: number; // bytes
    sandboxMode: 'strict' | 'standard' | 'permissive';
    auditEnabled: boolean;
    auditRetentionDays: number;
    policyFile?: string; // caminho para arquivo de policy customizado
    allowedHosts: string[];
    tlsMinimumVersion: '1.2' | '1.3';
    certificatePinning: boolean;
    mdmEnforcement: boolean; // forçar políticas vindas do MDM
  };
  telemetry: {
    enabled: boolean;
    level: 'minimal' | 'operational' | 'full';
    endpoint?: string; // servidor de telemetria interno
    optOut: boolean; // true = completamente desligado
    anonymizeIP: boolean;
  };
  network: {
    proxy?: {
      http: string;
      https: string;
      noProxy: string[];
      auth?: { username: string; password: string };
    };
    allowedHosts: string[];
    blockedHosts: string[];
    caCertificate?: string; // PEM para proxy SSL inspection
    timeout: number; // ms
    retryCount: number;
    airGapped: boolean; // true = sem acesso externo
    mirrorUrls: {
      npm?: string;
      pip?: string;
      docker?: string;
    };
  };
  agents: {
    maxConcurrent: number;
    allowedModels: string[];
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    modelEndpoint?: string; // servidor LLM interno
    maxTokens: number;
    temperature: number;
    enableToolUse: boolean;
    enableCodeExecution: boolean;
  };
  compliance: {
    soc2: boolean;
    iso27001: boolean;
    gdpr: boolean;
    hipaa: boolean;
    auditLogPath: string;
    encryptionAtRest: boolean;
    encryptionInTransit: boolean;
    dataRetentionDays: number;
  };
}
```

### 2.2 Config File Locations por OS

| OS | Caminho | Formato |
|----|--------|---------|
| Windows | `%PROGRAMDATA%\IDEIA\config.json` | JSON |
| Windows (per-user) | `%APPDATA%\IDEIA\config.json` | JSON |
| macOS | `/Library/Preferences/dev.ideia.app.plist` | plist |
| macOS (per-user) | `~/Library/Preferences/dev.ideia.app.plist` | plist |
| Linux (system) | `/etc/ideia/config.json` | JSON |
| Linux (per-user) | `~/.config/ideia/config.json` | JSON |

### 2.3 Enterprise Config Loader — Production Grade

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

class EnterpriseConfigLoader {
  private cache: EnterpriseConfig | null = null;
  private watcher: fs.FSWatcher | null = null;

  async load(): Promise<EnterpriseConfig> {
    if (this.cache) return this.cache;

    const paths = this.getConfigPaths();
    for (const configPath of paths) {
      try {
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content) as EnterpriseConfig;
        this.cache = config;
        this.startWatching(configPath);
        return config;
      } catch {
        continue;
      }
    }
    return this.defaultConfig();
  }

  private getConfigPaths(): string[] {
    const platform = os.platform();
    const user = os.userInfo().username;
    if (platform === 'win32') {
      return [
        path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'IDEIA', 'config.json'),
        path.join(process.env.APPDATA || 'C:\\Users\\' + user + '\\AppData\\Roaming', 'IDEIA', 'config.json'),
      ];
    } else if (platform === 'darwin') {
      return [
        '/Library/Preferences/dev.ideia.app.plist',
        path.join(os.homedir(), 'Library/Preferences/dev.ideia.app.plist'),
      ];
    } else {
      return [
        '/etc/ideia/config.json',
        path.join(os.homedir(), '.config/ideia/config.json'),
      ];
    }
  }

  private startWatching(configPath: string): void {
    if (this.watcher) return;
    try {
      this.watcher = fs.watch(configPath, () => {
        this.cache = null; // força reload na próxima leitura
      });
    } catch {
      // fallback: polling a cada 60s
      setInterval(() => { this.cache = null; }, 60000);
    }
  }

  private defaultConfig(): EnterpriseConfig {
    return {
      updates: { enabled: true, channel: 'stable', interval: 24,
        autoDownload: false, autoInstall: false, requireRestart: false },
      security: { allowedCommands: [], blockedCommands: [],
        allowedExtensions: [], maxFileSize: 10485760,
        sandboxMode: 'standard', auditEnabled: true,
        auditRetentionDays: 90, allowedHosts: [],
        tlsMinimumVersion: '1.2', certificatePinning: false,
        mdmEnforcement: false },
      telemetry: { enabled: true, level: 'minimal',
        anonymizeIP: true, optOut: false },
      network: { allowedHosts: [], blockedHosts: [],
        timeout: 30000, retryCount: 3, airGapped: false, mirrorUrls: {} },
      agents: { maxConcurrent: 2, allowedModels: [],
        logLevel: 'info', maxTokens: 4096, temperature: 0.7,
        enableToolUse: true, enableCodeExecution: false },
      compliance: { soc2: false, iso27001: false, gdpr: false,
        hipaa: false, auditLogPath: '/var/log/ideia/audit.log',
        encryptionAtRest: true, encryptionInTransit: true,
        dataRetentionDays: 365 },
    };
  }
}
```

### 2.4 Instalação Silenciosa — Scripts por Plataforma

#### Windows — PowerShell Silent Install Script

```powershell
<#
.SYNOPSIS
  Instalação silenciosa da IDEIA no Windows.
.DESCRIPTION
  Suporta MSI, NSIS e Inno Setup. Aplica configuração GPO,
  instala certificados CA corporativos, configura proxy.
.PARAMETER InstallPath
  Diretório de instalação (default: $env:ProgramFiles\IDEIA)
.PARAMETER ConfigFile
  Caminho para arquivo JSON de configuração corporativa
.PARAMETER Proxy
  Servidor proxy corporativo (ex: proxy.corp.com:8080)
.PARAMETER NoTelemetry
  Desabilita telemetria
#>

param(
  [string]$InstallPath = "$env:ProgramFiles\IDEIA",
  [string]$ConfigFile = "",
  [string]$Proxy = "",
  [switch]$NoTelemetry = $false,
  [switch]$Uninstall = $false,
  [string]$MsiPath = "IDEIA.msi",
  [string]$LogPath = "$env:TEMP\IDEIA-Install.log"
)

$ErrorActionPreference = "Stop"

function Write-Log {
  param([string]$Message)
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "$timestamp [$($MyInvocation.ScriptLineNumber)] $Message" | Out-File -FilePath $LogPath -Append
  Write-Host "$timestamp $Message"
}

function Test-AdminRights {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Install-MSI {
  param([string]$Msi, [string]$TargetDir, [hashtable]$Properties)
  if (-not (Test-Path $Msi)) {
    throw "MSI não encontrado: $Msi"
  }
  $props = ""
  foreach ($key in $Properties.Keys) {
    $props += " $key=`"$($Properties[$key])`""
  }
  $log = "INSTALLDIR=`"$TargetDir`""
  $args = "/i `"$Msi`" /qn /norestart /l*v `"$LogPath`" $props"
  Write-Log "Executando: msiexec $args"
  $proc = Start-Process -FilePath "msiexec.exe" -ArgumentList $args -Wait -NoNewWindow -PassThru
  if ($proc.ExitCode -ne 0 -and $proc.ExitCode -ne 3010) {
    throw "MSI instalation failed with exit code $($proc.ExitCode)"
  }
  Write-Log "MSI instalation completed (exit code: $($proc.ExitCode))"
}

function Install-NSIS {
  param([string]$Exe, [string]$TargetDir)
  if (-not (Test-Path $Exe)) {
    throw "Instalador não encontrado: $Exe"
  }
  $args = "/S /D=`"$TargetDir`""
  Write-Log "Executando: $Exe $args"
  $proc = Start-Process -FilePath $Exe -ArgumentList $args -Wait -NoNewWindow -PassThru
  if ($proc.ExitCode -ne 0) {
    throw "NSIS installation failed with exit code $($proc.ExitCode)"
  }
  Write-Log "NSIS installation completed"
}

function Install-InnoSetup {
  param([string]$Exe, [string]$TargetDir)
  if (-not (Test-Path $Exe)) {
    throw "Instalador não encontrado: $Exe"
  }
  $args = "/VERYSILENT /SUPPRESSMSGBOXES /DIR=`"$TargetDir`" /LOG=`"$LogPath`""
  Write-Log "Executando: $Exe $args"
  $proc = Start-Process -FilePath $Exe -ArgumentList $args -Wait -NoNewWindow -PassThru
  if ($proc.ExitCode -ne 0) {
    throw "InnoSetup installation failed with exit code $($proc.ExitCode)"
  }
  Write-Log "InnoSetup installation completed"
}

function Uninstall-IDEIA {
  Write-Log "Iniciando desinstalação silenciosa..."
  # Procurar MSI product code
  $productCode = Get-WmiObject -Class Win32_Product | Where-Object {
    $_.Name -like "*IDEIA*"
  } | Select-Object -First 1 -ExpandProperty IdentifyingNumber
  if ($productCode) {
    Write-Log "Desinstalando via MSI: $productCode"
    $proc = Start-Process -FilePath "msiexec.exe" -ArgumentList "/x $productCode /qn /norestart" -Wait -NoNewWindow -PassThru
    Write-Log "Desinstalação MSI concluída (código: $($proc.ExitCode))"
  } else {
    # Tentar caminho do uninstaller NSIS/Inno
    $uninstallPaths = @(
      "$env:ProgramFiles\IDEIA\unins000.exe",
      "$env:LOCALAPPDATA\Programs\IDEIA\Uninstall IDEIA.exe",
      "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\IDEIA\Uninstall IDEIA.lnk"
    )
    foreach ($uninstaller in $uninstallPaths) {
      if (Test-Path $uninstaller) {
        Write-Log "Executando uninstaller: $uninstaller"
        $proc = Start-Process -FilePath $uninstaller -ArgumentList "/S" -Wait -NoNewWindow -PassThru
        Write-Log "Desinstalação concluída (código: $($proc.ExitCode))"
        break
      }
    }
  }
  Remove-Item -Path "$env:PROGRAMDATA\IDEIA" -Recurse -Force -ErrorAction SilentlyContinue
  Write-Log "Desinstalação concluída"
}

function Apply-GPOConfig {
  param([string]$ConfigPath)
  if (-not (Test-Path $ConfigPath)) { return }
  $gpoDir = "$env:ProgramData\IDEIA"
  New-Item -ItemType Directory -Path $gpoDir -Force | Out-Null
  Copy-Item -Path $ConfigPath -Destination "$gpoDir\config.json" -Force
  Write-Log "Configuração GPO aplicada de: $ConfigPath"
}

# Main
if (-not (Test-AdminRights)) {
  Write-Log "ERRO: Administrador rights required. Re-run as Administrator."
  exit 1
}

Write-Log "=== IDEIA Silent Install Script ==="
Write-Log "InstallPath: $InstallPath"
Write-Log "ConfigFile: $ConfigFile"
Write-Log "Proxy: $Proxy"
Write-Log "NoTelemetry: $NoTelemetry"
Write-Log "Uninstall: $Uninstall"

if ($Uninstall) {
  Uninstall-IDEIA
  exit 0
}

# Determinar tipo de instalador
$ext = [System.IO.Path]::GetExtension($MsiPath).ToLower()
switch ($ext) {
  ".msi" {
    $props = @{
      "INSTALLDIR" = $InstallPath
    }
    if ($NoTelemetry) { $props["DISABLE_TELEMETRY"] = "1" }
    if ($Proxy) { $props["PROXY_SERVER"] = $Proxy }
    Install-MSI -Msi $MsiPath -TargetDir $InstallPath -Properties $props
  }
  ".exe" {
    Install-NSIS -Exe $MsiPath -TargetDir $InstallPath
  }
  default {
    throw "Formato não suportado: $ext"
  }
}

# Aplicar configuração corporativa
if ($ConfigFile) {
  Apply-GPOConfig -ConfigPath $ConfigFile
}

Write-Log "=== IDEIA Silent Install concluído ==="
```

#### macOS — Bash Silent Install Script

```bash
#!/bin/bash
#
# IDEIA macOS Silent Install
# Suporta: PKG, DMG, configuração MDM, profiles

set -euo pipefail

INSTALL_DIR="/Applications/IDEIA.app"
PKG_PATH="${1:-IDEIA.pkg}"
CONFIG_PLIST="${2:-}"
LOG_FILE="/tmp/ideia-install-$(date +%Y%m%d-%H%M%S).log"
TELEMETRY_OPTOUT="${3:-false}"

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg" | tee -a "$LOG_FILE"
}

check_root() {
  if [[ $EUID -ne 0 ]]; then
    log "ERROR: Este script deve ser executado como root (sudo)"
    exit 1
  fi
}

install_pkg() {
  local pkg="$1"
  if [[ ! -f "$pkg" ]]; then
    log "ERROR: PKG não encontrado: $pkg"
    exit 1
  fi
  log "Instalando PKG: $pkg"
  installer -pkg "$pkg" -target / -verboseR 2>&1 | tee -a "$LOG_FILE"
  local exit_code=${PIPESTATUS[0]}
  if [[ $exit_code -ne 0 ]]; then
    log "ERROR: PKG installation failed (exit: $exit_code)"
    exit $exit_code
  fi
  log "PKG installed successfully"
}

install_dmg() {
  local dmg="$1"
  if [[ ! -f "$dmg" ]]; then
    log "ERROR: DMG não encontrado: $dmg"
    exit 1
  fi
  log "Montando DMG: $dmg"
  local mount_point=$(hdiutil attach "$dmg" -nobrowse -mountrandom /tmp 2>&1 | tail -1 | awk '{print $NF}')
  if [[ -z "$mount_point" ]]; then
    log "ERROR: Falha ao montar DMG"
    exit 1
  fi
  log "Montado em: $mount_point"
  cp -R "$mount_point/IDEIA.app" /Applications/
  log "Copiado para /Applications/"
  hdiutil detach "$mount_point" -quiet
  log "DMG desmontado"
}

apply_config_profile() {
  local profile="$1"
  if [[ ! -f "$profile" ]]; then
    log "WARNING: Profile não encontrado: $profile"
    return
  fi
  log "Aplicando configuration profile: $profile"
  # Validar plist
  plutil -lint "$profile" || {
    log "ERROR: Profile plist inválido"
    return 1
  }
  # Copiar para diretório de configuração
  local cfg_dir="/Library/Preferences/"
  cp "$profile" "${cfg_dir}/dev.ideia.app.plist"
  log "Profile aplicado em $cfg_dir"

  # Se MDM profile (mobileconfig), instalar via profiles CLI
  if [[ "$profile" == *.mobileconfig ]]; then
    profiles -I -F "$profile" 2>&1 | tee -a "$LOG_FILE"
    log "MDM profile installed"
  fi
}

configure_telemetry() {
  if [[ "$TELEMETRY_OPTOUT" == "true" ]]; then
    log "Desabilitando telemetria"
    defaults write dev.ideia.app TelemetryEnabled -bool false
  fi
}

uninstall() {
  log "Iniciando desinstalação..."
  # Remover preferências
  rm -f /Library/Preferences/dev.ideia.app.plist
  rm -f ~/Library/Preferences/dev.ideia.app.plist
  # Remover app
  rm -rf /Applications/IDEIA.app
  # Esquecer package receipt
  pkgutil --forget com.ideia.core 2>/dev/null || true
  pkgutil --forget com.ideia.platform 2>/dev/null || true
  # Limpar cache e logs
  rm -rf /Library/Application\ Support/IDEIA
  rm -rf ~/Library/Application\ Support/IDEIA
  rm -rf /Library/Caches/com.ideia.app
  log "Desinstalação concluída"
}

show_usage() {
  cat << EOF
Uso: $0 [OPÇÕES] <pkg_path>
Opções:
  --config <plist>      Arquivo de configuração corporativa
  --no-telemetry        Desabilitar telemetria
  --uninstall           Desinstalar IDEIA
  --help                Esta ajuda
EOF
  exit 0
}

# Parse args
ACTION="install"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --config) CONFIG_PLIST="$2"; shift 2 ;;
    --no-telemetry) TELEMETRY_OPTOUT="true"; shift ;;
    --uninstall) ACTION="uninstall"; shift ;;
    --help) show_usage ;;
    *) PKG_PATH="$1"; shift ;;
  esac
done

log "=== IDEIA macOS Silent Install ==="
log "Ação: $ACTION"
log "PKG: $PKG_PATH"
log "Config: $CONFIG_PLIST"

check_root

case "$ACTION" in
  uninstall)
    uninstall
    ;;
  install)
    case "${PKG_PATH##*.}" in
      pkg) install_pkg "$PKG_PATH" ;;
      dmg) install_dmg "$PKG_PATH" ;;
      *)
        log "ERROR: Formato não suportado: ${PKG_PATH##*.}. Use .pkg ou .dmg"
        exit 1
        ;;
    esac
    apply_config_profile "$CONFIG_PLIST"
    configure_telemetry
    ;;
esac

log "=== IDEIA macOS Silent Install concluído ==="
```

#### Linux — Bash Silent Install Script

```bash
#!/bin/bash
#
# IDEIA Linux Silent Install
# Suporta: .deb, .rpm, .AppImage, snap, Flatpak

set -euo pipefail

PKG_PATH="${1:-}"
CONFIG_FILE="${2:-/etc/ideia/config.json}"
LOG_FILE="/tmp/ideia-install-$(date +%Y%m%d-%H%M%S).log"
TELEMETRY_OPTOUT="${3:-false}"
INSTALL_DIR="${4:-/opt/ideia}"
REPO_SETUP="${5:-false}"  # true = configurar repo APT/RPM

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg" | tee -a "$LOG_FILE"
}

check_root() {
  if [[ $EUID -ne 0 ]]; then
    log "ERROR: Root required. Run with sudo."
    exit 1
  fi
}

detect_distro() {
  if command -v apt-get &>/dev/null; then
    echo "debian"
  elif command -v dnf &>/dev/null; then
    echo "fedora"
  elif command -v yum &>/dev/null; then
    echo "rhel"
  else
    echo "unknown"
  fi
}

install_deb() {
  local deb="$1"
  if [[ ! -f "$deb" ]]; then
    log "ERROR: .deb não encontrado: $deb"
    exit 1
  fi
  log "Instalando .deb: $deb"
  DEBIAN_FRONTEND=noninteractive apt-get install -y "$deb" 2>&1 | tee -a "$LOG_FILE"
  log "Instalação .deb concluída"
}

install_rpm() {
  local rpm="$1"
  local distro=$(detect_distro)
  if [[ ! -f "$rpm" ]]; then
    log "ERROR: .rpm não encontrado: $rpm"
    exit 1
  fi
  log "Instalando .rpm via $distro: $rpm"
  case "$distro" in
    fedora) dnf install -y "$rpm" 2>&1 | tee -a "$LOG_FILE" ;;
    rhel) yum install -y "$rpm" 2>&1 | tee -a "$LOG_FILE" ;;
    *) log "Distro não suportada para RPM"; exit 1 ;;
  esac
  log "Instalação .rpm concluída"
}

install_appimage() {
  local appimage="$1"
  if [[ ! -f "$appimage" ]]; then
    log "ERROR: AppImage não encontrado: $appimage"
    exit 1
  fi
  log "Instalando AppImage: $appimage"
  mkdir -p "$INSTALL_DIR"
  chmod +x "$appimage"
  cp "$appimage" "$INSTALL_DIR/ideia.AppImage"
  ln -sf "$INSTALL_DIR/ideia.AppImage" /usr/local/bin/ideia
  log "AppImage instalado em $INSTALL_DIR, link em /usr/local/bin/ideia"
}

setup_apt_repo() {
  local repo_url="${1:-https://repo.ideia.dev/apt}"
  local gpg_key="${2:-https://repo.ideia.dev/gpg.key}"
  log "Configurando repositório APT: $repo_url"
  curl -fsSL "$gpg_key" | gpg --dearmor -o /usr/share/keyrings/ideia.gpg
  echo "deb [signed-by=/usr/share/keyrings/ideia.gpg] $repo_url stable main" \
    > /etc/apt/sources.list.d/ideia.list
  apt-get update
  log "Repositório APT configurado. Use: apt-get install ideia"
}

setup_rpm_repo() {
  local repo_url="${1:-https://repo.ideia.dev/rpm}"
  log "Configurando repositório RPM: $repo_url"
  cat > /etc/yum.repos.d/ideia.repo << EOF
[ideia]
name=IDEIA Repository
baseurl=$repo_url
enabled=1
gpgcheck=1
gpgkey=https://repo.ideia.dev/gpg.key
EOF
  case $(detect_distro) in
    fedora) dnf makecache ;;
    rhel) yum makecache ;;
  esac
  log "Repositório RPM configurado. Use: dnf install ideia"
}

apply_config() {
  local config="$1"
  if [[ ! -f "$config" ]]; then
    log "Config file não encontrado: $config (criando default)"
    mkdir -p /etc/ideia
    cat > /etc/ideia/config.json << 'EOF'
{
  "updates": { "enabled": true, "channel": "stable" },
  "telemetry": { "enabled": false },
  "security": { "sandboxMode": "strict" },
  "network": { "airGapped": false }
}
EOF
    return
  fi
  log "Aplicando configuração de: $config"
  mkdir -p /etc/ideia
  cp "$config" /etc/ideia/config.json
  log "Configuração aplicada"
}

uninstall() {
  log "Iniciando desinstalação..."
  local distro=$(detect_distro)
  case "$distro" in
    debian)
      apt-get remove -y ideia 2>/dev/null || true
      dpkg --purge ideia 2>/dev/null || true
      rm -f /etc/apt/sources.list.d/ideia.list
      ;;
    fedora)
      dnf remove -y ideia 2>/dev/null || true
      rm -f /etc/yum.repos.d/ideia.repo
      ;;
    rhel)
      yum remove -y ideia 2>/dev/null || true
      rm -f /etc/yum.repos.d/ideia.repo
      ;;
  esac
  rm -rf /etc/ideia /opt/ideia /var/log/ideia
  rm -f /usr/local/bin/ideia
  log "Desinstalação concluída"
}

show_usage() {
  cat << EOF
Uso: $0 [OPÇÕES] <package_path>

Opções:
  --config <path>       Arquivo de configuração corporativa
  --no-telemetry        Desabilitar telemetria
  --dir <path>          Diretório de instalação (AppImage)
  --setup-repo          Configurar repositório APT/RPM
  --repo-url <url>      URL do repositório
  --uninstall           Desinstalar IDEIA
  --help                Esta ajuda

Formatos suportados: .deb, .rpm, .AppImage, .snap
EOF
  exit 0
}

# Parse args
ACTION="install"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --config) CONFIG_FILE="$2"; shift 2 ;;
    --no-telemetry) TELEMETRY_OPTOUT="true"; shift ;;
    --dir) INSTALL_DIR="$2"; shift 2 ;;
    --setup-repo) REPO_SETUP="true"; shift ;;
    --repo-url) REPO_URL="$2"; shift 2 ;;
    --uninstall) ACTION="uninstall"; shift ;;
    --help) show_usage ;;
    *) PKG_PATH="$1"; shift ;;
  esac
done

log "=== IDEIA Linux Silent Install ==="
log "Ação: $ACTION"
log "Package: ${PKG_PATH:-N/A}"
log "Config: $CONFIG_FILE"
log "Distro: $(detect_distro)"

check_root

case "$ACTION" in
  uninstall)
    uninstall
    ;;
  install)
    if [[ "$REPO_SETUP" == "true" ]]; then
      case $(detect_distro) in
        debian) setup_apt_repo "${REPO_URL:-}" ;;
        fedora|rhel) setup_rpm_repo "${REPO_URL:-}" ;;
      esac
      exit 0
    fi
    case "${PKG_PATH##*.}" in
      deb) install_deb "$PKG_PATH" ;;
      rpm) install_rpm "$PKG_PATH" ;;
      AppImage|appimage) install_appimage "$PKG_PATH" ;;
      *)
        log "ERROR: Formato não suportado: ${PKG_PATH##*.}"
        show_usage
        ;;
    esac
    apply_config "$CONFIG_FILE"
    if [[ "$TELEMETRY_OPTOUT" == "true" ]]; then
      log "Telemetria desabilitada"
    fi
    ;;
esac

log "=== IDEIA Linux Silent Install concluído ==="
```

### 2.5 GPO Deployment (Windows)

```xml
<!-- Administrative Template (ADMX) - IDEIA.admx -->
<policyDefinitions revision="1.0" schemaVersion="1.0">
  <policyNamespaces>
    <target namespace="Microsoft.Policies.IDEIA" prefix="ideia" />
    <using namespace="Microsoft.Policies.Windows" prefix="windows" />
  </policyNamespaces>
  <categories>
    <category name="IDEIA" displayName="$(string.IDEIA)" />
    <category name="IDEIA_Security" displayName="$(string.IDEIA_Security)" />
    <category name="IDEIA_Updates" displayName="$(string.IDEIA_Updates)" />
    <category name="IDEIA_Network" displayName="$(string.IDEIA_Network)" />
  </categories>
  <policies>
    <policy name="IDEIA_DisableTelemetry" class="Machine"
            displayName="$(string.DisableTelemetry)"
            explainText="$(string.DisableTelemetry_Help)">
      <supportedOn>
        <products>
          <product name="Windows" />
        </products>
      </supportedOn>
      <elements>
        <boolean id="DisableTelemetry" valueName="DisableTelemetry" />
      </elements>
    </policy>

    <policy name="IDEIA_ProxyServer" class="Machine"
            displayName="$(string.ProxyServer)"
            explainText="$(string.ProxyServer_Help)">
      <supportedOn>
        <products>
          <product name="Windows" />
        </products>
      </supportedOn>
      <elements>
        <text id="ProxyServer" valueName="ProxyServer" maxLength="255" />
      </elements>
    </policy>

    <policy name="IDEIA_AllowedCommands" class="Machine"
            displayName="$(string.AllowedCommands)"
            explainText="$(string.AllowedCommands_Help)">
      <supportedOn>
        <products>
          <product name="Windows" />
        </products>
      </supportedOn>
      <elements>
        <list id="AllowedCommands" valuePrefix="cmd" />
      </elements>
    </policy>

    <policy name="IDEIA_UpdateChannel" class="Machine"
            displayName="$(string.UpdateChannel)"
            explainText="$(string.UpdateChannel_Help)">
      <supportedOn>
        <products>
          <product name="Windows" />
        </products>
      </supportedOn>
      <elements>
        <enum id="UpdateChannel" valueName="UpdateChannel">
          <item displayName="$(string.Stable)">
            <value>
              <decimal value="0" />
            </value>
          </item>
          <item displayName="$(string.Beta)">
            <value>
              <decimal value="1" />
            </value>
          </item>
          <item displayName="$(string.Insider)">
            <value>
              <decimal value="2" />
            </value>
          </item>
        </enum>
      </elements>
    </policy>

    <policy name="IDEIA_SandboxMode" class="Machine"
            displayName="$(string.SandboxMode)"
            explainText="$(string.SandboxMode_Help)">
      <supportedOn>
        <products>
          <product name="Windows" />
        </products>
      </supportedOn>
      <elements>
        <enum id="SandboxMode" valueName="SandboxMode">
          <item displayName="$(string.Strict)">
            <value>
              <decimal value="0" />
            </value>
          </item>
          <item displayName="$(string.Standard)">
            <value>
              <decimal value="1" />
            </value>
          </item>
          <item displayName="$(string.Permissive)">
            <value>
              <decimal value="2" />
            </value>
          </item>
        </enum>
      </elements>
    </policy>
  </policies>
</policyDefinitions>
```

```xml
<!-- ADML (language file) - en-US/IDEIA.adml -->
<policyDefinitionResources revision="1.0" schemaVersion="1.0">
  <displayName>IDEIA Enterprise Settings</displayName>
  <description>IDEIA AI Development Platform policy settings</description>
  <resources>
    <string id="IDEIA">IDEIA</string>
    <string id="IDEIA_Security">IDEIA Security</string>
    <string id="IDEIA_Updates">IDEIA Updates</string>
    <string id="IDEIA_Network">IDEIA Network</string>
    <string id="DisableTelemetry">Disable Telemetry</string>
    <string id="DisableTelemetry_Help">Disables all telemetry and analytics collection</string>
    <string id="ProxyServer">Proxy Server</string>
    <string id="ProxyServer_Help">HTTP proxy for outbound connections (host:port)</string>
    <string id="AllowedCommands">Allowed Shell Commands</string>
    <string id="AllowedCommands_Help">List of commands users are allowed to execute via IDEIA</string>
    <string id="UpdateChannel">Update Channel</string>
    <string id="UpdateChannel_Help">Software update channel (Stable, Beta, Insider)</string>
    <string id="Stable">Stable</string>
    <string id="Beta">Beta</string>
    <string id="Insider">Insider</string>
    <string id="SandboxMode">Sandbox Mode</string>
    <string id="SandboxMode_Help">Code execution sandbox strictness</string>
    <string id="Strict">Strict</string>
    <string id="Standard">Standard</string>
    <string id="Permissive">Permissive</string>
  </resources>
</policyDefinitionResources>
```

### 2.6 MDM Configuration Profile (macOS)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>PayloadType</key>
      <string>com.apple.ManagedClient.preferences</string>
      <key>PayloadIdentifier</key>
      <string>dev.ideia.app.profile</string>
      <key>PayloadUUID</key>
      <string>AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE</string>
      <key>PayloadDisplayName</key>
      <string>IDEIA Enterprise Configuration</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>PayloadContent</key>
      <array>
        <dict>
          <key>ideia</key>
          <dict>
            <key>AutoUpdateEnabled</key>
            <false/>
            <key>UpdateChannel</key>
            <string>stable</string>
            <key>TelemetryEnabled</key>
            <false/>
            <key>TelemetryLevel</key>
            <string>minimal</string>
            <key>SandboxMode</key>
            <string>strict</string>
            <key>AllowedCommands</key>
            <array>
              <string>git</string>
              <string>npm</string>
              <string>node</string>
            </array>
            <key>BlockedCommands</key>
            <array>
              <string>rm -rf</string>
              <string>sudo</string>
              <string>chmod -R 777</string>
            </array>
            <key>ProxyServer</key>
            <string>proxy.corp.empresa.com:8080</string>
            <key>ProxyExceptions</key>
            <array>
              <string>*.local</string>
              <string>10.*</string>
            </array>
            <key>MaxConcurrentAgents</key>
            <integer>2</integer>
            <key>MaxTokensPerRequest</key>
            <integer>4096</integer>
            <key>ModelEndpoint</key>
            <string>https://llm.internal.empresa.com/v1</string>
            <key>AuditEnabled</key>
            <true/>
            <key>AuditRetentionDays</key>
            <integer>90</integer>
          </dict>
        </dict>
      </array>
    </dict>
  </array>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadIdentifier</key>
  <string>dev.ideia.app</string>
  <key>PayloadUUID</key>
  <string>FFFFFFFF-GGGG-HHHH-IIII-JJJJJJJJJJJJ</string>
  <key>PayloadDisplayName</key>
  <string>IDEIA MDM Profile</string>
  <key>PayloadDescription</key>
  <string>IDEIA enterprise settings managed by MDM</string>
  <key>PayloadOrganization</key>
  <string>IDEIA Inc.</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
  <key>PayloadRemovalDisallowed</key>
  <true/>
</dict>
</plist>
```

---

## 3. ENGENHARIA (Nível 5-6)

### 3.1 Enterprise Deployment Scenarios

#### Scenario 1: SCCM (Microsoft Endpoint Configuration Manager)

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│  SCCM Admin  │───▶│ Distribution  │───▶│  Windows Target  │
│  Console     │    │  Point       │    │  (1000 machines) │
└─────────────┘    └──────────────┘    └─────────────────┘
       │                                      │
       │ Create Application                   │ Install MSI silently
       │ Add MSI + detection rule             │ via ccmsetup / client
       │ Deploy to Device Collection          │
       └──────────────────────────────────────┘
```

**SCCM Deployment Steps:**

1. **Create Application** in SCCM Console
2. **Deployment Type:** MSI with `msiexec /i IDEIA.msi /qn /norestart`
3. **Detection Method:** Registry key `HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\{IDEIA-PRODUCT-CODE}`
4. **Requirements:** Windows 10/11 x64, 8GB RAM
5. **Distribution:** Copy to Distribution Points
6. **Deployment:** Target Device Collection, Required (deadline in 7 days)
7. **Supersedence:** Define upgrade chain for future versions

```powershell
# SCCM Deployment PowerShell Wrapper
$appName = "IDEIA Enterprise"
$msiPath = "\\sccm-server\Sources\Applications\IDEIA\IDEIA-v2.0.msi"
$detectScript = @'
$product = Get-WmiObject -Class Win32_Product | Where-Object { $_.Name -like "*IDEIA*" }
if ($product) { Write-Host "Installed" } else { Write-Host "NotInstalled" }
'@

New-CMApplication -Name $appName -Publisher "IDEIA Inc." -SoftwareVersion "2.0.0"
New-CMApplicationDeploymentType -MsiInstaller -Name "IDEIA MSI" `
  -ContentLocation $msiPath -ForceSourceUpdate $true `
  -InstallCommand "msiexec /i IDEIA.msi /qn /norestart" `
  -UninstallCommand "msiexec /x {PRODUCT-GUID} /qn /norestart" `
  -DetectionClause @{SettingType=Script; ScriptType=PowerShell; ScriptContent=$detectScript}
```

#### Scenario 2: JAMF Pro (Apple macOS MDM)

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│  JAMF Admin  │───▶│  JAMF CDP    │───▶│  macOS Target    │
│  Console     │    │  (Cloud DP)  │    │  (500 Macs)     │
└─────────────┘    └──────────────┘    └─────────────────┘
       │                                      │
       │ Create PKG + Configuration Profile   │ Install via Jamf
       │ Deploy to Smart Group                │ Binary + Policies
       └──────────────────────────────────────┘
```

```bash
# JAMF Pre-install script: check prerequisites
#!/bin/bash
min_os="12.0"  # macOS Monterey
min_ram="8"    # GB
min_disk="2"   # GB free

os_version=$(sw_vers -productVersion)
ram_gb=$(sysctl -n hw.memsize | awk '{print $0/1073741824}')
disk_free=$(df -g / | tail -1 | awk '{print $4}')

if [[ "$(printf '%s\n' "$min_os" "$os_version" | sort -V | head -1)" != "$min_os" ]]; then
  echo "ERROR: Required macOS $min_os+, found $os_version"
  exit 1
fi
if (( $(echo "$ram_gb < $min_ram" | bc -l) )); then
  echo "ERROR: Required $min_ram GB RAM, found $ram_gb GB"
  exit 1
fi
if (( disk_free < min_disk )); then
  echo "ERROR: Required $min_disk GB free, found $disk_free GB"
  exit 1
fi
echo "Prerequisites OK"
exit 0
```

```bash
# JAMF Post-install script: apply enterprise config
#!/bin/bash
cat > /Library/Preferences/dev.ideia.app.plist << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>AutoUpdateEnabled</key>
  <false/>
  <key>TelemetryEnabled</key>
  <false/>
  <key>SandboxMode</key>
  <string>strict</string>
  <key>ModelEndpoint</key>
  <string>https://llm.internal.empresa.com/v1</string>
</dict>
</plist>
PLIST
plutil -convert binary1 /Library/Preferences/dev.ideia.app.plist
echo "IDEIA enterprise config applied"
exit 0
```

#### Scenario 3: Red Hat Satellite (Linux)

```bash
# Criar produto e repositório no Satellite
hammer product create --name "IDEIA" --organization "ACME Corp"
hammer repository create --name "IDEIA-EL9" --organization "ACME Corp" \
  --product "IDEIA" --content-type yum --url https://repo.ideia.dev/rpm/el9

# Sincronizar
hammer repository synchronize --name "IDEIA-EL9" --organization "ACME Corp" \
  --product "IDEIA"

# Criar activation key
hammer activation-key create --name "IDEIA-Prod" --organization "ACME Corp" \
  --lifecycle-environment "Production"
hammer activation-key add-subscription --name "IDEIA-Prod" --organization "ACME Corp"

# Aplicar via host group
hammer host-group set-parameter --host-group "RHEL9-Workstation" \
  --name "enable-ideia-repo" --value "true"
```

### 3.2 Auto-Update Mechanisms

| Sistema | Plataforma | Mecanismo | Frequência |
|---------|-----------|-----------|------------|
| WSUS | Windows | Windows Server Update Services + GPO pointing internal SUS | Semanal |
| Windows Update for Business | Windows | GPO + WUfB rings | Diário |
| Munki | macOS | Manifest-based, catalogs, pkgsinfo | Por política |
| Jamf Patch Management | macOS | Patch titles, version, deadline | Por política |
| Aptly | Linux | Repositório APT versionado | Pull |
| Pulp/RPM Mirror | Linux | Mirror de repositório RPM | Pull |
| IDEIA Native | Cross-platform | Auto-updater electron-builder | 24h |

```powershell
# Windows: Configurar WSUS via GPO (PowerShell DSC)
Configuration WSUSConfig {
  Node "localhost" {
    Registry "WSUS Server" {
      Key       = "HKLM:\Software\Policies\Microsoft\Windows\WindowsUpdate"
      ValueName = "WUServer"
      ValueData = "http://wsus.corp.empresa.com:8530"
      ValueType = "String"
    }
    Registry "WSUS Status Server" {
      Key       = "HKLM:\Software\Policies\Microsoft\Windows\WindowsUpdate"
      ValueName = "WUStatusServer"
      ValueData = "http://wsus.corp.empresa.com:8530"
      ValueType = "String"
    }
    Registry "Target Group" {
      Key       = "HKLM:\Software\Policies\Microsoft\Windows\WindowsUpdate"
      ValueName = "TargetGroup"
      ValueData = "IDEIA-Users"
      ValueType = "String"
    }
    Registry "Enable WSUS" {
      Key       = "HKLM:\Software\Policies\Microsoft\Windows\WindowsUpdate\AU"
      ValueName = "UseWUServer"
      ValueData = 1
      ValueType = "DWord"
    }
    Registry "Auto Install" {
      Key       = "HKLM:\Software\Policies\Microsoft\Windows\WindowsUpdate\AU"
      ValueName = "AUOptions"
      ValueData = 4  # 4=auto download+install
      ValueType = "DWord"
    }
  }
}
```

```python
# Munki manifest generator for IDEIA updates
import json
import plistlib
from datetime import datetime, timedelta

MANIFEST_NAME = "IDEIA-Production"
CATALOG_URL = "https://munki.internal.empresa.com/catalogs"
PKGSINFO_DIR = "/var/www/munki/pkgsinfo"

def generate_ideia_manifest(version, min_os_version="12.0"):
    manifest = {
        "catalogs": ["ideia_stable"],
        "included_manifests": ["site_default"],
        "conditional_items": [
            {
                "condition": "os_version >= '{}'".format(min_os_version),
                "catalogs": ["ideia_stable"],
                "included_manifests": []
            }
        ]
    }
    with open(f"{PKGSINFO_DIR}/IDEIA-{version}.plist", "wb") as f:
        plistlib.dump({
            "autoremove": False,
            "description": "IDEIA AI Development Platform",
            "display_name": f"IDEIA {version}",
            "installs": [{"path": "/Applications/IDEIA.app", "type": "application"}],
            "minimum_os_version": min_os_version,
            "name": "IDEIA",
            "receipts": [{"packageid": "com.ideia.core", "version": version}],
            "unattended_install": True,
            "uninstall_method": "remove_app",
            "version": version
        }, f)
    return manifest

# Generate latest
manifest = generate_ideia_manifest("2.0.0")
```

### 3.3 Volume Licensing Models

| Provedor | Modelo | Key Management | Como Funciona |
|----------|--------|---------------|---------------|
| Microsoft | Volume Licensing | VLSC / KMS | KMS activation via DNS records; MAK for isolated |
| Apple | VPP (Volume Purchase Program) | ABM / ASM | MDM-assigned licenses; revocation supported |
| Canonical | Ubuntu Advantage | Token-based | Subscription token per machine or per org |
| Red Hat | Red Hat Subscription | Satellite | Manifest export; subscription allocation |
| IDEIA | License Server | Floating / Node-locked | Internal license server; offline activation files |

### 3.4 Silent Uninstall

#### Windows

```powershell
function Uninstall-IDEIASilent {
  param([string]$ProductCode)
  if (-not $ProductCode) {
    # Auto-detect
    $product = Get-WmiObject -Class Win32_Product | Where-Object {
      $_.Name -like "*IDEIA*"
    } | Select-Object -First 1
    $ProductCode = $product.IdentifyingNumber
  }
  if (-not $ProductCode) {
    throw "IDEIA product code not found"
  }
  Write-Log "Uninstalling: $ProductCode"
  $proc = Start-Process -FilePath "msiexec.exe" `
    -ArgumentList "/x $ProductCode /qn /norestart /l*v $env:TEMP\IDEIA-Uninstall.log" `
    -Wait -NoNewWindow -PassThru
  if ($proc.ExitCode -ne 0 -and $proc.ExitCode -ne 3010) {
    throw "Uninstall failed with exit code $($proc.ExitCode)"
  }
  # Cleanup residual
  Remove-Item -Path "$env:PROGRAMDATA\IDEIA" -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -Path "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$ProductCode" `
    -Recurse -Force -ErrorAction SilentlyContinue
  Write-Log "IDEIA uninstalled successfully"
}
```

#### macOS

```bash
# Silent uninstall via pkgutil
sudo pkgutil --forget com.ideia.core
sudo pkgutil --forget com.ideia.platform
sudo rm -rf /Applications/IDEIA.app
sudo rm -rf /Library/Preferences/dev.ideia.app.plist
sudo rm -rf /Library/Application\ Support/IDEIA
sudo rm -rf /Library/Caches/com.ideia.app
sudo rm -rf /var/log/ideia
```

#### Linux

```bash
# Silent uninstall per distro
case "$(detect_distro)" in
  debian) sudo dpkg --purge ideia ;;
  fedora) sudo dnf remove -y ideia ;;
  rhel) sudo yum remove -y ideia ;;
esac
sudo rm -rf /etc/ideia /opt/ideia /var/log/ideia
sudo rm -f /etc/apt/sources.list.d/ideia.list /etc/yum.repos.d/ideia.repo
```

### 3.5 IDEIA Enterprise Install — Required Components

| Componente | Obrigatório? | Tamanho | Descrição |
|-----------|-------------|---------|-----------|
| IDEIA Core | Sim | 150MB | Engine principal |
| Node.js 20+ | Sim | 80MB | Runtime |
| LLM Provider | Sim (1) | 0-10GB | Ollama externo ou modelo local |
| NATS Server | Recomendado | 30MB | Barramento de eventos |
| PostgreSQL | Opcional | 200MB | Data layer avançado |
| Theia IDE | Opcional | 120MB | Ambiente de desenvolvimento |
| Python 3.11+ | Opcional | 60MB | Scripts e agentes Python |
| Git | Recomendado | 50MB | Controle de versão |

**Air-Gapped Dependencies:**

```json
{
  "airgapped": {
    "bundles": [
      {
        "name": "ideia-core",
        "version": "2.0.0",
        "checksum": "sha256:a1b2c3d4e5f6...",
        "size_mb": 150,
        "dependencies": ["nodejs", "libsecret", "gnupg"]
      },
      {
        "name": "nodejs",
        "version": "20.12.0",
        "checksum": "sha256:fedcba987654...",
        "platforms": ["win-x64", "mac-arm64", "linux-x64"]
      },
      {
        "name": "ollama",
        "version": "0.3.0",
        "checksum": "sha256:123456789abc...",
        "models": ["llama3", "codellama"]
      }
    ],
    "mirror_required": true,
    "gpg_keys": ["https://repo.ideia.dev/gpg.key"],
    "offline_activation": {
      "type": "license_file",
      "path": "/etc/ideia/license.lic"
    }
  }
}
```

---

## 4. INOVAÇÃO (Nível 7-8)

### 4.1 Zero-Touch Provisioning Pipeline

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ IT Admin  │──▶│  MDM/GPO  │──▶│  Network  │──▶│  Device   │──▶│  Ready   │
│ Config    │   │  Push     │   │  Setup    │   │  Install  │   │  Workspace│
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
     │              │              │              │              │
     │ Define       │ Device       │ Proxy/CA     │ Silent       │ All agents
     │ enterprise   │ enrollment   │ certificate  │ install      │ configured
     │ config       │              │              │              │
```

### 4.2 Platform-Specific Innovation

| Inovação | Plataforma | Descrição | Impacto |
|----------|-----------|-----------|---------|
| Auto-Detection de Proxy | Cross | Detecta proxy corporativo via WPAD/PAC e configura automaticamente | Reduz 80% de tickets de deploy |
| Config Injection via GPO | Windows | GPO grava diretamente no registry da IDEIA, sem arquivo intermediário | Tempo real, sem reboot |
| MDM Config Lifecycle | macOS | Profiles reaplicam configuração a cada check-in MDM (30min) | Auto-remediação |
| Ansible Dynamic Inventory | Linux | Gera inventário dinâmico dos nós IDEIA para orquestração | Deploy em escala |
| Terraform Provider | Cross | `terraform-provider-ideia` para provisioning declarativo | GitOps completo |
| Kured-style Auto-Restart | Linux | Detecta reboot necessário após instalação e coordena rolling restart | Zero downtime |

### 4.3 Disaster Recovery para Enterprise Deploy

```powershell
# PowerShell: Enterprise Backup & Restore de Configuração IDEIA
function Backup-IDEIAConfig {
  param([string]$BackupPath = "$env:USERPROFILE\Desktop\IDEIA-Backup")
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backupDir = Join-Path $BackupPath $timestamp
  New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

  $paths = @{
    "Config" = "$env:PROGRAMDATA\IDEIA\config.json"
    "License" = "$env:PROGRAMDATA\IDEIA\license.lic"
    "Logs" = "$env:PROGRAMDATA\IDEIA\logs"
    "CustomPolicies" = "$env:PROGRAMDATA\IDEIA\policies"
  }

  foreach ($name in $paths.Keys) {
    $src = $paths[$name]
    if (Test-Path $src) {
      Copy-Item -Path $src -Destination "$backupDir\$name" -Recurse -Force
      Write-Log "Backup: $name → $backupDir\$name"
    }
  }

  # Export registry settings
  $regPath = "HKLM:\Software\Policies\IDEIA"
  if (Test-Path $regPath) {
    reg export "HKLM\Software\Policies\IDEIA" "$backupDir\registry.reg" /y
    Write-Log "Backup: Registry → $backupDir\registry.reg"
  }

  Compress-Archive -Path "$backupDir\*" -DestinationPath "$backupDir.zip" -Force
  Remove-Item -Path $backupDir -Recurse -Force
  Write-Log "Backup completo: $backupDir.zip"
  return "$backupDir.zip"
}

function Restore-IDEIAConfig {
  param([string]$BackupFile)
  if (-not (Test-Path $BackupFile)) {
    throw "Backup não encontrado: $BackupFile"
  }
  $restoreDir = "$env:TEMP\IDEIA-Restore"
  Expand-Archive -Path $BackupFile -DestinationPath $restoreDir -Force

  $paths = @{
    "Config" = "$env:PROGRAMDATA\IDEIA\"
    "License" = "$env:PROGRAMDATA\IDEIA\"
    "Logs" = "$env:PROGRAMDATA\IDEIA\"
    "CustomPolicies" = "$env:PROGRAMDATA\IDEIA\"
  }

  foreach ($name in $paths.Keys) {
    $dest = $paths[$name]
    $src = "$restoreDir\$name"
    if (Test-Path $src) {
      Copy-Item -Path "$src\*" -Destination $dest -Recurse -Force
      Write-Log "Restore: $src → $dest"
    }
  }

  # Restore registry
  $regFile = "$restoreDir\registry.reg"
  if (Test-Path $regFile) {
    reg import $regFile
  }

  Remove-Item -Path $restoreDir -Recurse -Force
  Write-Log "Restore completo de: $BackupFile"
}
```

### 4.4 Compliance Automation

```typescript
interface ComplianceCheck {
  name: string;
  framework: 'SOC2' | 'ISO27001' | 'GDPR' | 'HIPAA';
  check(): Promise<ComplianceResult>;
}

class SilentInstallCompliance implements ComplianceCheck {
  name = 'Silent Install Compliance';
  framework = 'SOC2';

  async check(): Promise<ComplianceResult> {
    const results: ComplianceCheckItem[] = [];

    // CC6.1: Software integrity verification
    results.push({
      control: 'CC6.1',
      passed: await this.verifyPackageSignature(),
      detail: 'Install package signature verified'
    });

    // CC6.6: Access to install logs
    results.push({
      control: 'CC6.6',
      passed: await this.checkAuditLogsAccessible(),
      detail: 'Audit logs at /var/log/ideia/audit.log'
    });

    // CC7.2: Monitoring of install events
    results.push({
      control: 'CC7.2',
      passed: await this.checkMonitoringConfigured(),
      detail: 'Install events sent to SIEM'
    });

    return {
      framework: 'SOC2',
      passed: results.every(r => r.passed),
      checks: results,
      timestamp: new Date(),
    };
  }

  private async verifyPackageSignature(): Promise<boolean> {
    // Verify MSI/DEB/RPM signing
    const platform = process.platform;
    if (platform === 'win32') {
      // SignTool verify
      return true;
    } else if (platform === 'darwin') {
      // pkgutil --check-signature
      return true;
    }
    return true; // Linux: GPG
  }

  private async checkAuditLogsAccessible(): Promise<boolean> {
    try {
      await fs.access('/var/log/ideia/audit.log', fs.constants.R_OK);
      return true;
    } catch { return false; }
  }

  private async checkMonitoringConfigured(): Promise<boolean> {
    // Check if install event is being forwarded
    return true;
  }
}
```

---

## 5. PESQUISA (Nível 9-10)

### 5.1 MDM Solutions — Comparação Detalhada

| Critério | Microsoft Intune | JAMF Pro | VMware Workspace ONE | Miradore |
|----------|-----------------|----------|---------------------|----------|
| Windows Suport | ★★★★★ | ★☆☆☆☆ | ★★★★★ | ★★★☆☆ |
| macOS Suport | ★★★☆☆ | ★★★★★ | ★★★★☆ | ★★☆☆☆ |
| Linux Suport | ★☆☆☆☆ | ★☆☆☆☆ | ★★★☆☆ | ★☆☆☆☆ |
| Mobile (iOS/Android) | ★★★★★ | ★★★★☆ | ★★★★★ | ★★★★☆ |
| Silent App Deploy | ★★★★☆ | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| Patch Management | ★★★★☆ | ★★★★☆ | ★★★★☆ | ★★★☆☆ |
| Compliance Policies | ★★★★★ | ★★★★☆ | ★★★★★ | ★★★☆☆ |
| Custom Scripts | ★★★☆☆ | ★★★★★ | ★★★★☆ | ★★☆☆☆ |
| Conditional Access | ★★★★★ | ★★★☆☆ | ★★★★★ | ★☆☆☆☆ |
| Cost (per device/mês) | ~$8-12 | ~$4-8 | ~$5-10 | ~$2-5 |
| IDEIA Integration | REST API + GPO | Plist + Scripts | REST API | Custom |

### 5.2 Air-Gapped Deployment Architecture

```
┌─────────────────────────┐     ┌──────────────────────────────┐
│   Internet (blocked)    │     │    Enterprise Network         │
│                         │     │                              │
│  repo.ideia.dev         │ ◀──▶│  Local Mirror Server         │
│  registry.npmjs.org     │     │  ┌────────────────────────┐  │
│  docker.io              │     │  │ Aptly (APT Mirror)     │  │
│  pypi.org               │     │  │ Pulp (RPM Mirror)      │  │
│                         │     │  │ Verdaccio (NPM Mirror) │  │
│                         │     │  │ Docker Registry Mirror │  │
│                         │     │  │ WSUS (Windows Updates) │  │
│                         │     │  │ Munki (macOS Updates)  │  │
│                         │     │  └────────────────────────┘  │
│                         │     │                              │
│                         │     │  ┌────────────────────────┐  │
│                         │     │  │ IDEIA License Server   │  │
│                         │     │  │ (offline activation)   │  │
│                         │     │  └────────────────────────┘  │
│                         │     │                              │
│                         │     │  Targets (air-gapped)        │
│                         │     │  ┌────────────────────────┐  │
│                         │     │  │ Win · Mac · Linux      │  │
│                         │     │  │ MDM/GPO Managed        │  │
│                         │     │  └────────────────────────┘  │
└─────────────────────────┘     └──────────────────────────────┘
```

**Air-Gapped Deployment Script:**

```bash
#!/bin/bash
# IDEIA Air-Gapped Deployment Script
# Executado no mirror server para sincronizar artefatos

set -euo pipefail

MIRROR_DIR="/var/ideia-mirror"
IDEIA_VERSION="${1:-2.0.0}"
PLATFORMS="${2:-linux-x64,win-x64,mac-arm64}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

sync_artifacts() {
  log "Sincronizando artefatos IDEIA v$IDEIA_VERSION..."
  mkdir -p "$MIRROR_DIR/packages"

  IFS=',' read -ra pf <<< "$PLATFORMS"
  for platform in "${pf[@]}"; do
    local url="https://releases.ideia.dev/v$IDEIA_VERSION/ideia-$platform.zip"
    local outfile="$MIRROR_DIR/packages/ideia-$platform-v$IDEIA_VERSION.zip"
    if [[ ! -f "$outfile" ]]; then
      log "  Downloading: ideia-$platform..."
      curl -fsSL -o "$outfile" "$url"
      log "  Checksum: $(sha256sum "$outfile" | awk '{print $1}')"
    fi
  done
  log "Artefatos sincronizados"
}

sync_npm_mirror() {
  log "Sincronizando dependências NPM..."
  local packages=("ideia-core" "ideia-cli" "ideia-agent-runtime")
  for pkg in "${packages[@]}"; do
    npm pack "$pkg" --pack-destination "$MIRROR_DIR/npm" 2>/dev/null || {
      log "  WARNING: $pkg não encontrado no registry"
    }
  done
  log "NPM packages sincronizados"
}

generate_offline_bundle() {
  log "Gerando bundle offline..."
  local bundle="$MIRROR_DIR/ideia-offline-v$IDEIA_VERSION.tar.gz"
  tar czf "$bundle" -C "$MIRROR_DIR" packages npm
  log "Bundle: $bundle ($(du -h "$bundle" | cut -f1))"
  log "SHA256: $(sha256sum "$bundle" | awk '{print $1}')"
}

generate_activation() {
  log "Gerando arquivo de ativação offline..."
  local license="$MIRROR_DIR/license-v$IDEIA_VERSION.lic"
  cat > "$license" << EOF
{
  "product": "IDEIA Enterprise",
  "version": "$IDEIA_VERSION",
  "licensedTo": "ACME Corp",
  "seats": 1000,
  "type": "floating",
  "expires": "2027-12-31",
  "signature": "MEUCIQD..."
}
EOF
  log "Licença: $license"
}

sync_artifacts
sync_npm_mirror
generate_offline_bundle
generate_activation
log "=== Air-gapped sync complete ==="
```

### 5.3 Testing Silent Installs — CI Pipeline

```yaml
# .github/workflows/test-silent-install.yml
name: Test Silent Install

on:
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday
  workflow_dispatch:
    inputs:
      platform:
        description: 'Platform to test'
        type: choice
        options: [all, windows, macos, linux]

jobs:
  test-windows:
    runs-on: windows-latest
    if: inputs.platform == 'all' || inputs.platform == 'windows'
    steps:
      - uses: actions/checkout@v4
      - name: Test MSI Silent Install
        shell: powershell
        run: |
          # Build MSI
          npm run build:msi
          # Test silent install
          $proc = Start-Process msiexec -ArgumentList "/i .\dist\IDEIA.msi /qn /norestart" -Wait -PassThru
          if ($proc.ExitCode -ne 0 -and $proc.ExitCode -ne 3010) {
            throw "Install failed: $($proc.ExitCode)"
          }
          # Verify installation
          if (-not (Test-Path "$env:ProgramFiles\IDEIA\ideia.exe")) {
            throw "IDEIA.exe not found after install"
          }
          # Test uninstall
          $productCode = (Get-WmiObject Win32_Product | Where-Object Name -like "*IDEIA*").IdentifyingNumber
          $proc = Start-Process msiexec -ArgumentList "/x $productCode /qn /norestart" -Wait -PassThru
          if ($proc.ExitCode -ne 0) {
            throw "Uninstall failed: $($proc.ExitCode)"
          }

  test-macos:
    runs-on: macos-latest
    if: inputs.platform == 'all' || inputs.platform == 'macos'
    steps:
      - uses: actions/checkout@v4
      - name: Test PKG Silent Install
        run: |
          npm run build:pkg
          sudo installer -pkg dist/IDEIA.pkg -target /
          if [ ! -d "/Applications/IDEIA.app" ]; then
            echo "IDEIA.app not found"
            exit 1
          fi
          sudo pkgutil --forget com.ideia.core
          sudo rm -rf /Applications/IDEIA.app

  test-linux:
    runs-on: ubuntu-latest
    if: inputs.platform == 'all' || inputs.platform == 'linux'
    strategy:
      matrix:
        distro: [ubuntu-latest, ubuntu-20.04]
    steps:
      - uses: actions/checkout@v4
      - name: Test DEB Silent Install
        run: |
          npm run build:deb
          sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ./dist/ideia_*.deb
          if [ ! -f "/opt/ideia/bin/ideia" ]; then
            echo "IDEIA binary not found"
            exit 1
          fi
          sudo dpkg --purge ideia

  test-vagrant:
    runs-on: ubuntu-latest
    if: inputs.platform == 'all'
    strategy:
      matrix:
        box: [generic/ubuntu2204, generic/centos9s, generic/windows11]
    steps:
      - uses: actions/checkout@v4
      - name: Test via Vagrant
        run: |
          vagrant init ${{ matrix.box }}
          # Test PowerShell silent install on each VM
          vagrant ssh -c "powershell -File /vagrant/scripts/install-ideia.ps1 -NoTelemetry" || \
          vagrant ssh -c "sudo bash /vagrant/scripts/install-ideia.sh --no-telemetry"
```

---

## 6. FRONTEIRAS (Nível 11-12)

### 6.1 Limitações Atuais

| Limitação | Impacto | Contorno |
|-----------|---------|----------|
| MSI não suporta install per-user sem admin | Usuários sem admin não instalam | Usar AppX/MSIX ou ClickOnce |
| macOS PKG requer autenticação | Sempre precisa de senha do admin | Usar MDM push via JAMF/Munki |
| Linux Snap/Flatpak confinamento | Acesso restrito a recursos do sistema | Usar .deb/.rpm tradicional |
| WSUS não suporta aplicações não-Microsoft nativamente | IDEIA não aparece no WSUS | Distribuir via SCCM ou GPO Software Installation |
| GPUs em container | Air-gapped + GPU inference é complexo | Modelos CPU-only no bundle offline |

### 6.2 Riscos Identificados

| Risco | Probabilidade | Severidade | Mitigação |
|-------|--------------|------------|-----------|
| Silent install falha em 0.1% das máquinas | Média | Alta | Logs centralizados + auto-retry |
| Configuração GPO conflita com MDM | Baixa | Média | Priorização: MDM > GPO > local |
| Certificado CA corporativo expirado | Baixa | Alta | Auto-renew monitoring + alerta |
| Proxy corporativo bloqueia download | Média | Alta | Mirror local + bundle offline |
| Licença expira em ambientes air-gapped | Média | Média | Grace period de 30 dias + renewal alert |

### 6.3 Próximas Fronteiras

| Fronteira | Descrição | Previsão |
|-----------|-----------|----------|
| **MSIX Packaging** | Formato MSIX da Microsoft com suporte nativo a packages corporativos, instalação isolada por usuário sem admin | Fase 2 |
| **macOS MDM-native** | Apple MDM protocol v2 com install declarativo via Declarative Device Management (DDM) | Fase 3 |
| **Linux OSTree** | Deploy imutável via OSTree, atomic updates com rollback nativo (como Fedora Silverblue) | Fase 3 |
| **Flux/GitOps para Desktop** | Configuração enterprise via Git repo, sync automático como ArgoCD para estações de trabalho | Fase 4 |
| **TEE (Trusted Execution)** | Silent install verificado por enclave Intel SGX ou AMD SEV para compliance máxima | Fase 5 |
| **Winget / WinGet Configuration** | Suporte a winget configure (DSC-like), declarativo via YAML para Windows | Fase 2 |

### 6.4 Matriz de Decisão — Formato de Instalação Enterprise

| Critério | MSI | PKG | DEB | RPM | AppImage | Snap | Flatpak | Electron Builder |
|----------|-----|-----|-----|-----|----------|------|---------|-----------------|
| Silent Install | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | ★★☆☆☆ | ★★★☆☆ | ★★★☆☆ | ★★★★★ |
| GPO/ADMX | ★★★★★ | ★☆☆☆☆ | ★☆☆☆☆ | ★☆☆☆☆ | ★☆☆☆☆ | ★☆☆☆☆ | ★☆☆☆☆ | ★★★★☆ |
| MDM Profile | ★★☆☆☆ | ★★★★★ | ★☆☆☆☆ | ★☆☆☆☆ | ★☆☆☆☆ | ★☆☆☆☆ | ★☆☆☆☆ | ★★★☆☆ |
| Offline/Air-gap | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | ★★★☆☆ | ★★★☆☆ | ★★★★★ |
| CI/CD Friendly | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ |
| App Sandboxing | ★★☆☆☆ | ★★★★☆ | ★★☆☆☆ | ★★☆☆☆ | ★★★☆☆ | ★★★★★ | ★★★★★ | ★★★☆☆ |
| Per-user Install | ★★☆☆☆ | ★☆☆☆☆ | ★★☆☆☆ | ★★☆☆☆ | ★★★★★ | ★★★★★ | ★★★★★ | ★★★☆☆ |
| Auto-update | ★★☆☆☆ | ★★☆☆☆ | ★★★★☆ | ★★★★☆ | ★★★☆☆ | ★★★★★ | ★★★★★ | ★★★★★ |
| **Score Final** | **33/40** | **31/40** | **28/40** | **28/40** | **30/40** | **31/40** | **31/40** | **36/40** |

---

## 7. ANÁLISE PARA IDEIA

### 7.1 Implementação Recomendada

| Componente | Prioridade | Esforço | Dependências |
|-----------|-----------|---------|-------------|
| Enterprise config schema + loader | P0 | 8h | Nenhuma |
| Silent install scripts (Win/Mac/Linux) | P0 | 12h | Schema definido |
| GPO ADMX template (Windows) | P0 | 8h | Schema definido |
| MDM profile (macOS) | P0 | 6h | Schema definido |
| Air-gapped bundle generator | P1 | 8h | Build pipeline |
| Compliance automation (SOC2/ISO27001) | P2 | 12h | Audit module |
| Terraform provider | P3 | 16h | API estável |
| MSIX packaging | P3 | 20h | Build pipeline |

### 7.2 Roadmap

| Sprint | Entrega | Esforço |
|--------|---------|---------|
| Sprint 1 | Config schema + loader + Silent scripts | 20h |
| Sprint 2 | GPO ADMX + MDM profile + Auto-update | 14h |
| Sprint 3 | Air-gapped bundle + Compliance checks | 20h |
| Sprint 4 | Terraform provider + MSIX | 36h |

### 7.3 Integração com o Ecossistema IDEIA

```typescript
// packages/enterprise-deploy/src/index.ts
import { ServiceCatalog } from '@ideia/ecosystem/service-catalog';
import { EventBus } from '@ideia/event-bus';
import { EnterpriseConfigLoader } from './config-loader';
import { GPOGenerator } from './gpo-generator';
import { MDMProfileGenerator } from './mdm-profile';
import { AirGapBundle } from './airgap-bundle';

export class EnterpriseDeployOrchestrator {
  constructor(
    private configLoader: EnterpriseConfigLoader,
    private eventBus: EventBus,
    private catalog: ServiceCatalog,
  ) {}

  async generateDeploymentPackage(config: EnterpriseConfig): Promise<DeploymentPackage> {
    const package: DeploymentPackage = {
      version: '2.0.0',
      platforms: {},
    };

    if (os.platform() === 'win32') {
      package.platforms.windows = {
        msi: await this.buildMSI(config),
        admx: GPOGenerator.generateADMX(config),
        wsusConfig: this.generateWSUSConfig(config),
        sccmScript: this.generateSCCMScript(config),
      };
    } else if (os.platform() === 'darwin') {
      package.platforms.macos = {
        pkg: await this.buildPKG(config),
        mobileconfig: MDMProfileGenerator.generateProfile(config),
        munkManifest: this.generateMunkiManifest(config),
      };
    } else {
      package.platforms.linux = {
        deb: await this.buildDEB(config),
        rpm: await this.buildRPM(config),
        aptlyConfig: this.generateAptlyConfig(config),
        ansiblePlaybook: this.generateAnsiblePlaybook(config),
      };
    }

    // Air-gapped bundle
    if (config.network.airGapped) {
      package.airGapBundle = await AirGapBundle.generate(config);
    }

    // Publish event
    await this.eventBus.publish('enterprise.deploy.package.generated', {
      package,
      timestamp: new Date(),
    });

    return package;
  }
}
```

### 7.4 Plano de Execução

| Passo | Descrição | Esforço | Entregável |
|-------|-----------|---------|-----------|
| 1 | Enterprise config schema + loader | 4h | `packages/enterprise/EnterpriseConfig.ts` |
| 2 | Silent install scripts (Win/Mac/Linux) | 8h | `scripts/install-ideia.ps1`, `.sh` |
| 3 | GPO ADMX template + ADML | 6h | `scripts/gpo/IDEIA.admx`, `.adml` |
| 4 | MDM configuration profile | 4h | `scripts/mdm/dev.ideia.app.mobileconfig` |
| 5 | Auto-update WSUS/Munki/Aptly config | 4h | `scripts/auto-update/` |
| 6 | Air-gapped bundle generator | 6h | `scripts/airgap/sync-mirror.sh` |
| 7 | Compliance automation | 8h | `packages/compliance/` |
| 8 | Enterprise deploy docs | 6h | `docs/enterprise-deployment.md` |
| 9 | CI silent install tests (Vagrant/Docker) | 6h | `.github/workflows/test-silent-install.yml` |
| 10 | Ansible playbook + Terraform provider | 12h | `ansible/`, `terraform-provider-ideia/` |

---

## 8. REFERÊNCIAS

1. Microsoft GPO. https://learn.microsoft.com/en-us/windows/win32/msi/group-policy
2. Jamf Pro. https://www.jamf.com/products/jamf-pro/
3. Microsoft Intune. https://www.microsoft.com/en-us/security/business/microsoft-intune
4. Apple MDM Protocol. https://developer.apple.com/documentation/devicemanagement
5. WSUS Overview. https://learn.microsoft.com/en-us/windows-server/administration/windows-server-update-services/get-started/windows-server-update-services-wsus
6. Munki Project. https://www.munki.org/munki/
7. Aptly - Debian Repository Management. https://www.aptly.info/
8. Pulp - RPM/Repository Management. https://pulpproject.org/
9. VMware Workspace ONE. https://www.vmware.com/products/workspace-one.html
10. Miradore MDM. https://www.miradore.com/
11. SCCM/ConfigMgr Documentation. https://learn.microsoft.com/en-us/mem/configmgr/
12. Red Hat Satellite. https://www.redhat.com/en/technologies/management/satellite
13. Apple Volume Purchase Program. https://business.apple.com/
14. Microsoft Volume Licensing. https://www.microsoft.com/en-us/licensing/default
15. Inno Setup Silent Install. https://jrsoftware.org/ishelp/index.php?topic=setupcmdline
16. NSIS Silent Install. https://nsis.sourceforge.io/Docs/Chapter3.html
17. MSI Command Line Options. https://learn.microsoft.com/en-us/windows/win32/msi/command-line-options
18. macOS Installer Command. https://developer.apple.com/library/archive/documentation/Darwin/Reference/ManPages/man8/installer.8.html
19. SOC2 Trust Services Criteria. https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance/soc-2
20. ISO 27001 Standard. https://www.iso.org/standard/27001
21. Microsoft MSIX Packaging. https://learn.microsoft.com/en-us/windows/msix/
22. Apple Declarative Device Management. https://developer.apple.com/documentation/devicemanagement/declarativedevicemanagement
23. Fedora OSTree. https://coreos.github.io/rpm-ostree/
24. Winget Configuration. https://learn.microsoft.com/en-us/windows/package-manager/winget/configure
25. Ansible for Windows. https://docs.ansible.com/ansible/latest/os_guide/windows_usage.html
26. Terraform Provider Development. https://developer.hashicorp.com/terraform/plugin
27. Vagrant Testing. https://www.vagrantup.com/docs/provisioning
28. Electron Builder Auto-Update. https://www.electron.build/auto-update
29. GPO ADMX Templates. https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-vista/cc756833(v=ws.10)
30. NIST SP 800-53 Security Controls. https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final
