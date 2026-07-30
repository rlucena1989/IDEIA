# Plano Mestre de Desmembramento — Desktop Nativo

> **Data:** 2026-07-24
> **Versão:** 1.0
> **Propósito:** Detalhamento completo dos 23 estudos derivados de ESTUDO-DESKTOP-NATIVE.md,
> organizados em níveis: Técnico (básico→avançado) → Engenharia → Inovação → Fronteiras.
> **Origem:** `ESTUDO-DESKTOP-NATIVE.md` (2069 linhas, 6 seções)

---

## Estrutura Padrão de Cada Estudo

Cada estudo seguirá esta progressão em 4 níveis:

```
NÍVEL 1 — TÉCNICO (Básico → Avançado)
├── Conceitos fundamentais
├── Arquitetura e componentes
├── Mão na massa: exemplos funcionais
├── Padrões e anti-patterns
└── Exercícios práticos

NÍVEL 2 — ENGENHARIA
├── Projeto e design para produção
├── CI/CD, testes, qualidade
├── Segurança e compliance
├── Performance e escalabilidade
├── Manutenção e observabilidade
└── Estudos de caso reais

NÍVEL 3 — INOVAÇÃO / PESQUISA
├── Estado da arte (últimos 2 anos)
├── Trabalhos acadêmicos relevantes
├── Experimentos e protótipos
├── Comparação com abordagens concorrentes
└── Oportunidades não exploradas

NÍVEL 4 — FRONTEIRAS / BARREIRAS
├── Limitações fundamentais conhecidas
├── Trade-offs intransponíveis (até hoje)
├── Problemas em aberto na área
├── Hipóteses para novos paradigmas
└── Roteiro de pesquisa sugerido
```

---

## Os 23 Estudos

---

### 01 — ELECTRON: ARQUITETURA E ENGENHARIA

**Seção Origem:** 1.1
**Peso:** ⭐⭐⭐⭐⭐ (crítico — MVP atual)

**N1 Técnico:**
- Processo principal vs renderer vs utility
- IPC: contextBridge, ipcMain/ipcRenderer
- Ciclo de vida: app ready, window, quit
- Menu, Tray, Dialog, Notification
- Segurança: contextIsolation, sandbox, CSP
- Debugging: DevTools, --inspect, memory profiling

**N2 Engenharia:**
- electron-builder: NSIS, DMG, AppImage
- ASAR packing e file protocol
- Auto-update com electron-updater
- Code signing: Windows + macOS + Linux
- CI/CD matrix: Windows/macOS/Linux x x64/arm64
- Lazy loading de extensões e features
- Crash reporting: Sentry, electron-crash-reporter
- Testes: Spectron, Playwright Electron

**N3 Inovação:**
- Electron 30+: Service Workers, Window Management API
- Electron + WASM: performance crítica
- Memory optimization: Chromium feature flags
- GPU process isolation e fallback
- Electron Fuses: desligar Chromium unused features
- Benchmark comparativo com Theia

**N4 Fronteiras:**
- Chromium monolítico: há como reduzir abaixo de 100MB?
- Modelo de segurança: contexto compartilhado ainda é vetor
- Concorrência: Tauri, web containers (Emscripten)
- Problema em aberto: startup time vs Chromium init
- Hipótese: Electron sem Node.js no main (só Rust sidecar)?

---

### 02 — TAURI V2: CORE RUST E ARQUITETURA

**Seção Origem:** 1.2
**Peso:** ⭐⭐⭐⭐⭐ (estratégico — Fase 5)

**N1 Técnico:**
- Rust fundamentals para desktop
- Tauri Builder, generate_context!, run()
- WebView nativo: WebView2 vs WKWebView vs WebKitGTK
- IPC invoke: JSON-RPC entre frontend e Rust
- Tauri conf: window, security, bundle
- Commands Rust: #[tauri::command]
- Eventos: app.emit(), listen()

**N2 Engenharia:**
- Plugin system: oficiais e customizados
- Capabilities: segurança declarativa
- Sidecar: processos externos (Node.js, Python)
- Build matrix: targets Rust por plataforma
- Code signing integrado
- Auto-update built-in (differential)
- Testes: tauri-driver, WebDriver
- CI/CD: dtolnay/rust-toolchain, cargo tauri build

