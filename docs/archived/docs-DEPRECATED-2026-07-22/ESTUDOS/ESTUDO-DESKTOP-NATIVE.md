# Estudo de Desktop Nativo — Projeto IDEIA

> **Data:** 2026-07-18
> **Versão:** 1.0
> **Propósito:** Analisar opções de distribuição desktop para o produto IDEIA, comparando
> Electron, Tauri v2, NW.js e Neutralino.js, com recomendações estratégicas para cada fase do roadmap.
> **Autoria:** Equipe de Arquitetura IDEIA

---

## Sumário

1. [Comparação entre Shells Desktop](#1-comparação-entre-shells-desktop)
   - 1.1 Electron
   - 1.2 Tauri v2
   - 1.3 NW.js
   - 1.4 Neutralino.js
   - 1.5 Matriz Comparativa
2. [Tauri v2 Deep Dive](#2-tauri-v2-deep-dive)
   - 2.1 Rust Core e Segurança
   - 2.2 Plugin System
   - 2.3 Sidecar para Node.js
   - 2.4 IPC Security Model
   - 2.5 Auto-update
   - 2.6 Builds por Plataforma
3. [Auto-update e Distribuição](#3-auto-update-e-distribuição)
   - 3.1 Estratégias de Atualização
   - 3.2 Windows: MSI, NSIS, Squirrel
   - 3.3 macOS: DMG, Sparkle
   - 3.4 Linux: AppImage, .deb, .rpm, Snap, Flatpak
   - 3.5 Code Signing
4. [Instaladores e Releases](#4-instaladores-e-releases)
   - 4.1 GitHub Releases + CI/CD
   - 4.2 Package Managers
   - 4.3 App Stores
   - 4.4 Silent Install Enterprise
5. [Performance Desktop](#5-performance-desktop)
   - 5.1 Profiling Memory
   - 5.2 Startup Time
   - 5.3 GPU Acceleration
   - 5.4 Native File Dialogs
   - 5.5 Tray Icon e Global Shortcuts
   - 5.6 Protocol Handlers
6. [Estratégia para IDEIA](#6-estratégia-para-ideia)
   - 6.1 Fase 0: Electron (MVP Rápido)
   - 6.2 Fase 3: Theia Platform
   - 6.3 Fase 5: Tauri (Alternativa Leve)
   - 6.4 Mapa de Decisão
   - 6.5 Recomendação Final

---

## 1. Comparação entre Shells Desktop

### 1.1 Electron

**Visão Geral:**
Electron é o framework desktop mais maduro e adotado (VS Code, Slack, Discord, Figma, Notion). Combina Chromium + Node.js no mesmo runtime.

**Arquitetura:**

```
+------------------------------------------------------------------+
|                        ELECTRON ARCHITECTURE                      |
+------------------------------------------------------------------+
|                                                                   |
|  +----------------------------+  +----------------------------+  |
|  |      PROCESSO PRINCIPAL    |  |     PROCESSO RENDERER      |  |
|  |  (Node.js + Electron API)  |  |  (Chromium + HTML/CSS/JS)  |  |
|  |                            |  |                            |  |
|  |  - Gerenciamento de janela |  |  - Monaco Editor           |  |
|  |  - Menu, Tray, Dialog      |  |  - Chat UI                 |  |
|  |  - IPC bridge              |  |  - Terminal (xterm)        |  |
|  |  - Auto-updater            |  |  - Agent panels            |  |
|  |  - Native APIs             |  |                            |  |
|  +----------------------------+  +-----------+----------------+  |
|                                              |                    |
|                                   IPC (contextBridge)            |
|                                              |                    |
|  +-------------------------------------------+----------------+  |
|  |                 PROCESSO UTILITÁRIO        |                |  |
|  |  (opcional, para tarefas pesadas)         |                |  |
|  |  - Compilação, análise de código          |                |  |
|  |  - Comunicação com NATS                  |                |  |
|  +-------------------------------------------+----------------+  |
|                                                                   |
+------------------------------------------------------------------+
```

**Prós:**
- Ecossistema maduro (npm packages, ferramentas, documentação)
- Chromium por trás (compatibilidade CSS/JS, DevTools)
- Node.js nativo (acesso a fs, child_process)
- electron-builder / electron-forge (build maduro)
- Suporte a comunidade massivo

**Contras:**
- Tamanho do binário: ~150-250MB (Chromium incluso)
- Consumo de RAM: ~200-400MB por instância
- Vulnerabilidades: Chromium + Node expõem superfície de ataque grande
- Startup time: ~2-5s (Chromium precisa inicializar)
- Sem isolamento real entre processos

**Dados de consumo:**

| Métrica | Electron | Observação |
|---------|----------|------------|
| Binary size | 150-250MB | Com asar pack, sem bloat |
| RAM idle | 180-250MB | VS Code: ~220MB |
| RAM com workspace | 300-600MB | Depende de extensões |
| Startup time (frio) | 2-5s | VS Code: ~3.2s |
| Startup time (quente) | 0.5-1.5s | Com cache V8 |
| GPU memory | 50-150MB | Chromium GPU process |

### 1.2 Tauri v2

**Visão Geral:**
Tauri é um framework desktop moderno que usa o webview nativo do SO (WebView2 no Windows, WKWebView no macOS, WebKitGTK no Linux) com backend em Rust.

**Arquitetura:**

```
+------------------------------------------------------------------+
|                      TAURI V2 ARCHITECTURE                        |
+------------------------------------------------------------------+
|                                                                   |
|  +----------------------------+  +----------------------------+  |
|  |      CORE RUST (Tauri)     |  |    WEBVIEW NATIVO          |  |
|  |                            |  |  - WebView2 (Windows)      |  |
|  |  - Gerenciamento de janela |  |  - WKWebView (macOS)       |  |
|  |  - Plugin system (Rust)    |  |  - WebKitGTK (Linux)       |  |
|  |  - IPC (JSON-RPC)          |  |                            |  |
|  |  - Segurança (capabilities)|  |  +------------------------+ |  |
|  |  - Auto-updater (built-in) |  |  | Frontend (HTML/CSS/JS) | |  |
|  |  - Sistema de arquivos     |  |  | - Monaco Editor        | |  |
|  |  - Shell, Dialog, etc      |  |  | - Chat, Terminal       | |  |
|  +-------------+--------------+  |  | - Agent panels         | |  |
|                |                 |  +------------------------+ |  |
|     IPC (invoke)                 +----------------------------+  |
|                |                                                  |
|  +-------------v--------------+                                   |
|  |        SIDECAR (opcional)  |                                   |
|  |  (Node.js ou outro binário)|                                   |
|  |  - Comunicação com NATS   |                                   |
|  |  - Operações pesadas      |                                   |
|  |  - Bridge para bibliotecas|                                   |
|  +----------------------------+                                   |
|                                                                   |
+------------------------------------------------------------------+
```

**Prós:**
- Binary tiny: ~3-10MB (sem runtime embutido)
- RAM baixo: ~50-100MB
- Segurança: sem Node.js no frontend, capabilities declarativas
- Startup time: < 500ms (webview nativo já instalado)
- Rust performance para operações nativas
- Plugin system extensível

**Contras:**
- Depende de webview do SO (WebView2 pode não estar instalado no Windows 8/10 antigo)
- WKWebView no macOS tem limitações (sem WebRTC completo, sem certas APIs)
- Sidecar para Node.js adiciona complexidade
- Ecossistema Rust menor que Node.js
- Theia Platform não é compatível com Tauri (requer Electron/Chromium)

**Dados de consumo:**

| Métrica | Tauri v2 | Observação |
|---------|----------|------------|
| Binary size | 3-10MB | Sem runtime, apenas Rust |
| RAM idle | 40-80MB | WebView nativo |
| RAM com workspace | 100-250MB | Depende do frontend |
| Startup time (frio) | 200-500ms | WebView já está no SO |
| Startup time (quente) | 50-200ms | Praticamente instantâneo |
| GPU memory | 20-60MB | WebView nativo |

### 1.3 NW.js

**Visão Geral:**
NW.js (anteriormente node-webkit) foi o pioneiro dos frameworks desktop baseados em Chromium + Node.js. Similar ao Electron, mas com arquitetura diferente.

**Arquitetura:**

```
+------------------------------------------------------------------+
|                       NW.JS ARCHITECTURE                          |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------------------------------------------------+  |
|  |                    PROCESSO ÚNICO                           |  |
|  |  (Node.js + Chromium no mesmo contexto)                    |  |
|  |                                                            |  |
|  |  - DOM e Node.js no mesmo namespace                        |  |
|  |  - Pacotes nativos com require() direto no frontend        |  |
|  |  - Janelas, menus, tray                                   |  |
|  |  - Chrome DevTools built-in                                |  |
|  +------------------------------------------------------------+  |
|                                                                   |
+------------------------------------------------------------------+
```

**Prós:**
- Acesso direto a Node.js do frontend (sem IPC)
- Chrome DevTools nativo (excelente debugging)
- Suporte a Chrome Apps API
- Leve vantagem de performance sobre Electron (processo único)

**Contras:**
- Menos popular que Electron (ecossistema menor)
- Processo único = menos isolamento (se frontend crasha, tudo crasha)
- Segurança: Node.js exposto ao frontend é vetor de ataque
- Tamanho similar ao Electron (~150MB)
- Manutenção menos frequente
- Suporte a Wayland limitado

**Dados de consumo:**

| Métrica | NW.js | Observação |
|---------|-------|------------|
| Binary size | 120-200MB | Chromium + Node.js |
| RAM idle | 150-200MB | Similar ao Electron |
| RAM com workspace | 250-500MB | |
| Startup time | 1.5-4s | Chromium + Node init |

### 1.4 Neutralino.js

**Visão Geral:**
Neutralino.js é um framework desktop ultra-leve que usa o webview nativo do SO + backend em Node.js (ou outros runtimes).

**Arquitetura:**

```
+------------------------------------------------------------------+
|                    NEUTRALINO.JS ARCHITECTURE                      |
+------------------------------------------------------------------+
|                                                                   |
|  +----------------------------+  +----------------------------+  |
|  |   NEUTRALINO CORE (C++)    |  |    WEBVIEW NATIVO          |  |
|  |                            |  |  - WebView2 (Windows)      |  |
|  |  - Gerenciamento de janela |  |  - WKWebView (macOS)       |  |
|  |  - Extensões nativas       |  |  - WebKitGTK (Linux)       |  |
|  |  - Auto-updater            |  |                            |  |
|  |  - Filesystem, OS, Storage |  |  +------------------------+ |  |
|  +-------------+--------------+  |  | Frontend (HTML/CSS/JS) | |  |
|                |                 |  |                        | |  |
|     Neutralino API               |  +------------------------+ |  |
|                |                 +----------------------------+  |
|  +-------------v--------------+                                   |
|  |   BACKEND (Node.js/Deno)   |                                   |
|  |  (opcional, extensões)     |                                   |
|  +----------------------------+                                   |
|                                                                   |
+------------------------------------------------------------------+
```

**Prós:**
- Binary tiny: ~2-5MB
- RAM baixo: ~30-60MB
- Multiplataforma
- PHP, Node.js, Deno como backend

**Contras:**
- Ecossistema muito pequeno
- Poucas extensões nativas disponíveis
- Sem suporte a Theia
- Documentação limitada
- Sem maturidade enterprise
- Monaco Editor pode ter problemas com webview nativo

**Dados de consumo:**

| Métrica | Neutralino.js | Observação |
|---------|---------------|------------|
| Binary size | 2-5MB | Apenas core C++ |
| RAM idle | 30-60MB | WebView nativo |
| RAM com workspace | 80-200MB | |
| Startup time | 100-300ms | WebView nativo |

### 1.5 Matriz Comparativa

| Dimensão | Electron | Tauri v2 | NW.js | Neutralino.js |
|----------|----------|----------|-------|---------------|
| **Binary size** | 150-250MB | 3-10MB | 120-200MB | 2-5MB |
| **RAM idle** | 180-250MB | 40-80MB | 150-200MB | 30-60MB |
| **RAM full load** | 600MB+ | 250MB+ | 500MB+ | 200MB+ |
| **Startup (frio)** | 2-5s | 200-500ms | 1.5-4s | 100-300ms |
| **Webview** | Chromium próprio | Nativo do SO | Chromium próprio | Nativo do SO |
| **Runtime backend** | Node.js integrado | Rust (sidecar Node) | Node.js integrado | C++ (extensível) |
| **Segurança** | Média | **Alta** (capabilities) | Baixa | Média |
| **API nativas** | Excelente | **Excelente** (plugins) | Boa | Limitada |
| **Theia compatível** | **Sim** | Não | **Sim** | Não |
| **Auto-update** | electron-updater | **Built-in** | Manual | Manual |
| **Windows** | MSI, NSIS, Squirrel | MSI, NSIS | MSI, NSIS | NSIS |
| **macOS** | DMG, MAS | DMG, MAS | DMG | DMG |
| **Linux** | AppImage, deb, rpm, Snap, Flatpak | AppImage, deb, rpm | AppImage, deb | deb, AppImage |
| **Code signing** | Sim | Sim | Sim | Manual |
| **Maturidade** | **Altíssima** | Média-alta | Média | Baixa |
| **Comunidade** | **Massiva** | Crescendo | Pequena | Muito pequena |
| **Manutenção** | Ativa | **Muito ativa** | Moderada | Moderada |
| **IDE recomendado** | VS Code | VS Code + Rust | VS Code | VS Code |
| **CI/CD build time** | 10-20min | 5-10min | 10-15min | 3-5min |
| **Cross-platform build** | Excelente | Excelente | Boa | Boa |
| **Hot reload** | Sim (electron-reload) | **Sim (built-in)** | Sim | Sim |

---

## 2. Tauri v2 Deep Dive

### 2.1 Rust Core e Segurança

O core do Tauri é escrito em Rust, trazendo benefícios de segurança e performance.

**Modelo de segurança Tauri:**

```
+------------------------------------------------------------------+
|                    TAURI SECURITY MODEL                           |
+------------------------------------------------------------------+
|                                                                   |
|  +-------------------+              +---------------------------+ |
|  |   Frontend        |              |   Backend (Rust Core)     | |
|  |   (HTML/CSS/JS)   |              |                           | |
|  |                   |   IPC invoke |  - Apenas comandos        | |
|  |  Sem acesso       |<------------>|    explicitamente         | |
|  |  direto a:        |   JSON-RPC   |    permitidos             | |
|  |  - fs             |              |                           | |
|  |  - shell          |              |  - Capabilities:          | |
|  |  - network        |              |    "fs:read"              | |
|  |  - env vars       |              |    "shell:execute"        | |
|  |                   |              |    "dialog:open"          | |
|  +-------------------+              +---------------------------+ |
|                                                                   |
|  Capabilities sao declaradas em tauri.conf.json:                  |
|  {                                                                |
|    "identifier": "dev.ideia.app",                                |
|    "capabilities": [                                              |
|      {                                                            |
|        "identifier": "default",                                  |
|        "windows": ["main"],                                       |
|        "permissions": [                                           |
|          "core:default",                                          |
|          "fs:allow-read",                                         |
|          "shell:allow-execute",                                   |
|          "dialog:allow-open"                                     |
|        ]                                                          |
|      }                                                            |
|    ]                                                              |
|  }                                                                |
|                                                                   |
+------------------------------------------------------------------+
```

**Vantagens de segurança sobre Electron:**

| Aspecto | Electron | Tauri |
|---------|----------|-------|
| Node.js no renderer | Sim (contextBridge isola) | Não (sem Node.js no frontend) |
| Acesso a fs | Permissões do usuário | Capabilities declarativas |
| Execução de shell | child_process.spawn | shell plugin com allowlist |
| Ataque XSS | Pode escalar para RCE | Limitado ao sandbox |
| Memory safety | Garbage collected (V8) | Ownership (Rust) |
| Supply chain | node_modules massivo | cargo crates auditing |

### 2.2 Plugin System

Tauri v2 possui um sistema de plugins baseado em Rust.

**Plugins oficiais:**

| Plugin | Funcionalidade | Comando(s) |
|--------|---------------|-------------|
| `tauri-plugin-shell` | Execução de comandos | `shell:execute`, `shell:open` |
| `tauri-plugin-fs` | Sistema de arquivos | `fs:read`, `fs:write`, `fs:exists` |
| `tauri-plugin-dialog` | Diálogos nativos | `dialog:open`, `dialog:save`, `dialog:message` |
| `tauri-plugin-clipboard` | Área de transferência | `clipboard:read`, `clipboard:write` |
| `tauri-plugin-notification` | Notificações nativas | `notification:send` |
| `tauri-plugin-window` | Gerenciamento de janelas | `window:create`, `window:close`, `window:setFocus` |
| `tauri-plugin-process` | Processo | `process:exit`, `process:restart` |
| `tauri-plugin-global-shortcut` | Atalhos globais | `global-shortcut:register`, `global-shortcut:unregister` |
| `tauri-plugin-http` | HTTP requests | `http:fetch` |
| `tauri-plugin-websocket` | WebSocket | `websocket:connect`, `websocket:send` |
| `tauri-plugin-upload` | Upload de arquivos | `upload:file` |

**Plugins customizados para IDEIA:**

```rust
// Exemplo: Plugin NATS para Tauri
use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime, Manager,
};
use nats::Connection;

#[tauri::command]
async fn nats_publish(app: tauri::AppHandle, subject: String, payload: String) -> Result<(), String> {
    let nc = app.state::<NatsState>().0.lock().map_err(|e| e.to_string())?;
    nc.publish(&subject, payload).map_err(|e| e.to_string())
}

#[tauri::command]
async fn nats_subscribe(app: tauri::AppHandle, subject: String) -> Result<(), String> {
    let nc = app.state::<NatsState>().0.lock().map_err(|e| e.to_string())?;
    let sub = nc.subscribe(&subject).map_err(|e| e.to_string())?;
    std::thread::spawn(move || {
        for msg in sub.messages() {
            if let Ok(msg) = msg {
                app.emit("nats-message", serde_json::json!({
                    "subject": msg.subject,
                    "data": String::from_utf8_lossy(&msg.data).to_string(),
                })).ok();
            }
        }
    });
    Ok(())
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("nats")
        .invoke_handler(tauri::generate_handler![nats_publish, nats_subscribe])
        .setup(|app| {
            let nc = nats::connect("nats://localhost:4222")
                .map_err(|e| eyre::eyre!("Failed to connect to NATS: {}", e))?;
            app.manage(NatsState(Arc::new(Mutex::new(nc))));
            Ok(())
        })
        .build()
}

struct NatsState(Arc<Mutex<Connection>>);
```

### 2.3 Sidecar para Node.js

O maior desafio para IDEIA no Tauri: o ecossistema atual depende fortemente de Node.js (NATS client, monaco editor bundler, ferramentas de build). O **sidecar** permite executar Node.js como processo auxiliar.

**Arquitetura sidecar:**

```
+------------------------------------------------------------------+
|                    TAURI + SIDECAR NODE.JS                        |
+------------------------------------------------------------------+
|                                                                   |
|  +----------------------------+  +----------------------------+  |
|  |      TAURI (Rust Core)     |  |    SIDECAR (Node.js)        |  |
|  |                            |  |                            |  |
|  |  - Window management       |  |  - NATS client             |  |
|  |  - File dialogs            |  |  - AI agent runtime        |  |
|  |  - Native notifications    |  |  - Code analysis           |  |
|  |  - Global shortcuts        |  |  - File watcher (chokidar) |  |
|  |  - Auto-update             |  |  - Build pipeline          |  |
|  |                            |  |                            |  |
|  |  IPC (invoke)              |  |  IPC (stdin/stdout JSON)   |  |
|  +-------------+--------------+  +-------------+--------------+  |
|                |                               |                 |
|                |          NATS JetStream        |                 |
|                +---------------+----------------+                 |
|                                |                                  |
|                       +--------v--------+                        |
|                       |   NATS Cluster   |                        |
|                       +-----------------+                        |
|                                                                   |
+------------------------------------------------------------------+
```

**Configuração do sidecar:**

```json
{
  "bundle": {
    "externalBin": ["binaries/nats-sidecar", "binaries/agent-worker"],
    "sidecar": true
  }
}
```

```rust
// Inicializacao do sidecar
use tauri_plugin_shell::ShellExt;

fn setup_sidecar(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let sidecar = app.shell()
        .sidecar("nats-sidecar")
        .expect("failed to create sidecar command");

    let (mut rx, _child) = sidecar
        .spawn()
        .expect("failed to spawn sidecar");

    // Lidar com mensagens do sidecar
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                    // Processar JSON do sidecar
                    if let Ok(msg) = serde_json::from_str::<SidecarMessage>(&line) {
                        app.emit("sidecar-message", &msg).ok();
                    }
                }
                _ => {}
            }
        }
    });

    Ok(())
}
```

**Desvantagens do sidecar:**
- Adiciona ~50-80MB ao bundle (Node.js runtime)
- Complexidade de gerenciamento de processo
- Comunicação via stdin/stdout (mais lenta que IPC nativo)
- Dois runtimes: Rust + Node.js (manutenção)
- Debugging em dois ambientes

### 2.4 IPC Security Model

Tauri usa IPC baseado em **JSON-RPC** com **capabilities declarativas**.

```
+------------------------------------------------------------------+
|                    TAURI IPC FLOW                                 |
+------------------------------------------------------------------+
|                                                                   |
|  Frontend (JS)               Backend (Rust)                      |
|  +-------------+             +-------------+                     |
|  | invoke()    |--- JSON --->| Comando     |                     |
|  |             |             | handler     |                     |
|  | await       |<-- JSON ---|             |                     |
|  | result      |             +-------------+                     |
|  +-------------+                                                    |
|       |                                                          |
|       | Capability check:                                        |
|       | "O comando 'fs:read' esta na allowlist                   |
|       |  da janela 'main'?"                                     |
|       |                                                          |
|       v                                                          |
|  Permitido ou rejeitado com erro 403                             |
|                                                                   |
+------------------------------------------------------------------+
```

**Exemplo de capabilities para IDEIA:**

```json
{
  "identifier": "dev.ideia.app",
  "capabilities": [
    {
      "identifier": "main-window",
      "windows": ["main"],
      "permissions": [
        "core:default",
        "fs:allow-read",
        "fs:allow-write",
        "fs:allow-exists",
        "fs:allow-mkdir",
        "fs:scope": {
          "allow": ["$HOME/.ideia/**", "$APPDATA/**", "$PROJECT_DIR/**"]
        },
        "shell:allow-execute",
        "shell:allow-open",
        "shell:scope": [
          {
            "name": "node",
            "cmd": "node",
            "args": true
          },
          {
            "name": "git",
            "cmd": "git",
            "args": true
          },
          {
            "name": "npm",
            "cmd": "npm",
            "args": true
          }
        ],
        "dialog:allow-open",
        "dialog:allow-save",
        "dialog:allow-message",
        "dialog:allow-ask",
        "notification:default",
        "global-shortcut:allow-register",
        "global-shortcut:allow-unregister",
        "clipboard:allow-read-text",
        "clipboard:allow-write-text"
      ]
    },
    {
      "identifier": "agent-worker",
      "windows": [],
      "permissions": [
        "core:default",
        "fs:allow-read",
        "fs:allow-write",
        "shell:allow-execute",
        "nats:allow-publish",
        "nats:allow-subscribe"
      ]
    }
  ]
}
```

### 2.5 Auto-update

Tauri v2 possui auto-update built-in, diferentemente do Electron que requer biblioteca externa.

**Configuração:**

```json
{
  "bundle": {
    "active": true,
    "icon": ["icons/32x32.png", "icons/128x128.png"],
    "targets": ["nsis", "msi", "dmg", "appimage", "deb"]
  },
  "plugins": {
    "updater": {
      "active": true,
      "dialog": true,
      "pubkey": "YOUR_UPDATER_SIGNATURE_PUBKEY",
      "endpoints": [
        "https://releases.ideia.dev/update/{{target}}-{{arch}}/{{current_version}}"
      ]
    }
  }
}
```

**Backend de atualização:**

```rust
use tauri_plugin_updater::UpdaterExt;

fn check_update(app: &tauri::AppHandle) {
    let updater = app.updater().expect("failed to get updater");

    tauri::async_runtime::spawn(async move {
        match updater.check().await {
            Ok(Some(update)) => {
                // Atualizacao disponivel
                if update.should_update() {
                    update.download_and_install(|event| {
                        match event {
                            tauri_plugin_updater::UpdateEvent::DownloadProgress { chunk_length, .. } => {
                                app.emit("update-progress", chunk_length).ok();
                            }
                            tauri_plugin_updater::UpdateEvent::UpdaterReady { .. } => {
                                // Instalacao pronta
                            }
                            _ => {}
                        }
                    }).await.expect("update failed");
                }
            }
            Ok(None) => {} // Sem atualizacao
            Err(e) => {
                app.emit("update-error", e.to_string()).ok();
            }
        }
    });
}
```

**Comparativo auto-update:**

| Funcionalidade | Electron (electron-updater) | Tauri (built-in) |
|---------------|----------------------------|-------------------|
| Update server | S3, GitHub, custom | Custom endpoint |
| Delta updates | Não | Sim (differential) |
| Background download | Sim | Sim |
| Force update | Sim | Sim |
| Code signing | Necessário | Necessário |
| Rollback | Manual | Manual |
| macOS Sparkle | Sim | Nativo |
| Windows | NSIS, Squirrel | NSIS, MSI |

### 2.6 Builds por Plataforma

Tauri v2 builds para as três plataformas principais:

**Windows:**

```json
{
  "bundle": {
    "windows": {
      "wix": {
        "language": "pt-BR",
        "template": "ideia.wxs"
      },
      "nsis": {
        "installMode": "currentUser",
        "installerIcon": "icons/ideia.ico",
        "uninstallerIcon": "icons/ideia.ico"
      }
    }
  }
}
```

| Formato | Instalação | Vantagens | Desvantagens |
|---------|------------|-----------|--------------|
| MSI (WiX) | System-wide | GPO, enterprise, silent | Complexo de configurar |
| NSIS | User ou system | Simples, customizável | Sem suporte GPO nativo |

**macOS:**

```json
{
  "bundle": {
    "macOS": {
      "minimumSystemVersion": "12.0",
      "entitlements": "entitlements.plist",
      "hardenedRuntime": true
    }
  }
}
```

| Formato | Instalação | Vantagens | Desvantagens |
|---------|------------|-----------|--------------|
| DMG | Drag & drop | Padrão macOS | Sem auto-update nativo |
| MAS (Mac App Store) | App Store | Distribuição oficial | Sandbox restrito |

**Linux:**

```json
{
  "bundle": {
    "linux": {
      "deb": {
        "depends": ["libwebkit2gtk-4.1-0", "libgtk-3-0", "libappindicator3-1"]
      },
      "appimage": {
        "bundleMediaFramework": true
      },
      "rpm": {
        "depends": ["webkit2gtk4.1", "gtk3"]
      }
    }
  }
}
```

| Formato | Distribuições | Vantagens | Desvantagens |
|---------|--------------|-----------|--------------|
| AppImage | Todas | Portable, sem instalação | Tamanho maior |
| .deb | Debian, Ubuntu | Nativo, integrado | Apenas Debian-based |
| .rpm | Fedora, RHEL | Nativo, integrado | Apenas RPM-based |
| Snap | Ubuntu + outras | Sandbox, auto-update | Snap store dependence |
| Flatpak | Todas | Sandbox, runtime compartilhado | Flatpak runtime grande |

---

## 3. Auto-update e Distribuição

### 3.1 Estratégias de Atualização

```
+------------------------------------------------------------------+
|                    ESTRATEGIAS DE ATUALIZACAO                     |
+------------------------------------------------------------------+
|                                                                   |
|  SINCERA (recomendada para IDEIA)                                  |
|  +----------------------------------------------------------+    |
|  | 1. Verificacao periodica (a cada 4h + no startup)         |    |
|  | 2. Download em background                                 |    |
|  | 3. Notificacao: "Atualizacao pronta. Reiniciar agora?"    |    |
|  | 4. Instalacao no restart                                  |    |
|  | 5. Rollback automatico se falhar                          |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  CANAIS DE ATUALIZACAO:                                            |
|  +----------+  +----------+  +----------+  +----------+          |
|  |  Stable  |  |   Beta   |  |   Alpha  |  |  Nightly |          |
|  | Default  |  | Opt-in   |  | Opt-in   |  | Dev only |          |
|  | Semanal  |  | 3x/sem   |  | Diario   |  | Por PR   |          |
|  +----------+  +----------+  +----------+  +----------+          |
|                                                                   |
|  INFRAESTRUTURA DE UPDATE:                                        |
|  +----------------------------------------------------------+    |
|  | URL: https://releases.ideia.dev/update/{channel}/{file}   |    |
|  | Storage: Cloudflare R2 + CDN                              |    |
|  | Assinatura: Ed25519 (minisign)                            |    |
|  +----------------------------------------------------------+    |
|                                                                   |
+------------------------------------------------------------------+
```

**Endpoint de update:**

```typescript
interface UpdateCheckResponse {
  version: string;
  releaseDate: string;
  notes: string;
  pubDate: string;
  url: string;        // URL do instalador
  signature: string;  // Assinatura do arquivo
  mandatory: boolean;
  rollbackVersion?: string;
}
```

### 3.2 Windows: MSI, NSIS, Squirrel

**MSI (WiX Toolset):**

Prós: Instalação silenciosa via GPO, ideal para enterprise, desinstalação limpa
Contras: Complexo de configurar, tamanho maior, WiX learning curve

```
ideia-x.x.x.msi
  +-- ProgramFiles64Folder/IDEIA/
  |   +-- ideia.exe
  |   +-- resources/
  |   +-- nats-sidecar.exe
  |   +-- agent-worker.exe
  +-- StartMenu/IDEIA/IDEIA.lnk
  +-- Desktop/IDEIA.lnk (opcional)
  +-- Registry: HKLM/Software/IDEIA
```

**NSIS (Nullsoft Scriptable Install System):**

Prós: Simples, leve, altamente customizável, suporte a plug-ins
Contras: Menos integração enterprise, sem suporte GPO

```nsis
; install.nsis
!define PRODUCT_NAME "IDEIA"
!define PRODUCT_VERSION "1.0.0"

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "IDEIA-${PRODUCT_VERSION}-Setup.exe"

InstallDir "$LOCALAPPDATA\IDEIA"

Section "Install"
  SetOutPath "$INSTDIR"
  File "ideia.exe"
  File "resources/*"
  CreateShortCut "$SMPROGRAMS\IDEIA.lnk" "$INSTDIR\ideia.exe"
  WriteUninstaller "$INSTDIR\uninst.exe"
SectionEnd
```

**Squirrel (Windows):**

Prós: Auto-update nativo (usado por Slack, GitHub Desktop)
Contras: Descontinuado, substituído por electron-updater

### 3.3 macOS: DMG, Sparkle

**DMG (Disk Image):**

```
IDEIA-x.x.x.dmg
  +-- IDEIA.app
  |   +-- Contents/
  |   |   +-- MacOS/ideia
  |   |   +-- Resources/
  |   |   |   +-- icon.icns
  |   |   +-- Info.plist
  |   +-- Embedded.provisionprofile
  +-- Applications -> /Applications
```

**Sparkle Framework:**

Tauri usa Sparkle para auto-update no macOS.

```xml
<!-- appcast.xml -->
<rss xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle" version="2.0">
  <channel>
    <title>IDEIA Changelog</title>
    <item>
      <title>Version 1.0.0</title>
      <sparkle:version>1.0.0</sparkle:version>
      <sparkle:shortVersionString>1.0.0</sparkle:shortVersionString>
      <enclosure url="https://releases.ideia.dev/IDEIA-1.0.0.dmg"
                 sparkle:edSignature="YOUR_ED25519_SIGNATURE"
                 length="12345678"
                 type="application/octet-stream" />
      <description>Novidades da versao 1.0.0...</description>
    </item>
  </channel>
</rss>
```

### 3.4 Linux: AppImage, .deb, .rpm, Snap, Flatpak

**AppImage:**

```yaml
# ideia.appdata.xml
<component type="desktop-application">
  <id>dev.ideia.app</id>
  <name>IDEIA</name>
  <summary>Transforme ideias em sistemas completos</summary>
  <releases>
    <release version="1.0.0" date="2026-07-18"/>
  </releases>
</component>
```

**Flatpak (recomendado para Linux):**

Flatpak isola a aplicação em sandbox com runtime compartilhado.

```yaml
# dev.ideia.app.yml
app-id: dev.ideia.app
runtime: org.gnome.Platform
runtime-version: '46'
sdk: org.gnome.Sdk
command: ideia

finish-args:
  - --socket=wayland
  - --socket=x11
  - --share=network
  - --share=ipc
  - --device=dri
  - --filesystem=host

modules:
  - name: webkitgtk
    buildsystem: cmake
    sources:
      - type: archive
        url: https://webkitgtk.org/releases/webkitgtk-2.44.0.tar.xz

  - name: ideia
    buildsystem: simple
    sources:
      - type: file
        path: ideia.AppImage
```

**Snap para Ubuntu:**

```yaml
name: ideia
base: core22
version: '1.0.0'
summary: AI-powered IDE
description: Transform ideas into complete systems

apps:
  ideia:
    command: ideia
    plugs:
      - home
      - network
      - network-bind
      - process-control
      - raw-usb

plugs:
  gtk-3-themes:
    interface: content
    target: $SNAP/data-dir/themes

parts:
  ideia:
    plugin: dump
    source: .
```

### 3.5 Code Signing

Code signing é obrigatório para distribuição desktop profissional.

**Windows (Authenticode):**

```powershell
# Assinar com Azure Key Vault (CI/CD)
# Usando AzureSignTool
dotnet tool install --global AzureSignTool

AzureSignTool sign `
  -kvu "https://ideia-kv.vault.azure.net" `
  -kvi "client-id" `
  -kvs "client-secret" `
  -kvc "code-signing-cert" `
  -tr "http://timestamp.digicert.com" `
  -v "dist/IDEIA-Setup.exe"
```

**macOS (Apple Developer ID):**

```bash
# Assinar aplicativo
codesign --force --options runtime \
  --sign "Developer ID Application: IDEIA Inc (TEAMID)" \
  --entitlements entitlements.plist \
  IDEIA.app

# Notarizar para Apple
xcrun notarytool submit IDEIA.app \
  --apple-id "developer@ideia.dev" \
  --team-id "TEAMID" \
  --password "@keychain:AC_PASSWORD"

# Carimbar
xcrun stapler staple IDEIA.app
```

**Linux (assinatura opcional):**

```bash
# Assinar com GPG
gpg --detach-sign --armor dist/IDEIA-1.0.0-x86_64.AppImage

# Verificar
gpg --verify dist/IDEIA-1.0.0-x86_64.AppImage.asc
```

---

## 4. Instaladores e Releases

### 4.1 GitHub Releases + CI/CD

**Pipeline de release:**

```
                    CI/CD PIPELINE DE RELEASE
+------------------------------------------------------------------+
|                                                                   |
|  trigger: tag v*                                                   |
|       |                                                            |
|       v                                                            |
|  +------------------------------------------+                     |
|  |  BUILD MATRIZ                            |                     |
|  |  +---------+ +---------+ +---------+     |                     |
|  |  | Windows  | | macOS   | | Linux   |     |                     |
|  |  | x64/arm64| | x64/arm64| | x64/arm64|     |                     |
|  |  +----+----+ +----+----+ +----+----+     |                     |
|  +------------------------------------------+                     |
|       |          |          |                                      |
|       v          v          v                                      |
|  +---------+ +---------+ +---------+                               |
|  | MSI     | | DMG     | | AppImage|                               |
|  | NSIS    | |         | | .deb    |                               |
|  |         | |         | | .rpm    |                               |
|  +----+----+ +----+----+ +----+----+                               |
|       |          |          |                                      |
|       +----------+----------+                                      |
|                  |                                                 |
|                  v                                                 |
|  +------------------------------------------+                     |
|  |  SIGNING (paralelo)                      |                     |
|  |  - Windows: AzureSignTool                |                     |
|  |  - macOS: codesign + notarize            |                     |
|  |  - Linux: GPG sign                       |                     |
|  +------------------------------------------+                     |
|                  |                                                 |
|                  v                                                 |
|  +------------------------------------------+                     |
|  |  GITHUB RELEASE                          |                     |
|  |  - Cria release tag v*                   |                     |
|  |  - Upload assets (instaladores + .asc)   |                     |
|  |  - Gera changelog automatico             |                     |
|  +------------------------------------------+                     |
|                  |                                                 |
|                  v                                                 |
|  +------------------------------------------+                     |
|  |  NOTIFY                                  |                     |
|  |  - Slack: "IDEIA 1.0.0 lancado!"        |                     |
|  |  - Email: newsletter usuarios            |                     |
|  |  - Twitter/X: anuncio publico            |                     |
|  +------------------------------------------+                     |
|                                                                   |
+------------------------------------------------------------------+
```

**GitHub Actions workflow:**

```yaml
name: Build and Release
on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
        arch: [x86_64, aarch64]
        include:
          - os: windows-latest
            arch: x86_64
            target: x86_64-pc-windows-msvc
          - os: macos-latest
            arch: aarch64
            target: aarch64-apple-darwin
          - os: ubuntu-latest
            arch: x86_64
            target: x86_64-unknown-linux-gnu

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup Rust (Tauri)
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Install dependencies
        run: npm ci

      - name: Build frontend
        run: npm run build

      - name: Build native (Tauri)
        run: npx tauri build
        env:
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PASSWORD: ${{ secrets.TAURI_SIGNING_PASSWORD }}

      - name: Sign Windows binary
        if: matrix.os == 'windows-latest'
        run: |
          AzureSignTool sign -kvu "${{ secrets.AZURE_KV_URL }}" ...

      - name: Notarize macOS
        if: matrix.os == 'macos-latest'
        run: |
          codesign ...
          xcrun notarytool submit ...

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ideia-${{ matrix.os }}-${{ matrix.arch }}
          path: src-tauri/target/release/bundle/

  release:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4

      - name: Create Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            **/bundle/**/*.msi
            **/bundle/**/*.exe
            **/bundle/**/*.dmg
            **/bundle/**/*.AppImage
            **/bundle/**/*.deb
            **/bundle/**/*.rpm
          generate_release_notes: true
          draft: true
```

### 4.2 Package Managers

**Windows (Chocolatey, Scoop):**

```powershell
# Chocolatey (ideia.nuspec)
<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://schemas.microsoft.com/packaging/2015/06/nuspec.xsd">
  <metadata>
    <id>ideia</id>
    <version>1.0.0</version>
    <title>IDEIA</title>
    <authors>IDEIA Team</authors>
    <description>Transform ideas into complete systems</description>
    <packageSourceUrl>https://github.com/ideia/choco-packages</packageSourceUrl>
  </metadata>
  <files>
    <file src="tools\**" target="tools" />
  </files>
</package>

# Chocolatey install script (tools/chocolateyinstall.ps1)
$packageName = 'ideia'
$installerType = 'exe'
$url = 'https://github.com/ideia/ideia/releases/download/v1.0.0/IDEIA-Setup.exe'
Install-ChocolateyPackage $packageName $installerType '--silent' $url

# Scoop (bucket)
{
  "version": "1.0.0",
  "description": "AI-powered IDE",
  "homepage": "https://ideia.dev",
  "license": "MIT",
  "architecture": {
    "64bit": {
      "url": "https://github.com/ideia/ideia/releases/download/v1.0.0/IDEIA-x64.msi",
      "hash": "sha256:..."
    }
  },
  "bin": "IDEIA.exe",
  "shortcuts": [["IDEIA.exe", "IDEIA"]]
}
```

**macOS (Homebrew):**

```ruby
# ideia.rb
cask "ideia" do
  version "1.0.0"
  sha256 "..."

  url "https://github.com/ideia/ideia/releases/download/v#{version}/IDEIA-#{version}.dmg"
  name "IDEIA"
  desc "AI-powered IDE"
  homepage "https://ideia.dev"

  app "IDEIA.app"

  zap trash: [
    "~/Library/Application Support/ideia",
    "~/Library/Preferences/dev.ideia.app.plist",
    "~/Library/Caches/dev.ideia.app",
  ]
end
```

### 4.3 App Stores

**Windows Store via MSIX:**

```xml
<!-- AppxManifest.xml -->
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10">
  <Identity Name="Dev.IDEIA.IDEIA" Publisher="CN=IDEIA" Version="1.0.0.0" />
  <Properties>
    <DisplayName>IDEIA</DisplayName>
    <PublisherDisplayName>IDEIA Inc</PublisherDisplayName>
    <Logo>Assets\StoreLogo.png</Logo>
  </Properties>
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.22621.0" />
  </Dependencies>
  <Applications>
    <Application Id="App" Executable="ideia.exe" EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements DisplayName="IDEIA" Square150x150Logo="Assets\Square150x150Logo.png"
        Square44x44Logo="Assets\Square44x44Logo.png" Description="IDEIA AI IDE"
        BackgroundColor="transparent" />
    </Application>
  </Applications>
</Package>
```

**Mac App Store:**

Requer sandbox, que impõe restrições:

| Funcionalidade | Mac App Store | DMG standalone |
|---------------|---------------|----------------|
| File system | Sandbox (pastas autorizadas) | Acesso total |
| Network | Sim | Sim |
| Child process | Limitado (XPC services) | Total |
| Auto-update | App Store | Sparkle |
| Code signing | Apple Developer Program | Developer ID |
| Distribuição | App Store | Qualquer lugar |
| Comissão | 15-30% | 0% |

**Decisão:** IDEIA deve priorizar distribuição própria (DMG + Sparkle) Mac App Store apenas como canal secundário.

### 4.4 Silent Install Enterprise

Para adoção enterprise, instalação silenciosa e desatendida é essencial.

**Windows (MSI):**

```powershell
# Instalação silenciosa
msiexec /i IDEIA-1.0.0.msi /qn /norestart

# Parâmetros customizados
msiexec /i IDEIA-1.0.0.msi /qn INSTALLDIR="D:\Programs\IDEIA" AUTO_UPDATE=0

# Desinstalação
msiexec /x {PRODUCT-GUID} /qn /norestart
```

**Windows (NSIS):**

```powershell
# Instalação silenciosa
IDEIA-Setup.exe /S

# Com diretório customizado
IDEIA-Setup.exe /S /D="D:\Programs\IDEIA"

# Instalação para todos os usuários
IDEIA-Setup.exe /S /ALLUSERS=1
```

**macOS:**

```bash
# Instalação silenciosa via MDM
sudo installer -pkg IDEIA-1.0.0.pkg -target /

# Configuração via MCX/profile
sudo defaults write /Library/Preferences/dev.ideia.app.plist AutoUpdate -bool false
```

**Linux:**

```bash
# .deb (APT)
sudo apt install ./ideia-1.0.0.deb

# Desatendido
sudo DEBIAN_FRONTEND=noninteractive apt install -y ./ideia-1.0.0.deb

# Configuração corporate
mkdir -p /etc/ideia
cat > /etc/ideia/corporate-config.json <<'EOF'
{
  "updates": { "enabled": false },
  "security": { "allowedCommands": ["git", "npm", "node"] }
}
EOF
```

---

## 5. Performance Desktop

### 5.1 Profiling Memory

**Comparação de consumo de memória (carga típica):**

```
Memory Profile (MB) — Carga: Editor + 3 arquivos abertos + terminal + chat

Electron:
  0MB  100MB  200MB  300MB  400MB  500MB  600MB
  [████████████████████████████████████████████░░] 520MB
  - Main process: 85MB
  - Renderer: 320MB (Monaco + terminal + chat)
  - GPU: 65MB
  - Utility: 50MB

Tauri v2:
  0MB  100MB  200MB  300MB  400MB  500MB  600MB
  [██████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 230MB
  - Rust core: 15MB
  - WebView: 180MB (Monaco + terminal + chat)
  - Sidecar Node: 35MB

NW.js:
  0MB  100MB  200MB  300MB  400MB  500MB  600MB
  [███████████████████████████████████████████░░░] 490MB
  - Processo unico: 490MB

Neutralino.js:
  0MB  100MB  200MB  300MB  400MB  500MB  600MB
  [██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 150MB
  - Core: 8MB
  - WebView: 120MB
  - Backend: 22MB
```

**Estratégias de otimização de memória:**

```typescript
// 1. Pooling de webview — reutilizar em vez de criar nova
class WebViewPool {
  private pool: WebView[] = [];
  private maxSize = 3;

  async acquire(): Promise<WebView> {
    if (this.pool.length > 0) return this.pool.pop()!;
    return this.createWebView();
  }

  release(wv: WebView) {
    if (this.pool.length < this.maxSize) {
      wv.navigate('about:blank'); // Limpar
      this.pool.push(wv);
    } else {
      wv.close();
    }
  }
}

// 2. Lazy loading de paineis
class PanelManager {
  private panels = new Map<string, { component: LazyComponent; loaded: boolean }>();

  async ensureLoaded(panelId: string) {
    const panel = this.panels.get(panelId);
    if (!panel?.loaded) {
      // Carregar sob demanda
      panel.loaded = true;
    }
  }

  unload(panelId: string) {
    // Liberar recursos
    const panel = this.panels.get(panelId);
    if (panel) panel.loaded = false;
  }
}

// 3. Monaco Editor memory management
editor.updateOptions({
  // Reduzir memoria do Monaco
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  suggest: { showMethods: false, showFunctions: false },
  // Desligar features nao usadas
});
```

### 5.2 Startup Time

**Benchmark de startup (primeira abertura, sem cache):**

```
Startup Time (ms)

Electron:       ██████████████████████████████████░░░░░ 3200ms
  - Node init: 300ms
  - Chromium:  1500ms
  - App load:  800ms
  - Extensions: 600ms

Tauri v2:       ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 450ms
  - Rust init: 80ms
  - WebView:   200ms
  - App load:  120ms
  - Sidecar:   50ms

NW.js:          █████████████████████████████████░░░░ 2800ms

Neutralino:     █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 280ms
```

**Otimizações de startup para IDEIA:**

```rust
// Tauri: lazy initialization de plugins
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        // Plugins carregados sob demanda
        .setup(|app| {
            // Defer carregamento de features pesadas
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(Duration::from_millis(500)).await;
                // Inicializar sidecar Node.js
                init_sidecar(app).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```typescript
// Frontend: lazy loading de chunks
const AgentPanel = lazy(() => import('./panels/AgentPanel'));
const TerminalPanel = lazy(() => import('./panels/TerminalPanel'));
const DebugPanel = lazy(() => import('./panels/DebugPanel'));

function IDEIApp() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MainLayout>
        <Sidebar />
        <EditorArea />
        <PanelHost>
          {/* Painéis carregados sob demanda */}
        </PanelHost>
      </MainLayout>
    </Suspense>
  );
}
```

### 5.3 GPU Acceleration

| Aspecto | Electron (Chromium) | Tauri (WebView nativo) |
|---------|-------------------|-----------------------|
| GPU process | Chromium GPU process | WebView usa GPU do SO |
| WebGL | Completo | WebView2: completo; WKWebView: limitado |
| Canvas 2D | Acelerado | Acelerado |
| CSS 3D transforms | Acelerado | Acelerado |
| Video decode | HW acelerado | HW acelerado |
| Monaco rendering | Canvas-based (GPU) | Canvas-based (GPU) |

Para IDEIA, GPU é relevante para:
- Monaco Editor (canvas rendering de sintaxe, minimap)
- ReactFlow (diagramas de arquitetura)
- Terminal (xterm.js)
- Animações de transição

**Configuração de GPU no Tauri:**

```json
{
  "tauri": {
    "windows": [
      {
        "label": "main",
        "center": true,
        "width": 1280,
        "height": 800,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data: asset: https://asset.localhost"
    }
  }
}
```

### 5.4 Native File Dialogs

**Comparação:**

| Funcionalidade | Electron (dialog.showOpenDialog) | Tauri (dialog:open) |
|---------------|----------------------------------|---------------------|
| Seleção de arquivo | Nativo | Nativo |
| Seleção de diretório | Nativo | Nativo |
| Multi-select | Sim | Sim |
| Filtros de extensão | Sim | Sim |
| Salvar como | Nativo | Nativo |
| Aparência nativa | Sim | Sim (WebView2/WKWebView) |
| Título customizado | Sim | Sim |
| Botão customizado | Sim | Limitado |

**Exemplo Tauri:**

```typescript
import { open, save, message, ask } from '@tauri-apps/plugin-dialog';

// Abrir arquivo
const file = await open({
  multiple: false,
  filters: [{
    name: 'TypeScript',
    extensions: ['ts', 'tsx']
  }]
});

// Abrir diretório
const dir = await open({
  directory: true,
  title: 'Selecione o workspace IDEIA'
});

// Salvar
const savePath = await save({
  defaultPath: 'projeto-novo',
  filters: [{ name: 'IDEIA Project', extensions: ['ideia'] }]
});
```

### 5.5 Tray Icon e Global Shortcuts

**Tray Icon (Tauri):**

```rust
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder};

fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("IDEIA")
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "show" => app.get_webview_window("main").unwrap().show(),
                "hide" => app.get_webview_window("main").unwrap().hide(),
                "quit" => app.exit(0),
                _ => {}
            }
        })
        .menu(Submenu::new("IDEIA", Menu::new()
            .add_item(MenuItem::new("Mostrar", true, None::<()>, "show"))
            .add_item(MenuItem::new("Ocultar", true, None::<()>, "hide"))
            .add_native_item(MenuNativeItem::Separator)
            .add_item(MenuItem::new("Sair", true, None::<()>, "quit"))
        ))
        .build(app)?;

    Ok(())
}
```

**Global Shortcuts:**

```rust
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Code, Modifiers, Shortcut};

