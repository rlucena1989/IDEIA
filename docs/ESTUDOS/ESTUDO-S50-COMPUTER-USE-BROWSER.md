# Estudo S50 — Computer Use & Browser Automation

> **Tipo:** `study`
> **Status:** `draft`
> **Data:** 2026-07-22
> **Propósito:** Definir a arquitetura e implementacao do sistema de Computer Use e Browser Automation para IDEIA, combinando o melhor das abordagens Devin, Claude Code, Factory e ferramentas open-source
> **Contexto:** IDEIA — evolucao do ai-devkit para IDE completa com agentes de IA integrados, capaz de navegar na web, testar E2E, gravar sessoes e interagir com interfaces como um humano
> **Base:** Playwright 1.45+, Devin Computer Use, Claude Computer Use (Vision + CDP), Browserbase SDK, Puppeteer 22.x, Chrome DevTools Protocol 1.3

---

## Sumario

1. [Introducao](#1-introducao)
2. [Competitive Landscape](#2-competitive-landscape)
3. [IDEIA Current State](#3-ideia-current-state)
4. [Architecture Design: IDEIA Browser Agent](#4-architecture-design-ideia-browser-agent)
5. [Browser Controller](#5-browser-controller)
6. [Vision-Based UI Understanding](#6-vision-based-ui-understanding)
7. [Action System](#7-action-system)
8. [Recording & Replay](#8-recording--replay)
9. [E2E Testing Integration](#9-e2e-testing-integration)
10. [SSO/Authentication Handling](#10-ssoauthentication-handling)
11. [Security & Isolation](#11-security--isolation)
12. [Code Examples](#12-code-examples)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Conexoes](#14-conexoes)

---

## 1. Introducao

### 1.1 O Que e Computer Use

Computer Use e a capacidade de um agente de IA controlar um navegador web (ou sistema operacional) de forma autonoma: navegar, clicar, digitar, extrair informacao, gravar sessoes e testar aplicacoes. E o componente que transforma uma CLI de IA em uma ferramenta capaz de interagir com o mundo real da web.

```
+------------------------------------------------------------+
|                    Computer Use Stack                       |
|                                                            |
|  +--------------------+  +----------------------------+     |
|  |   Natural Language  |  |   Vision Understanding    |     |
|  |   "log in to gmai  |  |   screenshot -> x,y click |     |
|  |   and send email"   |  |   OCR + element detection |     |
|  +--------+-----------+  +-------------+--------------+     |
|           |                              |                  |
|           v                              v                  |
|  +--------------------------------------------------+      |
|  |            Action Planning Layer                  |      |
|  |  navigate -> wait -> click(#id) -> type -> assert |     |
|  +--------------------------------------------------+      |
|           |                              |                  |
|           v                              v                  |
|  +--------------------------------------------------+      |
|  |            Browser Execution Engine              |      |
|  |  Playwright / Puppeteer / CDP / WebDriver        |      |
|  +--------------------------------------------------+      |
|           |                              |                  |
|           v                              v                  |
|  +--------------------------------------------------+      |
|  |   Recording & Replay   |   E2E Test Framework    |      |
|  |   video, screenshot,   |   assertions, parallel, |      |
|  |   step-by-step replay  |   CI integration         |      |
|  +------------------------+--------------------------+      |
+------------------------------------------------------------+
```

### 1.2 Por Que Computer Use e Critico para IDEIA

| Capacidade | Impacto | Concorrente que tem |
|------------|---------|---------------------|
| Automação de login SSO | Acesso a sistemas corporativos sem expor secrets | Devin (Playwright scripting) |
| Testes E2E generativos | "teste o fluxo de checkout" -> script executavel | Factory (AI-driven testing) |
| Visual regression | Screenshot A/B para detectar quebras visuais | Applitools, Percy |
| Web scraping inteligente | Extrair dados de sites com selectors adaptaveis | Claude (Vision-based) |
| Gravacao de sessoes | Auditoria de interacoes para debugging | Devin (video recording) |
| Acessibilidade audit | Verificacao automatica de WCAG via axe-core | axe DevTools, Lighthouse |

---

## 2. Competitive Landscape

### 2.1 Devin — Computer Use Implementation

Devin implementa Computer Use como um dos seus diferenciais competitivos. A arquitetura e baseada em:

| Componente | Implementacao Devin |
|------------|---------------------|
| **VM Isolation** | VM Linux efemera por sessao, com Chrome/Chromium instalado |
| **Browser Engine** | Playwright (Chromium) como driver principal |
| **Action Model** | LLM proprietario (SWE-1.7) gera scripts Playwright |
| **Vision** | Screenshot-based com bounding boxes para elementos interativos |
| **Recording** | Video recording da tela inteira (ffmpeg + Xvfb) |
| **SSO** | Scripts Playwright pre-escritos para OAuth providers |
| **Selectors** | Mistura de CSS selectors, text, role e x,y coordinates |
| **Recovery** | Retry com selectors alternativos quando falha |
| **E2E Generation** | "teste o login" -> script Playwright gerado + executado |

Pontos fortes:
- VM isolada garante seguranca e reproducibilidade
- Playwright e battle-tested (5+ anos de mercado)
- Video recording permite auditoria visual

Pontos fracos:
- VM overhead (boot lento, consumo de memoria)
- Scripts Playwright sao deterministicos — falham facil com mudancas de UI
- Sem fallback para visao LLM quando selectors quebram
- Playwright scripting requer manutencao constante

### 2.2 Claude Code — Computer Use Implementation

Claude Code (Anthropic) implementa Computer Use de forma radicalmente diferente:

```
+----------------------------------------------------------+
|              Claude Computer Use Architecture              |
|                                                           |
|  +------------------+     +----------------------------+  |
|  |  Screenshot via  |     |  Accessibility Tree via   |  |
|  |  CDP (Chrome)    |     |  Chrome DevTools Protocol |  |
|  +--------+---------+     +-------------+--------------+  |
|           |                              |                 |
|           v                              v                 |
|  +--------------------------------------------------+     |
|  |          Vision LLM (Claude 4 Vision)             |     |
|  |  Analisa screenshot + accessibility tree,         |     |
|  |  decide: click(x,y) | type(text) | scroll(delta) |     |
|  +--------------------------------------------------+     |
|           |                                                  |
|           v                                                  |
|  +--------------------------------------------------+     |
|  |        CDP Commands (Chrome DevTools)             |     |
|  |  Input.dispatchMouseEvent, Input.dispatchKeyEvent |     |
|  +--------------------------------------------------+     |
+----------------------------------------------------------+
```

| Componente | Implementacao Claude |
|------------|----------------------|
| **Browser Engine** | Chrome + CDP direto (sem Playwright/Puppeteer) |
| **Vision** | Claude 4 Vision analisa screenshot + acessibility tree |
| **Actions** | Mouse click (x,y), keyboard type, scroll, wait |
| **Selectors** | Nao usa — tudo por coordenadas + accessibility tree |
| **Recording** | NA (sessao ao vivo, sem gravacao) |
| **SSO** | Delega ao usuario ("clique no botao de login") |
| **Recovery** | Claude reavalia screenshot apos acao falha |
| **E2E** | NA (foco em task completion, nao em testes) |

Pontos fortes:
- Nao quebra com mudancas de CSS/HTML — usa visao, nao selectors
- Adaptavel a qualquer interface web
- Claude 4 Vision e extremamente capaz de entender UI

Pontos fracos:
- Lento (cada acao requer round-trip para LLM vision)
- Caro (cada screenshot = ~2K tokens de imagem)
- Sem script replay deterministico
- Nao gera testes E2E
- Depende de modelo externo (Claude 4)

### 2.3 Factory — AI-Driven Browser Testing

Factory implementa browser testing com AI generativa focada em engenharia de software:

| Componente | Implementacao Factory |
|------------|-----------------------|
| **Browser Engine** | Playwright + BrowserStack |
| **Test Generation** | LLM gera spec -> script -> executa -> reporta |
| **Assertions** | Geradas automaticamente (visual + content + URL) |
| **Parallelism** | Multiplos browsers em paralelo via cloud |
| **CI Integration** | GitHub Actions + Slack notification |
| **Flaky Detection** | Automatic retry + flaky test marking |

Pontos fortes:
- Geração automatica de testes a partir de descricao
- Integracao CI nativa
- Relatorios visuais

Pontos fracos:
- Foco exclusivo em E2E testing (nao em automacao geral)
- Sem visao LLM (usa selectors tradicionais)
- Vendor lock-in (BrowserStack)

### 2.4 Open-Source Alternatives

| Ferramenta | Engine | Vision | Recording | E2E | SSO | License |
|------------|--------|--------|-----------|-----|-----|---------|
| **Playwright** | Chromium/Firefox/WebKit | NA | Video API + Trace Viewer | Nativo | Manual | Apache 2.0 |
| **Puppeteer** | Chromium only | NA | Screenshot + video (3rd party) | Manual | Manual | Apache 2.0 |
| **Browserbase** | Playwright + Cloud | NA | Session recording cloud | Nativo | Managed | Proprietaria |
| **Cypress** | Chromium only | NA | Video + screenshot | Nativo | Manual | MIT |
| **Selenium** | Multi-browser | NA | Screenshot only | Nativo | Manual | Apache 2.0 |

### 2.5 Comparative Matrix

| Dimensao | Devin | Claude | Factory | Playwright | IDEIA (alvo) |
|----------|-------|--------|---------|------------|--------------|
| **Browser Engine** | Playwright | Chrome CDP | Playwright | Chromium/Fx/WebKit | Playwright + CDP |
| **Vision LLM** | NA (selectors) | Claude 4 Vision | NA (selectors) | NA | GPT-4o / Claude 4 |
| **Action Model** | Script generation | LLM per action | LLM per test case | Code | Hybrid (script + vision) |
| **Recording** | Video (ffmpeg) | NA | Screenshots | Trace + Video | Video + Screenshot + Trace |
| **E2E Generation** | "teste" -> script | NA | "teste" -> spec | NA | NL -> Test script |
| **SSO Automation** | Playwright scripts | Manual delegation | NA | Manual | Profile injection + OAuth flow |
| **Recovery** | Retry selectors | Re-analyze screen | Retry test | Manual | Vision+Selector hybrid |
| **Isolation** | VM full | Chrome profile | BrowserStack cloud | Local process | Sandboxed Chromium |
| **Parallelism** | Multi-VM | Single session | Cloud parallel | Native (contexts) | Context pools |
| **Flaky Detection** | NA | NA | Automatic | NA | Statistical + Vision |
| **Cost Model** | ~$500/mo | ~$0.03/action | ~$200/mo | Free | Free (own infra) |

### 2.6 Key Insights for IDEIA

1. **Devin acerta em:** Playwright como engine, video recording, SSO scripting, VM isolation
2. **Claude acerta em:** Vision-based UI understanding, adaptability to UI changes, accessibility tree parsing
3. **Factory acerta em:** Test generation from NL, CI integration, flaky detection
4. **Playwright oferece:** Trace Viewer, codegen, multiplatform, free

**Decisao arquitetural:** IDEIA adota abordagem hibrida:

```
Devin's Playwright Engine
  + Claude's Vision Understanding
  + Factory's Test Generation
  + Playwright's Trace Viewer + Codegen
  = IDEIA Browser Agent
```

---

## 3. IDEIA Current State

### 3.1 What Exists Today

O package `@ideia/browser-agent` contem:

| Arquivo | Linhas | Status | Conteudo |
|---------|--------|--------|----------|
| `src/browser-agent.ts` | 127 | Stub | `BrowserAction` interface, `BrowserEngine` interface, `HttpEngine` (all throw), `PlaywrightPEngine` (all throw), `BrowserAgent` facade |
| `src/session-recorder.ts` | 99 | Funcional | `SessionRecorder` com start/stop/recordAction/replay/exportToScript |
| `src/index.ts` | 4 | Export | Re-exporta `BrowserAgent`, `BrowserAction`, `BrowserEngine`, `SessionRecorder`, `Session`, `SessionAction` |
| `__tests__/browser-agent.test.ts` | 166 | Funcional | Testes com `MockEngine`, `HttpEngine` e `SessionRecorder` |
| `package.json` | 27 | Basico | Sem dependencias, sem scripts de teste |

### 3.2 Gaps Identificados

| Gap | Severidade | Descricao |
|-----|------------|-----------|
| **G-BR-01** | CRITICO | `PlaywrightPEngine` nao implementa nenhum metodo — jogou erro |
| **G-BR-02** | CRITICO | Sem dependencia `@playwright/test` ou `playwright` no package.json |
| **G-BR-03** | CRITICO | Sem Vision LLM integration (nao analisa screenshots) |
| **G-BR-04** | ALTO | Sem video recording (ffmpeg/ScreenRecorder) |
| **G-BR-05** | ALTO | Sem Action System (gerenciamento de estado de acoes) |
| **G-BR-06** | ALTO | Sem Action Planning (NL -> sequence of actions) |
| **G-BR-07** | ALTO | Sem Action Recovery (retry com fallback) |
| **G-BR-08** | ALTO | Sem E2E test generation from NL |
| **G-BR-09** | ALTO | Sem AssertionEngine (visual, content, URL asserts) |
| **G-BR-10** | MEDIO | Sem SSO/Auth handling (cookie injection, OAuth flow) |
| **G-BR-11** | MEDIO | Sem security sandboxing (network filter, download restrict) |
| **G-BR-12** | MEDIO | Sem browser profile management (persistent sessions) |
| **G-BR-13** | MEDIO | Sem CDP integration (Chrome DevTools Protocol) |
| **G-BR-14** | BAIXO | Sem accessibility tree parsing |
| **G-BR-15** | BAIXO | Sem headless detection evasion |

### 3.3 Current Test Coverage

```
BrowserAgent (MockEngine)  -> 8 tests (passing)
BrowserAgent (HttpEngine)  -> 3 tests (passing)
SessionRecorder            -> 8 tests (passing)
Total: 19 tests
```

---

## 4. Architecture Design: IDEIA Browser Agent

### 4.1 High-Level Architecture

```
+------------------------------------------------------------------+
|                     IDEIA Browser Agent                           |
|                                                                   |
|  +----------------------------------------------------------+    |
|  |                    Public API Layer                       |    |
|  |  BrowserAgent facade  |  BrowserAgentCLI  |  IDEIA Tool  |    |
|  +----------------------------+-----------------------------+    |
|                               |                                   |
|  +----------------------------v-----------------------------+    |
|  |                Action Planning Layer                     |    |
|  |  +----------------+  +----------------+  +----------+   |    |
|  |  | Intent Parser  |  | Action Planner |  | Verifier |   |    |
|  |  | NL -> Actions  |  | Action Sequence|  | Step Pass|   |    |
|  |  +----------------+  +----------------+  +----------+   |    |
|  +----------------------------+-----------------------------+    |
|                               |                                   |
|  +----------------------------v-----------------------------+    |
|  |              Core Execution Layer                        |    |
|  |  +------------------+  +---------------+  +-----------+  |    |
|  |  | BrowserController |  | VisionParser  |  | Action    |  |   |
|  |  | Playwright + CDP  |  | Screenshot +  |  | Executor  |  |   |
|  |  | Session Manager   |  | a11y tree     |  | Run/Retry |  |   |
|  |  +------------------+  +---------------+  +-----------+  |   |
|  +----------------------------+-----------------------------+    |
|                               |                                   |
|  +----------------------------v-----------------------------+    |
|  |              Recording & Assertion Layer                 |    |
|  |  +------------------+  +----------------+  +----------+  |    |
|  |  | SessionRecorder  |  | VideoRecorder  |  | Assertion|  |   |
|  |  | Action log ->    |  | ffmpeg -> mp4  |  | Engine   |  |   |
|  |  | exportToScript   |  | screenshot seq |  | Visual + |  |   |
|  |  | exportToVideo    |  | + audio (opt)  |  | Content  |  |   |
|  |  +------------------+  +----------------+  +----------+  |   |
|  +----------------------------+-----------------------------+    |
|                               |                                   |
|  +----------------------------v-----------------------------+    |
|  |              Integration Layer                          |    |
|  |  +----------------+  +----------------+  +-----------+  |    |
|  |  | E2E Generator  |  | Auth Handler  |  | CI Import |  |   |
|  |  | NL -> Test     |  | SSO + Cookies |  | Export     |  |   |
|  |  +----------------+  +----------------+  +-----------+  |   |
|  +----------------------------------------------------------+    |
+------------------------------------------------------------------+
```

### 4.2 Module Dependency Map

```
@ideia/browser-agent
  +-> @ideia/llm-integration (S31)       -> VisionParser, IntentParser
  +-> @ideia/agent-runtime                -> ActionPlanner, ActionExecutor
  +-> @ideia/event-bus                    -> Session events, metrics
  +-> @ideia/policy-engine                -> Security sandboxing
  +-> @ideia/memory-store                 -> Session persistence
  +-> @ideia/quality-gates                -> Test assertions
  +-> playwright                          -> Browser engine
  +-> playwright-video                    -> Video recording (optional)
  +-> axe-core                            -> Accessibility tree (optional)
```

### 4.3 Namespace Organization

```
@ideia/browser-agent/
  src/
    index.ts                    -> Public exports
    browser-agent.ts            -> BrowserAgent facade, types
    browser-controller.ts       -> Playwright + CDP controller
    session-recorder.ts         -> Action recording + replay
    vision-parser.ts            -> Screenshot + a11y tree analysis
    action-executor.ts          -> Action execution + retry
    action-planner.ts           -> NL -> action sequence
    assertion-engine.ts         -> Visual, content, URL assertions
    video-recorder.ts           -> ffmpeg video capture
    e2e-generator.ts            -> NL -> Test script generation
    auth-handler.ts             -> SSO, cookie, OAuth management
    profile-manager.ts          -> Browser profile persistence
    network-filter.ts           -> Domain whitelist, request intercept
    recovery-strategies.ts      -> Fallback selectors, retry logic
    types.ts                    -> All shared types
  __tests__/
    browser-agent.test.ts
    browser-controller.test.ts
    vision-parser.test.ts
    action-executor.test.ts
    action-planner.test.ts
    assertion-engine.test.ts
    session-recorder.test.ts
    auth-handler.test.ts
```

---

## 5. Browser Controller

### 5.1 Architecture

O BrowserController e o coracao do sistema — gerencia o ciclo de vida do navegador, contextos, paginas e a comunicacao via CDP.

```
+------------------------------------------------------------------+
|                      BrowserController                            |
|                                                                   |
|  +----------------------------------------------------------+    |
|  |                    Browser Pool                           |    |
|  |  +----------------+  +----------------+  +------------+  |    |
|  |  | BrowserContext |  | BrowserContext |  | Browser... |  |    |
|  |  | (profile A)    |  | (profile B)    |  | (profile N)|  |    |
|  |  +-------+--------+  +-------+--------+  +------------+  |    |
|  |          |                    |                            |    |
|  |          v                    v                            |    |
|  |  +--------------------------------------------------+    |    |
|  |  |              Playwright Browser                    |    |    |
|  |  |  Chromium | Firefox | WebKit | CDP Session        |    |    |
|  |  +--------------------------------------------------+    |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  +----------------------------------------------------------+    |
|  |                    Session Manager                       |    |
|  |  createSession()    -> BrowserContext + Page             |    |
|  |  getSession(id)     -> Active session                    |    |
|  |  closeSession(id)   -> Cleanup resources                 |    |
|  |  listSessions()     -> Active session list               |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  +----------------------------------------------------------+    |
|  |              Chrome DevTools Protocol Provider           |    |
|  |  CDPSession via Playwright CDPSession API                |    |
|  |  Input.dispatchMouseEvent, Input.dispatchKeyEvent,      |    |
|  |  DOM.getDocument, Accessibility.getFullAXTree,          |    |
|  |  Page.captureScreenshot, Page.startScreencast           |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  +----------------------------------------------------------+    |
|  |              Network Interceptor                        |    |
|  |  Request blocking, response modification,               |    |
|  |  cookie injection, header manipulation,                 |    |
|  |  domain whitelist, rate limiting                         |    |
|  +----------------------------------------------------------+    |
+------------------------------------------------------------------+
```

### 5.2 Browser Session Lifecycle

```
createSession()
  |
  +-> Launch browser (if not running)
  +-> Create BrowserContext with profile
  +-> Set viewport, locale, timezone
  +-> Inject cookies/auth state
  +-> Apply network filters
  +-> Create new Page
  +-> Return Session ID
  |
  v
[Actions execute on Page]
  |
  +-> navigate, click, type, scroll, extract, screenshot
  +-> Each action recorded in SessionRecorder
  +-> Each action verified (did navigation complete?)
  +-> On failure: VisionParser re-analyzes, retry with alternative
  |
  v
closeSession(id)
  |
  +-> Stop video recording
  +-> Export session trace
  +-> Close page
  +-> Close context
  +-> Return final Session object
```

### 5.3 Configuration Options

```typescript
interface BrowserControllerConfig {
  browserType: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  viewport: { width: number; height: number };
  locale?: string;
  timezone?: string;
  geolocation?: { latitude: number; longitude: number };
  userAgent?: string;
  proxy?: { server: string; username?: string; password?: string };
  args: string[];                  // Chrome launch arguments
  profileDir?: string;             // Persistent profile directory
  cookies?: Cookie[];              // Pre-injected cookies
  localStorage?: Record<string, string>;
  sessionStorage?: Record<string, string>;
  networkFilter?: NetworkFilterConfig;
  recording?: RecordingConfig;
  timeout: number;                 // Default action timeout
  retryCount: number;              // Action retry count
  cdpEnabled: boolean;             // Enable CDP for vision actions
}
```

### 5.4 CDP Integration

CDP (Chrome DevTools Protocol) e usado em complemento ao Playwright para acoes que exigem coordenadas exatas ou acesso ao accessibility tree:

| Acao | Playwright | CDP |
|------|------------|-----|
| navigate | `page.goto()` | NA |
| click(selector) | `page.click(selector)` | NA |
| click(x,y) | NA | `Input.dispatchMouseEvent` |
| type(text) | `page.fill(selector, text)` | `Input.dispatchKeyEvent` |
| scroll | `page.evaluate(scroll)` | `Input.dispatchMouseWheelEvent` |
| screenshot | `page.screenshot()` | `Page.captureScreenshot` |
| getAccessibilityTree | NA | `Accessibility.getFullAXTree` |
| getDOMSnapshot | NA | `DOM.getDocument` + `DOM.querySelector` |

A decisao de usar Playwright vs CDP e automatica:

```typescript
function shouldUseCDP(action: Action): boolean {
  // CDP e usado quando:
  // 1. A acao e por coordenada (vision-based)
  // 2. Precisa de accessibility tree
  // 3. O selector falhou e precisa de fallback
  return action.type === 'clickByCoordinate'
    || action.type === 'getAXTree'
    || action.metadata?.fallback === true;
}
```

### 5.5 Browser Profile Management

Profiles persistentes permitem sessoes reutilizaveis com dados de autenticacao:

```
~/.ideia/browser-profiles/
  default/              -> Profile padrao (anonimo)
  github-work/          -> Profile com sessao GitHub
  google-accounts/      -> Profile com contas Google logadas
  staging-env/          -> Profile para ambiente de staging
  custom-{uuid}/        -> Profiles temporarios criados via API
```

Cada profile contem:
- `Default/` — Chromium profile directory (cookies, local storage, extensions)
- `preferences.json` — Viewport, locale, timezone, args
- `network-filter.json` — Whitelist/blacklist de dominios
- `auth-state.json` — Metadados de autenticacao (provider, email, expiry)

---

## 6. Vision-Based UI Understanding

### 6.1 Architecture

```
+------------------------------------------------------------------+
|                      VisionParser                                 |
|                                                                   |
|  +----------------------------------------------------------+    |
|  |                  Input Sources                          |    |
|  |  +-----------+  +-----------+  +----------------------+  |    |
|  |  |Screenshot |  |Accessibili|  | DOM Snapshot         |  |    |
|  |  |(base64    |  |ty Tree    |  | (simplified HTML)    |  |    |
|  |  | PNG)      |  |(CDP)      |  |                       |  |    |
|  |  +-----+-----+  +-----+-----+  +----------+-----------+  |    |
|  |        |              |                    |               |    |
|  |        v              v                    v               |    |
|  |  +--------------------------------------------------+    |    |
|  |  |              Element Detection                    |    |    |
|  |  |  Bounding boxes from accessibility tree          |    |    |
|  |  |  Element roles, names, states, positions         |    |    |
|  |  |  Interactive elements: button, link, input, etc  |    |    |
|  |  +--------------------------------------------------+    |    |
|  |        |                                                    |    |
|  |        v                                                    |    |
|  |  +--------------------------------------------------+    |    |
|  |  |         LLM Vision Analysis (GPT-4o / Claude 4)   |    |    |
|  |  |  "What elements are on this screen?"              |    |    |
|  |  |  "Where is the login button?"                     |    |    |
|  |  |  "Is the error message visible?"                  |    |    |
|  |  |  Returns: element descriptions with coordinates   |    |    |
|  |  +--------------------------------------------------+    |    |
|  |        |                                                    |    |
|  |        v                                                    |    |
|  |  +--------------------------------------------------+    |    |
|  |  |           Action Recommendation                   |    |    |
|  |  |  "Click the 'Sign In' button at (450, 320)"      |    |    |
|  |  |  "Type 'user@example.com' into email field"      |    |    |
|  |  |  Confidence score for each recommendation        |    |    |
|  |  +--------------------------------------------------+    |    |
|  +----------------------------------------------------------+    |
+------------------------------------------------------------------+
```

### 6.2 Screenshot Capture Strategy

```typescript
interface ScreenshotStrategy {
  capture(options: ScreenshotOptions): Promise<ScreenshotResult>;
}

class FullPageScreenshot implements ScreenshotStrategy {
  // Captura a pagina inteira (scroll + stitch)
  // Usado para visao completa do estado da pagina
}

class ViewportScreenshot implements ScreenshotStrategy {
  // Captura apenas o viewport atual
  // Usado para decisoes de clique (mais rapido)
}

class ElementScreenshot implements ScreenshotStrategy {
  // Captura apenas um elemento especifico
  // Usado para analise focada (ex: modal, toast)
}
```

### 6.3 Accessibility Tree Parsing

A accessibility tree do Chrome CDP e a fonte mais confiavel para entender a estrutura da UI:

```typescript
interface AXNode {
  nodeId: number;
  role: AXRole;         // button, link, textbox, checkbox, etc
  name: string;          // Texto do elemento
  value?: string;
  description?: string;
  states: AXState[];     // focused, disabled, checked, expanded, etc
  bounds: {              // Coordenadas do bounding box
    x: number;
    y: number;
    width: number;
    height: number;
  };
  children: AXNode[];
}

// Roles mais comuns mapeadas para acoes:
const ROLE_TO_ACTION: Record<string, ActionType> = {
  button: 'click',
  link: 'click',
  menuitem: 'click',
  tab: 'click',
  checkbox: 'click',
  radio: 'click',
  switch: 'click',
  textbox: 'type',
  combobox: 'type',
  searchbox: 'type',
  slider: 'scroll',
  scrollbar: 'scroll',
};
```

### 6.4 DOM Snapshot Analysis

Quando o accessibility tree nao e suficiente (ex: canvas, WebGL, custom components), o DOM snapshot entra como fallback:

```typescript
interface DOMSnapshot {
  html: string;           // HTML simplificado (sem scripts, sem styles)
  interactiveElements: InteractiveElement[];
  textContent: string;    // Texto visivel na pagina
  formFields: FormField[];
  links: Link[];
  images: Image[];
}

interface InteractiveElement {
  tagName: string;
  selector: string;       // CSS selector unico
  text: string;
  rect: DOMRect;
  attributes: Record<string, string>;
  isVisible: boolean;
  isEnabled: boolean;
}
```

### 6.5 LLM Vision Integration

```typescript
interface VisionAnalysisRequest {
  screenshot: string;          // base64 PNG
  accessibilityTree?: AXNode[];
  domSnapshot?: DOMSnapshot;
  instruction: string;         // "Find the login button"
  previousActions?: Action[];  // Context for state tracking
}

interface VisionAnalysisResponse {
  elements: DetectedElement[];
  interpretation: string;      // "The page shows a login form..."
  error?: string;               // "No login button found"
  confidence: number;           // 0-1
}

interface DetectedElement {
  description: string;          // "Sign In button"
  role: string;                 // "button"
  bounds: { x: number; y: number; width: number; height: number };
  selector?: string;            // CSS selector (if determinable)
  confidence: number;
  suggestedAction: ActionType;
}
```

### 6.6 Selector Resolution Strategy

A resolucao de selectors segue uma hierarquia de fallback:

```
1. CSS selector (mais preciso) -> page.click('#login-btn')
   |
   fallback:
2. Text selector -> page.getByText('Sign In').click()
   |
   fallback:
3. Role selector -> page.getByRole('button', { name: 'Sign In' }).click()
   |
   fallback:
4. Accessibility tree -> AXNode with matching name/role
   |
   fallback:
5. Vision LLM -> screenshot + "click the sign in button" -> (x,y)
   |
   fallback:
6. Coordinate click via CDP -> Input.dispatchMouseEvent({ x, y })
```

---

## 7. Action System

### 7.1 Action Types

```typescript
type ActionType =
  | 'navigate'
  | 'click'
  | 'clickByCoordinate'
  | 'type'
  | 'select'
  | 'scroll'
  | 'hover'
  | 'wait'
  | 'assert'
  | 'extract'
  | 'screenshot'
  | 'executeScript'
  | 'setCookie'
  | 'clearCookies'
  | 'setLocalStorage'
  | 'getAccessibilityTree';

interface BaseAction {
  id: string;
  type: ActionType;
  description: string;       // Human-readable description
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface NavigateAction extends BaseAction {
  type: 'navigate';
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}

interface ClickAction extends BaseAction {
  type: 'click';
  selector?: string;        // CSS/text/role selector
  coordinate?: { x: number; y: number };  // Vision-based click
  modifiers?: { ctrl?: boolean; shift?: boolean; meta?: boolean };
  force?: boolean;
  noWaitAfter?: boolean;
}

interface TypeAction extends BaseAction {
  type: 'type';
  selector?: string;
  text: string;
  delay?: number;           // ms between keystrokes (human-like)
  clearFirst?: boolean;     // Clear field before typing
  pressEnter?: boolean;
}

interface ScrollAction extends BaseAction {
  type: 'scroll';
  direction: 'up' | 'down' | 'left' | 'right' | 'to';
  amount?: number;          // Pixels to scroll
  selector?: string;         // Element to scroll within
  targetPosition?: 'top' | 'bottom' | 'center';
}

interface WaitAction extends BaseAction {
  type: 'wait';
  condition: 'timeout' | 'selector' | 'url' | 'networkIdle' | 'function';
  value?: string | number;
  timeout?: number;
}

interface AssertAction extends BaseAction {
  type: 'assert';
  assertionType: 'url' | 'title' | 'text' | 'visible' | 'hidden'
    | 'count' | 'value' | 'screenshot' | 'console' | 'network';
  expected: unknown;
  actual?: unknown;
  selector?: string;
  timeout?: number;
}

interface ExtractAction extends BaseAction {
  type: 'extract';
  selector: string;
  property?: 'textContent' | 'innerHTML' | 'value' | 'href' | 'src' | 'attribute';
  attributeName?: string;
}

interface ScreenshotAction extends BaseAction {
  type: 'screenshot';
  fullPage?: boolean;
  selector?: string;        // Element-specific screenshot
  quality?: number;          // JPEG quality 0-100
}
```

### 7.2 Action Execution Pipeline

```
Action -> PreCondition Check -> Execute -> Verify -> Record

PreCondition Check:
  - Element exists? (wait for selector)
  - Element is visible?
  - Element is enabled?
  - Page is in correct state?
  -> Fail with specific error code

Execute:
  - Dispatch action via Playwright or CDP
  - Measure execution time
  - Capture pre/post screenshots (if recording)

Verify:
  - Did navigation complete? (URL check + wait)
  - Did click land? (element state change)
  - Did type fill? (value check)
  - Did scroll happen? (scroll position check)
  -> Pass: continue
  -> Fail: trigger recovery strategy

Record:
  - Store action + result + duration
  - Capture post-action screenshot
  - Update session state
  - Emit event to event bus
```

### 7.3 Action Recovery Strategies

```typescript
interface RecoveryStrategy {
  name: string;
  maxRetries: number;
  shouldRetry(action: Action, error: Error): boolean;
  getAlternative(action: Action): Action | null;
}

class SelectorFallbackStrategy implements RecoveryStrategy {
  name = 'selector-fallback';
  maxRetries = 3;

  shouldRetry(action: Action, _error: Error): boolean {
    return action.type === 'click' || action.type === 'type';
  }

  getAlternative(action: Action): Action | null {
    if (action.type === 'click' && action.selector) {
      // Try text selector -> role selector -> visibility-based
      return {
        ...action,
        selector: this.nextSelector(action.selector),
        metadata: { ...action.metadata, fallback: true },
      };
    }
    return null;
  }

  private nextSelector(current: string): string {
    const selectors = this.generateSelectorChain(current);
    return selectors[this.currentIndex++] ?? current;
  }

  private generateSelectorChain(selector: string): string[] {
    // Gera alternativas: text=, role=, aria-label, data-testid, nth, etc
    return [
      `text=${selector}`,
      `role=button[name=/${selector}/i]`,
      `[data-testid="${selector}"]`,
      selector,
    ];
  }
}

class VisionFallbackStrategy implements RecoveryStrategy {
  name = 'vision-fallback';
  maxRetries = 2;

  async getAlternative(action: Action, page: Page): Promise<Action | null> {
    // 1. Take screenshot
    const screenshot = await page.screenshot();

    // 2. Get accessibility tree
    const axTree = await getAccessibilityTree(page);

    // 3. Ask LLM: "What element should I interact with to achieve this?"
    const visionResult = await visionParser.analyze({
      screenshot,
      accessibilityTree: axTree,
      instruction: `Find element for action: ${action.type} - ${action.description}`,
    });

    if (visionResult.confidence > 0.7 && visionResult.elements.length > 0) {
      return {
        ...action,
        selector: visionResult.elements[0].selector,
        coordinate: {
          x: visionResult.elements[0].bounds.x,
          y: visionResult.elements[0].bounds.y,
        },
        metadata: { ...action.metadata, visionBased: true },
      };
    }

    return null;
  }
}
```

### 7.4 Action Planning from Natural Language

```typescript
interface ActionPlan {
  id: string;
  description: string;       // Original NL instruction
  actions: Action[];          // Generated sequence
  parallelGroups?: string[][]; // Actions that can run in parallel
  verification: AssertAction[]; // Assertions to verify plan success
  estimatedDuration: number;  // Estimated execution time
  confidence: number;          // 0-1
}

class ActionPlanner {
  async planFromNL(
    instruction: string,
    context: PlanningContext
  ): Promise<ActionPlan> {
    // 1. Parse intent from NL
    const intent = await this.parseIntent(instruction);

    // 2. Get current page state
    const state = await this.capturePageState(context);

    // 3. Generate action sequence
    const actions = await this.generateActions(intent, state);

    // 4. Add verification assertions
    const verification = await this.generateAssertions(intent, actions);

    // 5. Optimize plan (parallelize where possible)
    const optimized = this.optimize(actions, verification);

    return {
      id: generateId(),
      description: instruction,
      actions: optimized.actions,
      parallelGroups: optimized.parallelGroups,
      verification,
      estimatedDuration: this.estimateDuration(optimized.actions),
      confidence: this.calculateConfidence(intent, state),
    };
  }

  private async parseIntent(nl: string): Promise<Intent> {
    // "log into github and create a PR" ->
    // { type: 'multi-step', steps: [{ type: 'login', provider: 'github' }, { type: 'create-pr' }] }
    return llm.parse(nl);
  }

  private async generateActions(
    intent: Intent,
    state: PageState
  ): Promise<Action[]> {
    // Login intent ->
    // 1. navigate('https://github.com/login')
    // 2. type('#login_field', 'username')
    // 3. type('#password', '********')
    // 4. click('[name="commit"]')
    // 5. wait('selector', '.dashboard')
    return llm.generateActions(intent, state);
  }
}
```

---

## 8. Recording & Replay

### 8.1 Recording Architecture

```
+------------------------------------------------------------------+
|                      Recording Layer                              |
|                                                                   |
|  +----------------------------------------------------------+    |
|  |              Session Recorder (in-memory)                 |    |
|  |  +----------------+  +----------------+  +------------+  |    |
|  |  | Action Log     |  | State Snapshots|  | Metrics    |  |    |
|  |  | (ordered list) |  | (DOM, URL,     |  | (duration, |  |    |
|  |  |                |  |  title, scroll)|  |  memory,   |  |    |
|  |  |                |  |                |  |  errors)   |  |    |
|  |  +----------------+  +----------------+  +------------+  |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  +----------------------------------------------------------+    |
|  |              Video Recorder (ffmpeg)                     |    |
|  |  +----------------+  +----------------+  +------------+  |    |
|  |  | Screenshot     |  | Frame Buffer   |  | ffmpeg     |  |    |
|  |  | Capture        |  | (fifo queue)   |  | Encoder    |  |    |
|  |  | (every 100ms)  |  | (30 frames)    |  | (h264 mp4) |  |    |
|  |  +----------------+  +----------------+  +------------+  |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  +----------------------------------------------------------+    |
|  |              Trace Recorder (Playwright)                  |    |
|  |  Playwright Trace Viewer format                           |    |
|  |  Includes: network requests, console logs,               |    |
|  |  source maps, snapshots before/after each action         |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  +----------------------------------------------------------+    |
|  |              Export Formats                              |    |
|  |  +----------+  +---------+  +---------+  +-----------+  |    |
|  |  | Script   |  | JSON    |  | HTML    |  | Playwright|  |    |
|  |  | (.ts)    |  | (.json) |  | Report  |  | Trace     |  |    |
|  |  +----------+  +---------+  +---------+  +-----------+  |    |
|  +----------------------------------------------------------+    |
+------------------------------------------------------------------+
```

### 8.2 Video Recording

```typescript
interface VideoRecorderConfig {
  fps: number;              // Frames per second (default: 10)
  quality: number;          // JPEG quality 0-100 (default: 80)
  maxDuration: number;      // Max recording duration in ms
  outputDir: string;        // Output directory for videos
  ffmpegPath?: string;      // Custom ffmpeg path
}

class VideoRecorder {
  private frames: Buffer[] = [];
  private recording = false;
  private frameInterval: NodeJS.Timeout | null = null;

  async start(page: Page, config: VideoRecorderConfig): Promise<void> {
    this.recording = true;
    this.frames = [];

    // Capture frames at regular interval
    this.frameInterval = setInterval(async () => {
      if (!this.recording) return;
      try {
        const screenshot = await page.screenshot({
          type: 'jpeg',
          quality: config.quality,
        });
        this.frames.push(screenshot);
      } catch {
        // Page might be closed
      }
    }, 1000 / config.fps);
  }

  async stop(): Promise<Buffer> {
    this.recording = false;
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
    }

    // Encode frames to video using ffmpeg
    return this.encodeVideo(this.frames);
  }

  private async encodeVideo(frames: Buffer[]): Promise<Buffer> {
    // Write frames to temp dir
    // Spawn ffmpeg: ffmpeg -framerate 10 -i frame-%04d.jpg -c:v libx264 -pix_fmt yuv420p output.mp4
    // Return video buffer
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'ideia-video-'));
    try {
      frames.forEach((frame, i) => {
        writeFileSync(join(tempDir, `frame-${String(i).padStart(4, '0')}.jpg`), frame);
      });

      const outputPath = join(tempDir, 'output.mp4');
      await execa('ffmpeg', [
        '-framerate', '10',
        '-i', join(tempDir, 'frame-%04d.jpg'),
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-y',
        outputPath,
      ]);

      return readFileSync(outputPath);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}
```

### 8.3 Screenshot Comparison (Visual Regression)

```typescript
interface ComparisonResult {
  match: boolean;
  diffPercentage: number;
  diffImage?: Buffer;
  mismatchedPixels: number;
  totalPixels: number;
}

class VisualAssertionEngine {
  async compare(
    baseline: Buffer,
    current: Buffer,
    options?: ComparisonOptions
  ): Promise<ComparisonResult> {
    // Use pixelmatch for fast comparison
    const { default: pixelmatch } = await import('pixelmatch');
    const { PNG } = await import('pngjs');

    const img1 = PNG.sync.read(baseline);
    const img2 = PNG.sync.read(current);

    const { width, height } = img1;
    const diff = new PNG({ width, height });
    const diffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, {
      threshold: options?.threshold ?? 0.1,
      alpha: options?.alpha ?? 0.3,
    });

    return {
      match: diffPixels === 0,
      diffPercentage: (diffPixels / (width * height)) * 100,
      diffImage: diffPixels > 0 ? PNG.sync.write(diff) : undefined,
      mismatchedPixels: diffPixels,
      totalPixels: width * height,
    };
  }

  async assertVisualMatch(
    baselinePath: string,
    current: Buffer,
    options?: ComparisonOptions
  ): Promise<void> {
    const baseline = await readFile(baselinePath);
    const result = await this.compare(baseline, current, options);

    if (!result.match) {
      throw new VisualAssertionError(
        `Visual mismatch: ${result.diffPercentage.toFixed(2)}% different pixels`,
        result
      );
    }
  }
}
```

### 8.4 Session Export Formats

```typescript
interface SessionExport {
  type: 'script' | 'json' | 'html-report' | 'playwright-trace';
  content: string | Buffer;
  mimeType: string;
  extension: string;
}

class SessionExporter {
  exportToPlaywrightScript(session: Session): string {
    // Generates standalone Playwright test script
    return `import { test, expect } from '@playwright/test';

test('${session.id}', async ({ page }) => {
  ${session.actions.map(a => this.actionToCode(a)).join('\n  ')}
});`;
  }

  exportToJSON(session: Session): string {
    return JSON.stringify({
      id: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      url: session.startUrl,
      actions: session.actions.map(a => ({
        type: a.action.type,
        selector: a.action.selector,
        text: a.action.text,
        url: a.action.url,
        timestamp: a.action.timestamp,
        duration: a.duration,
        result: a.result,
        error: a.error,
      })),
      metrics: session.metrics,
    }, null, 2);
  }

  exportToHTMLReport(session: Session): string {
    // Self-contained HTML report with:
    // - Navigation timeline
    // - Action list with screenshots
    // - Error highlights
    // - Performance metrics
    // - Video player (if video exists)
    return generateHTMLReport(session);
  }
}
```

---

## 9. E2E Testing Integration

### 9.1 Test Generation from Natural Language

```
NL Input: "Test the login flow: navigate to /login, enter credentials,
           verify redirect to dashboard, check user name is displayed"

  |
  v
[ActionPlanner.planFromNL()]
  |
  v
Generated Test Plan:
  1. navigate('https://app.example.com/login')
  2. type('#email', 'test@example.com')
  3. type('#password', 'password123')
  4. click('[data-testid="login-submit"]')
  5. assert('url', 'https://app.example.com/dashboard')
  6. assert('text', '.user-name', 'Test User')
  7. screenshot('login-success.png')

  |
  v
[E2EGenerator.generate()]
  |
  v
Generated Playwright Test:
```

```typescript
class E2EGenerator {
  async generateFromNL(
    description: string,
    options?: E2EOptions
  ): Promise<E2ETest> {
    // 1. Parse NL into action plan
    const plan = await this.planner.planFromNL(description, {
      state: { url: '', title: '' },
    });

    // 2. Execute plan (optional, for validation)
    if (options?.dryRun !== true) {
      const result = await this.executor.executePlan(plan);
      if (result.failed && options?.autoFix) {
        plan.actions = await this.fixFailures(plan, result);
      }
    }

    // 3. Generate test code
    const code = this.generateTestCode(plan, options);

    // 4. Generate assertions
    const assertions = this.generateAssertions(plan);

    return {
      name: this.generateTestName(description),
      description,
      code,
      actions: plan.actions,
      assertions,
      tags: options?.tags ?? [],
    };
  }

  private generateTestCode(plan: ActionPlan, options?: E2EOptions): string {
    const testName = this.generateTestName(plan.description);

    let code = `import { test, expect } from '@playwright/test';\n\n`;
    code += `test.describe('${testName}', () => {\n`;
    code += `  test('${plan.description}', async ({ page }) => {\n`;

    for (const action of plan.actions) {
      code += `    ${this.actionToTestCode(action)}\n`;
    }

    for (const assertion of plan.verification) {
      code += `    ${this.assertionToTestCode(assertion)}\n`;
    }

    code += `  });\n`;
    code += `});\n`;

    return code;
  }

  private actionToTestCode(action: Action): string {
    switch (action.type) {
      case 'navigate':
        return `await page.goto('${action.url}', { waitUntil: '${action.waitUntil ?? 'networkidle'}' });`;
      case 'click':
        if (action.selector) {
          return `await page.click('${action.selector}');`;
        }
        if (action.coordinate) {
          return `await page.mouse.click(${action.coordinate.x}, ${action.coordinate.y});`;
        }
        return '';
      case 'type':
        return `await page.fill('${action.selector}', '${action.text}');`;
      case 'scroll':
        if (action.targetPosition === 'bottom') {
          return 'await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));';
        }
        return `await page.evaluate(() => window.scrollBy(0, ${action.amount ?? 300}));`;
      case 'wait':
        if (action.selector) {
          return `await page.waitForSelector('${action.selector}', { timeout: ${action.timeout ?? 5000} });`;
        }
        return `await page.waitForTimeout(${action.value as number ?? 1000});`;
      case 'screenshot':
        return `await page.screenshot({ path: '${action.selector ?? 'screenshot'}.png' });`;
      default:
        return '';
    }
  }
}
```

### 9.2 Assertion Engine

```typescript
class AssertionEngine {
  async assert(action: AssertAction, page: Page): Promise<AssertionResult> {
    switch (action.assertionType) {
      case 'url':
        return this.assertUrl(action.expected as string, page);
      case 'title':
        return this.assertTitle(action.expected as string, page);
      case 'text':
        return this.assertText(action.selector!, action.expected as string, page);
      case 'visible':
        return this.assertVisible(action.selector!, page);
      case 'hidden':
        return this.assertHidden(action.selector!, page);
      case 'count':
        return this.assertCount(action.selector!, action.expected as number, page);
      case 'value':
        return this.assertValue(action.selector!, action.expected as string, page);
      case 'screenshot':
        return this.assertScreenshot(action.expected as string, page);
      case 'console':
        return this.assertConsole(action.expected as string, page);
      case 'network':
        return this.assertNetwork(action.expected as string, page);
      default:
        throw new Error(`Unknown assertion type: ${action.assertionType}`);
    }
  }

  private async assertUrl(expected: string, page: Page): Promise<AssertionResult> {
    const currentUrl = page.url();
    const match = currentUrl.includes(expected) || new RegExp(expected).test(currentUrl);
    return {
      passed: match,
      expected,
      actual: currentUrl,
      message: match
        ? `URL matches: ${currentUrl}`
        : `URL mismatch: expected to include "${expected}", got "${currentUrl}"`,
    };
  }

  private async assertText(
    selector: string,
    expected: string,
    page: Page
  ): Promise<AssertionResult> {
    const element = page.locator(selector);
    const text = await element.textContent();
    const match = text?.includes(expected) ?? false;
    return {
      passed: match,
      expected,
      actual: text ?? '',
      message: match
        ? `Text matches: "${text}"`
        : `Text mismatch: expected "${expected}", got "${text}"`,
    };
  }

  private async assertScreenshot(
    baselinePath: string,
    page: Page
  ): Promise<AssertionResult> {
    const screenshot = await page.screenshot();
    const visualEngine = new VisualAssertionEngine();
    const result = await visualEngine.compare(
      await readFile(baselinePath),
      screenshot
    );
    return {
      passed: result.match,
      expected: `Visual match (< ${result.diffPercentage.toFixed(2)}% diff)`,
      actual: `${result.diffPercentage.toFixed(2)}% diff`,
      message: result.match
        ? 'Screenshots match'
        : `Screenshots differ by ${result.diffPercentage.toFixed(2)}%`,
      diffImage: result.diffImage?.toString('base64'),
    };
  }
}
```

### 9.3 Flaky Test Detection

```typescript
interface FlakyDetectionConfig {
  minRuns: number;             // Minimum runs to detect flakiness (default: 5)
  failureThreshold: number;    // % failure rate to flag as flaky (default: 30%)
  retryOnFlaky: boolean;       // Auto-retry flaky tests (default: true)
}

class FlakyDetector {
  private testHistory: Map<string, TestRun[]> = new Map();

  recordRun(testName: string, result: TestResult): void {
    if (!this.testHistory.has(testName)) {
      this.testHistory.set(testName, []);
    }
    this.testHistory.get(testName)!.push({
      passed: result.passed,
      duration: result.duration,
      timestamp: Date.now(),
    });
  }

  isFlaky(testName: string, config?: FlakyDetectionConfig): boolean {
    const history = this.testHistory.get(testName);
    if (!history || history.length < (config?.minRuns ?? 5)) {
      return false; // Not enough data
    }

    const failures = history.filter(r => !r.passed).length;
    const failRate = (failures / history.length) * 100;

    return failRate > (config?.failureThreshold ?? 30);
  }

  getFlakyTests(config?: FlakyDetectionConfig): string[] {
    const flaky: string[] = [];
    for (const [name] of this.testHistory) {
      if (this.isFlaky(name, config)) {
        flaky.push(name);
      }
    }
    return flaky;
  }

  getRecommendedRetries(testName: string): number {
    const history = this.testHistory.get(testName);
    if (!history) return 0;

    const failures = history.filter(r => !r.passed).length;
    const failRate = failures / history.length;

    // Adaptive retry: more flaky = more retries
    if (failRate > 0.3) return 3;
    if (failRate > 0.1) return 2;
    if (failRate > 0.05) return 1;
    return 0;
  }
}
```

---

## 10. SSO/Authentication Handling

### 10.1 Auth Strategies

```typescript
type AuthStrategy =
  | 'cookie-injection'       // Inject pre-exported cookies
  | 'local-storage-injection' // Inject pre-exported localStorage
  | 'oauth-flow'              // Automate OAuth login flow
  | 'http-auth'               // HTTP Basic/Digest auth
  | 'saml-flow'               // SAML SSO automation
  | 'mfa-manual'              // User completes MFA manually
  | 'mfa-totp'                // TOTP code generation
  | 'mfa-backup-codes';       // Use backup codes for MFA
```

### 10.2 Auth Profile System

```typescript
interface AuthProfile {
  id: string;
  name: string;
  provider: 'github' | 'gitlab' | 'google' | 'azure-ad' | 'okta' | 'generic';
  strategy: AuthStrategy;
  credentials?: {
    username?: string;
    password?: string;
    totpSecret?: string;      // Encrypted TOTP seed
    backupCodes?: string[];   // For MFA fallback
    apiToken?: string;
  };
  cookies?: Cookie[];          // Pre-exported session cookies
  localStorage?: Record<string, string>;
  sessionStorage?: Record<string, string>;
  expiresAt?: number;          // Auth state expiry
  metadata?: Record<string, string>;
}

class AuthHandler {
  private profiles: Map<string, AuthProfile> = new Map();

  async createProfile(config: AuthProfileConfig): Promise<AuthProfile> {
    if (config.strategy === 'oauth-flow') {
      return this.createOAuthProfile(config);
    }
    if (config.strategy === 'cookie-injection') {
      return this.createCookieProfile(config);
    }
    return this.createManualProfile(config);
  }

  async applyAuth(
    context: BrowserContext,
    profileId: string
  ): Promise<void> {
    const profile = this.profiles.get(profileId);
    if (!profile) throw new Error(`Profile not found: ${profileId}`);

    // Add cookies
    if (profile.cookies && profile.cookies.length > 0) {
      await context.addCookies(profile.cookies);
    }

    // Set localStorage
    if (profile.localStorage) {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.evaluate((data) => {
        for (const [key, value] of Object.entries(data)) {
          localStorage.setItem(key, value);
        }
      }, profile.localStorage);
      await page.close();
    }

    // Set HTTP auth
    if (profile.credentials?.username) {
      await context.setHTTPCredentials({
        username: profile.credentials.username,
        password: profile.credentials.password ?? '',
      });
    }
  }

  async automateOAuthFlow(
    page: Page,
    provider: 'github' | 'google' | 'azure-ad',
    credentials: { username: string; password: string }
  ): Promise<void> {
    // Provider-specific OAuth flows
    switch (provider) {
      case 'github':
        await this.githubOAuth(page, credentials);
        break;
      case 'google':
        await this.googleOAuth(page, credentials);
        break;
      case 'azure-ad':
        await this.azureADOAuth(page, credentials);
        break;
    }
  }

  async handleMFA(
    page: Page,
    strategy: 'totp' | 'backup-codes' | 'manual',
    secret?: string
  ): Promise<void> {
    switch (strategy) {
      case 'totp': {
        // Generate TOTP code from secret
        const { authenticator } = await import('otplib');
        const token = authenticator.generate(secret!);
        // Fill TOTP input
        const input = page.locator('input[type="text"]:near(:text("code"))');
        await input.fill(token);
        await page.keyboard.press('Enter');
        break;
      }
      case 'backup-codes': {
        // Use backup code flow
        // Find input field for backup code
        await page.getByText(/use a backup code|enter a backup/i).click();
        await page.waitForTimeout(500);
        break;
      }
      case 'manual': {
        // Signal to user that manual MFA is needed
        // Used when TOTP/backup codes unavailable
        await this.notifyUser('MFA code required. Check your authenticator app.');
        break;
      }
    }
  }

  private async githubOAuth(
    page: Page,
    creds: { username: string; password: string }
  ): Promise<void> {
    await page.fill('input[name="login"]', creds.username);
    await page.fill('input[name="password"]', creds.password);
    await page.click('input[type="submit"]');

    // Handle 2FA if prompted
    const totpInput = page.locator('input#otp');
    if (await totpInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // If we have TOTP secret, generate code
      // Otherwise, delegate to MFA handler
      await this.notifyUser('GitHub 2FA required');
    }
  }

  async exportAuthState(
    context: BrowserContext,
    profileId: string
  ): Promise<void> {
    const cookies = await context.cookies();
    const profile = this.profiles.get(profileId);
    if (profile) {
      profile.cookies = cookies;
      profile.expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    }
  }
}
```

### 10.3 Session Persistence

```typescript
class SessionPersistence {
  private storageDir: string;

  constructor(baseDir?: string) {
    this.storageDir = baseDir ?? join(
      os.homedir(),
      '.ideia',
      'browser-profiles'
    );
  }

  async saveAuthState(
    profileId: string,
    context: BrowserContext
  ): Promise<void> {
    const statePath = join(
      this.storageDir,
      profileId,
      'auth-state.json'
    );

    const state = {
      cookies: await context.cookies(),
      origins: await context.storageState().then(s => s.origins),
      timestamp: Date.now(),
    };

    await mkdir(dirname(statePath), { recursive: true });
    await writeFile(statePath, JSON.stringify(state, null, 2));
  }

  async loadAuthState(
    context: BrowserContext,
    profileId: string
  ): Promise<boolean> {
    const statePath = join(
      this.storageDir,
      profileId,
      'auth-state.json'
    );

    try {
      const data = await readFile(statePath, 'utf-8');
      const state = JSON.parse(data);

      // Check expiry (default: 7 days)
      if (Date.now() - state.timestamp > 7 * 24 * 60 * 60 * 1000) {
        return false; // Expired
      }

      await context.addCookies(state.cookies);
      return true;
    } catch {
      return false; // No saved state
    }
  }
}
```

---

## 11. Security & Isolation

### 11.1 Browser Sandboxing

```typescript
interface SandboxConfig {
  enabled: boolean;
  type: 'namespace' | 'process' | 'container';
  networkFilter: NetworkFilterConfig;
  downloadRestrictions: DownloadRestrictions;
  resourceLimits: ResourceLimits;
  sessionTimeout: number;       // Max session duration (ms)
  maxConcurrentSessions: number;
  allowedOrigins: string[];     // Domains the agent can access
  blockedOrigins: string[];     // Domains the agent cannot access
  allowedPermissions: string[]; // clipboard, notifications, etc
}

interface NetworkFilterConfig {
  blockAds: boolean;
  blockTrackers: boolean;
  allowedDomains: string[];
  blockedDomains: string[];
  allowedContentTypes: string[];
  maxRequestsPerSession: number;
  requestTimeout: number;
}

interface ResourceLimits {
  maxMemoryMB: number;       // Max memory per browser context
  maxCPUPercent: number;     // Max CPU utilization
  maxSessionDuration: number; // Max session time in ms
}
```

### 11.2 Network Interception

```typescript
class NetworkFilter {
  private config: NetworkFilterConfig;
  private requestCount = 0;

  async intercept(page: Page): Promise<void> {
    await page.route('**/*', (route) => {
      // Check request count limit
      if (this.requestCount >= this.config.maxRequestsPerSession) {
        route.abort('blockedbyclient');
        return;
      }

      const url = route.request().url();

      // Check domain whitelist
      if (!this.isDomainAllowed(url)) {
        route.abort('blockedbyclient');
        return;
      }

      // Check domain blacklist
      if (this.isDomainBlocked(url)) {
        route.abort('blockedbyclient');
        return;
      }

      // Check content type
      const contentType = route.request().resourceType();
      if (!this.isContentTypeAllowed(contentType)) {
        route.abort('blockedbyclient');
        return;
      }

      this.requestCount++;
      route.continue();
    });
  }

  private isDomainAllowed(url: string): boolean {
    if (this.config.allowedDomains.length === 0) return true; // Allow all
    const parsed = new URL(url);
    return this.config.allowedDomains.some(d =>
      parsed.hostname === d || parsed.hostname.endsWith('.' + d)
    );
  }
}
```

### 11.3 Secure Cookie Management

```typescript
class SecureCookieManager {
  private encryptionKey: Buffer;

  constructor(key?: string) {
    this.encryptionKey = key
      ? Buffer.from(key, 'hex')
      : crypto.randomBytes(32);
  }

  encryptCookies(cookies: Cookie[]): string {
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      crypto.randomBytes(16)
    );
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(cookies), 'utf-8'),
      cipher.final(),
    ]);
    return encrypted.toString('base64');
  }

  decryptCookies(encrypted: string): Cookie[] {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      crypto.randomBytes(16)
    );
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString('utf-8'));
  }

  async injectSecureCookies(
    context: BrowserContext,
    cookies: Cookie[]
  ): Promise<void> {
    // Only inject cookies for allowed domains
    const safeCookies = cookies.filter(c =>
      !c.domain?.includes('bank') &&
      !c.domain?.includes('paypal') &&
      c.secure !== false
    );
    await context.addCookies(safeCookies);
  }
}
```

### 11.4 Session Lifecycle & Limits

```typescript
class SessionManager {
  private activeSessions: Map<string, ManagedSession> = new Map();
  private maxConcurrent: number;
  private defaultTimeout: number;

  constructor(config: { maxConcurrent: number; defaultTimeout: number }) {
    this.maxConcurrent = config.maxConcurrent;
    this.defaultTimeout = config.defaultTimeout;
  }

  async createSession(config: SessionConfig): Promise<string> {
    if (this.activeSessions.size >= this.maxConcurrent) {
      throw new Error(
        `Max concurrent sessions reached (${this.maxConcurrent}). ` +
        `Close an existing session or increase limit.`
      );
    }

    const id = crypto.randomUUID();
    const timeout = config.timeout ?? this.defaultTimeout;

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort('Session timeout');
      this.forceClose(id);
    }, timeout);

    const session: ManagedSession = {
      id,
      config,
      controller,
      timeoutHandle,
      createdAt: Date.now(),
    };

    this.activeSessions.set(id, session);
    return id;
  }

  async closeSession(id: string): Promise<SessionReport> {
    const session = this.activeSessions.get(id);
    if (!session) throw new Error(`Session not found: ${id}`);

    clearTimeout(session.timeoutHandle);
    session.controller.abort('Session closed by user');
    this.activeSessions.delete(id);

    return this.generateReport(session);
  }

  private forceClose(id: string): void {
    const session = this.activeSessions.get(id);
    if (session) {
      this.activeSessions.delete(id);
      // Emergency cleanup
    }
  }
}
```

---

## 12. Code Examples

### 12.1 BrowserController with Playwright

```typescript
import { Browser, BrowserContext, Page, chromium, firefox, webkit } from 'playwright';

interface BrowserControllerConfig {
  browserType: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  viewport: { width: number; height: number };
  timeout: number;
  userDataDir?: string;
  args?: string[];
  proxy?: { server: string; username?: string; password?: string };
}

export class BrowserController {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: BrowserControllerConfig;

  constructor(config: Partial<BrowserControllerConfig> = {}) {
    this.config = {
      browserType: 'chromium',
      headless: true,
      viewport: { width: 1280, height: 720 },
      timeout: 30000,
      ...config,
    };
  }

  async launch(): Promise<void> {
    const browserLauncher = this.getBrowserLauncher();
    this.browser = await browserLauncher.launch({
      headless: this.config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        ...(this.config.args ?? []),
      ],
      proxy: this.config.proxy,
    });
  }

  async createSession(userDataDir?: string): Promise<Page> {
    if (!this.browser) await this.launch();

    this.context = await this.browser!.newContext({
      viewport: this.config.viewport,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: [],
    });

    if (userDataDir) {
      await this.context.addInitScript(() => {
        // Evade headless detection
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });
    }

    this.context.setDefaultTimeout(this.config.timeout);
    this.page = await this.context.newPage();
    return this.page;
  }

  async closeSession(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
    }
  }

  async close(): Promise<void> {
    await this.closeSession();
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  getPage(): Page {
    if (!this.page) throw new Error('No active session. Call createSession() first.');
    return this.page;
  }

  getCDPSession(): Promise<import('playwright').CDPSession> {
    const page = this.getPage();
    return page.context().newCDPSession(page);
  }

  private getBrowserLauncher() {
    switch (this.config.browserType) {
      case 'firefox': return firefox;
      case 'webkit': return webkit;
      default: return chromium;
    }
  }
}
```

### 12.2 Action Executor

```typescript
import { Page } from 'playwright';

interface ActionResult {
  actionId: string;
  passed: boolean;
  duration: number;
  result?: unknown;
  error?: string;
  screenshot?: string;
}

export class ActionExecutor {
  private page: Page;
  private visionParser?: VisionParser;
  private recorder: SessionRecorder;
  private recoveryStrategies: RecoveryStrategy[];

  constructor(
    page: Page,
    options?: {
      visionParser?: VisionParser;
      recorder?: SessionRecorder;
      strategies?: RecoveryStrategy[];
    }
  ) {
    this.page = page;
    this.visionParser = options?.visionParser;
    this.recorder = options?.recorder ?? new SessionRecorder();
    this.recoveryStrategies = options?.strategies ?? [
      new SelectorFallbackStrategy(),
    ];
  }

  async execute(action: Action): Promise<ActionResult> {
    const startTime = performance.now();
    const preScreenshot = await this.page.screenshot({ type: 'jpeg', quality: 50 }).catch(() => '');

    try {
      let result: unknown;

      switch (action.type) {
        case 'navigate':
          result = await this.executeNavigate(action as NavigateAction);
          break;
        case 'click':
          result = await this.executeClick(action as ClickAction);
          break;
        case 'type':
          result = await this.executeType(action as TypeAction);
          break;
        case 'scroll':
          result = await this.executeScroll(action as ScrollAction);
          break;
        case 'wait':
          result = await this.executeWait(action as WaitAction);
          break;
        case 'assert':
          result = await this.executeAssert(action as AssertAction);
          break;
        case 'extract':
          result = await this.executeExtract(action as ExtractAction);
          break;
        case 'screenshot':
          result = await this.executeScreenshot(action as ScreenshotAction);
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      const duration = performance.now() - startTime;
      const postScreenshot = await this.page.screenshot({ type: 'jpeg', quality: 50 }).catch(() => '');

      const ar: ActionResult = {
        actionId: action.id,
        passed: true,
        duration,
        result,
        screenshot: postScreenshot,
      };

      this.recorder.recordAction(action, result as string);
      return ar;

    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Try recovery strategies
      for (const strategy of this.recoveryStrategies) {
        if (strategy.shouldRetry(action, error as Error)) {
          const alternative = await strategy.getAlternative(action, this.page);
          if (alternative) {
            return this.execute(alternative); // Recursive retry
          }
        }
      }

      this.recorder.recordAction(action, undefined, errorMessage);
      return {
        actionId: action.id,
        passed: false,
        duration,
        error: errorMessage,
      };
    }
  }

  async executePlan(plan: ActionPlan): Promise<PlanResult> {
    const results: ActionResult[] = [];

    for (const action of plan.actions) {
      const result = await this.execute(action);
      results.push(result);

      if (!result.passed) {
        // Early exit on critical failure
        if (this.isCriticalFailure(action, result)) {
          return {
            planId: plan.id,
            passed: false,
            results,
            failedAction: action,
          };
        }
      }
    }

    // Execute verification assertions
    for (const assertion of plan.verification) {
      const result = await this.executeAssert(assertion);
      results.push(result);
    }

    return {
      planId: plan.id,
      passed: results.every(r => r.passed),
      results,
    };
  }

  private async executeNavigate(action: NavigateAction): Promise<void> {
    await this.page.goto(action.url, {
      waitUntil: action.waitUntil ?? 'networkidle',
      timeout: action.timeout ?? 30000,
    });
  }

  private async executeClick(action: ClickAction): Promise<void> {
    if (action.coordinate) {
      await this.page.mouse.click(action.coordinate.x, action.coordinate.y);
    } else if (action.selector) {
      await this.page.click(action.selector, {
        force: action.force,
        noWaitAfter: action.noWaitAfter,
        timeout: action.timeout ?? 5000,
      });
    }
  }

  private async executeType(action: TypeAction): Promise<void> {
    if (action.selector) {
      if (action.clearFirst) {
        await this.page.fill(action.selector, '');
      }
      await this.page.fill(action.selector, action.text, {
        timeout: action.timeout ?? 5000,
      });
    }
    if (action.pressEnter) {
      await this.page.keyboard.press('Enter');
    }
  }

  private async executeScroll(action: ScrollAction): Promise<void> {
    if (action.targetPosition === 'top') {
      await this.page.evaluate(() => window.scrollTo(0, 0));
    } else if (action.targetPosition === 'bottom') {
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    } else {
      const delta = action.direction === 'down' ? (action.amount ?? 300) : -(action.amount ?? 300);
      await this.page.evaluate((d: number) => window.scrollBy(0, d), delta);
    }
  }

  private async executeWait(action: WaitAction): Promise<void> {
    switch (action.condition) {
      case 'timeout':
        await this.page.waitForTimeout(action.value as number ?? 1000);
        break;
      case 'selector':
        await this.page.waitForSelector(action.selector!, {
          timeout: action.timeout ?? 10000,
        });
        break;
      case 'url':
        await this.page.waitForURL(action.value as string, {
          timeout: action.timeout ?? 10000,
        });
        break;
      case 'networkIdle':
        await this.page.waitForLoadState('networkidle', {
          timeout: action.timeout ?? 10000,
        });
        break;
    }
  }

  private async executeAssert(action: AssertAction): Promise<AssertionResult> {
    const engine = new AssertionEngine();
    return engine.assert(action, this.page);
  }

  private async executeExtract(action: ExtractAction): Promise<string> {
    const element = this.page.locator(action.selector);
    switch (action.property) {
      case 'innerHTML': return await element.innerHTML();
      case 'value': return await element.inputValue();
      case 'href': return await element.getAttribute('href') ?? '';
      case 'src': return await element.getAttribute('src') ?? '';
      case 'attribute':
        return await element.getAttribute(action.attributeName ?? '') ?? '';
      default: return await element.textContent() ?? '';
    }
  }

  private async executeScreenshot(action: ScreenshotAction): Promise<string> {
    const buffer = await this.page.screenshot({
      fullPage: action.fullPage,
      type: action.quality ? 'jpeg' : 'png',
      quality: action.quality,
    });
    return buffer.toString('base64');
  }

  private isCriticalFailure(action: Action, result: ActionResult): boolean {
    // Navigations and assertions are critical
    return action.type === 'navigate' || action.type === 'assert';
  }
}
```

### 12.3 Vision Parser Using DOM + Accessibility Tree

```typescript
import { Page, CDPSession } from 'playwright';

interface AXNode {
  nodeId: number;
  role: string;
  name: string;
  value?: string;
  description?: string;
  states?: string[];
  bounds?: { x: number; y: number; width: number; height: number };
  children: AXNode[];
}

interface DetectedElement {
  role: string;
  name: string;
  bounds: { x: number; y: number; width: number; height: number };
  selector?: string;
  confidence: number;
}

export class VisionParser {
  async analyzePage(page: Page): Promise<{
    accessibilityTree: AXNode[];
    interactiveElements: DetectedElement[];
  }> {
    const cdpSession = await page.context().newCDPSession(page);

    // Get full accessibility tree
    const axTree = await cdpSession.send('Accessibility.getFullAXTree', {});
    const tree = this.normalizeAXTree(axTree.nodes ?? []);

    // Get page screenshot for LLM analysis
    const screenshot = await page.screenshot({ type: 'png' });

    // Extract interactive elements from accessibility tree
    const interactiveElements = this.extractInteractiveElements(tree);

    return { accessibilityTree: tree, interactiveElements };
  }

  private normalizeAXTree(nodes: any[]): AXNode[] {
    return nodes.map((n: any) => ({
      nodeId: n.nodeId,
      role: n.role?.value ?? 'unknown',
      name: n.name?.value ?? '',
      value: n.value?.value,
      description: n.description?.value,
      states: n.states?.map((s: any) => s.value) ?? [],
      bounds: n.location
        ? {
            x: n.location.x,
            y: n.location.y,
            width: n.location.width,
            height: n.location.height,
          }
        : undefined,
      children: [],
    }));
  }

  private extractInteractiveElements(tree: AXNode[]): DetectedElement[] {
    const clickableRoles = new Set([
      'button', 'link', 'menuitem', 'tab', 'checkbox',
      'radio', 'switch', 'option', 'combobox', 'searchbox',
      'textbox', 'colorwell', 'slider', 'spinbutton',
    ]);

    return tree
      .filter(n => clickableRoles.has(n.role) && n.bounds)
      .filter(n => {
        // Filter out invisible elements
        const b = n.bounds!;
        return b.width > 5 && b.height > 5 && b.x >= 0 && b.y >= 0;
      })
      .map(n => {
        const b = n.bounds!;
        return {
          role: n.role,
          name: n.name,
          bounds: { x: b.x, y: b.y, width: b.width, height: b.height },
          selector: n.role === 'link'
            ? `a:has-text("${n.name}")`
            : `${n.role}[name="${n.name}"]`,
          confidence: 0.8,
        };
      })
      .filter(e => e.name.length > 0);
  }

  async findElementByInstruction(
    page: Page,
    instruction: string
  ): Promise<DetectedElement | null> {
    // 1. Try accessibility tree first
    const { interactiveElements } = await this.analyzePage(page);

    // 2. Try text-based matching
    const textMatch = this.matchByText(interactiveElements, instruction);
    if (textMatch) return textMatch;

    // 3. Try role-based matching
    const roleMatch = this.matchByRole(interactiveElements, instruction);
    if (roleMatch) return roleMatch;

    // 4. Fallback to LLM vision analysis
    const result = await this.analyzeWithLLM(page, instruction);
    return result;
  }

  private matchByText(
    elements: DetectedElement[],
    instruction: string
  ): DetectedElement | null {
    const keywords = instruction.toLowerCase().split(' ');
    let best: DetectedElement | null = null;
    let bestScore = 0;

    for (const el of elements) {
      const name = el.name.toLowerCase();
      const score = keywords.filter(k => name.includes(k)).length;
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }

    return best && bestScore > 0 ? { ...best, confidence: bestScore / keywords.length } : null;
  }

  private matchByRole(
    elements: DetectedElement[],
    instruction: string
  ): DetectedElement | null {
    const roleMap: Record<string, string> = {
      button: 'button',
      link: 'link',
      input: 'textbox',
      textbox: 'textbox',
      checkbox: 'checkbox',
      dropdown: 'combobox',
      select: 'combobox',
    };

    const lower = instruction.toLowerCase();
    for (const [word, role] of Object.entries(roleMap)) {
      if (lower.includes(word)) {
        const match = elements.find(e => e.role === role);
        if (match) return { ...match, confidence: 0.7 };
      }
    }

    return null;
  }

  private async analyzeWithLLM(
    page: Page,
    instruction: string
  ): Promise<DetectedElement | null> {
    // Take viewport screenshot
    const screenshot = await page.screenshot({ type: 'jpeg', quality: 70 });

    // Get accessibility tree for context
    const cdp = await page.context().newCDPSession(page);
    const axTree = await cdp.send('Accessibility.getFullAXTree', {});

    // Ask LLM (GPT-4o or Claude 4) to identify the element
    const prompt = `Given the screenshot and accessibility tree of a web page,
find the element that matches this instruction: "${instruction}"

Accessibility tree nodes:
${(axTree.nodes ?? []).slice(0, 50).map((n: any) =>
  `- ${n.role?.value ?? '?'}: "${n.name?.value ?? ''}" at ${n.location?.x ?? 0},${n.location?.y ?? 0}`
).join('\n')}

Respond with JSON:
{ "role": "button", "name": "Sign In", "x": 450, "y": 320, "width": 120, "height": 40, "confidence": 0.95 }`;

    // This would call the LLM integration (via @ideia/llm-integration S31)
    // For now, return null to indicate no match
    return null;
  }
}
```

### 12.4 Assertion Engine for Visual Comparison

```typescript
import { Page } from 'playwright';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

interface AssertionResult {
  passed: boolean;
  expected: string;
  actual: string;
  message: string;
  diffImage?: string;
}

interface ComparisonResult {
  match: boolean;
  diffPercentage: number;
  diffImage?: Buffer;
}

export class AssertionEngine {
  private baselineDir: string;
  private visualEngine: VisualAssertionEngine;

  constructor(baselineDir?: string) {
    this.baselineDir = baselineDir ?? join(process.cwd(), '.baseline');
    this.visualEngine = new VisualAssertionEngine();
  }

  async assertUrl(expectedPattern: string, page: Page): Promise<AssertionResult> {
    const currentUrl = page.url();
    const matches = currentUrl.includes(expectedPattern)
      || new RegExp(expectedPattern).test(currentUrl);

    return {
      passed: matches,
      expected: `URL matching "${expectedPattern}"`,
      actual: currentUrl,
      message: matches
        ? `URL matches: ${currentUrl}`
        : `Expected URL to match "${expectedPattern}", got "${currentUrl}"`,
    };
  }

  async assertTitle(expected: string, page: Page): Promise<AssertionResult> {
    const title = await page.title();
    const matches = title.includes(expected) || title === expected;

    return {
      passed: matches,
      expected: `Title "${expected}"`,
      actual: title,
      message: matches
        ? `Title matches: "${title}"`
        : `Expected title "${expected}", got "${title}"`,
    };
  }

  async assertText(
    selector: string,
    expected: string,
    page: Page
  ): Promise<AssertionResult> {
    const locator = page.locator(selector);
    const exists = await locator.count() > 0;

    if (!exists) {
      return {
        passed: false,
        expected: `Element "${selector}" exists with text "${expected}"`,
        actual: 'Element not found',
        message: `Element "${selector}" not found in DOM`,
      };
    }

    const text = await locator.textContent();
    const cleanedText = text?.trim() ?? '';
    const matches = cleanedText.includes(expected) || cleanedText === expected;

    return {
      passed: matches,
      expected: `Text "${expected}" in "${selector}"`,
      actual: cleanedText,
      message: matches
        ? `Text matches: "${cleanedText}"`
        : `Expected "${expected}" in "${selector}", got "${cleanedText}"`,
    };
  }

  async assertVisible(selector: string, page: Page): Promise<AssertionResult> {
    const locator = page.locator(selector);
    let visible = false;
    try {
      visible = await locator.isVisible({ timeout: 5000 });
    } catch {
      visible = false;
    }

    return {
      passed: visible,
      expected: `Element "${selector}" is visible`,
      actual: visible ? 'visible' : 'not visible',
      message: visible
        ? `Element "${selector}" is visible`
        : `Element "${selector}" is not visible`,
    };
  }

  async assertCount(
    selector: string,
    expected: number,
    page: Page
  ): Promise<AssertionResult> {
    const count = await page.locator(selector).count();
    const matches = count === expected;

    return {
      passed: matches,
      expected: `${expected} elements matching "${selector}"`,
      actual: `${count} elements`,
      message: matches
        ? `Found ${count} elements matching "${selector}"`
        : `Expected ${expected} elements, found ${count}`,
    };
  }

  async assertScreenshot(
    baselineName: string,
    page: Page
  ): Promise<AssertionResult> {
    const screenshot = await page.screenshot({ type: 'png' });

    // Save current screenshot for debugging
    const currentDir = join(this.baselineDir, 'current');
    await mkdir(currentDir, { recursive: true });
    await writeFile(join(currentDir, `${baselineName}.png`), screenshot);

    // Compare with baseline
    const baselinePath = join(this.baselineDir, `${baselineName}.png`);
    let baseline: Buffer;
    try {
      baseline = await readFile(baselinePath);
    } catch {
      // First run — save as baseline
      await mkdir(dirname(baselinePath), { recursive: true });
      await writeFile(baselinePath, screenshot);
      return {
        passed: true,
        expected: `Baseline "${baselineName}" created`,
        actual: 'First run — no comparison',
        message: `Baseline screenshot saved as "${baselineName}.png"`,
      };
    }

    const result = await this.visualEngine.compare(baseline, screenshot);

    return {
      passed: result.match,
      expected: `Visual match (< 1% diff)`,
      actual: `${result.diffPercentage.toFixed(2)}% diff`,
      message: result.match
        ? `Screenshots match within tolerance`
        : `Screenshots differ by ${result.diffPercentage.toFixed(2)}%`,
      diffImage: result.diffImage?.toString('base64'),
    };
  }

  async assertConsole(
    expectedPattern: string,
    page: Page
  ): Promise<AssertionResult> {
    const messages: string[] = [];

    page.on('console', (msg) => {
      messages.push(`${msg.type()}: ${msg.text()}`);
    });

    // Wait a bit for console messages to accumulate
    await page.waitForTimeout(500);

    const matches = messages.some(m =>
      m.includes(expectedPattern) || new RegExp(expectedPattern).test(m)
    );

    return {
      passed: matches,
      expected: `Console message matching "${expectedPattern}"`,
      actual: messages.length > 0
        ? messages.join('; ')
        : 'No console messages',
      message: matches
        ? `Console contains matching message`
        : `No console message matched "${expectedPattern}"`,
    };
  }
}

export class VisualAssertionEngine {
  async compare(baseline: Buffer, current: Buffer): Promise<ComparisonResult> {
    try {
      const { default: pixelmatch } = await import('pixelmatch');
      const { PNG } = await import('pngjs');

      const img1 = PNG.sync.read(baseline);
      const img2 = PNG.sync.read(current);

      const { width, height } = img1;

      if (img2.width !== width || img2.height !== height) {
        return {
          match: false,
          diffPercentage: 100,
          message: 'Image dimensions differ',
        } as any;
      }

      const diff = new PNG({ width, height });
      const diffPixels = pixelmatch(
        img1.data, img2.data, diff.data,
        width, height,
        { threshold: 0.1 }
      );

      return {
        match: diffPixels === 0,
        diffPercentage: (diffPixels / (width * height)) * 100,
        diffImage: diffPixels > 0 ? PNG.sync.write(diff) : undefined,
      };
    } catch (error) {
      return {
        match: false,
        diffPercentage: 100,
        diffImage: current,
      };
    }
  }
}
```

### 12.5 Test Recorder with Video Capture

```typescript
import { Page, BrowserContext } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { execa } from 'execa';
import { randomUUID } from 'crypto';

interface TestRecording {
  testName: string;
  videoPath?: string;
  tracePath?: string;
  screenshotPaths: string[];
  actions: TestAction[];
  startTime: number;
  endTime: number;
  passed: boolean;
}

interface TestAction {
  type: string;
  description: string;
  duration: number;
  passed: boolean;
  screenshot?: string;
  error?: string;
}

export class TestRecorder {
  private recordings: TestRecording[] = [];
  private currentRecording: TestRecording | null = null;
  private outputDir: string;

  constructor(outputDir?: string) {
    this.outputDir = outputDir ?? join(process.cwd(), 'test-recordings');
  }

  async startRecording(testName: string, context: BrowserContext): Promise<void> {
    await mkdir(this.outputDir, { recursive: true });

    // Start Playwright tracing
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });

    this.currentRecording = {
      testName,
      screenshotPaths: [],
      actions: [],
      startTime: Date.now(),
      endTime: 0,
      passed: false,
    };
  }

  async recordAction(
    type: string,
    description: string,
    page: Page,
    passed: boolean,
    error?: string
  ): Promise<void> {
    if (!this.currentRecording) return;

    const screenshotPath = join(
      this.outputDir,
      `${this.currentRecording.testName}-${this.currentRecording.actions.length}.png`
    );

    await page.screenshot({ path: screenshotPath, type: 'png' });

    this.currentRecording.actions.push({
      type,
      description,
      duration: 0, // Will be calculated
      passed,
      screenshot: screenshotPath,
      error,
    });

    this.currentRecording.screenshotPaths.push(screenshotPath);
  }

  async stopRecording(
    context: BrowserContext,
    passed: boolean
  ): Promise<TestRecording> {
    if (!this.currentRecording) {
      throw new Error('No recording in progress');
    }

    // Stop tracing and save
    const tracePath = join(this.outputDir, `${this.currentRecording.testName}-trace.zip`);
    await context.tracing.stop({ path: tracePath });

    this.currentRecording.tracePath = tracePath;
    this.currentRecording.endTime = Date.now();
    this.currentRecording.passed = passed;

    // Calculate durations
    for (let i = 1; i < this.currentRecording.actions.length; i++) {
      const prev = this.actions[i - 1]; // Will be fixed
    }

    const recording = this.currentRecording;
    this.recordings.push(recording);
    this.currentRecording = null;

    return recording;
  }

  async generateReport(recording: TestRecording): Promise<string> {
    const reportPath = join(this.outputDir, `${recording.testName}-report.html`);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Test Report: ${recording.testName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .passed { color: #22c55e; }
    .failed { color: #ef4444; }
    .action { padding: 10px; margin: 5px 0; border: 1px solid #e5e7eb; border-radius: 6px; }
    .action.passed { border-left: 4px solid #22c55e; }
    .action.failed { border-left: 4px solid #ef4444; }
    img { max-width: 100%; border: 1px solid #e5e7eb; border-radius: 4px; margin-top: 10px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
    .stat { padding: 15px; background: #f9fafb; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <h1>Test: ${recording.testName}</h1>
  <div class="summary">
    <div class="stat">
      <div class="stat-value ${recording.passed ? 'passed' : 'failed'}">${recording.passed ? 'PASSED' : 'FAILED'}</div>
      <div class="stat-label">Status</div>
    </div>
    <div class="stat">
      <div class="stat-value">${((recording.endTime - recording.startTime) / 1000).toFixed(1)}s</div>
      <div class="stat-label">Duration</div>
    </div>
    <div class="stat">
      <div class="stat-value">${recording.actions.length}</div>
      <div class="stat-label">Actions</div>
    </div>
    <div class="stat">
      <div class="stat-value">${recording.actions.filter(a => a.passed).length}/${recording.actions.length}</div>
      <div class="stat-label">Passed</div>
    </div>
  </div>

  <h2>Action Timeline</h2>
  ${recording.actions.map(a => `
    <div class="action ${a.passed ? 'passed' : 'failed'}">
      <strong>${a.type}</strong>: ${a.description}
      <span class="${a.passed ? 'passed' : 'failed'}">${a.passed ? 'OK' : 'FAIL'}</span>
      ${a.error ? `<br><small style="color: #ef4444;">${a.error}</small>` : ''}
      ${a.screenshot ? `<br><img src="${a.screenshot}" alt="Screenshot">` : ''}
    </div>
  `).join('\n  ')}

  <h2>Trace</h2>
  <p><a href="${recording.tracePath}">Download Playwright Trace</a></p>
</body>
</html>`;

    await writeFile(reportPath, html);
    return reportPath;
  }
}
```

### 12.6 Action Planner from NL

```typescript
import type { Action, NavigateAction, ClickAction, TypeAction, WaitAction, AssertAction, ExtractAction, ScreenshotAction } from './types';

interface Intent {
  type: 'navigate' | 'click' | 'type' | 'multi-step' | 'extract' | 'assert' | 'login';
  target?: string;
  text?: string;
  url?: string;
  steps?: Intent[];
  provider?: string;
}

interface ActionPlan {
  id: string;
  description: string;
  actions: Action[];
  verification: AssertAction[];
  confidence: number;
}

export class ActionPlanner {
  async planFromNL(instruction: string): Promise<ActionPlan> {
    const intent = this.parseIntent(instruction);
    const actions = await this.intentToActions(intent);
    const verification = this.generateVerification(intent, actions);

    return {
      id: randomUUID(),
      description: instruction,
      actions,
      verification,
      confidence: this.calculateConfidence(intent),
    };
  }

  private parseIntent(instruction: string): Intent {
    const lower = instruction.toLowerCase();

    // Login flows
    if (lower.includes('log in') || lower.includes('login') || lower.includes('sign in')) {
      return {
        type: 'login',
        provider: this.detectProvider(lower),
        url: this.extractUrl(lower),
      };
    }

    // Navigation
    if (lower.includes('go to') || lower.includes('navigate') || lower.startsWith('open ')) {
      return {
        type: 'navigate',
        url: this.extractUrl(lower) ?? this.extractAfterPhrase(lower, ['go to', 'navigate to', 'open ']),
      };
    }

    // Click
    if (lower.includes('click') || lower.includes('press') || lower.includes('tap')) {
      return {
        type: 'click',
        target: this.extractAfterPhrase(lower, ['click', 'press', 'tap', 'on ']),
      };
    }

    // Type / fill
    if (lower.includes('type') || lower.includes('fill') || lower.includes('enter ')) {
      return {
        type: 'type',
        target: this.extractTargetForInput(lower),
        text: this.extractText(lower),
      };
    }

    // Extract data
    if (lower.includes('extract') || lower.includes('get ') || lower.includes('read ')) {
      return {
        type: 'extract',
        target: this.extractAfterPhrase(lower, ['from', 'of', 'the ']),
      };
    }

    // Assertion
    if (lower.includes('check') || lower.includes('verify') || lower.includes('assert')
      || lower.includes('should be') || lower.includes('should have')) {
      return {
        type: 'assert',
        target: this.extractAssertTarget(lower),
      };
    }

    // Multi-step (fallback)
    return { type: 'multi-step', steps: [this.parseIntent(lower)] };
  }

  private async intentToActions(intent: Intent): Promise<Action[]> {
    switch (intent.type) {
      case 'login': return this.buildLoginFlow(intent);
      case 'navigate': return this.buildNavigation(intent);
      case 'click': return this.buildClick(intent);
      case 'type': return this.buildType(intent);
      case 'extract': return this.buildExtract(intent);
      case 'assert': return this.buildAssert(intent);
      case 'multi-step': return this.buildMultiStep(intent);
    }
  }

  private async buildLoginFlow(intent: Intent): Promise<Action[]> {
    const actions: Action[] = [];

    if (intent.url) {
      actions.push({
        type: 'navigate',
        url: intent.url,
        waitUntil: 'networkidle',
        id: randomUUID(),
        description: `Navigate to ${intent.url}`,
        timestamp: Date.now(),
      } as NavigateAction);

      actions.push({
        type: 'wait',
        condition: 'selector',
        selector: 'input[type="email"], input[name="login"], input[name="username"]',
        timeout: 10000,
        id: randomUUID(),
        description: 'Wait for login form',
        timestamp: Date.now(),
      } as WaitAction);
    }

    actions.push({
      type: 'type',
      selector: 'input[type="email"], input[name="login"], input[name="username"]',
      text: '${USERNAME}',  // Placeholder for credential injection
      clearFirst: true,
      id: randomUUID(),
      description: 'Enter username',
      timestamp: Date.now(),
    } as TypeAction);

    actions.push({
      type: 'type',
      selector: 'input[type="password"]',
      text: '${PASSWORD}',
      clearFirst: true,
      id: randomUUID(),
      description: 'Enter password',
      timestamp: Date.now(),
    } as TypeAction);

    actions.push({
      type: 'click',
      selector: 'button[type="submit"], input[type="submit"], button:has-text("Sign in")',
      id: randomUUID(),
      description: 'Click submit button',
      timestamp: Date.now(),
    } as ClickAction);

    return actions;
  }

  private buildNavigation(intent: Intent): Action[] {
    return [{
      type: 'navigate',
      url: intent.url ?? 'https://example.com',
      waitUntil: 'networkidle',
      id: randomUUID(),
      description: `Navigate to ${intent.url}`,
      timestamp: Date.now(),
    } as NavigateAction];
  }

  private buildClick(intent: Intent): Action[] {
    return [{
      type: 'click',
      selector: this.textToSelector(intent.target ?? ''),
      id: randomUUID(),
      description: `Click "${intent.target}"`,
      timestamp: Date.now(),
    } as ClickAction];
  }

  private buildType(intent: Intent): Action[] {
    return [{
      type: 'type',
      selector: this.textToInputSelector(intent.target ?? 'input'),
      text: intent.text ?? '',
      clearFirst: true,
      id: randomUUID(),
      description: `Type "${intent.text}" into ${intent.target}`,
      timestamp: Date.now(),
    } as TypeAction];
  }

  private buildExtract(intent: Intent): Action[] {
    return [{
      type: 'extract',
      selector: this.textToSelector(intent.target ?? 'body'),
      property: 'textContent',
      id: randomUUID(),
      description: `Extract content from "${intent.target}"`,
      timestamp: Date.now(),
    } as ExtractAction];
  }

  private buildAssert(intent: Intent): Action[] {
    return [{
      type: 'assert',
      assertionType: this.detectAssertionType(intent.target ?? ''),
      expected: intent.text ?? intent.target ?? '',
      id: randomUUID(),
      description: `Verify "${intent.target}"`,
      timestamp: Date.now(),
    } as AssertAction];
  }

  private async buildMultiStep(intent: Intent): Promise<Action[]> {
    if (intent.steps) {
      const all: Action[] = [];
      for (const step of intent.steps) {
        all.push(...await this.intentToActions(step));
      }
      return all;
    }
    return [];
  }

  private generateVerification(intent: Intent, actions: Action[]): AssertAction[] {
    const verifications: AssertAction[] = [];

    // Add URL verification after navigation
    const navigateAction = actions.find(a => a.type === 'navigate') as NavigateAction | undefined;
    if (navigateAction) {
      verifications.push({
        type: 'assert',
        assertionType: 'url',
        expected: navigateAction.url,
        id: randomUUID(),
        description: 'Verify navigation succeeded',
        timestamp: Date.now(),
      } as AssertAction);
    }

    // Add visibility verification after click
    const clickAction = actions.find(a => a.type === 'click') as ClickAction | undefined;
    if (clickAction && clickAction.selector) {
      verifications.push({
        type: 'wait',
        condition: 'timeout',
        value: 1000,
        id: randomUUID(),
        description: 'Wait for click effect',
        timestamp: Date.now(),
      } as WaitAction);
    }

    return verifications;
  }

  private detectProvider(text: string): string | undefined {
    if (text.includes('github')) return 'github';
    if (text.includes('google') || text.includes('gmail')) return 'google';
    if (text.includes('gitlab')) return 'gitlab';
    if (text.includes('microsoft') || text.includes('azure')) return 'azure-ad';
    if (text.includes('okta')) return 'okta';
    return undefined;
  }

  private extractUrl(text: string): string | undefined {
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    return urlMatch?.[0];
  }

  private extractAfterPhrase(text: string, phrases: string[]): string | undefined {
    for (const phrase of phrases) {
      const idx = text.indexOf(phrase);
      if (idx >= 0) {
        return text.substring(idx + phrase.length).trim().replace(/^["'\s]+|["'\s]+$/g, '');
      }
    }
    return undefined;
  }

  private extractTargetForInput(text: string): string | undefined {
    // "type hello into the search box" -> "search box"
    const intoMatch = text.match(/into\s+(?:the\s+)?(.+?)(?:\s*$|,\s*$|\.\s*$)/i);
    if (intoMatch) return intoMatch[1];
    return undefined;
  }

  private extractText(text: string): string | undefined {
    // "type hello into search" -> "hello"
    const typeMatch = text.match(/^type\s+(.+?)\s+into/i);
    if (typeMatch) return typeMatch[1];
    // "fill email@example.com" -> "email@example.com"
    const fillMatch = text.match(/^(?:fill|enter)\s+(.+?)\s*(?:in|into|$)/i);
    if (fillMatch) return fillMatch[1];
    return undefined;
  }

  private extractAssertTarget(text: string): string | undefined {
    // "check the title is Login" -> "title"
    // "verify the URL contains dashboard" -> "URL"
    if (text.includes('title')) return 'title';
    if (text.includes('url')) return 'url';
    if (text.includes('text') || text.includes('contains')) {
      const containsMatch = text.match(/contains\s+(.+?)$/i);
      return containsMatch?.[1];
    }
    return undefined;
  }

  private detectAssertionType(target: string): 'url' | 'title' | 'text' | 'visible' {
    if (target === 'url') return 'url';
    if (target === 'title') return 'title';
    if (target === 'visible') return 'visible';
    return 'text';
  }

  private textToSelector(text: string): string {
    // Convert natural language descriptions to CSS selectors
    const buttonMap: Record<string, string> = {
      'submit': 'button[type="submit"], input[type="submit"]',
      'login': 'button:has-text("Log in"), button:has-text("Sign in")',
      'sign in': 'button:has-text("Sign in"), button:has-text("Log in")',
      'search': 'button[type="submit"], button:has-text("Search")',
      'next': 'button:has-text("Next"), a:has-text("Next")',
      'previous': 'button:has-text("Previous"), a:has-text("Previous")',
      'save': 'button:has-text("Save"), button[type="submit"]',
      'cancel': 'button:has-text("Cancel"), a:has-text("Cancel")',
      'delete': 'button:has-text("Delete"), button:has-text("Remove")',
      'confirm': 'button:has-text("Confirm"), button:has-text("Yes")',
    };

    if (buttonMap[text.toLowerCase()]) {
      return buttonMap[text.toLowerCase()];
    }

    // Generic text-based selector
    return `:has-text("${text}")`;
  }

  private textToInputSelector(text: string): string {
    const inputMap: Record<string, string> = {
      'email': 'input[type="email"], input[name="email"]',
      'password': 'input[type="password"]',
      'search': 'input[type="search"], input[name="q"], input[placeholder*="search"]',
      'username': 'input[name="username"], input[name="login"]',
      'name': 'input[name="name"], input[name="fullname"]',
      'phone': 'input[type="tel"], input[name="phone"]',
    };

    if (inputMap[text.toLowerCase()]) {
      return inputMap[text.toLowerCase()];
    }

    return `input[placeholder*="${text}" i], input[name="${text}" i], input[aria-label*="${text}" i]`;
  }

  private calculateConfidence(intent: Intent): number {
    if (intent.type === 'login' && intent.provider) return 0.85;
    if (intent.type === 'navigate' && intent.url) return 0.95;
    if (intent.type === 'click' && intent.target) return 0.75;
    if (intent.type === 'type' && intent.text) return 0.70;
    return 0.50;
  }
}
```

---

## 13. Implementation Roadmap

### 13.1 Phases

```
Phase 1 (Foundation)      Phase 2 (Vision)         Phase 3 (Recording)     Phase 4 (Production)
+------------------+     +------------------+     +------------------+     +------------------+
| BrowserController | --> | VisionParser     | --> | VideoRecorder    | --> | E2E Generator    |
| ActionExecutor    |     | LLM Integration  |     | AssertionEngine  |     | CI Integration    |
| SessionRecorder   |     | AX Tree Parsing  |     | Visual Compare   |     | Flaky Detection   |
| Auth Handler      |     | DOM Snapshot     |     | Report Generator |     | Parallel Sessions |
| Network Filter    |     | ActionPlanner    |     | Trace Export     |     | Performance Opt   |
+------------------+     +------------------+     +------------------+     +------------------+
```

### 13.2 Detailed Plan

#### Phase 1: Foundation (Sprint 1-2, ~80h)

| Task | Esforco | Dependencias | Entregavel |
|------|---------|--------------|------------|
| Implement `BrowserController` with Playwright | 16h | `@playwright/test` install | Launch, createSession, closeSession, getPage, getCDPSession |
| Implement `ActionExecutor` with all action types | 20h | BrowserController | navigate, click, type, scroll, wait, extract, screenshot |
| Implement `SessionRecorder` enhancement | 8h | Current SessionRecorder | Full session export (script, JSON, HTML) |
| Implement `AuthHandler` + `SessionPersistence` | 16h | BrowserController | Cookie injection, OAuth flow, profile persistence |
| Implement `NetworkFilter` + security sandbox | 12h | BrowserController | Domain whitelist, request limiting, download restriction |
| Unit tests (BrowserController, ActionExecutor, Auth) | 8h | All above | 50+ tests passing |

**Phase 1 Success Criteria:**
- Browser can navigate, click, type, scroll, wait, extract
- Auth profiles can be created and applied
- Sessions can be recorded and exported to script
- Network filtering blocks unwanted domains
- 50+ unit tests passing, coverage > 70%

#### Phase 2: Vision (Sprint 3-4, ~80h)

| Task | Esforco | Dependencias | Entregavel |
|------|---------|--------------|------------|
| Implement `VisionParser` with AX tree | 12h | BrowserController + CDP | Extract interactive elements from accessibility tree |
| Implement LLM Vision integration | 16h | `@ideia/llm-integration` (S31) | Screenshot -> LLM -> element detection |
| Implement `ActionPlanner` from NL | 16h | VisionParser | "log into github" -> action sequence |
| Implement recovery strategies | 12h | ActionExecutor | SelectorFallbackStrategy, VisionFallbackStrategy |
| Implement selector resolution chain | 8h | VisionParser | CSS -> text -> role -> AX -> vision -> coordinate |
| Integration tests (Vision + Planning) | 16h | All above | 20+ integration tests passing |

**Phase 2 Success Criteria:**
- VisionParser extracts elements from AX tree with > 90% accuracy
- ActionPlanner converts "click the login button" -> correct action
- Recovery strategies handle 80%+ of selector failures
- Action success rate > 90%
- 20+ integration tests passing

#### Phase 3: Recording (Sprint 5-6, ~80h)

| Task | Esforco | Dependencias | Entregavel |
|------|---------|--------------|------------|
| Implement `VideoRecorder` with ffmpeg | 16h | BrowserController | Video capture + encoding |
| Implement `AssertionEngine` | 16h | ActionExecutor | URL, title, text, visibility, count, value assertions |
| Implement `VisualAssertionEngine` | 12h | pixelmatch + pngjs | Screenshot comparison, diff generation |
| Implement `TestRecorder` | 12h | All above | Recording, HTML reports, trace export |
| Implement `SessionExporter` | 8h | SessionRecorder | Script, JSON, HTML, Playwright trace formats |
| Integration tests (Recording + Assertions) | 16h | All above | 20+ tests passing |

**Phase 3 Success Criteria:**
- Video can be recorded and encoded to mp4 (10fps, 30min max)
- AssertionEngine passes/fails correctly on all assertion types
- Visual comparison detects > 95% of visual differences
- HTML reports are generated with screenshots and action timeline
- 20+ integration tests passing

#### Phase 4: Production (Sprint 7-8, ~80h)

| Task | Esforco | Dependencias | Entregavel |
|------|---------|--------------|------------|
| Implement `E2EGenerator` from NL | 16h | ActionPlanner + AssertionEngine | "test login" -> Playwright test file |
| Implement `FlakyDetector` | 8h | E2EGenerator | Statistical flaky detection, adaptive retry |
| Implement parallel session pools | 12h | BrowserController | Multi-context management, resource limiting |
| CI integration (GitHub Actions, Jenkins) | 12h | E2EGenerator | Test execution, reporting, artifact upload |
| Performance optimization | 16h | All above | Session reuse, lazy loading, connection pooling |
| E2E tests (real browser test suite) | 16h | All above | 20+ E2E tests on real websites |

**Phase 4 Success Criteria:**
- Flaky rate < 5% across 100 test runs
- Action success rate > 95%
- Test coverage > 80% (line coverage)
- Parallel sessions: 10 concurrent sessions without resource exhaustion
- CI integration: tests run in < 10min for 50 tests
- Video recording overhead < 5% CPU

### 13.3 Effort Summary

| Phase | Horas | Sprints | Tests | Dependencias Externas |
|-------|-------|---------|-------|----------------------|
| Phase 1: Foundation | 80h | 2 | 50+ | `@playwright/test`, `execa` |
| Phase 2: Vision | 80h | 2 | 40+ | `@ideia/llm-integration`, OpenAI/Claude API |
| Phase 3: Recording | 80h | 2 | 40+ | `ffmpeg`, `pixelmatch`, `pngjs` |
| Phase 4: Production | 80h | 2 | 40+ | CI infrastructure |
| **Total** | **320h** | **8** | **170+** | |

### 13.4 Dependencies

```json
{
  "dependencies": {
    "@playwright/test": "^1.45.0",
    "playwright": "^1.45.0",
    "pixelmatch": "^5.3.0",
    "pngjs": "^7.0.0",
    "execa": "^8.0.0",
    "otplib": "^12.0.0"
  },
  "optionalDependencies": {
    "@ffmpeg-installer/ffmpeg": "^1.1.0",
    "axe-core": "^4.9.0"
  }
}
```

### 13.5 Risks and Mitigations

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| Playwright browser download (300MB+) | Alta | Medio | Bundle chromium with Docker, cache in CI |
| LLM Vision latency (3-5s per call) | Alta | Alto | Cache similar screenshots, parallel analysis |
| Flaky tests on real websites | Media | Medio | Statistical flaky detection, adaptive retry |
| ffmpeg binary availability | Media | Alto | Use @ffmpeg-installer/ffmpeg, graceful fallback |
| CDP API changes | Baixa | Alto | Abstract CDP behind interface, test against API |
| Auth profiles breaking (UI changes) | Media | Alto | Vision fallback, auto-refresh profiles |
| Memory leaks in long sessions | Media | Alto | Resource limits, session timeout, forced GC |

### 13.6 Success Metrics

| Metric | Current | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|--------|---------|---------|---------|---------|---------|
| Package LOC | ~233 | ~2,000 | ~4,000 | ~6,000 | ~8,000 |
| Unit tests | 19 | 70 | 110 | 150 | 200+ |
| Action success rate | 0% (stub) | 85% | 90% | 93% | 95%+ |
| Flaky test rate | NA | NA | NA | NA | < 5% |
| Test coverage | 0% | 50% | 60% | 70% | 80%+ |
| Video recording | NA | NA | NA | Yes | Yes |
| Vision LLM accuracy | NA | NA | 85% | 88% | 90%+ |
| Parallel sessions | 0 | 1 | 2 | 5 | 10+ |
| CI integration | NA | NA | NA | Manual | Automatic |

---

## 14. Conexoes

### 14.1 Conexao com S31 — LLM Integration

O `VisionParser` depende do `@ideia/llm-integration` (S31) para analise de screenshots com GPT-4o ou Claude 4. A interface de integracao:

```typescript
// Em @ideia/llm-integration (S31)
interface LLMProvider {
  analyzeImage(
    image: Buffer,
    prompt: string,
    options?: { model?: string; maxTokens?: number }
  ): Promise<LLMResponse>;
}
```

O VisionParser implementa um cache de analise de imagens para evitar chamadas repetidas para a mesma URL/estado da pagina.

### 14.2 Conexao com S37 — Search/SCM/Task

O `E2EGenerator` produz scripts que podem ser integrados ao sistema de Task Runner (S37):

```typescript
// Task definition for browser tests
const browserTestTask: TaskDefinition = {
  type: 'browser-e2e',
  command: 'npx playwright test',
  group: 'test',
  problemMatcher: ['$playwright'],
};
```

Resultados de testes E2E sao indexados pelo sistema de Search (S37) para consulta rapida.

### 14.3 Conexao com S38 — Editor Intelligence

O `ActionPlanner` pode ser exposto como Code Action no Monaco (S38):

```typescript
// Code Action for "Generate browser test"
const codeAction: CodeAction = {
  title: 'IDEIA: Generate Browser Test',
  kind: 'refactor.extract',
  command: {
    command: 'ideia.browser.generateTest',
    arguments: [selectedText],
  },
};
```

### 14.4 Conexao com S51 — Parallel Agents

O pool de sessoes do `BrowserController` se integra com o sistema de agentes paralelos (S51):

```typescript
// Multi-agent browser testing
const agent1 = new BrowserAgent({ headless: true });
const agent2 = new BrowserAgent({ headless: true });

await Promise.all([
  agent1.execute(loginTest),
  agent2.execute(dashboardTest),
]);
```

### 14.5 Conexao com S52 — PR Automation

O `E2EGenerator` pode ser invocado pelo sistema de automacao de PR (S52):

```typescript
// Auto-generate E2E tests when PR modifies UI files
const pr = await getPR(prNumber);
const changedFiles = pr.getChangedFiles();
const uiFiles = changedFiles.filter(f => f.endsWith('.tsx') || f.endsWith('.vue'));

if (uiFiles.length > 0) {
  const test = await e2eGenerator.generateFromNL(
    `Test the changed UI components: ${uiFiles.join(', ')}`
  );
  await pr.addComment(`Generated E2E test: \`${test.name}\``);
}
```

### 14.6 Conexao com Event Bus (NATS)

Eventos emitidos durante execucao de acoes:

```typescript
// Events published to NATS JetStream
interface BrowserEvents {
  'browser.session.created': { sessionId: string; url: string };
  'browser.session.closed': { sessionId: string; duration: number };
  'browser.action.executed': { sessionId: string; action: Action; result: ActionResult };
  'browser.action.failed': { sessionId: string; action: Action; error: string };
  'browser.test.completed': { testName: string; passed: boolean; duration: number };
  'browser.auth.expired': { profileId: string; provider: string };
}
```

### 14.7 Conexao com Memory Store

Sessoes e profiles sao persistidos no Memory Store:

```typescript
interface StoredBrowserData {
  sessions: Session[];
  profiles: AuthProfile[];
  baselines: Record<string, Buffer>;  // Screenshot baselines
  flakyHistory: Record<string, TestRun[]>;
}
```

---

## Appendix A: Current Package API

### A.1 Current `BrowserEngine` Interface

```typescript
interface BrowserEngine {
  navigate(url: string): Promise<void>;
  click(selector: string): Promise<void>;
  type(selector: string, text: string): Promise<void>;
  extract(selector: string): Promise<string>;
  screenshot(): Promise<string>;
  getPageContent(): Promise<string>;
  executeScript(code: string): Promise<unknown>;
}
```

### A.2 Target `BrowserController` API

```typescript
class BrowserController {
  // Lifecycle
  static async create(config?: BrowserControllerConfig): Promise<BrowserController>;
  async launch(): Promise<void>;
  async close(): Promise<void>;

  // Session management
  async createSession(options?: SessionOptions): Promise<string>;
  async getSession(id: string): Promise<ActiveSession>;
  async closeSession(id: string): Promise<SessionReport>;
  async listSessions(): Promise<SessionSummary[]>;

  // Direct page access (for advanced use)
  getPage(sessionId: string): Page;
  getCDPSession(sessionId: string): Promise<CDPSession>;
}

class ActiveSession {
  readonly id: string;
  readonly page: Page;
  readonly context: BrowserContext;

  // Actions
  async navigate(url: string, options?: NavigateOptions): Promise<void>;
  async click(selectorOrCoordinate: string | Coordinate, options?: ClickOptions): Promise<void>;
  async type(selector: string, text: string, options?: TypeOptions): Promise<void>;
  async scroll(options: ScrollOptions): Promise<void>;
  async wait(options: WaitOptions): Promise<void>;
  async extract(selector: string, property?: string): Promise<string>;
  async screenshot(options?: ScreenshotOptions): Promise<string>;

  // Recording
  async startRecording(): Promise<void>;
  async stopRecording(): Promise<SessionRecording>;
  async getState(): Promise<PageState>;

  // Auth
  async applyProfile(profileId: string): Promise<void>;
  async saveProfile(profileId: string): Promise<void>;
}
```

### A.3 Migration Path

O codigo existente (`BrowserAgent`, `HttpEngine`, `PlaywrightPEngine`, `SessionRecorder`) sera mantido para compatibilidade, mas marcado como `@deprecated`:

```typescript
/** @deprecated Use BrowserController instead */
export class BrowserAgent {
  // Redirects to BrowserController internally
  private controller: BrowserController;

  constructor(engine?: BrowserEngine) {
    this.controller = new BrowserController();
    // ...
  }
}
```

Novo codigo deve usar `BrowserController` diretamente. O facade `BrowserAgent` existente sera removido na versao 1.0.

---

> **Fim do Estudo S50** | Proximo: S52 — PR Automation