**N3 Inovação:**
- Tauri mobile: iOS + Android (v2)
- Multiwindow: gerenciamento avançado
- Tauri + Deno sidecar
- Tauri + WASM plugins
- Tauri + WebGPU (WebView2/WKWebView)
- IPC performance: raw sockets vs JSON-RPC

**N4 Fronteiras:**
- WebView2 depende de runtime do SO (~100MB oculto)
- WKWebView sem suporte a WebRTC DataChannel completo
- Sem Theia compatibility — barreira fundamental
- Problema em aberto: plugin distribution sem app store
- Hipótese: Tauri + Theia via web container?

---

### 03 — NW.JS: LEGADO E ARQUITETURA PROCESSO ÚNICO

**Seção Origem:** 1.3
**Peso:** ⭐⭐ (referência histórica)

**N1 Técnico:**
- node-webkit origem e evolução
- Processo único: DOM + Node.js no mesmo contexto
- require() direto no frontend
- Vantagens e riscos do modelo monolithic

**N2 Engenharia:**
- Build e distribuição
- Chrome Apps API integration
- Casos de uso: jogos, protótipos

**N3 Inovação:**
- Por que NW.js perdeu para Electron?
- Lições de arquitetura para frameworks atuais

**N4 Fronteiras:**
- Modelo de processo único é viável com segurança moderna?
- Lições para WebContainer e modelos híbridos

---

### 04 — NEUTRALINO.JS: ULTRA-LEVE C++

**Seção Origem:** 1.4
**Peso:** ⭐⭐ (alternativa nicho)

**N1 Técnico:**
- Core C++, webview nativo
- Neutralino API vs Tauri API
- Extensões nativas
- Backend opcional: Node.js, Deno, PHP

**[N2-N4 seguirão o mesmo padrão]**

---

### 05 — MATRIZ COMPARATIVA SHELLS DESKTOP

**Seção Origem:** 1.5
**Peso:** ⭐⭐⭐⭐ (decisão arquitetural)

**N1 Técnico:**
- Dimensões de comparação: binário, RAM, startup, segurança
- Critérios de avaliação ponderados
- Metodologia de benchmark

**N2 Engenharia:**
- Mapa de decisão para diferentes personas
- Trade-offs: Electron (ecossistema) vs Tauri (performance)
- Custom scoring matrix por caso de uso

**N3 Inovação:**
- Modelos emergentes: web containers, Cloud IDE
- Runtime único: será que um dia teremos?

**N4 Fronteiras:**
- O problema dos múltiplos runtimes instalados
- Hipótese: WASM runtime universal substitui nativo?

---

### 06 — RUST CORE E SEGURANÇA EM DESKTOP

**Seção Origem:** 2.1
**Peso:** ⭐⭐⭐⭐ (fundação Tauri)

**N1 Técnico:**
- Rust ownership e memory safety em GUI
- Gerenciamento de estado: AppHandle, State<>, Mutex
- async runtime: tokio no Tauri

**N2 Engenharia:**
- Modelo de capabilities: allowlist, scopes
- Content Security Policy para desktop
- Supply chain: cargo audit, crateres vulneráveis

**N3 Inovação:**
- Rust + WebAssembly no frontend
- Zero-cost abstractions para IPC
- Formal verification de capabilities?

**N4 Fronteiras:**
- Rust ownership é suficiente contra XSS?
- Como modelar permissões granulares em desktop?
- Problema em aberto: capability revocation sem restart

---

### 07 — PLUGIN SYSTEM TAURI

**Seção Origem:** 2.2
**Peso:** ⭐⭐⭐ (extensibilidade)

**N1 Técnico:**
- Plugin lifecycle: setup, run, cleanup
- Criar plugin Rust do zero
- Registrar commands e eventos
- Plugin permissions

**N2 Engenharia:**
- Publicar plugin no crates.io
- Plugin marketplace
- Compatibilidade entre versões Tauri

**N3 Inovação:**
- Dynamic plugins (runtime carregamento)?
- WASM plugins para Tauri?
- Plugin sandbox isolation