fn setup_shortcuts(app: &tauri::AppHandle) {
    let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyI);

    app.global_shortcut().register(shortcut, |app, _shortcut, _event| {
        app.emit("global-shortcut", "nova-ideia").ok();
    }).expect("Failed to register global shortcut");
}
```

```typescript
// Frontend: escutar shortcuts
import { listen } from '@tauri-apps/api/event';

await listen('global-shortcut', (event) => {
  if (event.payload === 'nova-ideia') {
    openNewIdeiaDialog();
  }
});
```

**Atalhos globais planejados para IDEIA:**

| Atalho | Ação |
|--------|------|
| `Ctrl+Shift+I` | Abrir nova ideia (de qualquer lugar) |
| `Ctrl+Shift+M` | Mostrar/ocultar IDEIA (toggle) |
| `Ctrl+Shift+A` | Abrir assistente AI |
| `Ctrl+Shift+Space` | Capturar screenshot para contexto |
| `Ctrl+Shift+P` | Abrir projeto recente |

### 5.6 Protocol Handlers

Protocol handlers permitem abrir a IDEIA via links `ideia://`.

**Registro no Tauri:**

```json
{
  "bundle": {
    "windows": {
      "wix": {
        "fragmentPaths": ["protocols.wxs"]
      }
    }
  }
}
```

