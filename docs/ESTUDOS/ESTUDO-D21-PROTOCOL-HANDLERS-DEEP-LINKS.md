# ESTUDO-D21 — Protocol Handlers / Deep Links v3.0

> **Data:** 2026-07-25
> **Versão:** 3.0
> **Propósito:** Estudo abrangente de protocol handlers e deep links para integração cross-platform da IDEIA com o sistema operacional, incluindo segurança, routing, single-instance e registros em CI.
> **Nível:** 9/12
> **Profundidade:** 8 seções, ~540 linhas
> **Classificação:** Técnico + Engenharia + Segurança
> **Origem:** ESTUDO-DESKTOP-NATIVE.md seção 5.6, ESTUDO-D21 v1.0
> **Stack:** TypeScript · Rust · PowerShell · MSI XML · Shell Script

---

## 1. FUNDAMENTOS

### 1.1 O Que São Protocol Handlers

Protocol handlers associam um esquema de URI personalizado (ex.: `ideia://`) a um aplicativo no sistema operacional. Quando o SO encontra uma URI com esse esquema, ele invoca o binário registrado passando a URI completa como argumento.

```
Browser/App → ideia://open?path=/projeto → SO → ideia.exe "ideia://open?path=/projeto"
```

### 1.2 Por Que a IDEIA Precisa

| Caso de Uso | URI | Gatilho |
|---|---|---|
| Abrir projeto do GitHub | `ideia://open?path=github.com/user/repo` | Botão "Open in IDEIA" |
| Executar agente | `ideia://agent/code-review?pr=42` | Webhook PR |
| Instalar plugin | `ideia://install-plugin?name=my-plugin` | VS Code Market |
| Configurações | `ideia://settings` | Menu iniciar |
| CI/CD | `ideia://run-workflow?name=deploy&env=staging` | Slack / GitHub |
| Code Review | `ideia://review/repo/pr/42` | Notificação |
| Suporte | `ideia://diagnostics` | Help desk |

### 1.3 Esquema `ideia://` — Estrutura da URI

```
ideia://<host>/<path>?<query>
```

| Componente | Exemplo | Descrição |
|---|---|---|
| scheme | `ideia` | Registrado no SO |
| host | `open`, `agent`, `settings` | Ação principal |
| path | `/code-review`, `/install` | Sub-ação (opcional) |
| query | `?repo=user/repo&pr=42` | Parâmetros |

**Versões com suporte a fallback:**

```
ideia://open?path=...&v=1           ← versão explícita
ideia://v2/open?path=...            ← versão no path (future-proof)
ideia://agent/review/42             ← REST-like
```

### 1.4 Registro por SO

#### Windows — Registry HKLM

```xml
<!-- MSI Component — WiX Toolset -->
<Component Id="ProtocolHandler" Directory="INSTALLDIR" Guid="*">
  <!-- CLSID opcional para associação avançada -->
  <RegistryValue Root="HKLM"
    Key="Software\Classes\ideia"
    Name="" Value="URL:IDEIA Protocol"
    Type="string" />
  <RegistryValue Root="HKLM"
    Key="Software\Classes\ideia"
    Name="URL Protocol" Value=""
    Type="string" />
  <!-- DefaultIcon — usado pelo Explorer -->
  <RegistryValue Root="HKLM"
    Key="Software\Classes\ideia\DefaultIcon"
    Value="&quot;[INSTALLDIR]ideia.exe&quot;,0"
    Type="string" />
  <!-- Comando de abertura -->
  <RegistryValue Root="HKLM"
    Key="Software\Classes\ideia\shell\open\command"
    Value="&quot;[INSTALLDIR]ideia.exe&quot; &quot;%1&quot;"
    Type="string" />
  <!-- ProgId para controle de associação -->
  <RegistryValue Root="HKLM"
    Key="Software\Classes\ideia"
    Name="AppUserModelID" Value="IDEIA"
    Type="string" />
</Component>
```

**ProgId e conflitos:** O ProgId `IDEIA.Protocol` evita conflito com outras apps que usem `ideia`. Se o path do executável mudar (reinstalação em diretório diferente), o handler aponta para lugar errado — resolvido com MSI `Component` que atualiza no repair/reinstall.