**N4 Fronteiras:**
- Plugin system security: como evitar escalation?
- Comparação com extensões VS Code/Theia

---

### 08 — SIDECAR NODE.JS

**Seção Origem:** 2.3
**Peso:** ⭐⭐⭐⭐ (arquitetura híbrida)

**N1 Técnico:**
- Processo sidecar: spawn, comunicação
- stdin/stdout JSON-RPC
- Gerenciamento de ciclo de vida

**N2 Engenharia:**
- Sidecar bundling: pkg, nexe, Sea
- Error handling, crash recovery
- Performance: IPC latency benchmarks

**N3 Inovação:**
- Sidecar com Deno ou Bun?
- Sidecar + NATS (nativa)
- Compartilhamento de runtime entre sidecars

**N4 Fronteiras:**
- Dois runtimes = dobro do consumo
- Como eliminar Node.js sidecar?
- Hipótese: rodar agentes IA em Rust diretamente?

---

### 09 — IPC SECURITY MODEL

**Seção Origem:** 2.4
**Peso:** ⭐⭐⭐⭐ (segurança)

**N1 Técnico:**
- JSON-RPC: request/response, notifications
- Capability-based security vs ACLs
- MAC vs DAC em desktop

**N2 Engenharia:**
- Threat modeling para IPC desktop
- Penetration testing de capabilities
- Auditoria de permissões

**N3 Inovação:**
- Zero-trust IPC?
- Capability delegation entre processos
- IPC over NATS para multi-processo

**N4 Fronteiras:**
- IPC é o gargalo de segurança do desktop?
- Como provar formalmente que capabilities são seguras?

---

### 10 — AUTO-UPDATE DESKTOP

**Seção Origem:** 2.5 + 3.1
**Peso:** ⭐⭐⭐⭐ (distribuição)

**N1 Técnico:**
- Mecanismos: polling, push, delta updates
- Electron: electron-updater
- Tauri: built-in updater
- Update server: endpoints, signatures

**N2 Engenharia:**
- Canais: stable, beta, alpha, nightly
- Rollback automático
- Background download + notification
- Delta updates: bsdiff, Courgette
- Atomic installation

**N3 Inovação:**
- P2P updates (BitTorrent)?
- Differential binary patches
- Server-side canary com telemetria
- Flatpak/Snap updates atômicos nativos

**N4 Fronteiras:**
- Auto-update quebra em air-gapped environments
- Como verificar integridade sem internet?
- Update server como SPOF — distribuição descentralizada?

---

### 11 — INSTALADORES WINDOWS

**Seção Origem:** 3.2 + 4.3
**Peso:** ⭐⭐⭐⭐ (enterprise)

**N1 Técnico:**
- MSI com WiX Toolset: fragmentos, componentes
- NSIS: script, seções, plug-ins
- Squirrel: delta packages
- MSIX: AppX, packaging, store

**N2 Engenharia:**
- Instalação silenciosa (GPO, SCCM, Intune)
- Instalação por usuário vs sistema
- Custom actions, prerequisites (WebView2, .NET)
- Registry, shortcuts, uninstall
- Code signing com Azure Key Vault (CI/CD)

**N3 Inovação:**
- Windows Package Manager (winget)
- MSIX vs MSI: quando usar cada um?
- Enterprise deployment: sempre silencioso

**N4 Fronteiras:**
- AppX/MSIX sandbox limita funcionalidades
- Sem GPO no NSIS — barreira enterprise
- Problema: múltiplas versões instaladas simultâneas?

---

### 12 — INSTALADORES MACOS

**Seção Origem:** 3.3 + 4.3
**Peso:** ⭐⭐⭐ (ecossistema Apple)

**N1 Técnico:**
- DMG: estrutura, background, Applications link
- PKG: distribution packages
- Sparkle Framework: appcast, Ed25519
- Code signing: Developer ID, entitlements

**N2 Engenharia:**
- Notarization pipeline (notarytool)
- Hardened Runtime
- Mac App Store: sandbox, restrições
- CI/CD: codesign + stapler

**N3 Inovação:**
- Mac App Store como canal secundário
- Universal binary (x64 + arm64)