```xml
<!-- protocols.wxs -->
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Fragment>
    <Component Id="ProtocolHandler" Directory="INSTALLDIR">
      <RegistryValue Root="HKLM"
        Key="Software\Classes\ideia"
        Name="URL Protocol"
        Value=""
        Type="string" />
      <RegistryValue Root="HKLM"
        Key="Software\Classes\ideia\shell\open\command"
        Value="&quot;[INSTALLDIR]ideia.exe&quot; &quot;%1&quot;"
        Type="string" />
    </Component>
  </Fragment>
</Wix>
```

**Manipulação no app:**

```rust
fn main() {
    tauri::Builder::default()
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Opened { url } = event {
                handle_deep_link(window.app_handle(), url);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn handle_deep_link(app: &tauri::AppHandle, url: &Url) {
    match url.host_str() {
        Some("open") => {
            // ideia://open/project?path=/home/user/projeto
            let path = url.query_pairs()
                .find(|(key, _)| key == "path")
                .map(|(_, val)| val.to_string());
            if let Some(path) = path {
                app.emit("open-project", path).ok();
            }
        }
        Some("new") => {
            // ideia://new?template=api-rest
            app.emit("new-project", "api-rest").ok();
        }
        Some("agent") => {
            // ideia://agent/code-review?repo=user/repo&pr=42
            app.emit("agent-action", url.path()).ok();
        }
        _ => {}
    }
}
```