```
HKLM\Software\Classes\IDEIA.Protocol
  → Default: "URL:IDEIA Protocol"
  → URL Protocol: ""
HKLM\Software\Classes\IDEIA.Protocol\shell\open\command
  → Default: "\"C:\IDEIA\ideia.exe\" \"%1\""
HKLM\Software\RegisteredApplications
  → ideia: "Software\Classes\IDEIA.Protocol"
```

#### macOS — Info.plist

```xml
<!-- electron/build/entitlements.mac.plist / Info.plist -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.ideia.app</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>ideia</string>
    </array>
  </dict>
</array>
```

**macOS Universal Links (Associated Domains):**

```xml
<!-- Entitlements -->
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:ideia.app</string>
  <string>webcredentials:ideia.app</string>
  <string>activitycontinuation:ideia.app</string>
</array>
```

Universal Links são preferíveis: não mostram prompt de confirmação, vinculam-se a domínio verificado (`.well-known/apple-app-site-association`), compartilham sessão com Safari. URL schemes tradicionais podem ser sequestrados.

```json
// https://ideia.app/.well-known/apple-app-site-association
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "TEAMID.com.ideia.app",
      "paths": ["/open/*", "/agent/*", "/review/*"]
    }]
  }
}
```

#### Linux — .desktop file + MIME type

```desktop
# /usr/share/applications/ideia-protocol.desktop
[Desktop Entry]
Type=Application
Name=IDEIA
Exec=/opt/ideia/ideia %u
StartupNotify=true
Terminal=false
MimeType=x-scheme-handler/ideia;
Categories=Development;IDE;
```

Registro via `xdg-open`:

```bash
# scripts/register-linux-deeplink.sh
xdg-mime default ideia-protocol.desktop x-scheme-handler/ideia
# ou manualmente:
gconftool-2 -t string -s /desktop/gnome/url-handlers/ideia/command '/opt/ideia/ideia "%s"'
gconftool-2 -t bool -s /desktop/gnome/url-handlers/ideia/needs_terminal false
gconftool-2 -t bool -s /desktop/gnome/url-handlers/ideia/enabled true
```

### 1.5 Instalação Automática (CI + Installer)

```typescript
// packages/deploy/src/protocol-registration.ts
export async function registerProtocolHandler(): Promise<void> {
  const platform = process.platform;
  if (platform === 'win32') {
    await registerWindows();
  } else if (platform === 'darwin') {
    await registerMacOS();
  } else if (platform === 'linux') {
    await registerLinux();
  }
}

async function registerWindows(): Promise<void> {
  const { execa } = await import('execa');
  const exePath = process.execPath;
  // Registrar via reg.exe (fallback se MSI não fez)
  await execa('reg', [
    'add', 'HKLM\\Software\\Classes\\ideia\\shell\\open\\command',
    '/ve', '/t', 'REG_SZ', '/d', `"${exePath}" "%1"`, '/f'
  ]);
  await execa('reg', [
    'add', 'HKLM\\Software\\Classes\\ideia',
    '/v', 'URL Protocol', '/t', 'REG_SZ', '/d', '', '/f'
  ]);
}
```

---

## 2. TÉCNICO

### 2.1 Single-Instance Handling

Evitar que deep link abra nova instância se a IDEIA já está rodando.

#### Electron

```typescript
// electron/src/main.ts
import { app, BrowserWindow } from 'electron';

let mainWindow: BrowserWindow | null = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const deeplink = argv.find(a => a.startsWith('ideia://'));
    if (deeplink) handleDeepLink(deeplink);
  });

  // macOS — open-url event
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });
}
```

#### Tauri

```rust
// packages/tauri/src-tauri/src/deeplink.rs
use tauri::Manager;
use url::Url;

#[cfg(target_os = "macos")]
use tauri::api::notification::Notification;

pub fn register_deeplink(app: &tauri::AppHandle) {
    let handle = app.clone();

    // Tauri plugin deep-link v2
    app.listen("deep-link", move |event| {
        let url_str = event.payload().unwrap_or_default();
        if let Ok(url) = Url::parse(url_str) {
            handle_deep_link(&handle, &url);
        }
    });
}

pub fn handle_deep_link(app: &tauri::AppHandle, url: &Url) {
    let action = match url.host_str() {
        Some("open") => handle_open(url),
        Some("agent") => handle_agent(url),
        Some("review") => handle_review(url),
        Some("settings") => handle_settings(),
        Some("install-plugin") => handle_install_plugin(url),
        Some("run-workflow") => handle_workflow(url),
        Some("diagnostics") => handle_diagnostics(),
        _ => {
            eprintln!("Unknown deep link action: {:?}", url.host_str());
            return;
        }
    };

    match action {
        Ok(msg) => app.emit("deep-link-result", msg).ok(),
        Err(e) => {
            eprintln!("Deep link error: {:?}", e);
            app.emit("deep-link-error", e.to_string()).ok();
        }
    }
}

fn handle_open(url: &Url) -> Result<String, &'static str> {
    let path = url.query_pairs()
        .find(|(k, _)| k == "path")
        .map(|(_, v)| v.to_string())
        .ok_or("Missing path parameter")?;
    if path.contains("..") || path.contains('\0') {
        return Err("Path traversal detected");
    }
    Ok(format!("Opening project: {}", path))
}
```