**N4 Fronteiras:**
- Mac App Store sandbox vs IDE funcionalidade
- DMG sem auto-update nativo

---

### 13 — INSTALADORES LINUX

**Seção Origem:** 3.4
**Peso:** ⭐⭐⭐ (distribuição diversa)

**N1 Técnico:**
- AppImage: portable, squashfs, desktop integration
- .deb: control, scripts, dependencies
- .rpm: spec, requires
- Snap: confinement, plugs, slots
- Flatpak: sandbox, runtime, finish-args

**N2 Engenharia:**
- CI/CD matrix para 5 formatos
- Snapshot/PPA vs Flatpak/Flathub
- FHS compliance para .deb/.rpm

**N3 Inovação:**
- Flatpak como padrão emergente Linux
- Snap vs Flatpak: guerra de ecossistemas

**N4 Fronteiras:**
- Fragmentação Linux = N formatos obrigatórios
- Flatpak runtime (~500MB) mata vantagem de tamanho
- Problema: libwebkit2gtk version hell

---

### 14 — CODE SIGNING DESKTOP

**Seção Origem:** 3.5
**Peso:** ⭐⭐⭐⭐ (segurança distribuição)

**N1 Técnico:**
- Authenticode: certificados, timestamp, EV
- Apple Developer ID: codesign, entitlements
- GPG: assinatura descentralizada
- Hardware tokens: YubiKey, HSM

**N2 Engenharia:**
- Azure Key Vault + AzureSignTool
- CI/CD: signing sem expor chaves
- Renewal automático, revogação
- Supply chain: SLSA framework

**N3 Inovação:**
- Sigstore/cosign para desktop?
- Blockchain-based transparency logs?

**N4 Fronteiras:**
- Custo dos certificados EV (~$300/ano)
- GPG sem verificação automática no Windows
- Single point of failure: private key compromise

---

### 15 — CI/CD PIPELINE DESKTOP

**Seção Origem:** 4.1
**Peso:** ⭐⭐⭐⭐⭐ (produção)

**N1 Técnico:**
- Build matrix: OS x arch x target
- GitHub Actions: strategy, matrix, runners
- Self-hosted runners para macOS signing

**N2 Engenharia:**
- Pipeline: build → sign → notarize → release
- Changelog automático (conventional commits)
- Release draft + publish automation
- Asset management: S3, Cloudflare R2, GitHub Releases
- Slack/e-mail notification

**N3 Inovação:**
- Parallel signing (Azure Key Vault)
- Deterministic builds (reproducible)
- Containerized builds (Docker para Linux)

**N4 Fronteiras:**
- Build de Electron (~20min) vs Tauri (~5min)
- Necessidade de macOS runner para notarization
- Cross-compilation Rust: ainda problemática

---

### 16 — PACKAGE MANAGERS

**Seção Origem:** 4.2
**Peso:** ⭐⭐⭐ (adoção dev)

**N1 Técnico:**
- Chocolatey: nuspec, chocolateyInstall.ps1
- Scoop: bucket, manifest, hash
- Homebrew: cask, formula
- Linux: APT, DNF, AUR

**N2 Engenharia:**
- Auto-publicação no CI/CD
- Versionamento e hash verification
- Enterprise: internal NuGet/Chocolatey repo

**N3 Inovação:**
- winget como padrão Windows futuro
- Universal package manager?

**N4 Fronteiras:**
- 5+ package managers diferentes = manutenção
- Chocolatey em declínio, winget em ascensão

---

### 17 — SILENT INSTALL ENTERPRISE

**Seção Origem:** 4.4
**Peso:** ⭐⭐⭐ (adoção corporativa)

**N1 Técnico:**
- Parâmetros de linha de comando por formato
- GPO deployment: MSI via Active Directory
- MDM: Intune, Jamf
- Configuração corporate: arquivos de política

**N2 Engenharia:**
- Scripts de deploy automatizado
- Verificação de instalação pós-deploy
- Update silencioso em massa
- Enterprise Config: allowedCommands, security policies

**N3 Inovação:**
- Auto-configuration via MDM policies
- Zero-touch deployment