**Usos para IDEIA:**

| URL | Ação |
|-----|------|
| `ideia://open/project?path=/workspace/meu-projeto` | Abrir projeto |
| `ideia://new?template=api-rest` | Criar novo projeto |
| `ideia://agent/code-review?repo=user/repo&pr=42` | Iniciar code review |
| `ideia://agent/new-ideia?text=criar%20um%20blog` | Criar ideia a partir de texto |
| `ideia://settings` | Abrir configurações |
| `ideia://install-plugin?name=my-plugin` | Instalar plugin |

---

## 6. Estratégia para IDEIA

### 6.1 Fase 0: Electron (MVP Rápido)

**Justificativa:**
- Código existente do ai-devkit já usa Electron
- Time já tem experiência com Electron
- Theia Platform (próximo passo) roda sobre Electron
- Velocidade de desenvolvimento: Electron permite MVP rápido

**Decisões técnicas:**

```json
{
  "electron": {
    "version": "28.x",
    "contextIsolation": true,
    "nodeIntegration": false,
    "sandbox": true,
    "build": {
      "tool": "electron-builder",
      "targets": {
        "windows": ["nsis"],
        "macOS": ["dmg"],
        "linux": ["AppImage"]
      }
    },
    "updater": "electron-updater",
    "publish": {
      "provider": "github",
      "owner": "ideia",
      "repo": "ideia"
    }
  }
}
```