#### Tauri Plugin: deep-link v2

```rust
// Cargo.toml
// [dependencies]
// tauri-plugin-deep-link = "2"

#[cfg(not(target_os = "macos"))]
use tauri_plugin_deep_link::DeepLinkExt;

pub fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.listen("deep-link", |event| { /* ... */ });

            #[cfg(not(target_os = "macos"))]
            app.deep_link().register("ideia")?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error running tauri app");
}
```

### 2.2 URL Parsing e Validação — TypeScript

```typescript
// packages/shared/src/deeplink/parser.ts
export class DeepLinkParser {
  static readonly ALLOWED_SCHEMES = ['ideia:', 'ideia:'];
  static readonly ALLOWED_HOSTS = new Set([
    'open', 'agent', 'settings', 'review',
    'install-plugin', 'run-workflow', 'diagnostics', 'new-project'
  ]);
  static readonly PATH_TRAVERSAL_RE = /(\.\.\/|\.\.\\)|[\0]/;
  static readonly INJECTION_RE = /[;&|`$(){}\n\r]/;

  static parse(raw: string): DeepLinkCommand {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new DeepLinkError('MALFORMED_URL', 'Invalid URL structure');
    }

    if (!this.ALLOWED_SCHEMES.includes(parsed.protocol)) {
      throw new DeepLinkError('INVALID_SCHEME', `Scheme ${parsed.protocol} not allowed`);
    }

    if (!this.ALLOWED_HOSTS.has(parsed.host)) {
      throw new DeepLinkError('INVALID_HOST', `Host ${parsed.host} not allowed`);
    }

    this.sanitizePath(parsed.searchParams.get('path'));
    this.sanitizeAllParams(parsed.searchParams);

    return {
      action: parsed.host as DeepLinkAction,
      subpath: parsed.pathname.replace(/^\//, ''),
      params: Object.fromEntries(parsed.searchParams),
      raw: raw,
    };
  }

  private static sanitizePath(path: string | null): void {
    if (!path) return;
    if (this.PATH_TRAVERSAL_RE.test(path)) {
      throw new DeepLinkError('PATH_TRAVERSAL', 'Path traversal detected');
    }
    if (path.length > 4096) {
      throw new DeepLinkError('PATH_TOO_LONG', 'Path exceeds 4096 chars');
    }
  }

  private static sanitizeAllParams(params: URLSearchParams): void {
    for (const [key, value] of params) {
      if (this.PATH_TRAVERSAL_RE.test(value)) {
        throw new DeepLinkError('PARAM_TRAVERSAL', `Parameter ${key} contains path traversal`);
      }
      if (this.INJECTION_RE.test(value)) {
        throw new DeepLinkError('PARAM_INJECTION', `Parameter ${key} contains shell injection characters`);
      }
    }
  }
}

// Types
type DeepLinkAction =
  | 'open' | 'new-project' | 'agent' | 'settings'
  | 'review' | 'install-plugin' | 'run-workflow' | 'diagnostics';

interface DeepLinkCommand {
  action: DeepLinkAction;
  subpath: string;
  params: Record<string, string>;
  raw: string;
}

class DeepLinkError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DeepLinkError';
  }
}
```

### 2.3 Router — Dispatcher

```typescript
// packages/shared/src/deeplink/router.ts
import { NATSClient } from '@ideia/event-bus';

export class DeepLinkRouter {
  private handlers = new Map<DeepLinkAction, (cmd: DeepLinkCommand) => Promise<void>>();
  private nats: NATSClient;