**N4 Fronteiras:**
- Mac App Store sandbox impede silent install
- NSIS sem suporte GPO nativo
- Como fazer rollback enterprise sem afetar usuários?

---

### 18 — GPU ACCELERATION

**Seção Origem:** 5.3
**Peso:** ⭐⭐⭐ (performance visual)

**N1 Técnico:**
- GPU vs CPU rendering
- Chromium GPU process
- WebGL, WebGPU, Canvas 2D
- HW video decode: H.264, H.265, AV1

**N2 Engenharia:**
- Monaco Editor: canvas rendering
- ReactFlow/Diagramas GPU-accelerated
- xterm.js: rendering em GPU

**N3 Inovação:**
- WebGPU no webview nativo
- OffscreenCanvas para background rendering
- GPU compute (WGSL) para agentes?

**N4 Fronteiras:**
- WKWebView sem WebGPU completo
- WebView2 GPU memory leak crônico
- GPU não acelerada em VMs/containers

---

### 19 — NATIVE FILE DIALOGS

**Seção Origem:** 5.4
**Peso:** ⭐⭐ (UX nativa)

**N1 Técnico:**
- dialog.showOpenDialog (Electron)
- @tauri-apps/plugin-dialog
- Filtros, multi-select, diretório

**[N2-N4: seguir padrão — engenharia, inovação, fronteiras]**

---

### 20 — TRAY ICON E GLOBAL SHORTCUTS

**Seção Origem:** 5.5
**Peso:** ⭐⭐⭐ (UX sistema)

**N1 Técnico:**
- Tray: ícone, menu, tooltip, eventos
- Global shortcuts: registro SO, conflitos
- Electron vs Tauri implementação

**N2 Engenharia:**
- Tray em múltiplas plataformas
- Shortcut conflict resolution
- Acessibilidade: atalhos alternativos

**N3 Inovação:**
- Tray com notificações interativas
- Global shortcuts para agentes AI

**N4 Fronteiras:**
- macOS: sem tray nativo (menu extras)
- Linux: tray deprecado no GNOME/Wayland
- Global shortcuts interceptados por antivírus

---

### 21 — PROTOCOL HANDLERS / DEEP LINKS

**Seção Origem:** 5.6
**Peso:** ⭐⭐⭐ (integração SO)

**N1 Técnico:**
- URL scheme: registro, parsing, handling
- ideia:// protocol
- Segurança: validação de URL, injeção

**N2 Engenharia:**
- Registro cross-platform
- Deep link para ações específicas
- Single instance lock

**N3 Inovação:**
- Deep links como API externa da IDE
- agente://code-review?repo=&pr= — workflow automation

**N4 Fronteiras:**
- Conflito de protocol handlers entre versões
- macOS: Universal Links vs URL schemes
- Segurança: como prevenir phishing via deep link?

---

### 22 — ELECTRON → THEIA MIGRATION

**Seção Origem:** 6.2
**Peso:** ⭐⭐⭐⭐⭐ (crítico — Fase 3)

**N1 Técnico:**
- Theia architecture: DI, contributions, protocol
- Electron app vs Theia backend
- Camada de abstração entre UI e agents

**N2 Engenharia:**
- Plano de migração: feature-parity matrix
- Theia Blueprint como base
- Testes de compatibilidade
- Feature flags para shell switching

**N3 Inovação:**
- Migration automática com codemods?
- Theia como plataforma universal

**N4 Fronteiras:**
- Theia depende de Electron (não resolve tamanho)
- Learning curve: Inversify DI, contribution points
- Problema: extensões VS Code em Theia têm diferenças

---

### 23 — ESTRATÉGIA MULTI-SHELL IDEIA

**Seção Origem:** 6.4-6.5
**Peso:** ⭐⭐⭐⭐⭐ (visão produto)

**N1 Técnico:**
- Modelo multi-shell: Electron, Theia, Tauri, CLI, Web
- Camada de abstração comum (NATS)
- Feature matrix por shell

**N2 Engenharia:**
- Decisão arquitetural por fase do roadmap
- Custo de manutenção N shells
- Priorização de investimento