**Otimizações necessárias no Electron:**
1. `contextIsolation: true` — segurança
2. `sandbox: true` — isolamento de processos
3. `nodeIntegration: false` — sem Node.js no renderer
4. Desligar features Chromium não usadas (webgl, flash, pdf)
5. ASAR packing para reduzir tamanho
6. Lazy loading de extensões

**Riscos e mitigações:**

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Consumo de RAM > 500MB | Alta | Médio | Lazy loading, pool de webview |
| Startup time > 5s | Média | Alto | Background init, splash screen |
| Segurança (XSS -> RCE) | Baixa | Crítico | contextIsolation, CSP |
| Bundle size > 300MB | Alta | Médio | Tree shaking, ASAR, assets sob demanda |

### 6.2 Fase 3: Theia Platform

**Justificativa:**
- Theia é a plataforma IDE definitiva para IDEIA
- Extensível via plugins/contributions
- Monaco Editor nativo
- Terminal, debug, SCM integrados
- Theia Cloud para colaboração
- Substitui Electron como shell (Theia roda sobre Electron)

**Arquitetura Theia IDEIA:**

```
+------------------------------------------------------------------+
|                    THEIA PLATFORM IDEIA                           |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------------------------------------------------+  |
|  |                    THEIA SHELL                              |  |
|  |  (Window management, menus, keybindings, preferences)       |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |                    THEIA CORE                                |  |
|  |  (DI container, contribution points, protocol)              |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  +--------+ +--------+ +--------+ +--------+ +--------+       |
|  | IDEIA  | | IDEIA  | | IDEIA  | | IDEIA  | | IDEIA  |       |
|  | Agent  | | Chat   | | Insight| | Plan   | | Deploy |       |
|  | View   | | Widget | | Dialog | | Viewer | | Widget |       |
|  +--------+ +--------+ +--------+ +--------+ +--------+       |
|  +--------+ +--------+ +--------+ +--------+ +--------+       |
|  | Monaco  | |Terminal| | Git    | | Debug  | | File   |       |
|  | Editor  | | Widget | | Widget | | Widget | | Tree   |       |
|  +--------+ +--------+ +--------+ +--------+ +--------+       |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |                    THEIA EXTENSIONS                          |  |
|  |  (Theia AI, Theia Cloud, Theia Blueprint)                   |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |                    ELECTRON SHELL (Theia backend)            |  |
|  +------------------------------------------------------------+  |
|                                                                   |
+------------------------------------------------------------------+
```