  constructor(nats: NATSClient) {
    this.nats = nats;
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.handlers.set('open', cmd => this.nats.publish('workspace.open', { path: cmd.params.path }));
    this.handlers.set('new-project', cmd => this.nats.publish('workspace.create', {
      template: cmd.params.template,
      name: cmd.params.name,
    }));
    this.handlers.set('agent', cmd => this.nats.publish(`agent.${cmd.subpath}`, cmd.params));
    this.handlers.set('settings', () => this.nats.publish('ui.navigate', { view: 'settings' }));
    this.handlers.set('review', cmd => this.nats.publish('code.review', {
      repo: cmd.params.repo,
      pr: cmd.params.pr ? parseInt(cmd.params.pr, 10) : undefined,
    }));
    this.handlers.set('install-plugin', cmd => this.nats.publish('plugins.install', {
      name: cmd.params.name,
      source: cmd.params.source || 'registry',
    }));
    this.handlers.set('run-workflow', cmd => this.nats.publish('workflow.trigger', {
      name: cmd.params.name,
      env: cmd.params.env || 'development',
      ref: cmd.params.ref || 'main',
    }));
    this.handlers.set('diagnostics', () => this.nats.publish('system.diagnostics', {}));
  }

  async dispatch(cmd: DeepLinkCommand): Promise<void> {
    const handler = this.handlers.get(cmd.action);
    if (!handler) {
      throw new DeepLinkError('NO_HANDLER', `No handler for action: ${cmd.action}`);
    }
    await handler(cmd);
  }
}
```

### 2.4 Logging e Audit Trail

```typescript
// packages/shared/src/deeplink/audit.ts
export class DeepLinkAuditor {
  async audit(cmd: DeepLinkCommand, result: 'success' | 'failure', error?: string): Promise<void> {
    const entry = {
      type: 'deep-link',
      action: cmd.action,
      params: cmd.params,
      result,
      error,
      timestamp: new Date().toISOString(),
      hash: '',  // SHA-256 será calculado no batch
    };
    // Enviar para audit trail via NATS
    await this.nats.publish('audit.record', entry);
  }
}
```

---

## 3. ENGENHARIA

### 3.1 Plano de Implementação

| Módulo | Esforço | Dependências | Prioridade |
|---|---|---|---|
| URL parser + validação | 4h | — | P0 |
| Router + handlers | 6h | NATS, parser | P0 |
| Single-instance (Electron) | 2h | Electron | P0 |
| Single-instance (Tauri) | 3h | Tauri plugin | P1 |
| MSI protocol registration | 3h | WiX | P0 |
| macOS Info.plist + entitlements | 2h | Xcode | P0 |
| Linux .desktop + xdg | 2h | — | P1 |
| CI registration scripts | 4h | deploy | P1 |
| Security review + pentest | 4h | audit | P1 |
| Audit trail integration | 2h | NATS | P2 |
| Cross-platform tests | 4h | Playwright | P2 |
| Embedded links (Slack bot, GitHub) | 6h | bot | P2 |

### 3.2 CI/CD Integration

```yaml
# .github/workflows/protocol-registration-ci.yml
name: Protocol Registration CI
on:
  push:
    paths:
      - 'packages/deploy/src/protocol-registration.ts'
      - 'installers/**/*.wxs'
      - 'scripts/register-*.sh'
      - 'scripts/register-*.ps1'

jobs:
  validate-registration:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - name: Validate protocol registration script
        run: |
          if [[ "$RUNNER_OS" == "Windows" ]]; then
            pwsh -File scripts/test-registration.ps1
          elif [[ "$RUNNER_OS" == "macOS" ]]; then
            bash scripts/test-registration-mac.sh
          else
            bash scripts/test-registration-linux.sh
          fi
```

### 3.3 PowerShell — Registro em Runtime

```powershell
# scripts/register-protocol.ps1
param(
    [Parameter(Mandatory)]
    [string]$ExePath,
    [string]$ProtocolName = "ideia"
)

$regPath = "HKLM:\Software\Classes\$ProtocolName"
$commandPath = "$regPath\shell\open\command"

if (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
}
Set-ItemProperty -Path $regPath -Name "URL Protocol" -Value ""
Set-ItemProperty -Path $regPath -Name "(Default)" -Value "URL:$ProtocolName Protocol"
Set-ItemProperty -Path $regPath -Name "AppUserModelID" -Value "IDEIA"