**N3 Inovação:**
- Adaptive shell selection (baseado em hardware)?
- Cloud IDE + Desktop + Mobile seamless

**N4 Fronteiras:**
- Manter N shells é sustentável?
- Unificação via web containers (Figma model)?
- Qual o shell definitivo para uma AI-native IDE?

---

## Roadmap de Criação

| Fase | Estudos | Esforço Estimado |
|------|---------|-----------------|
| **1** | 01-Electron, 02-Tauri, 15-CI/CD, 22-Theia Migration, 23-Estratégia | ~25h |
| **2** | 06-Rust Segurança, 08-Sidecar, 09-IPC, 10-Auto-update, 14-Code Signing | ~20h |
| **3** | 11-Windows, 12-macOS, 13-Linux, 16-Package Mgrs, 17-Silent Install | ~20h |
| **4** | 05-Matriz Comparativa, 18-GPU, 20-Tray/Shortcuts, 21-Protocol Handlers | ~15h |
| **5** | 03-NW.js, 04-Neutralino, 07-Plugins, 19-File Dialogs | ~10h |

**Total estimado:** ~90h de pesquisa e escrita

---

## Template de Criação

Cada estudo será salvo como `ESTUDO-D{n}-TITULO.md` (onde D = Desktop) seguindo o template:

```markdown
# ESTUDO-D{n} — Título Completo

> **Data:** 2026-07-24
> **Versão:** 1.0
> **Propósito:** ...
> **Nível 1 - Técnico:** ... | **Nível 2 - Engenharia:** ...
> **Nível 3 - Inovação:** ... | **Nível 4 - Fronteiras:** ...
> **Origem:** ESTUDO-DESKTOP-NATIVE.md seção X.Y

---

## 1. NÍVEL TÉCNICO (Básico → Avançado)

### 1.1 Conceitos Fundamentais
...

### 1.2 Arquitetura
...

### 1.3 Mão na Massa
...

### 1.4 Padrões e Anti-Patterns
...

### 1.5 Exercícios
...

---

## 2. NÍVEL ENGENHARIA

### 2.1 Projeto para Produção
...

### 2.2 CI/CD e Qualidade
...

### 2.3 Segurança
...

### 2.4 Performance
...

### 2.5 Estudos de Caso
...

---

## 3. NÍVEL INOVAÇÃO / PESQUISA

### 3.1 Estado da Arte
...

### 3.2 Trabalhos Acadêmicos
...

### 3.3 Experimentos
...

### 3.4 Oportunidades
...

---

## 4. NÍVEL FRONTEIRAS / BARREIRAS

### 4.1 Limitações Fundamentais
...

### 4.2 Trade-offs Intransponíveis
...

### 4.3 Problemas em Aberto
...

### 4.4 Hipóteses e Novos Paradigmas
...

### 4.5 Roteiro de Pesquisa
...

---

## Referências
...
```

---

## Metodologia de Cada Estudo

```
1. Pesquisar estado da arte (pacotes npm, crates.io, papers, docs)
2. Escrever Nível Técnico com exemplos funcionais
3. Escrever Nível Engenharia com CI/CD, segurança, estudos de caso
4. Escrever Nível Inovação com papers acadêmicos, experimentos
5. Escrever Nível Fronteiras com problemas em aberto e hipóteses
6. Revisar, referenciar, atualizar este plano mestre
```

---

## Descobertas da Auditoria de Código (2026-07-24)

### O Que já Existe no Codebase

**Electron (`electron/`) — Funcional mas com gaps de segurança:**
- Main process, preload, tray, menu, updater, notifications, deep links, installer
- ⚠️ `contextIsolation: false` e `nodeIntegration: true` — vulnerabilidade crítica
- ⚠️ Code signing ad-hoc (`--sign -`) sem identidade real
- ❌ `entitlements.mac.plist` não existe (referenciado no electron-builder.yml)
- ❌ Nenhum GitHub Actions workflow para desktop

**Tauri (`packages/tauri/`) — Bem estruturado mas faltam peças:**
- Rust core + plugins: shell, dialog, notification, process, updater, deep-link, fs
- TypeScript API client com 30+ testes
- ⚠️ `pubkey: ""` vazio no updater — sem verificação criptográfica
- ❌ Nenhum teste Rust (`#[cfg(test)]` modules)
- ❌ Global shortcuts não implementados