**Contribuições IDEIA para Theia:**

```typescript
// Exemplo: Contribuicao de view de agente
export const IDEIA_AGENT_VIEW = 'ideia-agent-view';

@injectable()
export class IdeiaAgentViewContribution implements ViewContribution {
  readonly id = IDEIA_AGENT_VIEW;
  readonly label = 'Agentes IDEIA';

  @postConstruct()
  init() {
    // Registrar comandos, menus, keybindings
  }

  async openView(agentId: string) {
    const shell = this.shell;
    await shell.revealWidget(IDEIA_AGENT_VIEW);
    const widget = shell.getWidget<IdeiaAgentWidget>(IDEIA_AGENT_VIEW);
    widget?.loadAgent(agentId);
  }
}
```

**Componentes Theia para IDEIA:**

| Componente | Extensão Theia | Descrição |
|------------|---------------|-----------|
| Agent Panel | `ideia.agent` | Painel de agentes AI com status |
| Chat Widget | `ideia.chat` | Chat com streaming de mensagens |
| Insight Dialog | `ideia.insight` | Input de nova ideia multi-linha |
| Plan Viewer | `ideia.plan` | Visualizador de roadmap interativo |
| Deploy Widget | `ideia.deploy` | Pipeline de deploy com um clique |
| Knowledge Graph | `ideia.knowledge` | Grafo de conhecimento do projeto |
| Session Panel | `ideia.collab` | Painel de colaboração em tempo real |