if (-not (Test-Path $commandPath)) {
    New-Item -Path $commandPath -Force | Out-Null
}
Set-ItemProperty -Path $commandPath -Name "(Default)" -Value "`"$ExePath`" `"%1`""

Write-Host "Protocol $ProtocolName registered for $ExePath"
```

### 3.4 Testes

```typescript
// packages/shared/src/deeplink/__tests__/parser.test.ts
import { DeepLinkParser } from '../parser';

describe('DeepLinkParser', () => {
  it('parses valid open URL', () => {
    const cmd = DeepLinkParser.parse('ideia://open?path=/workspace/project');
    expect(cmd.action).toBe('open');
    expect(cmd.params.path).toBe('/workspace/project');
  });

  it('parses agent URL with subpath', () => {
    const cmd = DeepLinkParser.parse('ideia://agent/code-review?repo=user/repo&pr=42');
    expect(cmd.action).toBe('agent');
    expect(cmd.subpath).toBe('code-review');
    expect(cmd.params.repo).toBe('user/repo');
  });

  it('rejects invalid scheme', () => {
    expect(() => DeepLinkParser.parse('evil://open')).toThrow('INVALID_SCHEME');
  });

  it('rejects path traversal', () => {
    expect(() => DeepLinkParser.parse('ideia://open?path=../../../etc/passwd'))
      .toThrow('PATH_TRAVERSAL');
  });

  it('rejects shell injection', () => {
    expect(() => DeepLinkParser.parse('ideia://open?path=foo;rm -rf /'))
      .toThrow('PARAM_INJECTION');
  });

  it('rejects null byte injection', () => {
    expect(() => DeepLinkParser.parse('ideia://open?path=good\x00bad'))
      .toThrow('PARAM_TRAVERSAL');
  });

  it('rejects URLs longer than 4096 chars in path', () => {
    const longPath = 'ideia://open?path=' + 'a'.repeat(4097);
    expect(() => DeepLinkParser.parse(longPath)).toThrow('PATH_TOO_LONG');
  });

  it('allows all valid hosts', () => {
    for (const host of ['open', 'agent', 'settings', 'review', 'install-plugin', 'run-workflow', 'diagnostics', 'new-project']) {
      const cmd = DeepLinkParser.parse(`ideia://${host}`);
      expect(cmd.action).toBe(host);
    }
  });
});
```

---

## 4. INOVAÇÃO

### 4.1 Deep Links como API Pública

A IDEIA expõe uma API externa via deep links que podem ser incorporados em qualquer ferramenta:

```typescript
// packages/external-api/src/deeplink-bridge.ts
class DeeplinkBridge {
  // Gera deep links programaticamente
  static generateOpenProjectLink(path: string): string {
    return `ideia://open?path=${encodeURIComponent(path)}`;
  }

  static generateAgentLink(action: string, params: Record<string, string>): string {
    const qs = new URLSearchParams(params).toString();
    return `ideia://agent/${action}?${qs}`;
  }

  static generateReviewLink(repo: string, pr: number): string {
    return `ideia://review?repo=${encodeURIComponent(repo)}&pr=${pr}`;
  }