**Theia Plugin (`packages/ideia-plugin/`) — Completamente funcional:**
- 10 widgets, 10 serviços backend, 0 erros compilação, 13 testes

**FALTA implementar (gaps da estratégia multi-shell):**
- `IShell` interface (contrato universal entre shells)
- `MetadataCache` (base para features Obsidian: Graph, Backlinks, Search)
- `Graph View` widget (conhecimento visual do projeto)
- `JSON Canvas` suporte (whiteboard + diagramas abertos)
- `Wiki-links` parser no Monaco (`[[referencia]]`)
- CI/CD automático com GitHub Actions (3 workflows)
- Feature flags para alternar entre shells

### Featured Implementados nos Estudos

| Estudo | Arquivo | Linhas | IDEIA-specific? | Obsidian? | Codebase Audit? |
|--------|---------|--------|-----------------|-----------|----------------|
| D01 — Electron | `ESTUDO-D01-ELECTRON-ARQUITETURA-ENGENHARIA.md` | 1046 | ✅ Seção 5 | ✅ MetadataCache | ✅ Gaps corrigidos |
| D02 — Tauri v2 | `ESTUDO-D02-TAURI-V2-CORE-RUST-ARQUITETURA.md` | 979 | ✅ Seção 5 | ✅ Rust cache | ✅ Auditoria completa |
| D15 — CI/CD | `ESTUDO-D15-CICD-PIPELINE-DESKTOP.md` | 500+ | ✅ Workflows IDEIA | ✅ Inspiração | ✅ Build matrix |
| D22 — Migração | `ESTUDO-D22-ELECTRON-THEIA-MIGRATION.md` | 400+ | ✅ Plano 4 fases | ✅ Lições Obsidian | ✅ Feature parity |
| D23 — Estratégia | `ESTUDO-D23-ESTRATEGIA-MULTI-SHELL-IDEIA.md` | 600+ | ✅ Blueprint final | ✅ Tabela completa | ✅ Status atual |

### Status dos 23 Estudos — FINAL (2026-07-24)