### 6.3 Fase 5: Tauri (Alternativa Leve)

**Justificativa:**
- Opção para usuários que querem versão leve
- Performance superior (50% menos RAM)
- Startup instantâneo
- Binary 20x menor que Electron
- Pode coexistir com Theia (diferentes segmentos)

**Quando usar Tauri:**
- Usuários com hardware limitado
- Distribuição em AppImage/Flatpak (Linux)
- Quick-launch mode (apenas editor + chat, sem IDE completo)
- Embedded/CI environments (tamanho do binário importa)
- Mobile? (Tauri v2 tem suporte mobile)

**Limitações para IDEIA completa:**

| Funcionalidade | Theia (Electron) | Tauri |
|---------------|-------------------|-------|
| Monaco Editor | Nativo | WebView (idêntico) |
| Plugin system | Theia extensions | Tauri plugins (Rust) |
| Terminal | xterm integrado | xterm via web (compatível) |
| Debug | V8 Debug Protocol | Limitado |
| SCM/Git | Integração total | Git via sidecar |
| Extensões VS Code | Theia suporta | Não |
| Colaboração real-time | Yjs + Theia Cloud | Yjs + NATS (separado) |
| AI Agents | Theia AI integrado | Sidecar Node.js |

### 6.4 Mapa de Decisão