  static generateWorkflowLink(name: string, env: string = 'development'): string {
    return `ideia://run-workflow?name=${encodeURIComponent(name)}&env=${env}`;
  }
}
```

### 4.2 Embedding em Ferramentas Externas

**GitHub — bot que comenta com deep link:**

```
🤖 IDEIA Review Available
Click to open in IDEIA: `ideia://review?repo=user/repo&pr=42`
```

**Slack — slash command:**

```
/ideia review repo/user#42
→ Bot responde: [Open in IDEIA](ideia://review?repo=user/repo&pr=42)
```

**Jira — webhook trigger:**

```
// Jira → GitHub webhook → IDEIA deep link via CLI
// ideia://run-workflow?name=jira-sync&issue=PROJ-123
```

**VS Code — extensão que gera links:**

```json
// Command in VS Code extension
"contributes.commands": [
  {
    "command": "ideia.openInIDEIA",
    "title": "Open in IDEIA"
  }
]
```

### 4.3 Auto-Reparo de Registro

```typescript
// packages/deploy/src/protocol-health.ts
export class ProtocolHealthCheck {
  async checkAndRepair(): Promise<boolean> {
    const healthy = await this.isProtocolRegistered();
    if (!healthy) {
      console.warn('Protocol handler missing — re-registering...');
      await registerProtocolHandler();
      return false;
    }
    return true;
  }

  private async isProtocolRegistered(): Promise<boolean> {
    if (process.platform === 'win32') {
      return this.checkWindows();
    }
    return true; // macOS/Linux checagem via API do SO
  }

  private async checkWindows(): Promise<boolean> {
    const { execa } = await import('execa');
    try {
      const { stdout } = await execa('reg', [
        'query', 'HKLM\\Software\\Classes\\ideia\\shell\\open\\command',
        '/ve'
      ]);
      return stdout.includes(process.execPath);
    } catch {
      return false;
    }
  }
}
```

### 4.4 Versões e Backward Compatibility

```typescript
// Suporte a múltiplas versões de esquema
const SCHEMA_VERSIONS = new Map<string, (cmd: DeepLinkCommand) => DeepLinkCommand>([
  ['1', upgradeV1toV2],
  ['2', (cmd) => cmd],  // versão atual
]);

function upgradeV1toV2(cmd: DeepLinkCommand): DeepLinkCommand {
  // v1: ideia://open-project?path=...
  // v2: ideia://open?path=...
  if (cmd.action === 'open-project') {
    return { ...cmd, action: 'open' };
  }
  return cmd;
}
```

---

## 5. PESQUISA

### 5.1 Segurança Comparativa: URL Schemes vs Universal Links

| Aspecto | URL Scheme (ideia://) | Universal Links (apple-app-site-association) |
|---|---|---|
| Confirmação | Prompt ao usuário | Silencioso (se domínio verificado) |
| Sequestro | Qualquer app pode registrar mesmo scheme | Apenas app com domínio verificado |
| Fallback | Navegador mostra erro 404 | Abre Safari se app não instalado |
| Estado | Stateless | Share credenciais com Safari (SSO) |
| iOS | Suportado desde iOS 2 | iOS 9+ |
| Android | Equivalente: intent filter | App Links (Android 6+) |

**Conclusão:** Para macOS/iOS, Universal Links são mais seguros e oferecem melhor UX. Para Windows e Linux, URL schemes são o único mecanismo disponível. O suporte duplo é necessário: Universal Links em Apple, URL scheme nas demais plataformas.

### 5.2 Ameaças e Mitigações — 6 Vetores

| # | Vetor | Descrição | Risco | Mitigação |
|---|---|---|---|---|
| 1 | Protocol Hijacking | App malicioso registra mesmo scheme | Alto | HKLM (requer admin), verificação de hash do executável |
| 2 | Command Injection | URL params com `; rm -rf /` | Alto | Sanitização estrita, whitelist de caracteres |
| 3 | Path Traversal | `?path=../../../etc/passwd` | Alto | Rejeitar `..`, null bytes |
| 4 | Phishing via Deep Link | `ideia://open?path=malware.exe` | Médio | Confirmar ação com usuário para paths executáveis |
| 5 | DoS via Long URL | URL > 64KB causa crash | Médio | Limitar tamanho (4KB máximo) |
| 6 | Replay Attack | URL interceptada reexecutada | Baixo | Nonce + timestamp em ações sensíveis |

### 5.3 Protocol Hijacking — Análise Detalhada

No Windows, o registro de protocol handler é feito em `HKLM\Software\Classes\` que requer privilégios de administrador. No entanto, `HKCU\Software\Classes\` também pode ser usado sem admin:

```
HKCU\Software\Classes\ideia  ← usuário comum (risco)
HKLM\Software\Classes\ideia  ← requer admin (seguro)
```

**Proteção:** Sempre verificar que o handler atual corresponde ao nosso executável:

```powershell
# scripts/verify-protocol.ps1
$expectedPath = "C:\Program Files\IDEIA\ideia.exe"
$currentPath = (Get-ItemProperty "HKLM:\Software\Classes\ideia\shell\open\command" -Name "(Default)").'(Default)'
if ($currentPath -notmatch [regex]::Escape($expectedPath)) {
    Write-Warning "Protocol handler mismatch! Expected: $expectedPath, Got: $currentPath"
    exit 1
}
```

### 5.4 Padrões e RFCs

| RFC | Título | Relevância |
|---|---|---|
| RFC 3986 | Uniform Resource Identifier (URI): Generic Syntax | Estrutura de URI |
| RFC 7595 | Guidelines and Registration Procedures for URI Schemes | Registro de esquemas |
| RFC 8615 | Well-Known Uniform Resource Identifiers | Apple App Site Association |
| RFC 9110 | HTTP Semantics (Section 4.2.4) | Redirecionamento entre apps |

### 5.5 Estudos Relacionados

- ESTUDO-DESKTOP-NATIVE.md — Electron, Tauri, distribuição
- ESTUDO-SEGURANCA-PROMPT-GOVERNADOR-AI.md — Políticas de segurança
- ESTUDO-PLUGINS-ECOSSISTEMA.md — Instalação de plugins
- ESTUDO-COLABORACAO-TEMPO-REAL.md — Compartilhamento de links

---

## 6. FRONTEIRAS

### 6.1 Limitações Conhecidas

1. **Windows — conflito após reinstalação:** Se a IDEIA for reinstalada em path diferente, o handler aponta para binário inexistente. Solução: MSI com `Component` que atualiza no repair e script de verificação pós-instalação.

2. **macOS — prompt duplicado:** URL schemes exibem prompt "Open this page in IDEIA?" + outro prompt do app. Universal Links eliminam isso, mas exigem domínio HTTPS e manutenção do `apple-app-site-association`. SOLUÇÃO: priorizar Universal Links com fallback para URL scheme.

3. **Linux — dependência de DE:** xdg-utils nem sempre está instalado. Gnome, KDE e outras DEs têm mecanismos diferentes. SOLUÇÃO: suportar `gconftool-2`, `kde-config` e fallbacks manuais.

4. **Browser Sandbox:** Alguns browsers (Firefox, Chrome hardened) bloqueiam URL schemes não padrão. SOLUÇÃO: documentar whitelist e botão "Always allow".

5. **Rate limiting:** Se um fluxo automático (CI/CD) gerar centenas de deep links, pode sobrecarregar o launch da IDEIA. SOLUÇÃO: Debounce de 500ms entre aberturas + fila de ações.

6. **Log de exposição:** Deep links vazam informações na linha de comando (visível via `ps` / Process Explorer). SOLUÇÃO: evitar secrets em deep links; usar tokens de curta duração para ações sensíveis.

### 6.2 Gaps Técnicos

| GAP | Descrição | Severidade | Plano |
|---|---|---|---|
| GS-D21-01 | Sem auto-repair de protocol handler | 🟠 | Fase 5.2 |
| GS-D21-02 | Sem nonce para replay protection | 🟡 | Fase 6 |
| GS-D21-03 | Sem suporte a Universal Links | 🟡 | Fase 7 |
| GS-D21-04 | Sem debounce para CI/CD bursts | 🟢 | Fase 5.2 |
| GS-D21-05 | Sem testes cross-platform auto | 🟠 | Fase 5.2 |

### 6.3 Observações de Plataforma

```
Windows:
+ Registro robusto via HKLM
+ MSI garante consistência
- Conflito se path mudar
- Requer admin para HKLM

macOS:
+ Universal Links mais seguros
+ .well-known verification
- Exige domínio HTTPS
- Certificado anual

Linux:
+ xdg-utils padronizado
+ Fácil debug
- Múltiplas DEs
- xdg-open pode falhar
```

---

## 7. ANÁLISE PARA IDEIA

### 7.1 Estado Atual

| Componente | Status | Localização |
|---|---|---|
| Electron protocol handler | ✅ Implementado | `electron/src/deeplink.ts` |
| Tauri deep link handler | ✅ Implementado | `packages/tauri/src-tauri/src/deeplink.rs` |
| Single-instance (Electron) | ✅ Implementado | `electron/src/main.ts` |
| Single-instance (Tauri) | ✅ Implementado | Tauri plugin v2 |
| URL parser | ⚠️ Parcial | `packages/shared/src/deeplink/parser.ts` |
| Security validation | ⚠️ Parcial | `packages/shared/src/deeplink/parser.ts` |
| MSI registration | ✅ Implementado | `installers/windows/` |
| macOS Info.plist | ✅ Implementado | `electron/build/` |
| Linux .desktop | ⚠️ Parcial | `scripts/register-linux-deeplink.sh` |
| Audit trail | ❌ Não implementado | — |
| CI registration tests | ❌ Não implementado | — |
| Cross-system embedding | ❌ Não implementado | — |

### 7.2 Roteiro de Expansão

```
Fase Atual (P0):
  └─ Completar URL parser com validação (4h)
  └─ Completar router com 8 handlers (6h)
  └─ Single-instance Electron (já feito) + Tauri (já feito)

Fase 5.2 (P1):
  └─ Auto-repair de protocol handler (3h)
  └─ Linux .desktop + xdg completo (2h)
  └─ CI registration tests (4h)
  └─ Debounce anti-flood (2h)

Fase 6 (P2):
  └─ Universal Links (macOS) (4h)
  └─ Nonce para replay protection (3h)
  └─ Audit trail integrado (2h)

Fase 7 (P3):
  └─ Slack bot + GitHub bot com deep links (6h)
  └─ VS Code extension command (4h)
  └─ CLI command `ideia link generate` (2h)
```

### 7.3 Matriz de Decisão

| Decisão | Opção A | Opção B | Escolhida | Motivo |
|---|---|---|---|---|
| URL esquema | `ideia://host/action` | `ideia://action/host` | A | Hierarquia clara: host = ação |
| Single-instance | app.requestSingleInstanceLock | IPC + named pipe | A | Nativo Electron/Tauri |
| Segurança | Whitelist + sanitização | Executar e validar resultado | A | Prevenir execução de código malicioso |
| Universal Links | Suporte duplo (UL + scheme) | Só UL | A | Windows/Linux não têm UL |
| Registro | HKLM (admin) | HKCU (user) | A | HKLM cobre todos os usuários |

### 7.4 Exemplo de Uso Completo

```
Fluxo: Usuário clica em "Open in IDEIA" no GitHub

1. Browser → `ideia://review?repo=user/repo&pr=42`
2. SO → launch IDEIA (ou foca instância existente)
3. Electron/Tauri → single-instance → foca janela
4. DeepLinkParser.parse('ideia://review?repo=user/repo&pr=42')
   → valida scheme, host, sanitiza params
5. DeepLinkRouter.dispatch({ action: 'review', params: { repo, pr } })
   → NATS publish 'code.review'
6. Code Review Service → recebe evento → abre PR diff
7. DeepLinkAuditor → registra ação no audit trail
8. UI: dashboard mostra "Code Review: user/repo#42"
```

### 7.5 Estimativa Total

| Atividade | Horas |
|---|---|
| Completar parser + validação | 4h |
| Router completo (8 handlers) | 6h |
| Auto-repair protocol | 3h |
| Linux .desktop + xdg | 2h |
| CI tests | 4h |
| Universal Links | 4h |
| Nonce replay protection | 3h |
| Audit trail | 2h |
| Embedding (Slack, GitHub, VS Code) | 10h |
| Cross-platform tests | 4h |
| **Total** | **42h** |

---

## 8. REFERÊNCIES

1. Electron Protocol. https://www.electronjs.org/docs/latest/api/protocol
2. Tauri Deep Link Plugin v2. https://v2.tauri.app/plugin/deep-link/
3. RFC 3986 — URI Generic Syntax. https://datatracker.ietf.org/doc/html/rfc3986
4. RFC 7595 — URI Scheme Registration. https://datatracker.ietf.org/doc/html/rfc7595
5. Apple Universal Links. https://developer.apple.com/ios/universal-links/
6. Microsoft — Registering an Application to a URI Scheme. https://learn.microsoft.com/en-us/windows/win32/shell/launching-apps-advanced
7. FreeDesktop — xdg-mime. https://www.freedesktop.org/wiki/Software/xdg-utils/
8. OWASP — Deep Link Security. https://owasp.org/www-community/attacks/Deep_Links
9. Apple App Site Association. https://developer.apple.com/documentation/xcode/supporting-associated-domains
10. WiX Toolset — Protocol Handler MSI. https://wixtoolset.org/
11. Electron app.requestSingleInstanceLock. https://www.electronjs.org/docs/latest/api/app#apprequestsingleinstancelock
12. ESTUDO-DESKTOP-NATIVE.md — E5. IDEIA docs/ESTUDOS
13. ESTUDO-SEGURANCA-PROMPT-GOVERNADOR-AI.md — S4. IDEIA docs/ESTUDOS
14. REALITY-MANIFEST.md — docs/governance/REALITY-MANIFEST.md
15. RFC 8615 — Well-Known URIs. https://datatracker.ietf.org/doc/html/rfc8615
