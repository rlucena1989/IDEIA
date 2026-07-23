# Plano de Implementacao: Features Pendentes

> **Proposito:** Consolidar planos de implementacao para 5 features mapeadas dos estudos S50, S14, S65, S31
> **Data:** 2026-07-22
> **Versao:** 1.0
> **Estudos Base:** S50 (3587 linhas), S14 (3459 linhas), S65 (3069 linhas), S31 (2151 linhas)

---

## Sumario

1. [Computer Use Real (S50 - Browser Automation)](#1-computer-use-real-s50---browser-automation)
2. [SSO (SAML/LDAP/OIDC) - S14](#2-sso-samldapoidc---s14)
3. [Compliance (SOC2/LGPD/HIPAA) - S65](#3-compliance-soc2lgpdhipaa---s65)
4. [Reasoning Models (o1/R1) - S31](#4-reasoning-models-o1r1---s31)
5. [Gemini Provider - S31](#5-gemini-provider---s31)
6. [Cronograma Consolidado](#6-cronograma-consolidado)
7. [Dependencias e Riscos](#7-dependencias-e-riscos)
8. [Conexoes](#8-conexoes)

---

## 1. Computer Use Real (S50 - Browser Automation)

### 1.1 Overview

Baseado no estudo **S50** (3587 linhas, completo). O objetivo e criar `packages/browser-agent` com capacidades reais de automacao de navegador: Playwright como driver, Vision-based UI understanding, Recording/Replay, SSO profile management e geracao de testes E2E a partir de linguagem natural.

Estado atual: `packages/browser-agent` existe com `BrowserAgent` e `SessionRecorder` basicos (~233 LOC, 19 testes). O estudo S50 propoe uma arquitetura completa de 4 fases que transforma esse package em um sistema de Computer Use de nivel empresarial.

### 1.2 Package Structure

```
packages/browser-agent/
  src/
    controller/
      browser-controller.ts      # Gerenciamento de lifecycle do Playwright
      session-manager.ts         # Pool de sessoes, contexto multiplo
      cdp-handler.ts             # Chrome DevTools Protocol bridge
    vision/
      vision-parser.ts           # AX tree + DOM snapshot parsing
      llm-vision-integration.ts  # Screenshot -> LLM -> elemento
      element-finder.ts          # Selector resolution chain
    action/
      action-executor.ts         # Conversao de acoes -> Playwright
      action-planner.ts          # Linguagem natural -> plano de acoes
      action-types.ts            # Tipos de acao (click, type, scroll, wait, assert)
      recovery-strategies.ts     # Fallback em falha de selector
    recording/
      video-recorder.ts          # Captura de video com ffmpeg
      session-recorder.ts        # Gravacao de sessoes
      session-exporter.ts        # Exportacao script/JSON/HTML/trace
      assertion-engine.ts        # Verificacoes (URL, title, text, visibility)
      visual-assertion.ts        # Comparacao de screenshots
    sso/
      auth-handler.ts            # Gerenciamento de autenticacao
      profile-manager.ts         # Perfis SSO persistentes
      cookie-injector.ts         # Injecao de cookies de sessao
    security/
      network-filter.ts          # Filtro de dominios
      sandbox-manager.ts         # Isolamento de sessoes
    e2e/
      e2e-generator.ts           # NL -> Playwright test file
      flaky-detector.ts          # Deteccao estatistica de flakiness
    index.ts
  tests/
    e2e/
      real-browser.test.ts
    integration/
      vision-planner.test.ts
      recording-assertion.test.ts
    unit/
      browser-controller.test.ts
      action-executor.test.ts
      auth-handler.test.ts
      network-filter.test.ts
```

### 1.3 Dependencies

```json
{
  "dependencies": {
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

### 1.4 Code Architecture

```
                    +--------------------+
                    |  ActionPlanner     |
                    |  NL -> acoes       |
                    +--------+-----------+
                             |
                    +--------v-----------+
                    |  ActionExecutor    |
                    |  acoes -> Playwright|
                    +--------+-----------+
                             |
         +-------------------+-------------------+
         |                   |                   |
+--------v--------+  +------v------+  +---------v---------+
| BrowserController|  | VisionParser |  | AuthHandler       |
| Playwright wrap  |  | AX tree+DOM  |  | SSO profiles      |
+--------+---------+  +------+------+  +---------+---------+
         |                   |                   |
         v                   v                   v
    [Chromium]         [CDP/API]           [Cookie Store]
```

### 1.5 Key Interfaces

```typescript
// === Controller ===
class BrowserController {
  static async create(config?: BrowserControllerConfig): Promise<BrowserController>
  async launch(): Promise<void>
  async close(): Promise<void>
  async createSession(options?: SessionOptions): Promise<string>
  async getSession(id: string): Promise<ActiveSession>
  async closeSession(id: string): Promise<SessionReport>
  async listSessions(): Promise<SessionSummary[]>
  getPage(sessionId: string): Page
  getCDPSession(sessionId: string): Promise<CDPSession>
}

class ActiveSession {
  readonly id: string
  readonly page: Page
  readonly context: BrowserContext

  async navigate(url: string, options?: NavigateOptions): Promise<void>
  async click(selectorOrCoordinate: string | Coordinate, options?: ClickOptions): Promise<void>
  async type(selector: string, text: string, options?: TypeOptions): Promise<void>
  async scroll(options: ScrollOptions): Promise<void>
  async wait(options: WaitOptions): Promise<void>
  async extract(selector: string, property?: string): Promise<string>
  async screenshot(options?: ScreenshotOptions): Promise<string>
  async startRecording(): Promise<void>
  async stopRecording(): Promise<SessionRecording>
  async getState(): Promise<PageState>
  async applyProfile(profileId: string): Promise<void>
  async saveProfile(profileId: string): Promise<void>
}

// === Vision ===
interface VisionResult {
  elements: DetectedElement[]
  screenshot: Buffer
  axTree: AXNode[]
  interactiveElements: InteractiveElement[]
  viewport: Viewport
}

interface DetectedElement {
  type: 'button' | 'input' | 'link' | 'select' | 'checkbox' | 'radio' | 'text' | 'image'
  selector: string
  text?: string
  boundingBox: { x: number; y: number; width: number; height: number }
  attributes: Record<string, string>
  confidence: number
}

// === Actions ===
type ActionType = 'navigate' | 'click' | 'type' | 'scroll' | 'wait' | 'extract' | 'assert'

interface Action {
  id: string
  type: ActionType
  description: string
  timestamp: number
}

interface ActionResult {
  success: boolean
  action: Action
  duration: number
  error?: string
  screenshot?: string
  metrics?: { domNodes: number; networkRequests: number; memoryUsage: number }
}

// === SSO ===
interface SSOProfile {
  id: string
  name: string
  provider: 'github' | 'google' | 'gitlab' | 'azure-ad' | 'okta' | 'custom'
  cookies: Cookie[]
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
  createdAt: number
  lastUsed: number
  expiresAt?: number
}

// === Recording ===
interface SessionRecording {
  id: string
  sessionId: string
  actions: Action[]
  results: ActionResult[]
  video?: Buffer
  screenshots: string[]
  trace: string
  startTime: number
  endTime: number
  metadata: { url: string; viewport: string; userAgent: string }
}
```

### 1.6 Tasks

| ID | Task | Esforco | Dependencias | Prioridade |
|----|------|---------|-------------|------------|
| CU-01 | Implementar `BrowserController` com Playwright (lifecycle, sessao, contexto) | 16h | `@playwright/test` | P0 |
| CU-02 | Implementar `ActionExecutor` com todos os 7 tipos de acao | 20h | CU-01 | P0 |
| CU-03 | Implementar `SessionRecorder` aprimorado com exportacao script/JSON | 8h | CU-02 | P0 |
| CU-04 | Implementar `AuthHandler` + `SessionPersistence` com injecao de cookies | 16h | CU-01 | P0 |
| CU-05 | Implementar `NetworkFilter` + sandbox de seguranca | 12h | CU-01 | P0 |
| CU-06 | Implementar `VisionParser` com AX tree + CDP | 12h | CU-01 | P1 |
| CU-07 | Implementar `ActionPlanner` de linguagem natural para acoes | 16h | CU-06 + S31 | P1 |
| CU-08 | Implementar `RecoveryStrategies` (fallback de selectors) | 12h | CU-07 | P1 |
| CU-09 | Implementar `VideoRecorder` com ffmpeg | 16h | CU-01 | P1 |
| CU-10 | Implementar `AssertionEngine` + `VisualAssertion` | 16h | CU-09 | P2 |
| CU-11 | Implementar `E2EGenerator` NL -> Playwright test file | 16h | CU-07 + CU-10 | P2 |
| CU-12 | Implementar `FlakyDetector` + parallel session pools | 12h | CU-11 | P2 |
| CU-13 | CI integration (GitHub Actions) + E2E tests | 12h | CU-12 | P2 |
| CU-14 | Performance optimization + memory leak fixes | 16h | CU-13 | P2 |
| | **Total** | **200h** | | |

---

## 2. SSO (SAML/LDAP/OIDC) - S14

### 2.1 Overview

Baseado no estudo **S14** (3459 linhas, completo). Objetivo: criar `packages/sso` com suporte a SAML 2.0, LDAP, OIDC e Keycloak como provedores de autenticacao empresarial. Integra com o auth system existente (Clerk como SaaS primario, este package como self-hosted enterprise complementar).

Estado atual: autenticacao basica com Clerk existe nos widgets. Nao ha suporte SAML/LDAP/OIDC para empresas que exigem federacao propria.

### 2.2 Package Structure

```
packages/sso/
  src/
    providers/
      saml/
        saml-provider.ts         # Implementacao SAML 2.0 SP
        saml-validator.ts        # Validacao de assertions
        saml-config.ts           # Schema de configuracao SAML
      ldap/
        ldap-provider.ts         # Implementacao LDAP bind+search
        ldap-config.ts           # Schema de configuracao LDAP
      oidc/
        oidc-provider.ts         # Implementacao OIDC RP
        oidc-discovery.ts        # OpenID Discovery
        oidc-config.ts           # Schema de configuracao OIDC
      keycloak/
        keycloak-provider.ts     # Integracao Keycloak admin API
        keycloak-sync.ts         # Sincronizacao de usuarios/grupos
    middleware/
      express-middleware.ts      # Express/Fastify auth middleware
      theia-middleware.ts        # Theia backend auth guard
      api-gateway-plugin.ts     # Plugin para API Gateway
    session/
      session-store.ts           # Gerenciamento de sessoes
      session-cache.ts           # Cache offline para desktop
      token-manager.ts           # JWT emission, refresh, rotacao
    strategies/
      passport-wrapper.ts        # Adapter para Passport.js
      clerk-bridge.ts            # Bridge Clerk <-> SSO providers
    user/
      user-mapper.ts             # Mapeamento identity -> usuario IDEIA
      user-sync.ts               # Sincronizacao periodica
      group-mapper.ts            # Mapeamento grupos -> roles
    admin/
      admin-api.ts               # CRUD de configuracao SSO
      admin-widget.ts            # Theia widget de administracao
    index.ts
  tests/
    saml-provider.test.ts
    ldap-provider.test.ts
    oidc-provider.test.ts
    keycloak-sync.test.ts
    middleware.test.ts
    integration/
      sso-flow.test.ts
      multi-provider.test.ts
```

### 2.3 Libraries

```json
{
  "dependencies": {
    "passport": "^0.7.0",
    "passport-saml": "^5.0.0",
    "passport-ldapauth": "^3.0.0",
    "openid-client": "^6.0.0",
    "ldapjs": "^3.0.0",
    "express-session": "^1.18.0",
    "@node-rs/argon2": "^2.0.0",
    "jwks-rsa": "^3.1.0"
  }
}
```

### 2.4 Key Flows

#### SAML SP-initiated SSO Flow

```
User -> IDEIA -> metadata.xml -> IdP
                     |
User <- IdP Login Page (redirect)
                     |
User -> Credentials -> IdP
                     |
IdP -> SAML Response (POST) -> IDEIA ACS URL
                     |
IDEIA -> Valida assertion (signature, audience, conditions)
     -> Extrai atributos (nameId, email, groups)
     -> Mapeia para usuario IDEIA (user-mapper.ts)
     -> Cria sessao JWT
     -> Redirect para destino original
```

#### OIDC Authorization Code Flow

```
User -> IDEIA -> Authorization Request -> IdP
                     |
User <- IdP Login Page (redirect)
                     |
User -> Credentials -> IdP
                     |
IdP -> Authorization Code -> IDEIA redirect_uri
                     |
IDEIA -> Token Request (code + client_secret) -> IdP
     -> Valida ID Token (signature, nonce, audience)
     -> Extrai claims (sub, email, preferred_username)
     -> Mapeia para usuario IDEIA
     -> Cria sessao JWT com refresh token rotation
```

#### LDAP Bind + Search Flow

```
User -> Credentials -> IDEIA
                  |
IDEIA -> LDAP Bind (user DN + password) -> LDAP Server
     -> LDAP Search (base DN, filter: uid={username})
     -> Extrai atributos (cn, mail, memberOf)
     -> Mapeia grupos LDAP -> roles IDEIA
     -> Cria sessao JWT
```

### 2.5 Integration Points

| Ponto de Integracao | Onde | Finalidade |
|--------------------|------|------------|
| Theia Preferences | `packages/ideia-plugin` | Configuracao de provedores SSO pela UI |
| Auth Middleware | `packages/sso/src/middleware` | Protecao de rotas em todos os servicos |
| Clerk Bridge | `packages/sso/src/strategies/clerk-bridge.ts` | Fallback enterprise quando Clerk nao atende |
| User Profile | `packages/sso/src/user` | Sincronizacao de identidade com profile do usuario |
| Event Bus | NATS `auth.sso.*` | Eventos de login, logout, sync, erro |
| Admin Widget | Theia Security Widget | Configuracao visual de SSO |
| Audit Trail | `@ideia/audit-trail` | Logs de autenticacao para compliance |

### 2.6 Tasks

| ID | Task | Esforco | Dependencias | Prioridade |
|----|------|---------|-------------|------------|
| SSO-01 | Implementar `OIDCProvider` com authorization code + PKCE + refresh rotation | 20h | `openid-client` | P0 |
| SSO-02 | Implementar `SAMlProvider` com validator de assertion + ACS handler | 24h | `passport-saml` | P0 |
| SSO-03 | Implementar `LDAPProvider` com bind + search + group mapping | 16h | `ldapjs` | P0 |
| SSO-04 | Implementar `KeycloakProvider` com admin API + sync de usuarios | 20h | Keycloak instance | P0 |
| SSO-05 | Implementar `ExpressMiddleware` + `TheiaMiddleware` para protecao de rotas | 12h | SSO-01, SSO-02, SSO-03 | P0 |
| SSO-06 | Implementar `SessionStore` + `SessionCache` offline para desktop | 16h | `express-session` | P1 |
| SSO-07 | Implementar `UserMapper` + `UserSync` com sincronizacao periodica | 12h | SSO-01, SSO-02, SSO-03 | P1 |
| SSO-08 | Implementar `ClerkBridge` para fallback enterprise | 8h | SSO-01 | P1 |
| SSO-09 | Implementar `TokenManager` com JWT emission + refresh rotation | 12h | SSO-01 | P0 |
| SSO-10 | Implementar `AdminAPI` + Theia widget de configuracao SSO | 16h | SSO-01 a SSO-04 | P2 |
| SSO-11 | Testes de integracao: multi-provedor, fluxos completos | 16h | SSO-01 a SSO-10 | P1 |
| | **Total** | **172h** | | |

---

## 3. Compliance (SOC2/LGPD/HIPAA) - S65

### 3.1 Overview

Baseado no estudo **S65** (3069 linhas, completo). O objetivo e criar 7 novos packages de compliance empresarial que implementam controles para SOC2, LGPD, HIPAA, GDPR com automacao de evidencia, scoring e preparacao para auditoria.

Estado atual: `@ideia/compliance` existe com CLI basico. `AuditTrail` existe com SHA-256 chain. Faltam evidencia continua, incidentes, criptografia, inventario de dados e privacy center.

### 3.2 Packages to Create

| Package | Caminho | LOC Estimado | Proposito |
|---------|---------|-------------|-----------|
| `@ideia/compliance` | `packages/compliance/` | ~2.000 | Core: control registry, evidence collection, scoring, CLI |
| `@ideia/incident-manager` | `packages/incident-manager/` | ~1.500 | Incident response workflow, post-mortem, SLA tracking |
| `@ideia/data-inventory` | `packages/data-inventory/` | ~1.000 | Data asset registry, classification, DPIA generation |
| `@ideia/encryption` | `packages/encryption/` | ~1.200 | Key management, encrypt/decrypt, key rotation, KDF |
| `@ideia/audit-exporter` | `packages/audit-exporter/` | ~1.200 | Export audit logs for SOC2/LGPD auditor evidence package |
| `@ideia/privacy-center` | `packages/privacy-center/` | ~1.500 | User privacy requests (DSAR), consent, erasure |
| `@ideia/compliance-cli` | `packages/compliance-cli/` | ~800 | CLI commands for compliance operations |

### 3.3 Compliance Controls Coverage

#### SOC2: 5 Trust Service Criteria

| Criterio | Controles | Status Atual |
|----------|-----------|-------------|
| **Security** (CC6.x) | Access control, encryption, audit logging, network security | Parcial (audit trail OK, encryption faltando) |
| **Availability** (CC7.x) | Monitoring, incident response, backup/DR, capacity | Parcial (monitoring OK, incident faltando) |
| **Processing Integrity** (CC8.x) | Input validation, error handling, data quality | Em andamento |
| **Confidentiality** (CC9.x) | Data classification, access restriction, retention | Faltando |
| **Privacy** (CC10.x) | Notice, consent, access, correction, enforcement | Faltando |

#### LGPD: 10 Artigos com Controles

| Artigo | Controle | Package Responsavel |
|--------|----------|-------------------|
| Art. 7 | Base legal para processamento | `privacy-center` |
| Art. 9 | Direito de acesso do titular | `privacy-center` |
| Art. 15 | Fim do tratamento (eliminacao) | `data-inventory` |
| Art. 16 | Anonimizacao | `encryption` |
| Art. 18 | Direitos do titular (DSAR) | `privacy-center` |
| Art. 19 | Prazos de resposta (15 dias) | `privacy-center` |
| Art. 37 | Registro de operacoes | `compliance` |
| Art. 38 | Relatorio de impacto (DPIA) | `data-inventory` |
| Art. 46 | Medidas de seguranca | `encryption` + `compliance` |
| Art. 48 | Comunicacao de incidentes | `incident-manager` |

#### HIPAA: 18 Rules with Controls

| Rule | Controle | Package |
|------|----------|---------|
| 164.308(a)(1) | Risk analysis | `compliance` |
| 164.308(a)(2) | Workforce security | `compliance` |
| 164.308(a)(3) | Information access management | `compliance` |
| 164.308(a)(4) | Security awareness training | `compliance` |
| 164.308(a)(5) | Security incident procedures | `incident-manager` |
| 164.308(a)(6) | Contingency plan | `compliance` |
| 164.308(a)(7) | Evaluation | `compliance` |
| 164.308(a)(8) | Business associate contracts | `compliance` |
| 164.310(a) | Facility access controls | `compliance` |
| 164.310(b) | Workstation use | `compliance` |
| 164.310(c) | Workstation security | `compliance` |
| 164.310(d) | Device and media controls | `compliance` |
| 164.312(a) | Access control | `compliance` |
| 164.312(b) | Audit controls | `audit-exporter` |
| 164.312(c) | Integrity controls | `encryption` |
| 164.312(d) | Person or entity authentication | `compliance` |
| 164.312(e) | Transmission security | `encryption` |
| 164.314(a) | BA requirements | `compliance` |

### 3.4 Integration Points

| Integracao | Componente | Proposito |
|-----------|-----------|-----------|
| Audit Trail | `@ideia/audit-trail` | Fonte de evidencias para compliance |
| Event Bus | NATS JetStream | Eventos de compliance (incidente, evidencia, scoring) |
| Theia Widgets | Security Dashboard | Visualizacao de status compliance |
| CI Pipeline | `compliance-cli` | Verificacao automatica em pre-commit/PR |
| Observability | `@ideia/observability-engine` | Metricas de controle continuo |
| Policy Engine | `@ideia/policy-engine` | Enforcement de controles em runtime |

### 3.5 Tasks

| ID | Task | Esforco | Dependencias | Prioridade |
|----|------|---------|-------------|------------|
| CP-01 | Implementar `ComplianceControlRegistry` com todos os controles SOC2/LGPD/HIPAA | 24h | `@ideia/audit-trail` | P0 |
| CP-02 | Implementar `EvidenceCollector` com coleta automatica de evidencias | 20h | CP-01 | P0 |
| CP-03 | Implementar `ComplianceScoreCalculator` com scoring por framework | 12h | CP-01, CP-02 | P0 |
| CP-04 | Implementar `IncidentManager` com workflow de deteccao/resposta/post-mortem | 24h | `@ideia/event-bus` | P0 |
| CP-05 | Implementar `DataInventoryScanner` com classificacao automatica | 16h | - | P0 |
| CP-06 | Implementar `EncryptionManager` com key management + encrypt/decrypt | 20h | `@node-rs/argon2` | P0 |
| CP-07 | Implementar `PrivacyCenter` com DSAR workflow + consent + erasure | 24h | `data-inventory` | P1 |
| CP-08 | Implementar `AuditExporter` com exportacao SOC2/LGPD evidence package | 16h | CP-02 | P1 |
| CP-09 | Implementar Theia compliance widget (dashboard + controls + evidence) | 20h | CP-01, CP-02, CP-03 | P1 |
| CP-10 | Implementar `ComplianceCLI` com 12 comandos (status, controls, evidence, report) | 12h | CP-01 a CP-08 | P1 |
| CP-11 | Contract tests para compliance events (NATS) | 8h | CP-01 | P1 |
| CP-12 | E2E tests: fluxo completo de compliance (detect -> collect -> score -> report) | 16h | CP-01 a CP-10 | P2 |
| | **Total** | **212h** | | |

---

## 4. Reasoning Models (o1/R1) - S31

### 4.1 Overview

Baseado no estudo **S31** (2151 linhas, secao 13 - Provedores Detalhados). O objetivo e estender o Provider System com suporte a modelos de raciocinio (OpenAI o1, o3, DeepSeek R1) que requerem estrategias de prompt especificas, gerenciamento de thinking budget e formatos de saida estruturada.

Estado atual: `@ideia/llm-integration` suporta OpenAI (gpt-4o, gpt-4o-mini), Anthropic (claude-4), DeepSeek (chat), Ollama. Modelos de raciocinio (o1, o3, R1) nao estao integrados.

### 4.2 Prompt Strategies for Reasoning Models

#### Chain-of-Thought Templating

Modelos de raciocinio exigem prompts estruturados que ativem o modo de pensamento interno:

```typescript
interface ReasoningPromptStrategy {
  type: 'cot' | 'structured' | 'step-by-step'

  // Para o1/o3: incluir "thinking..." header
  buildPrompt(task: string, context: string): string

  // Para R1: usar marcadores <｜end▁of▁thinking｜>-specific
  buildSystemPrompt(): string

  // Gerenciar thinking budget (max_completion_tokens)
  computeTokenBudget(taskComplexity: number): number
}
```

#### Thinking Budget Management

```typescript
interface ThinkingBudget {
  maxCompletionTokens: number   // Limite de tokens de pensamento
  reasoningEffort: 'low' | 'medium' | 'high'  // OpenAI o1/o3
  cotLength: number             // Comprimento esperado do CoT
  taskType: 'simple' | 'complex' | 'architectural'
}
```

#### Structured Output Schemas

Modelos de raciocinio precisam de schemas para saida estruturada via JSON mode ou tool calling:

```typescript
interface ReasoningOutputSchema {
  type: 'json' | 'markdown' | 'code' | 'plan'
  schema?: Record<string, unknown>  // Zod-like schema
  examples?: Array<{ input: string; output: unknown }>
}
```

### 4.3 Provider Extensions

#### OpenAI: o1, o3, o4-mini

```typescript
class OpenAIReasoningProvider extends BaseLLMProvider {
  readonly id = 'openai-reasoning'

  getModels(): ModelDescriptor[] {
    return [
      { id: 'o1', contextWindow: 200000, maxOutput: 100000, supportsReasoning: true },
      { id: 'o3', contextWindow: 200000, maxOutput: 100000, supportsReasoning: true },
      { id: 'o4-mini', contextWindow: 200000, maxOutput: 100000, supportsReasoning: true },
    ]
  }

  async streamChat(model: string, messages: Message[], options?: ChatOptions) {
    const reasoningEffort = options?.reasoningEffort ?? 'high'

    const apiMessages = this.adaptMessages(messages, {
      removeSystemPrompt: true,  // o1/o3 nao suportam system prompt
      addReasoningHeader: true,  // Adiciona "Think step by step..."
    })

    const stream = await this.client.chat.completions.create({
      model,
      messages: apiMessages,
      stream: true,
      max_completion_tokens: options?.maxTokens ?? 100000,
      reasoning_effort: reasoningEffort,
    })

    return this.adaptStream(stream)
  }
}
```

#### DeepSeek: R1

```typescript
class DeepSeekReasoningProvider extends BaseLLMProvider {
  readonly id = 'deepseek-reasoning'

  getModels(): ModelDescriptor[] {
    return [
      { id: 'deepseek-reasoner', contextWindow: 64000, maxOutput: 8000, supportsReasoning: true },
    ]
  }

  async streamChat(model: string, messages: Message[], options?: ChatOptions) {
    const apiMessages = this.adaptForR1(messages, {
      useCotMarker: true,  // Adiciona "  response" no final
    })

    const stream = await this.client.post('/chat/completions', {
      model: 'deepseek-reasoner',
      messages: apiMessages,
      stream: true,
      max_tokens: options?.maxTokens ?? 8000,
    })

    return this.adaptStream(stream, {
      parseReasoningContent: true,  // Extrai chain_of_thought do response
    })
  }
}
```

#### Generic ReasoningModelProvider Base Class

```typescript
abstract class ReasoningModelProvider extends BaseLLMProvider {
  abstract reasoningStrategy: ReasoningPromptStrategy

  async chat(model: string, messages: Message[], options?: ChatOptions): Promise<Response> {
    const budget = this.computeTokenBudget(options?.taskComplexity ?? 0.5)
    const adapted = this.reasoningStrategy.buildPrompt(
      messages,
      budget
    )

    const response = await super.chat(model, adapted, {
      ...options,
      maxTokens: budget.maxCompletionTokens,
    })

    return {
      ...response,
      reasoning: this.extractReasoning(response),
      confidence: this.estimateConfidence(response, budget),
    }
  }

  protected abstract extractReasoning(response: Response): string | undefined
  protected abstract estimateConfidence(response: Response, budget: ThinkingBudget): number
}
```

### 4.4 Integration Points

| Ponto | Componente | Acao |
|-------|-----------|------|
| Provider Registry | `@ideia/llm-integration` | Registrar `openai-reasoning` e `deepseek-reasoning` como providers |
| Router | ProviderRouter | Rotear tarefas complexas/arquiteturais para reasoning models |
| Fallback Chain | FallbackChain | Fallback de o1 -> gpt-4o quando thinking budget excedido |
| UI | Provider config widget | Adicionar seletor de reasoning effort (low/medium/high) |
| Prompt Pipeline | ContextEngine | Adaptar prompts automaticamente para modelos de raciocinio |
| Cost Control | BudgetTracker | Calcular custo de tokens de pensamento separadamente |

### 4.5 Tasks

| ID | Task | Esforco | Dependencias | Prioridade |
|----|------|---------|-------------|------------|
| RM-01 | Implementar `ReasoningPromptStrategy` com CoT + structured output schemas | 12h | - | P0 |
| RM-02 | Implementar `ThinkingBudget` manager com calculo de tokens | 8h | RM-01 | P0 |
| RM-03 | Implementar `OpenAIReasoningProvider` (o1, o3, o4-mini) | 16h | RM-01, RM-02 | P0 |
| RM-04 | Implementar `DeepSeekReasoningProvider` (R1) | 12h | RM-01, RM-02 | P0 |
| RM-05 | Implementar `ReasoningModelProvider` base class com extractReasoning | 8h | RM-01 | P0 |
| RM-06 | Integrar reasoning providers no ProviderRegistry + Router + FallbackChain | 12h | RM-03, RM-04, RM-05 | P1 |
| RM-07 | Adaptar Prompt Pipeline para detectar tarefas viaveis para reasoning models | 8h | RM-06 | P1 |
| RM-08 | Testes (unitarios + integracao + fallback) | 12h | RM-03 a RM-07 | P1 |
| | **Total** | **88h** | | |

---

## 5. Gemini Provider - S31

### 5.1 Overview

Baseado no estudo **S31** (secao 13 - Provedores Detalhados). O objetivo e adicionar Google Gemini como provedor de LLM seguindo o padrao ja implementado de OpenAI/Anthropic/DeepSeek, incluindo suporte multimodal (imagens + texto) e streaming SSE.

Estado atual: Gemini nao esta implementado. A interface `BaseLLMProvider` e o `ProviderRegistry` estao prontos para receber novos providers.

### 5.2 Provider Implementation

#### Package: `packages/llm-integration/src/providers/gemini/`

```
providers/gemini/
  gemini-provider.ts        # GeminiProvider extends BaseLLMProvider
  gemini-chat-stream.ts     # SSE streaming adapter
  gemini-embeddings.ts      # Suporte a embeddings
  gemini-multimodal.ts      # Suporte a imagem + texto
  gemini-config.ts          # Zod schema de configuracao
  gemini-models.ts          # Model mapping
  gemini-types.ts           # Tipos internos
```

#### Model Mapping

| Modelo Google | Contexto | Max Output | Equivalente OpenAI | Custo (in/out por 1K) |
|--------------|----------|------------|-------------------|----------------------|
| `gemini-2.0-flash` | 1.048.576 | 8.192 | gpt-4o-mini | $0.10/$0.40 |
| `gemini-2.0-flash-lite` | 1.048.576 | 8.192 | gpt-4o-mini | $0.075/$0.30 |
| `gemini-2.0-pro` | 2.097.152 | 8.192 | gpt-4o | $0.35/$1.40 |
| `gemini-1.5-pro` | 2.097.152 | 8.192 | gpt-4o | $0.35/$1.40 |
| `gemini-1.5-flash` | 1.048.576 | 8.192 | gpt-4o-mini | $0.075/$0.30 |
| `gemini-embedding-exp` | - | 7.680 | text-embedding-3 | $0.013 |

#### Package Dependencies

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.21.0"
  }
}
```

### 5.3 Code Examples

```typescript
class GeminiProvider extends BaseLLMProvider {
  readonly id = 'gemini'
  readonly name = 'Google Gemini'
  protected client: GoogleGenerativeAI

  constructor(config: GeminiConfig) {
    super(config)
    this.client = new GoogleGenerativeAI(config.apiKey)
  }

  getModels(): ModelDescriptor[] {
    return GEMINI_MODELS.map(m => ({
      id: m.id,
      contextWindow: m.contextWindow,
      maxOutputTokens: m.maxOutput,
      supportsStreaming: true,
      supportsFunctions: m.supportsFunctions,
      supportsVision: true,
      supportsJsonMode: m.supportsJsonMode,
      costPer1KTokensInput: m.costPer1KInput,
      costPer1KTokensOutput: m.costPer1KOutput,
      available: true,
    }))
  }

  async streamChat(
    model: string,
    messages: Message[],
    options?: ChatOptions
  ): Promise<AsyncIterable<LLMChunk>> {
    const genModel = this.client.getGenerativeModel({
      model,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 8192,
        topP: options?.topP ?? 0.95,
      },
      safetySettings: this.getSafetySettings(options),
    })

    const geminiMessages = this.convertToGeminiMessages(messages)
    const result = await genModel.generateContentStream({ contents: geminiMessages })

    return new GeminiChatStream(result).toAsyncIterable()
  }

  async embed(model: string, input: string): Promise<number[]> {
    const embedModel = this.client.getGenerativeModel({ model: 'gemini-embedding-exp' })
    const result = await embedModel.embedContent(input)
    return result.embedding.values
  }

  private convertToGeminiMessages(messages: Message[]): Content[] {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: msg.parts?.map(p => this.convertPart(p)) ?? [{ text: msg.content }],
    }))
  }

  private convertPart(part: MessagePart): Part {
    if (part.type === 'text') return { text: part.text }
    if (part.type === 'image') return {
      inlineData: {
        mimeType: part.mimeType ?? 'image/png',
        data: part.data,
      },
    }
    return { text: part.text ?? '' }
  }
}

// === Streaming Adapter ===
class GeminiChatStream {
  constructor(private result: GenerateContentStreamResult) {}

  async *[Symbol.asyncIterator](): AsyncIterator<LLMChunk> {
    for await (const chunk of this.result.stream) {
      const text = chunk.text()
      if (text) {
        yield {
          type: 'text',
          content: text,
          model: 'gemini',
          usage: {
            promptTokens: chunk.usageMetadata?.promptTokenCount,
            completionTokens: chunk.usageMetadata?.candidatesTokenCount,
            totalTokens: chunk.usageMetadata?.totalTokenCount,
          },
        }
      }
    }
  }
}
```

### 5.4 Integration Points

| Ponto | Componente | Status |
|-------|-----------|--------|
| Provider Registry | `@ideia/llm-integration` | Registro automatico por descoberta |
| Router & Fallback | ProviderRouter + FallbackChain | Gemini como opcao de baixo custo (flash) ou fallback de o1 |
| UI Config | Theia Preferences | Adicionar secao Google Gemini no configurador de providers |
| Embeddings | `@ideia/vector-store` | Gemini Embedding como alternativa a OpenAI |
| Multimodal | Chat Service | Suporte a analise de imagens via Gemini Vision |

### 5.5 Tasks

| ID | Task | Esforco | Dependencias | Prioridade |
|----|------|---------|-------------|------------|
| GM-01 | Implementar `GeminiProvider` com streamChat, chat, listModels | 16h | `@google/generative-ai` | P0 |
| GM-02 | Implementar `GeminiChatStream` SSE streaming adapter | 8h | GM-01 | P0 |
| GM-03 | Implementar suporte multimodal (imagem + texto) | 12h | GM-01 | P0 |
| GM-04 | Implementar `GeminiEmbeddings` para vector store | 8h | GM-01 | P1 |
| GM-05 | Implementar `GeminiConfig` Zod schema + validacao | 4h | GM-01 | P0 |
| GM-06 | Registrar Gemini no ProviderRegistry + Router + FallbackChain | 8h | GM-01 | P1 |
| GM-07 | Adicionar configuracao Gemini na UI (Theia preferences) | 8h | GM-05 | P2 |
| GM-08 | Testes (unitarios + integracao + fallback chain) | 12h | GM-01 a GM-06 | P1 |
| | **Total** | **76h** | | |

---

## 6. Cronograma Consolidado

### 6.1 Tabela de Esforco Total

| Feature | Tasks | Horas | Sprints Recomendadas | Fase Prioritaria |
|---------|-------|-------|---------------------|-----------------|
| Computer Use Real (S50) | 14 | 200h | 5 sprints | Fase 6 |
| SSO (SAML/LDAP/OIDC) - S14 | 11 | 172h | 4 sprints | Fase 6 |
| Compliance (SOC2/LGPD/HIPAA) - S65 | 12 | 212h | 6 sprints | Fase 7 |
| Reasoning Models (o1/R1) - S31 | 8 | 88h | 2 sprints | Fase 5 |
| Gemini Provider - S31 | 8 | 76h | 2 sprints | Fase 6 |
| **Total** | **53** | **748h** | **19 sprints** | |

### 6.2 Ordem Recomendada de Implementacao

```
Sprint 1-2:   Reasoning Models  (88h)  — Baixo esforco, alto impacto em qualidade
Sprint 3-4:   Gemini Provider    (76h)  — Baixo esforco, completa cobertura de providers
Sprint 5-9:   Computer Use      (200h)  — Feature critica para concorrencia com Devin
Sprint 10-13: SSO               (172h)  — Enterprise requirement
Sprint 14-19: Compliance        (212h)  — Enterprise requirement, maior esforco
```

### 6.3 Cronograma Timeline

```
Fase 5 (Features Leves): Semanas 1-4
  +------+------+------+------+
  | RM   | RM   | GM   | GM   |
  +------+------+------+------+

Fase 6 (Features Medias): Semanas 5-12
  +------+------+------+------+------+------+------+------+
  | CU-1 | CU-2 | CU-3 | CU-4 | SSO  | SSO  | SSO  | SSO  |
  +------+------+------+------+------+------+------+------+

Fase 7 (Features Pesadas): Semanas 13-18
  +------+------+------+------+------+------+
  | CP-1 | CP-2 | CP-3 | CP-4 | CP-5 | CP-6 |
  +------+------+------+------+------+------+
```

### 6.4 Alocacao de Recursos

| Recurso | Fase 5 (S1-4) | Fase 6 (S5-12) | Fase 7 (S13-18) |
|---------|---------------|----------------|----------------|
| Engenheiro Senior | 1 FTE | 2 FTE | 2 FTE |
| Engenheiro Pleno | - | 1 FTE | 2 FTE |
| QA | - | 0.5 FTE | 1 FTE |
| DevOps | - | 0.25 FTE | 0.25 FTE |
| CISO/DPO | - | - | 0.5 FTE |

---

## 7. Dependencias e Riscos

### 7.1 Shared Dependencies

| Dependencia | Features que dependem | Risco |
|------------|----------------------|-------|
| `@ideia/llm-integration` | CU (vision), RM, GM | Medio - interface estavel |
| `@ideia/event-bus` (NATS) | CU (eventos), CP (evidencias) | Baixo - ja implementado |
| `@ideia/audit-trail` | CP, SSO | Baixo - SHA-256 chain ativo |
| `@ideia/policy-engine` | CP, SSO | Medio - requer extensao de policies |
| `@ideia/theia-plugin` | SSO (widget admin), CP (widget) | Medio - precisa de contributions |
| `@ideia/provider-registry` | RM, GM | Baixo - ja implementado |
| Docker | CU (sandbox) | Medio - requer infra Docker |
| Clerk | SSO (bridge) | Baixo - bridge desacoplada |

### 7.2 Risks and Mitigation

| Risco | Probabilidade | Impacto | Feature | Mitigacao |
|-------|--------------|---------|---------|-----------|
| Playwright browser download 300MB+ | Alta | Medio | CU | Bundle chromium com Docker, cache CI |
| LLM Vision latency 3-5s por chamada | Alta | Alto | CU | Cache de screenshots semelhantes, analise paralela |
| SAML assertion complexidade | Media | Alto | SSO | Testar com 3 IdPs (Okta, Azure AD, Keycloak) |
| LDAP schema variacao entre servidores | Alta | Medio | SSO | Abstract schema com adapter por fornecedor |
| Compliance escopo crescer demais | Media | Alto | CP | Fixar SOC2 como framework inicial, LGPD como segundo |
| Evidencia insuficiente para Type II | Media | Critico | CP | Iniciar coleta de evidencias no dia 1 |
| o1 context window format incompativel | Baixa | Alto | RM | Adapter de mensagens dedicado (remove system, formata tools) |
| Gemini SDK breaking changes | Media | Medio | GM | Abstract SDK atras de interface propria |
| Vendor lock-in (Gemini SDK) | Baixa | Medio | GM | Usar interface `GeminiClient` propria, nao expor SDK |
| ffmpeg disponibilidade cross-platform | Media | Alto | CU | Usar `@ffmpeg-installer/ffmpeg`, fallback graceful |

---

## 8. Conexoes

### 8.1 Estudos Base

| Feature | Estudo | Linhas | Secoes Relevantes |
|---------|--------|--------|-------------------|
| Computer Use Real | S50 | 3587 | 4-13 (arquitetura, controller, vision, action, recording, roadmap) |
| SSO | S14 | 3459 | 1-5 (provedores, protocolos, integracao, sessoes, roadmap) |
| Compliance | S65 | 3069 | 3-16 (controles, evidencias, roadmap, packages) |
| Reasoning Models | S31 | 2151 | 11, 13 (model manager, provedores OpenAI/DeepSeek) |
| Gemini Provider | S31 | 2151 | 13.4 (Gemini provider specification) |

### 8.2 Estudos Relacionados

| Estudo | Relacao | Features Impactadas |
|--------|---------|-------------------|
| S4 - Seguranca e Governanca | Baseline de seguranca (audit, policy, output validation) | CP, SSO, CU |
| S1 - Barramento de Eventos | NATS JetStream para eventos de autenticacao e compliance | CP, SSO |
| S17 - Observabilidade Full-Stack | Tracing e metricas para todos os novos packages | CP, CU, RM, GM, SSO |
| S58 - Data Strategy & Governance | Inventario de dados, retencao, privacidade | CP |
| S59 - Theia Cloud Multitenant | Isolamento de locatarios para SSO e compliance | SSO, CP |
| S61 - Vulnerability Management | Escaneamento de vulnerabilidades (SOC2/HIPAA) | CP |
| S63 - Agent Debug & Runtime | Sandbox e modelo de permissoes | CU |
| S51 - Parallel Agents | Pool de sessoes do browser | CU |
| S52 - PR Automation | Geracao de testes E2E em PR | CU |
| S2 - Memoria e Contexto | Cache semantico para vision | CU |
| E3 - Qualidade Total | Quality Gates obrigatorios para novos packages | Todos |
| GAPS-PRODUCAO-IDE.md | Catalogacao de gaps abertos / resolvidos | Todos |

### 8.3 Contratos Novos Necessarios

| Contrato | Servico A | Servico B | Feature |
|----------|-----------|-----------|---------|
| SSO-C1 | `@ideia/sso` | `@ideia/auth` | Bridge Clerk <-> SSO providers |
| SSO-C2 | `@ideia/sso` | `@ideia/event-bus` | Eventos de autenticacao (login, logout, sync) |
| CP-C1 | `@ideia/compliance` | `@ideia/audit-trail` | Coleta de evidencias de auditoria |
| CP-C2 | `@ideia/compliance` | `@ideia/event-bus` | Eventos de compliance (scoring, incidente) |
| CU-C1 | `@ideia/browser-agent` | `@ideia/llm-integration` | Vision LLM analysis |
| CU-C2 | `@ideia/browser-agent` | `@ideia/event-bus` | Eventos de sessao/acao |
| RM-C1 | `@ideia/llm-integration` | `@ideia/provider-router` | Roteamento para reasoning models |

### 8.4 Documentos de Governanca Atualizar

| Documento | Caminho | Acao |
|-----------|---------|------|
| GAPS-PRODUCAO-IDE.md | `docs/governance/GAPS-PRODUCAO-IDE.md` | Adicionar gaps das 5 features |
| REALITY-MANIFEST.md | `docs/governance/REALITY-MANIFEST.md` | Adicionar packages novos |
| document-registry.md | `docs/governance/document-registry.md` | Registrar este documento |
| HANDOFF-NEXT-SESSION.md | `docs/governance/HANDOFF-NEXT-SESSION.md` | Adicionar ao handoff |

---

> **Fim do Documento** | Proxima atualizacao: apos inicio da implementacao
> **Total de features:** 5 | **Total de tasks:** 53 | **Total de horas estimadas:** 748h