```
                    DECISAO DE SHELL DESKTOP IDEIA

               +---------------------+
               | Projeto começa      |
               | (codigo existente   |
               |  ai-devkit)         |
               +----------+----------+
                          |
                          v
               +---------------------+
               | Electron + ai-devkit |
               | Fase 0 - MVP        |
               | "Fazer funcionar"   |
               +----------+----------+
                          |
                          v
               +---------------------+
               | Migrar para Theia   |
               | Platform            |
               | Fase 3 - Produto    |
               | "IDEIA como IDE     |
               |  completa"          |
               +----+-----------+-+-+
                    |           | |
                    v           | |
               +---------+     | |
               | Theia   |     | |
               | Desktop |     | |
               | (Electron)    | |
               +---------+     | |
                    |           | |
                    v           v v
               +---------+  +---------+
               | Theia   |  | Tauri   |
               | Cloud   |  | Leve    |
               | (Web)   |  | (Opt-in)|
               +---------+  +---------+
                    |           |
                    v           v
               +---------------------+
               | Multi-shell:        |
               | - Theia Desktop     |
               | - Theia Cloud (Web) |
               | - Tauri Leve        |
               | - CLI (headless)    |
               +---------------------+
```

### 6.5 Recomendação Final

**Recomendação para IDEIA:**

```
FASE 0 (MVP - agora):
  Shell: Electron 28.x
  Build: electron-builder (NSIS/DMG/AppImage)
  Update: electron-updater (GitHub Releases)
  Tamanho: ~250MB
  RAM: ~400-600MB
  Foco: Validar produto com usuários

FASE 3 (Produto - ~6 meses):
  Shell: Theia Platform sobre Electron
  Build: Theia Blueprint packaging
  Update: Theia update mechanism + electron-updater
  Tamanho: ~350MB (com extensões)
  RAM: ~500-800MB
  Foco: Experiência completa de IDE

FASE 5 (Otimização - ~12 meses):
  Shells multi-plataforma:
    - Theia Desktop (padrão, full features)
    - Theia Cloud (web, colaboração)
    - Tauri Leve (optional, lightweight)
  Build: CI/CD matrix (Electron + Tauri)
  Tamanho: Theia 350MB | Tauri 10MB
  RAM: Theia 500MB | Tauri 200MB
  Foco: Performance, distribuição, enterprise
```

**Por que não pular direto para Tauri:**

1. **Theia é a plataforma certa para IDE** — Tauri é shell, não IDE. Theia fornece editor, terminal, debug, SCM, extensões, colaboração
2. **Theia já usa Electron** — Theia não roda em Tauri (requer Electron/Chromium)
3. **Investimento em Tauri sidecar** — Substituir Node.js por sidecar adiciona complexidade sem benefício proporcional
4. **Ecossistema de extensões** — Theia suporta extensões VS Code, Tauri exigiria reescrever tudo em Rust
5. **Colaboração Theia Cloud** — Tauri não tem equivalente nativo

**Por que ter Tauri como opção na Fase 5:**

1. **Segmento Lightweight** — Usuários que só querem editor + chat
2. **Distribuição Linux** — AppImage/Flatpak com Tauri são muito menores
3. **CI/Headless** — Binary pequeno para ambientes de CI
4. **Startup rápido** — Abrir IDEIA em 300ms vs 3s

**Principal risco técnico (Electron → Theia):**

```
+------------------------------------------------------------------+
|                    PRINCIPAL RISCO: THEIA MIGRATION                |
+------------------------------------------------------------------+
|                                                                   |
|  Risco: Migracao do Electron vanilla para Theia Platform         |
|  Probabilidade: Alta (necessária)                                 |
|  Impacto: Alto (reestruturação significativa do frontend)         |
|                                                                   |
|  Mitigação:                                                        |
|  1. Camada de abstração entre UI e agentes                        |
|     - Agents chamam NATS, não Electron APIs                       |
|     - UI consome eventos NATS, independente do shell              |
|  2. Começar com Theia Blueprint o quanto antes                    |
|     - Testar compatibilidade das extensões                        |
|  3. Manter Electron como fallback durante migracao                |
|     - Feature flags para alternar entre shells                    |
|  4. Congelar features UI complexas até Theia estar pronto         |
|                                                                   |
|  Linha do tempo:                                                  |
|  - Mês 1-3: Estudar Theia, prototipar extensões principais       |
|  - Mês 3-6: Migrar funcionalidades core para Theia               |
|  - Mês 6-9: Theia como shell padrão, Electron como fallback      |
|  - Mês 9+: Electron deprecado, Theia único shell desktop          |
|                                                                   |
+------------------------------------------------------------------+
```

**Timeline de performance esperada:**

```
Performance alvo por fase:

              Startup    RAM      Binary    Install
              (ms)       (MB)     (MB)      (MB)
Fase 0:       < 3000     < 600    < 250     < 500
Fase 1-2:     < 2500     < 500    < 200     < 400
Fase 3:       < 2000     < 800    < 350     < 600
  (Theia)
Fase 4:       < 1500     < 600    < 300     < 500
Fase 5:       < 1000     < 400    < 200     < 300
  (otimizado)

Tauri opt-in:
Fase 5:       < 500      < 250    < 10      < 50
```

---

## Referências

1. Tauri v2 Documentation. v2.tauri.app
2. Electron Documentation. electronjs.org
3. NW.js Documentation. nwjs.io
4. Neutralino.js Documentation. neutralino.js.org
5. Theia Platform Architecture. theia-ide.org
6. WebView2 Microsoft Docs. learn.microsoft.com/webview2
7. WKWebView Apple Developer. developer.apple.com
8. electron-builder GitHub. github.com/electron-userland/electron-builder
9. Tauri Plugin System. tauri.app/plugins
10. Rust Performance Book. nnethercote.github.io/perf-book

---

> **Proximos passos:** Implementar electron-builder no pipeline CI/CD, configurar code signing com Azure Key Vault, criar prova de conceito de sidecar NATS para Tauri, definir plano de migração para Theia Platform.