| # | Estudo | Arquivo | Status | Prioridade | IDEIA | Obsidian |
|---|--------|---------|--------|------------|-------|----------|
| **01** | **Electron** | `ESTUDO-D01-ELECTRON-ARQUITETURA-ENGENHARIA.md` | ✅ Completo | ⭐⭐⭐⭐⭐ | ✅ Seção 5 | ✅ MetadataCache |
| **02** | **Tauri v2** | `ESTUDO-D02-TAURI-V2-CORE-RUST-ARQUITETURA.md` | ✅ Completo | ⭐⭐⭐⭐⭐ | ✅ Seção 5 | ✅ Rust Cache |
| 03 | NW.js | `ESTUDO-D03-NWJS-LEGADO.md` | ✅ Completo | ⭐⭐ | ✅ Lições | ❌ |
| 04 | Neutralino.js | `ESTUDO-D04-NEUTRALINOJS-ULTRA-LEVE.md` | ✅ Completo | ⭐⭐ | ✅ Não investir | ❌ |
| **05** | **Matriz Comparativa** | `ESTUDO-D05-MATRIZ-COMPARATIVA-SHELLS.md` | ✅ Completo | ⭐⭐⭐⭐ | ✅ Scoring IDEIA | ✅ Lições |
| **06** | **Rust Core Segurança** | `ESTUDO-D06-RUST-CORE-SEGURANCA-DESKTOP.md` | ✅ Completo | ⭐⭐⭐⭐ | ✅ Validação | ❌ |
| 07 | Plugin System Tauri | `ESTUDO-D07-PLUGIN-SYSTEM-TAURI.md` | ✅ Completo | ⭐⭐⭐ | ✅ NATS plugin | ❌ |
| **08** | **Sidecar Node.js** | `ESTUDO-D08-SIDECAR-NODEJS.md` | ✅ Completo | ⭐⭐⭐⭐ | ✅ Benchmark | ❌ |
| **09** | **IPC Security Model** | `ESTUDO-D09-IPC-SECURITY-MODEL.md` | ✅ Completo | ⭐⭐⭐⭐ | ✅ contextIsolation | ❌ |
| **10** | **Auto-update Desktop** | `ESTUDO-D10-AUTOUPDATE-DESKTOP.md` | ✅ Completo | ⭐⭐⭐⭐ | ✅ pubkey gap | ❌ |
| 11 | Instaladores Windows | `ESTUDO-D11-INSTALADORES-WINDOWS.md` | ✅ Completo | ⭐⭐⭐⭐ | ✅ NSIS+MSI | ❌ |
| 12 | Instaladores macOS | `ESTUDO-D12-INSTALADORES-MACOS.md` | ✅ Completo | ⭐⭐⭐ | ✅ entitlements | ❌ |
| 13 | Instaladores Linux | `ESTUDO-D13-INSTALADORES-LINUX.md` | ✅ Completo | ⭐⭐⭐ | ✅ 5 formatos | ❌ |
| **14** | **Code Signing** | `ESTUDO-D14-CODE-SIGNING-DESKTOP.md` | ✅ Completo | ⭐⭐⭐⭐ | ✅ Azure KV | ❌ |
| **15** | **CI/CD Pipeline** | `ESTUDO-D15-CICD-PIPELINE-DESKTOP.md` | ✅ Completo | ⭐⭐⭐⭐⭐ | ✅ 3 workflows | ✅ Inspiração |
| 16 | Package Managers | `ESTUDO-D16-PACKAGE-MANAGERS.md` | ✅ Completo | ⭐⭐⭐ | ✅ Auto-publish | ❌ |
| 17 | Silent Install | `ESTUDO-D17-SILENT-INSTALL-ENTERPRISE.md` | ✅ Completo | ⭐⭐⭐ | ✅ Enterprise cfg | ❌ |
| 18 | GPU Acceleration | `ESTUDO-D18-GPU-ACCELERATION-DESKTOP.md` | ✅ Completo | ⭐⭐⭐ | ✅ GPU agents | ❌ |
| 19 | Native File Dialogs | `ESTUDO-D19-NATIVE-FILE-DIALOGS.md` | ✅ Completo | ⭐⭐ | ✅ Já funciona | ❌ |
| 20 | Tray/Shortcuts | `ESTUDO-D20-TRAY-GLOBAL-SHORTCUTS.md` | ✅ Completo | ⭐⭐⭐ | ✅ Global short | ❌ |
| 21 | Protocol Handlers | `ESTUDO-D21-PROTOCOL-HANDLERS-DEEP-LINKS.md` | ✅ Completo | ⭐⭐⭐ | ✅ ideia:// | ❌ |
| **22** | **Electron→Theia** | `ESTUDO-D22-ELECTRON-THEIA-MIGRATION.md` | ✅ Completo | ⭐⭐⭐⭐⭐ | ✅ Plano 4 fases | ✅ Lições |
| **23** | **Estratégia Multi-Shell** | `ESTUDO-D23-ESTRATEGIA-MULTI-SHELL-IDEIA.md` | ✅ Completo | ⭐⭐⭐⭐⭐ | ✅ Blueprint | ✅ Completo |

**Total: 23/23 COMPLETO ✅ — 100% dos estudos de Desktop Nativo desmembrados.**

### Resumo Final da Sessão

| Métrica | Valor |
|---------|-------|
| Estudos do plano original | 23 |
| Estudos criados nesta sessão | 23 (5 Fase 1 + 18 Fases 2-5) |
| Arquivos criados | 23 novos + 1 plano mestre + 2 atualizações = 26 |
| Total de linhas escritas | ~12.000+ |
| Gaps de código encontrados | 15+ (documentados em cada estudo) |
| Features Obsidian propostas | 10 (MetadataCache, Graph, Canvas, Backlinks, Wiki-links, etc.)|
| Recomendações "Não Investir" | NW.js, Neutralino.js |

---

## Aprovação

Este plano mestre está em revisão contínua. A **Fase 1** (5 estudos críticos) foi concluída.
Os 18 estudos restantes aguardam início da Fase 2.
