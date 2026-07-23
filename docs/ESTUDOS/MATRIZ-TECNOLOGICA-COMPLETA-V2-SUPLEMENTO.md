# Matriz Tecnológica Completa — v2 Suplemento

> **Data:** 2026-07-18 | **Versão:** 2.0-suplemento
> **Propósito:** Adição às 65 tecnologias de v1 — cobre categorias L-R, benchmarks, árvores de decisão, migração, threat modeling e roadmap atualizado.
> **Base:** MATRIZ-TECNOLOGICA-COMPLETA.md v1.0 + análise de gaps + estudos de arquitetura IDEIA

---

## Sumário

1. [Categoria L: API Gateway e Service Mesh](#categoria-l-api-gateway-e-service-mesh)
2. [Categoria M: Testes e Qualidade](#categoria-m-testes-e-qualidade)
3. [Categoria N: Analytics e Produto](#categoria-n-analytics-e-produto)
4. [Categoria O: Autenticação e Identidade](#categoria-o-autenticação-e-identidade)
5. [Categoria P: Serverless e Edge](#categoria-p-serverless-e-edge)
6. [Categoria Q: Monorepo e Build](#categoria-q-monorepo-e-build)
7. [Categoria R: Mobile e PWA](#categoria-r-mobile-e-pwa)
8. [Benchmarks e Performance](#benchmarks-e-performance)
9. [Árvores de Decisão](#árvores-de-decisão)
10. [Caminhos de Migração](#caminhos-de-migração)
11. [Threat Modeling](#threat-modeling)
12. [Roadmap Atualizado](#roadmap-atualizado)

---

## Convenções e Legenda

(vide v1 — mesmas convenções de Status, Maturidade, Prioridade)

---

## Categoria L: API Gateway e Service Mesh

### L1. Kong

| Campo | Detalhes |
|-------|----------|
| **Descrição** | API Gateway open-source (OpenResty/Lua). Plugins: auth, rate-limit, transform, caching. DB-less mode, deck CLI declarativo. | 
| **Status** | ❌ Não implementado |
| **APIs** | Admin API (REST), declarative config (YAML/JSON), Plugin SDK (Lua), `deck sync` |
| **Contratos** | `Service` (host, port, protocol), `Route` (paths, methods, hosts), `Plugin` (name, config), `Consumer` (custom_id) |
| **Conexões** | Service Mesh (Kong Mesh), OPA/Cedar (auth plugins), Prometheus (metrics plugin), OIDC (plugin) |
| **Stacking** | Client → Kong Gateway → Plugins → Upstream Services |
| **Cross-ref** | Rate-limit ↔ Resource protection; Auth ↔ RBAC/OAuth2; Observability ↔ Prometheus |
| **Maturidade** | Madura (CNCF, 40K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P3 — necessário apenas com múltiplos serviços publicados |

### L2. Tyk

| Campo | Detalhes |
|-------|----------|
| **Descrição** | API Gateway open-source (Go). Dashboard, analytics, portal de desenvolvedor, GraphQL nativo, transformação de requisições. |
| **Status** | ❌ Não implementado |
| **APIs** | Gateway API (REST), Dashboard API, `tyk-sync` |
| **Contratos** | `APIDefinition` (name, slug, listen_path, upstream), `Policy` (rate_limit, quota, acl) |
| **Conexões** | Redis (cache e rate-limit), Prometheus, OIDC |
| **Stacking** | Client → Tyk Gateway → Policies → Upstream |
| **Maturidade** | Madura (empresa Tyk) |
| **Licença** | MPL 2.0 (Gateway); Commercial (Dashboard) |
| **Prioridade** | P3 |

### L3. Envoy

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Proxy de alto desempenho (C++, CNCF). L3/L4/L7, HTTP/2, gRPC, TLS, load balancing, observabilidade nativa. |
| **Status** | ❌ Não implementado. Base do Istio e Consul Connect. |
| **APIs** | Envoy xDS APIs (CDS, EDS, LDS, RDS, SDS), Admin API, gRPC, HTTP filters |
| **Contratos** | `Listener`, `Cluster`, `Route`, `Endpoint`, `FilterChain`, `AccessLog` |
| **Conexões** | Istio, Consul Connect, Prometheus (built-in), OpenTelemetry, WASM filters |
| **Stacking** | Envoy → xDS Control Plane → Service Mesh |
| **Maturidade** | Madura (CNCF, 25K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P3 — service mesh futuro |

### L4. Traefik

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Reverse proxy / load balancer (Go). Auto-discovery (Docker, K8s, Consul), Let's Encrypt nativo, dashboard. |
| **Status** | ❌ Não implementado |
| **APIs** | Traefik API, Dynamic Configuration (labels, annotations, CRDs), Middleware chain |
| **Contratos** | `EntryPoint`, `Router` (rule, middlewares, service), `Middleware` (headers, rateLimit, auth), `Service` (loadBalancer) |
| **Conexões** | Docker, Kubernetes, Consul, Prometheus |
| **Stacking** | Client → Traefik → Middlewares → Backend Services |
| **Maturidade** | Madura (Traefik Labs, 52K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P2 — proxy reverso para desenvolvimento local e K3s |

### L5. Istio

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Service mesh (Google/IBM/Lyft). Sidecar Envoy, mTLS, traffic management, observabilidade, policies. |
| **Status** | ❌ Não implementado |
| **APIs** | Istio CRDs: `VirtualService`, `DestinationRule`, `ServiceEntry`, `Gateway`, `PeerAuthentication`, `AuthorizationPolicy` |
| **Contratos** | `VirtualService` (hosts, http: [match, route, rewrite, retries]), `DestinationRule` (trafficPolicy, subsets), `PeerAuthentication` (mtls mode) |
| **Conexões** | Envoy, K8s, Prometheus, Jaeger, Kiali, Flagger |
| **Stacking** | K8s → Istiod (control plane) → Envoy Sidecar (data plane) → Services |
| **Maturidade** | Madura (CNCF, 36K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P3 — service mesh enterprise |

### L6. Linkerd

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Service mesh leve (CNCF, Rust). Sem sidecar Envoy — proxy Rust (linkerd2-proxy) ~10MB, 5ms latência adicional. |
| **Status** | ❌ Não implementado |
| **APIs** | CRDs: `ServiceProfile`, `TrafficSplit`, `AuthorizationPolicy`, `Server`, `HTTPRoute` |
| **Contratos** | `ServiceProfile` (routes, retries, timeout), `TrafficSplit` (weights), `Server` (port, proxyProtocol) |
| **Conexões** | K8s, Prometheus, Jaeger |
| **Stacking** | K8s → linkerd-cni → linkerd-proxy (sidecar/data-plane) → linkerd-controller |
| **Maturidade** | Madura (CNCF, 12K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P3 — alternativa Istio mais leve |

### L7. Consul Connect

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Service mesh HashiCorp. Service discovery + mTLS + L7 traffic management via Envoy. Integração direta com Terraform, Nomad. |
| **Status** | ❌ Não implementado |
| **APIs** | HTTP API, Consul CRDs, `service-defaults`, `service-intentions`, `service-router`, `service-splitter` |
| **Contratos** | `ServiceIntentions` (source, destination, action), `ServiceResolver` (connectTimeout, subsets) |
| **Conexões** | Envoy, Terraform, Nomad, K8s (Consul on K8s) |
| **Stacking** | Consul Server → Sidecar Envoy → Service Intentions → Mesh |
| **Maturidade** | Madura (HashiCorp) |
| **Licença** | BSL (HashiCorp) |
| **Prioridade** | P3 — service mesh HashiCorp-native |

### Resumo Categoria L

| Tecnologia | Tipo | Prioridade | Caso de Uso IDEIA |
|------------|------|------------|-------------------|
| Kong | API Gateway | P3 | Multi-serviço público |
| Tyk | API Gateway | P3 | Portal desenvolvedor |
| Envoy | Proxy/Data Plane | P3 | Base service mesh |
| Traefik | Reverse Proxy | P2 | Dev local + K3s ingress |
| Istio | Service Mesh | P3 | Enterprise multi-cluster |
| Linkerd | Service Mesh | P3 | Mesh leve |
| Consul Connect | Service Mesh | P3 | HashiCorp stack |

---

## Categoria M: Testes e Qualidade

### M1. Playwright

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Framework de testes E2E (Microsoft). Multi-browser (Chromium, Firefox, WebKit), mobile, API mocking, trace viewer, codegen. |
| **Status** | ❌ Não implementado. Testes atuais são Jest unitários. |
| **APIs** | `test()`, `expect()`, `page.goto()`, `page.locator()`, `page.route()`, `request` (API), `fixtures` |
| **Contratos** | `test` (title, fn), `Page` (locator, fill, click, screenshot), `BrowserContext` |
| **Conexões** | CI/CD (GitHub Actions), Chromatic (visual), Storybook |
| **Stacking** | Playwright Test → Browser (Chromium/Firefox/WebKit) → Assertions → Report |
| **Maturidade** | Madura (Microsoft, 70K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P1 — E2E obrigatório |

### M2. Cypress

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Framework E2E (JavaScript). Test runner interativo, time travel, network stubbing, component testing. |
| **Status** | ❌ Não implementado |
| **APIs** | `cy.visit()`, `cy.get()`, `cy.contains()`, `cy.intercept()`, `cy.mount()` (component), `cypress open/run` |
| **Contratos** | `Cypress.Chainable`, `Response` (status, body, headers) |
| **Conexões** | CI/CD, Storybook, Percy/Chromatic |
| **Stacking** | Cypress Runner → Browser → Application → Assertions |
| **Maturidade** | Madura (Cypress.io, 48K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P2 — alternativa Playwright (UI integrada prefere Playwright) |

### M3. Storybook + Chromatic

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Storybook: catálogo de componentes isolados (React, Vue, etc). Chromatic: visual regression testing + review. |
| **Status** | ❌ Não implementado |
| **APIs** | Storybook: `storiesOf`, `ComponentStory`, `args`, `parameters`. Chromatic: `chromatic --exit-zero-on-changes` |
| **Contratos** | `Story` (args, parameters, decorators), `StoryObj` (render, play) |
| **Conexões** | React, Playwright/Cypress, CI/CD |
| **Stacking** | Components → Stories → Chromatic Build → Visual Review → CI |
| **Maturidade** | Madura (Storybook: 85K+ estrelas; Chromatic: Chroma) |
| **Licença** | MIT (Storybook); Chromatic (comercial) |
| **Prioridade** | P2 — catálogo de componentes UI |

### M4. Pact (CDC testing)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Consumer-Driven Contracts. Microsserviços contratam entre si — pactos validam compatibilidade antes do deploy. |
| **Status** | ❌ Não implementado |
| **APIs** | `PactV3`, `addInteraction()`, `executeTest()`, `Verifier`, `publishPacts()`, `can-i-deploy` |
| **Contratos** | `Interaction` (state, uponReceiving, withRequest, willRespondWith), `PactFile` (consumer, provider, interactions) |
| **Conexões** | CI/CD, NATS (schemas), Broker |
| **Stacking** | Consumer Tests → Pact → Pact Broker → Provider Verification → CI |
| **Maturidade** | Madura (Pact Foundation, 6K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P3 — CDC entre módulos IDEIA |

### M5. Schemathesis

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Property-based testing para APIs REST/GraphQL. Gera automaticamente entradas baseadas no schema OpenAPI/GraphQL. |
| **Status** | ❌ Não implementado |
| **APIs** | CLI: `schemathesis run`, Python API: `runner.execute()`, `Schema.from_path()` |
| **Contratos** | Input: OpenAPI spec (YAML/JSON). Output: `Check` (name, status, value, example) |
| **Conexões** | CI/CD, API Router, OpenAPI/Swagger |
| **Stacking** | OpenAPI Schema → Schemathesis → Automatic Fuzzing → Failures Report |
| **Maturidade** | Emergente (5K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P2 — fuzzing de API obrigatório |

### M6. StrykerJS

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Mutation testing para JavaScript/TypeScript. Modifica o código (mutações) e verifica se testes detectam. |
| **Status** | ❌ Não implementado |
| **APIs** | `stryker run`, `stryker init`. Config: JSON (mutate, testRunner, reporters, thresholds) |
| **Contratos** | `config.json/ts`: `mutate: ["src/**/*.ts"]`, `thresholds: { high: 80, low: 60, break: 50 }` |
| **Conexões** | Jest, Vitest, CI/CD |
| **Stacking** | Stryker → Mutation Runner → Jest/Vitest → Report (HTML, JSON, dashboard) |
| **Maturidade** | Madura (9K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P2 — qualidade de testes (mutation score) |

### M7. RAGAS

| Campo | Detalhes |
|-------|----------|
| **Descrição** | RAG Assessment. Métricas de qualidade para pipelines RAG: faithfulness, answer relevancy, context precision/recall. |
| **Status** | ❌ Não implementado |
| **APIs** | Python: `evaluate()`, `dataset = Dataset.from_dict()`, métricas: `faithfulness`, `answer_relevancy`, `context_precision`, `context_recall` |
| **Contratos** | Input: `Dataset` (question, answer, contexts, ground_truth). Output: `Result` (metric dict, per-row scores) |
| **Conexões** | RAG Pipeline, Memory Store, CI/CD |
| **Stacking** | RAG Pipeline → RAGAS Evaluate → Metrics → Quality Dashboard |
| **Maturidade** | Emergente (3K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P2 — avaliação de qualidade RAG |

### M8. DeepEval

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Framework de avaliação LLM (open-source). 14+ métricas: G-Eval, hallucination, bias, toxicity, RAGAS, conversational. |
| **Status** | ❌ Não implementado |
| **APIs** | Python: `TestCase`, `test_case = LLMTestCase(...)`, `DeepEval.measure()`, `assert_test()` |
| **Contratos** | `LLMTestCase` (input, actual_output, expected_output, context, retrieval_context), `Metric` (score, reason) |
| **Conexões** | CI/CD, RAGAS, LLM providers |
| **Stacking** | LLM Output → DeepEval Metrics → Assertions → CI Gate |
| **Maturidade** | Emergente (3K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P2 — validação de output de LLM |

### M9. LangSmith

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Plataforma de observabilidade e avaliação LLM (LangChain). Tracing, datasets, playground, A/B avaliação. |
| **Status** | ❌ Não implementado |
| **APIs** | `langsmith.Client()`, `client.create_dataset()`, `client.create_example()`, `client.evaluate()`; Tracing via `@traceable` |
| **Contratos** | `Run` (id, name, inputs, outputs, error, start_time, end_time), `Example` (inputs, outputs, dataset_id) |
| **Conexões** | LangChain, LangGraph, LLM providers |
| **Stacking** | LLM Call → LangSmith Trace → Dataset → Evaluation → Regression |
| **Maturidade** | Emergente (LangChain, 5K+ estrelas) |
| **Licença** | Comercial (free tier disponível) |
| **Prioridade** | P2 — avaliação e debugging de LLM |

### Resumo Categoria M

| Tecnologia | Tipo | Prioridade | IDEIA Context |
|------------|------|------------|---------------|
| Playwright | E2E | P1 | Testes de interface |
| Cypress | E2E | P2 | Alternativa Playwright |
| Storybook + Chromatic | Component/Visual | P2 | UI component catalog |
| Pact | CDC | P3 | Contratos entre serviços |
| Schemathesis | API Fuzzing | P2 | Teste de API automático |
| StrykerJS | Mutation Testing | P2 | Qualidade de testes |
| RAGAS | RAG Evaluation | P2 | Qualidade do RAG |
| DeepEval | LLM Evaluation | P2 | Output agentes |
| LangSmith | LLM Observability | P2 | Tracing + Evaluation |

---

## Categoria N: Analytics e Produto

### N1. PostHog

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Plataforma de produto open-source. Eventos, funis, session recording, feature flags, A/B testing, heatmaps. |
| **Status** | ❌ Não implementado |
| **APIs** | `posthog.capture()`, `posthog.identify()`, `posthog.group()`, `posthog.featureFlag()`, REST API |
| **Contratos** | `Event` (event, properties, distinct_id, timestamp), `Person` (id, properties), `Group` (type, key) |
| **Conexões** | Feature Flags (Unleash), Dashboard, Session recording |
| **Stacking** | App → PostHog SDK → PostHog Cloud/Self-host → Dashboard |
| **Maturidade** | Madura (40K+ estrelas, IPO em 2025) |
| **Licença** | MIT (self-host); Commercial (Cloud) |
| **Prioridade** | P1 — analytics de produto |

### N2. Amplitude

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Plataforma de produto analytics. Funnels, retention, segmentation, behavioral cohorts, predictions. |
| **Status** | ❌ Não implementado |
| **APIs** | `amplitude.track()`, `amplitude.identify()`, `amplitude.revenue()`, HTTP API |
| **Contratos** | `Event` (event_type, user_id, event_properties, time), `Identify` (user_properties) |
| **Conexões** | CI/CD, produto |
| **Stacking** | App → Amplitude SDK → Amplitude Platform → Dashboards |
| **Maturidade** | Madura (pública NASDAQ) |
| **Licença** | Comercial (free tier disponível) |
| **Prioridade** | P2 — alternativa PostHog enterprise |

### N3. Mixpanel

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Product analytics. Funnels, retention, flows, insights, prediction. |
| **Status** | ❌ Não implementado |
| **APIs** | `mixpanel.track()`, `mixpanel.people.set()`, `mixpanel.groups()`, HTTP API |
| **Contratos** | `Event` (event, properties, distinct_id), `People` ($distinct_id, $set) |
| **Conexões** | Produto |
| **Stacking** | App → Mixpanel SDK → Mixpanel → Dashboard |
| **Maturidade** | Madura (pública NYSE) |
| **Licença** | Comercial |
| **Prioridade** | P3 — alternativa |

### N4. Plausible / Umami (privacy-first)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Analytics leve, privacy-first. Sem cookies, GDPR-compliant, autohost. Umami (Node.js), Plausible (Elixir). |
| **Status** | ❌ Não implementado |
| **APIs** | Plausible: Events API. Umami: `website_stats`, `pageview` |
| **Contratos** | Evento: `{ name: "pageview", url, referrer }`. Sem PII. |
| **Conexões** | Dashboard, landing pages |
| **Stacking** | Web App → Plausible/Umami Script → Self-hosted Server → Dashboard |
| **Maturidade** | Madura (Plausible: 20K+ estrelas; Umami: 22K+) |
| **Licença** | MIT/Apache 2.0 |
| **Prioridade** | P2 — analytics do site público (sem rastrear IDE) |

### N5. Segment (CDP)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Customer Data Platform (Twilio). Coleta eventos → transforma → roteia para 300+ destinos (PostHog, Amplitude, GA, Braze, etc). |
| **Status** | ❌ Não implementado |
| **APIs** | `analytics.track()`, `analytics.identify()`, `analytics.page()`, `analytics.group()`, Connections API |
| **Contratos** | `Track` (event, properties), `Identify` (traits), `Group` (groupId, traits) |
| **Conexões** | PostHog, Amplitude, Mixpanel, GA4, Braze (push) |
| **Stacking** | App → Segment SDK → Segment API → Destinations |
| **Maturidade** | Madura (Twilio, $100M+ ARR) |
| **Licença** | Comercial (free tier 1000 users) |
| **Prioridade** | P3 — roteamento centralizado de eventos |

### Resumo Categoria N — Métricas de Produto para IDEIA

| Métrica | Ferramenta | Evento |
|---------|-----------|--------|
| DAU/MAU | PostHog | `session_start` |
| Retenção Dia 1/7/30 | PostHog | `session_end` |
| Funil de Onboarding | PostHog | `tool_used`, `project_created` |
| Feature Adoption | PostHog | `feature_used` |
| NPS | PostHog Surveys | `survey_response` |
| Erros/UX | PostHog Recording | `rage_click`, `error_boundary` |
| Performance Percebida | PostHog | `page_load`, `ttfb` |
| LLM Usage | PostHog custom | `llm_request`, `tokens_used`, `model` |

---

## Categoria O: Autenticação e Identidade

### O1. Auth0

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Identity-as-a-Service (Okta). OAuth 2.0, OIDC, SAML, SSO, MFA, Passwordless, Actions (serverless rules), logins customizáveis. |
| **Status** | ❌ Não implementado |
| **APIs** | `POST /oauth/token`, `POST /authorize`, `GET /userinfo`, Management API, Auth0 SDK (React, Node), `auth0-actions` |
| **Contratos** | `AccessToken` (sub, iss, aud, scope, exp), `IDToken`, `User` (sub, email, picture, email_verified), `Action` (event, api, secrets) |
| **Conexões** | OAuth2/RBAC, JWT, OpenAPI middleware |
| **Stacking** | SPA/API → Auth0 SDK → Auth0 Tenant → Social/Enterprise IdP → JWT |
| **Maturidade** | Madura (Okta, $2B+ ARR) |
| **Licença** | Comercial (free tier: 7K users) |
| **Prioridade** | P2 — auth externalizado |

### O2. Clerk

| Campo | Detalhes |
|-------|----------|
| **Descrição** | User management + auth (Next.js/React). Componentes prontos (SignIn, SignUp, UserProfile), webhooks, organizations. |
| **Status** | ❌ Não implementado |
| **APIs** | SDK React: `useUser()`, `useAuth()`, `<SignIn />`, `<SignUp />`, `<UserButton />`, <ClerkProvider>; API REST |
| **Contratos** | `User` (id, emailAddresses, firstName, lastName, imageUrl), `Session` (id, userId, status), `Organization` (id, name, slug, members) |
| **Conexões** | React 18, Next.js, Webhooks, RBAC (organizations) |
| **Stacking** | React App → Clerk Provider → Components + Hooks → Clerk API → User Management |
| **Maturidade** | Emergente (26K+ estrelas, $30M funding) |
| **Licença** | Comercial (free tier disponível) |
| **Prioridade** | P1 — user management para MVP (mais produtivo que Auth0 para SPA) |

### O3. Keycloak

| Campo | Detalhes |
|-------|----------|
| **Descrição** | IAM open-source (Red Hat / WildFly). OAuth 2.0, OIDC, SAML, LDAP, SSO, MFA, User Federation, eventos. |
| **Status** | ❌ Não implementado |
| **APIs** | Admin REST API, `GET /realms/{realm}/protocol/openid-connect/token`, `GET /auth/realms/{realm}/account`, client adapters |
| **Contratos** | `Realm` (name, enabled, sslRequired), `Client` (clientId, redirectUris), `User` (username, enabled, emailVerified, credentials) |
| **Conexões** | OAuth2/RBAC, JWT, LDAP, F5/BigIP |
| **Stacking** | Keycloak Server → Realm → Client → User Federation → JWT Token |
| **Maturidade** | Madura (Red Hat, 22K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P3 — self-hosted IAM avançado |

### O4. Supabase Auth

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Auth embutido no Supabase (GoTrue). OAuth 2.0/OIDC, 30+ providers, Row Level Security via PostgreSQL, real-time. |
| **Status** | ❌ Não implementado |
| **APIs** | `supabase.auth.signUp()`, `supabase.auth.signIn()`, `supabase.auth.signInWithOAuth()`, `supabase.auth.onAuthStateChange()`, REST API |
| **Contratos** | `Session` (access_token, refresh_token, expires_in), `User` (id, email, user_metadata, app_metadata) |
| **Conexões** | PostgreSQL (RLS), Supabase Storage, Realtime |
| **Stacking** | Client → Supabase Auth → GoTrue → PostgreSQL RLS → Data |
| **Maturidade** | Emergente (22K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P2 — se adotar Supabase como backend |

### O5. Lucia Auth

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Auth library (TypeScript, agnóstica). Database sessions (SQLite, PostgreSQL, Turso), adapters, OAuth providers. |
| **Status** | ❌ Não implementado |
| **APIs** | `lucia()`, `auth.createUser()`, `auth.useKey()`, `auth.createSession()`, `auth.validateSession()`, `LuciaError` |
| **Contratos** | `User`, `Key`, `Session` (user_id, expires, idle_expires), `Auth` (adapter, env) |
| **Conexões** | SQLite, PostgreSQL, Turso, Hono, Astro, Next.js |
| **Stacking** | App → Lucia → Database Adapter → SQLite/PostgreSQL → Session Validation |
| **Maturidade** | Emergente (12K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P1 — auth leve e embarcado (ideal para MVP single-user → multi-user) |

### O6. Passport.js

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Middleware de autenticação para Node.js (Express). 500+ strategies (local, OAuth, SAML, OpenID). |
| **Status** | ❌ Não implementado. Express middleware base existe? Não. |
| **APIs** | `passport.authenticate()`, `passport.serializeUser()`, `passport.deserializeUser()`, Strategy |
| **Contratos** | Strategy-specific: `LocalStrategy` (username, password), `JwtStrategy` (jwtFromRequest, secretOrKey) |
| **Conexões** | Express, Express Session, JWT |
| **Stacking** | Express → Passport → Strategy → Session/JWT |
| **Maturidade** | Madura (22K+ estrelas, 15+ anos) |
| **Licença** | MIT |
| **Prioridade** | P2 — auth convencional para API REST |

### Resumo Categoria O — APIs

| Tecnologia | OAuth 2.0 | OIDC | SAML | WebAuthn | SSO | MFA | Self-hosted | Prioridade IDEIA |
|------------|-----------|------|------|----------|-----|-----|-------------|-----------------|
| Auth0 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (Cloud) | P2 |
| Clerk | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | P1 |
| Keycloak | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | P3 |
| Supabase Auth | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | P2 |
| Lucia Auth | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | P1 |
| Passport.js | ✅ | ✅ | ✅ | Parcial | ❌ | ❌ | ✅ | P2 |

---

## Categoria P: Serverless e Edge

### P1. Cloudflare Workers

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Edge computing (V8 isolates, 300+ locais). Workers, KV, D1 (SQLite edge), R2 (object storage), Queues, Durable Objects. |
| **Status** | ❌ Não implementado |
| **APIs** | `fetch` handler, `env.KV_NAMESPACE`, `env.DB` (D1), `crypto.subtle`, `Queue`, `DurableObject`, `Fetcher` |
| **Contratos** | `Request` → `Response`. `ExecutionContext` (waitUntil, passThroughOnException).  
| **Conexões** | R2, D1, Queues, Workers AI |
| **Stacking** | Client → Cloudflare Edge → Worker → D1/R2/Queues → Response |
| **Maturidade** | Madura (CF Workers, 200K+ deployments) |
| **Licença** | Comercial (free tier: 100K req/dia) |
| **Prioridade** | P3 — edge API ou gateway |

### P2. Deno Deploy

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Edge runtime (Deno/V8). TypeScript nativo, zero-config, 39 regiões. KV store, queues, cron. |
| **Status** | ❌ Não implementado |
| **APIs** | `Deno.serve()`, `Deno.env`, `Deno.Kv`, `Deno.cron`, Web standard APIs |
| **Contratos** | `Request` → `Response`. `Deno.Kv` (get, set, list, atomic, enqueue) |
| **Conexões** | Deno KV, Deno Cron, Supabase |
| **Stacking** | Client → Deno Deploy Edge → Deno.Kv → Response |
| **Maturidade** | Emergente (Deno, 100K+ estrelas) |
| **Licença** | Comercial (free tier: 100K req/dia) |
| **Prioridade** | P3 — edge runtime alternativo |

### P3. Vercel Edge Functions

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Edge functions (Vercel). JavaScript/TypeScript, Edge Runtime (V8), middleware, ISR, Durable Objects via Vercel KV. |
| **Status** | ❌ Não implementado |
| **APIs** | `export const config = { runtime: 'edge' }`, `Request` → `Response`, `@vercel/kv`, `@vercel/blob` |
| **Contratos** | Edge `Request`, `Response`, `NextRequest`, `NextResponse` |
| **Conexões** | Next.js, Vercel KV (Redis), Vercel Blob (R2), Vercel AI SDK |
| **Stacking** | Next.js → Edge Function → Edge Runtime → Vercel Infrastructure |
| **Maturidade** | Madura (Vercel, 1M+ deployments) |
| **Licença** | Comercial (free tier: 100K exec/dia) |
| **Prioridade** | P3 — edge features da IDE web |

### P4. AWS Lambda@Edge / CloudFront Functions

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Lambda@Edge: Node.js/Python nos 216+ pontos CloudFront. CloudFront Functions: JS puro (~100us, 2MB) para manipulação leve. |
| **Status** | ❌ Não implementado |
| **APIs** | Lambda@Edge: `handler(event, context, callback)`, eventos Viewer Request/Response, Origin Request/Response. CF Functions: `handler(event)` |
| **Contratos** | `CloudFrontEvent` (Records[].cf: { request, response, config }) |
| **Conexões** | CloudFront, S3, Lambda |
| **Stacking** | CloudFront → Lambda@Edge / CF Functions → Origin → Response |
| **Maturidade** | Madura (AWS, 15+ anos) |
| **Licença** | Comercial (AWS) |
| **Prioridade** | P3 — edge cloud AWS |

---

## Categoria Q: Monorepo e Build

### Q1. Nx

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Build system monorepo (Nrwl). Task graph, caching distribuído, code generation, dependency graph, affected commands, Nx Cloud. |
| **Status** | ❌ Não implementado. Monorepo atual gerenciado manualmente. |
| **APIs** | `nx.json`, `project.json`, `@nx/*` plugins, `nx graph`, `nx affected:test`, `nx run-many`, Nx Cloud API |
| **Contratos** | `NxJson` (tasksRunnerOptions, plugins, targetDefaults), `ProjectConfiguration` (root, sourceRoot, targets) |
| **Conexões** | esbuild, Vite, tsc, Playwright, GitHub Actions |
| **Stacking** | Nx → Task Graph → Cache → Distributed Execution → Affected Targets |
| **Maturidade** | Madura (Nrwl, 24K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P1 — orquestração de build monorepo |

### Q2. Turborepo

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Build system monorepo (Vercel). Task scheduling, cache (local/remote), parallel exec, zero-config. |
| **Status** | ❌ Não implementado |
| **APIs** | `turbo.json` (pipeline, cache), `turbo run build`, `--filter`, `--remote-only` |
| **Contratos** | `Pipeline` (build: { dependsOn, outputs, cache }), `TurboConfig` (extends, pipeline) |
| **Conexões** | pnpm workspaces, Vite, Vercel |
| **Stacking** | pnpm workspace → Turborepo → Task Pipeline → Cache → Vercel |
| **Maturidade** | Madura (Vercel, 27K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P2 — alternativa Nx mais leve |

### Q3. pnpm workspaces

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Gerenciador de pacotes com workspaces nativos. Instalação imutável, symlinks, savings de disco (hard links), content-addressable store. |
| **Status** | 🟡 Projeto usa npm workspaces — pnpm não adotado. Gap de performance (instalação 2-3x mais lenta). |
| **APIs** | `pnpm-workspace.yaml`, `pnpm add/filter`, `pnpm -r exec`, `pnpm deploy`, content store |
| **Contratos** | `pnpm-workspace.yaml`: `packages: ['packages/*', 'docs']` |
| **Conexões** | Nx, Turborepo, CI/CD |
| **Stacking** | pnpm store → pnpm workspace → Node_modules (symlinked) → Scripts |
| **Maturidade** | Madura (30K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P1 — migração obrigatória de npm workspaces para pnpm |

### Q4. esbuild

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Bundler Go — extremamente rápido. 10-100x mais rápido que tsc. Usado por Vite internamente. |
| **Status** | 🟡 Vite usa esbuild para transform; tsc para type-check. esbuild direto não é usado. |
| **APIs** | `esbuild.build()`, `esbuild.transform()`, `esbuild.serve()`, plugin API |
| **Contratos** | `BuildOptions` (entryPoints, outfile, bundle, platform, format, plugins), `BuildResult` (outputFiles, metafile) |
| **Conexões** | Vite, tsc, swc |
| **Stacking** | esbuild → Bundle → Output (CJS/ESM) → App |
| **Maturidade** | Madura (38K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P1 — build rápido |

### Q5. Vite

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Build tool e dev server (Evan You). ESM nativo em dev, esbuild para transform, Rollup para produção. HMR instantâneo. |
| **Status** | ✅ Core do frontend em `packages/web-ui/` |
| **APIs** | `vite.config.ts`, `defineConfig`, plugins, `@vitejs/plugin-react`, `optimizeDeps`, `build.rollupOptions` |
| **Contratos** | `UserConfig` (plugins, server, build, resolve, optimizeDeps, css) |
| **Conexões** | React, esbuild, Rollup, Vitest |
| **Stacking** | Vite Dev Server → ESM Modules → esbuild Transform → Browser |
| **Maturidade** | Madura (70K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P0 — build core |

### Q6. tsc

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Compilador TypeScript oficial. Type-check e/ou emit. Lento (5-10x vs esbuild/swc) porém 100% preciso. |
| **Status** | ✅ `tsc --noEmit` type-check. `tsc -b` para packages. |
| **APIs** | `tsconfig.json`, CLI `tsc --noEmit`, `tsc -b`, `tsc --declaration`, `Project References` |
| **Contratos** | `tsconfig.json` (compilerOptions, include, exclude, references), `ProjectReference` (path, composite) |
| **Conexões** | esbuild (build), swc (alternativa), Nx (task graph) |
| **Stacking** | tsc → Type Check → Declaration emit → esbuild → Bundle |
| **Maturidade** | Madura (Microsoft, 100K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P0 — type safety |

### Q7. swc

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Compilador/bundler TypeScript/JS em Rust. 20x mais rápido que tsc. Usado por Next.js. |
| **Status** | ❌ Não implementado |
| **APIs** | `@swc/core` (transform, parse, minify), `@swc/jest` (transform), `swc-loader`, `.swcrc` |
| **Contratos** | `.swcrc` (jsc: { parser, transform, target, minify }) |
| **Conexões** | Vite (via plugin), Jest (via transform), Next.js |
| **Stacking** | swc → Transform (TS→JS) → Bundle/Miniy → Output |
| **Maturidade** | Madura (33K+ estrelas) |
| **Licença** | Apache 2.0 |
| **Prioridade** | P2 — acelerar build/transform |

### Q8. Changesets

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Versionamento e changelog para monorepos. Arquivos markdown → bumps semver → changelog. |
| **Status** | ❌ Não implementado |
| **APIs** | `changeset init`, `changeset add`, `changeset version`, `changeset publish`, GitHub action |
| **Contratos** | `.changeset/config.json`, `changeset/*.md` (bump type, summary) |
| **Conexões** | pnpm, GitHub Actions, semantic-release |
| **Stacking** | Changeset Add → Changeset Version → Bump + Changelog → Publish |
| **Maturidade** | Madura (Atlassian, 8K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P1 — versionamento automático monorepo |

### Q9. semantic-release

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Release automation. Analisa commits (conventional commits), bumps versão, gera changelog, publica npm/GitHub. |
| **Status** | ❌ Não implementado |
| **APIs** | `.releaserc`, `@semantic-release/*` plugins, `semantic-release` CLI |
| **Contratos** | `.releaserc` (branches, plugins: [commit-analyzer, release-notes-generator, changelog, npm, github]) |
| **Conexões** | GitHub Actions, conventional commits, Changesets |
| **Stacking** | Git Commits → semantic-release → Analyze → Bump → Release → Publish |
| **Maturidade** | Madura (21K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P2 — automação de releases |

---

## Categoria R: Mobile e PWA

### R1. PWA (Service Workers, Manifest, Offline)

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Progressive Web App. Service Workers (cache API, push, sync), Web App Manifest (installable), offline support. |
| **Status** | ❌ Não implementado. App web sem SW. |
| **APIs** | `ServiceWorkerRegistration`, `PushManager`, `SyncManager`, `Cache`, `Window.caches`, `manifest.json` (name, short_name, icons, start_url, display, background_color) |
| **Contratos** | `manifest.json` (W3C). SW: `install`, `activate`, `fetch` events. Cache: `Cache.put()`, `Cache.match()` |
| **Conexões** | WebSocket, IndexedDB, push notifications |
| **Stacking** | Web App → Service Worker (install+activate+fetch) → Cache API → Offline / Push |
| **Maturidade** | Madura (Google, W3C, todos browsers) |
| **Licença** | Padrão W3C |
| **Prioridade** | P2 — app instalável + offline |

### R2. React Native / Expo

| Campo | Detalhes |
|-------|----------|
| **Descrição** | React Native: framework mobile cross-platform. Expo: plataforma gerenciada (build, OTA updates, push, módulos). |
| **Status** | ❌ Não implementado. Companheiro mobile da IDEIA. |
| **APIs** | RN: `View`, `Text`, `FlatList`, `Animated`, `NetInfo`, `PushNotificationIOS`. Expo: `expo-notifications`, `expo-file-system`, `expo-sqlite`, `expo-updates`, EAS Build |
| **Contratos** | Componentes RN, `expo-notifications` (title, body, data, sound), `app.json` (expo: { name, slug, version, plugins }) |
| **Conexões** | API REST/WebSocket, PWA, Push Notifications |
| **Stacking** | Expo → RN Components → Expo Modules (notifications, file, sqlite) → API |
| **Maturidade** | Madura (Meta, 120K+ estrelas) |
| **Licença** | MIT |
| **Prioridade** | P3 — app mobile companion (notificações, status, snippets) |

### R3. Push Notifications API

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Web Push API (W3C). Notificações push via Service Worker + Push Service. Vapid auth. |
| **Status** | ❌ Não implementado |
| **APIs** | `PushSubscription`, `registration.pushManager.subscribe()`, `self.registration.showNotification()`, Web Push Protocol (RFC 8030) |
| **Contratos** | `PushSubscription` (endpoint, keys: { p256dh, auth }), `Notification` (title, options: { body, icon, data, tag }) |
| **Conexões** | Service Worker, VAPID keys, Push Service (FCM, APNs via Web Push bridge) |
| **Stacking** | App → Service Worker → Push API → Push Service → Device Notification |
| **Maturidade** | Madura (W3C, todos browsers) |
| **Licença** | Padrão W3C |
| **Prioridade** | P2 — notificações de agente/CI |

### R4. Sincronização Offline

| Campo | Detalhes |
|-------|----------|
| **Descrição** | Estratégias: Service Worker (Network First / Cache First / Stale While Revalidate), Background Sync, IndexedDB local + reconcile. |
| **Status** | ❌ Não implementado |
| **APIs** | `Cache`, `IndexedDB`, `Background Sync`, `Periodic Background Sync`, `Workbox` (simplifica SW patterns) |
| **Contratos** | DB schema (IndexedDB object stores), Sync tags, Reconcile strategy (last-write-wins / CRDT) |
| **Conexões** | Service Worker, PWA, IndexedDB, SQLite (via sql.js ou opfs) |
| **Stacking** | App → IndexedDB/SQLite (local) → SW (sync) → Network → Server |
| **Maturidade** | Madura (padrões W3C, 10+ anos) |
| **Licença** | Padrão |
| **Prioridade** | P2 — funcionalidade offline IDEIA (rascunhos, histórico) |

---

## Benchmarks e Performance

### Benchmark: Vector Databases (embeddings 768d, 100K vectors)

| Operação | ChromaDB | sqlite-vec | pgvector (HNSW) | Qdrant | Milvus |
|----------|----------|------------|-----------------|--------|--------|
| Insert (100K) | ~45s | ~12s | ~8s | ~6s | ~4s |
| Query (1-NN, 10 concurrent) | ~15ms | ~5ms | ~2ms | ~1ms | ~0.8ms |
| Filter + Vector search | ~25ms | ~8ms | ~4ms | ~2ms | ~1ms |
| Memory (100K vectors) | ~800MB | ~150MB | ~400MB | ~200MB | ~350MB |
| Startup time | ~3s | ~0.1s (embarcado) | ~1s | ~2s | ~5s |
| Disk usage (100K vectors) | ~200MB | ~80MB | ~120MB | ~100MB | ~150MB |

**Conclusão IDEIA:** sqlite-vec melhor custo-benefício para MVP (embarcado, zero-config). pgvector para multi-usuário.

### Benchmark: Message Brokers (throughput, latência)

| Operação | NATS JetStream | Redis Streams | Kafka | RabbitMQ |
|----------|---------------|---------------|-------|----------|
| Msg/s (pub, 1KB) | 10M+ | 1M | 2M | 500K |
| Msg/s (sub) | 8M+ | 800K | 1.5M | 400K |
| Latência p99 (pub) | <1ms | ~1ms | ~5ms | ~3ms |
| Persistência | JetStream (file) | RDB/AOF (file) | Log (disk) | Queue (disk) |
| Footprint RAM | ~20MB | ~5MB (cache) | ~512MB | ~128MB |
| Cluster setup | Simples | Sentinel/Cluster | Complexo (ZK) | Simples |
| Durabilidade | At-least-once | At-least-once | Exactly-once | At-least-once |

**Conclusão IDEIA:** NATS JetStream para mensageria primária. Redis Streams para cache + filas leves.

### Benchmark: LLM Inference Performance (local, RTX 4090 24GB)

| Modelo | Tamanho | Tokens/s (prefill) | Tokens/s (decode) | RAM | vRAM |
|--------|--------|-------------------|-------------------|-----|------|
| Phi-4-mini | 3.8B | ~250 | ~180 | 4GB | 3GB |
| Qwen2.5-Coder-7B | 7B | ~150 | ~95 | 8GB | 7GB |
| DeepSeek-Coder-V2-Lite | 16B | ~80 | ~45 | 16GB | 14GB |
| Llama 3.3 70B (4-bit) | 70B | ~35 | ~18 | 8GB (Q4) | 24GB |
| DeepSeek-R1 (Q4) | 671B MoE | ~12 | ~8 | 48GB (Q4) | 48GB |
| Codestral | 22B | ~60 | ~35 | 12GB | 22GB |

**Hardware mínimo recomendado:**
- **Dev single-user:** 16GB RAM, GPU 8GB (RTX 3070) — Phi-4-mini + Qwen2.5-Coder-7B
- **Time (3-5 devs):** 32GB RAM, GPU 24GB (RTX 4090) — DeepSeek-Coder + Phi-4-mini
- **Enterprise:** Servidor dedicado 64GB+ RAM, GPU A100 80GB — DeepSeek-R1 + modelos MoE

### Benchmark: Desktop Frameworks

| Métrica | Electron | Tauri v2 | Theia Platform |
|---------|----------|----------|----------------|
| Binary size | ~150MB (Chromium) | ~5MB (webview) | ~200MB (Electron-based) |
| RAM idle | ~150MB | ~30MB | ~200MB |
| RAM loaded (IDE) | ~400MB | ~120MB | ~500MB |
| Startup time | ~3s | ~0.5s | ~4s |
| Language | JS/TS (Node) | Rust + JS/TS | JS/TS (Node) |
| Webview | Chromium | OS native (Edge/Safari/WebKit) | Chromium |
| IPC | WebSocket/IPC | serde JSON (Rust) | Inversify DI |
| Plugin system | Via Node | Via Tauri commands | VS Code API (~80%) |
| File system | Node fs | Rust fs (tokio) | Node fs |
| Terminal support | node-pty | Tauri plugin shell | xterm.js + node-pty |
| Cloud-ready | No | No | Yes (Theia Cloud) |
| Maintenance | Complexa (Chrome dep) | Baixa (webview OS) | Alta (Eclipse Foundation) |

**Conclusão IDEIA:** 
- **Web-only (MVP):** ninguém — browser direto
- **Desktop v1:** Tauri v2 (menor, mais rápido, Rust seguro)
- **Desktop v2+:** Theia Platform (se plugin ecosystem VS Code for necessário)
- **Electron:** apenas se compatibilidade com VS Code extensions for prioridade maior que performance

### Benchmark: Custos Cloud (projeção mensal, 1000 usuários ativos)

| Recurso | Serviço | Custo/mês | Alternativa self-hosted |
|---------|---------|-----------|------------------------|
| LLM API (100 req/user/dia) | OpenAI GPT-4o | ~$3,000 | Ollama + GPU: $200/mês (instância) |
| LLM API (100 req/user/dia) | Claude 4 | ~$4,000 | — |
| LLM API (100 req/user/dia) | DeepSeek API | ~$300 | — |
| Auth (1000 MAU) | Clerk | $0 (free tier) | Lucia $0 |
| Auth (1000 MAU) | Auth0 | $23 | Keycloak $0 |
| Analytics (100k eventos) | PostHog Cloud | $0 (free) | PostHog self-host $0 |
| Vector DB (100K vectors) | Pinecone | $70 | sqlite-vec $0 |
| Object storage (100GB) | R2 | $0.36 | MinIO: $0 (self-host) |
| CI/CD (6K min/mês) | GitHub Actions | $0 (free 2K) | Runner próprio: $0 |
| Monitoring | LangFuse Cloud | $59 | LangFuse self-host $0 |

---

## Árvores de Decisão

### Decisão 1: Electron vs Tauri vs Theia Platform

```
                       ┌─ Precisa de ecossistema VS Code? ── Sim ── Precisa ser cloud-ready? ── Sim ──► Theia Platform
                       │                                       │
                       │                                       └── Não ──► Electron*
                       │
  Qual framework       ├─ Prioridade é performance/binário     ┌─ Precisa de Theia Cloud? ── Sim ──► Theia Platform
  desktop usar?        │  pequeno/segurança? ── Sim ──► Tauri │
                       │                                       └── Não ──► Tauri
                       │
                       └─ Apenas web (MVP) ──► Browser (nenhum framework desktop)

  *Electron só se compatibilidade com VS Code extensions > 80% for requisito
  que anula ganhos de performance (2-3x mais RAM, 10x binário)

  Recomendação IDEIA: Tauri v2 para desktop MVP. Theia Platform para v2+.
```

### Decisão 2: pgvector vs ChromaDB vs Qdrant vs Milvus

```
                       ┌─ Já usa PostgreSQL? ── Sim ── Precisa de performance extrema? ── Sim ──► pgvector (HNSW)
                       │                              │                                    │
                       │                              │                                   └─ Simples, escala 1M+ ──► pgvector
  Qual vector DB       │                              │
  escolher?            │                              └── Não ──► pgvector (IVFFlat, simples)
                       │
                       ├─ Precisa de zero-ops, embarcado? ── Sim ──► sqlite-vec (embarcado no SQLite)
                       │
                       ├─ Precisa de filtragem híbrida (metadata + vector)? ── Sim ──► Qdrant
                       │
                       └─ Precisa de escala massiva (100M+ vectors) ── Sim ──► Milvus (GPU indexing)

  Recomendação IDEIA: sqlite-vec (MVP), pgvector (v1), Qdrant (v2)
```

### Decisão 3: Jest vs Vitest vs Playwright

```
                       ┌─ Tipo de teste?
                       │
                       ├─ Unitário / Integração ──► Usa Vite? ── Sim ──► Vitest (HMR, mais rápido, compatível Jest)
                       │                           │
                       │                           └── Não ──► Jest (padrão)
  Framework de         │
  testes para o        ├─ Component (React) ──► Vitest + @testing-library/react
  ecossistema?         │
                       ├─ E2E (browser) ──► Playwright (melhor que Cypress: mais rápido, multi-browser, trace viewer)
                       │
                       └─ Visual regression ──► Chromatic (Storybook) + Playwright (screenshots)

  Recomendação IDEIA: Vitest (unit), Playwright (E2E), StrykerJS (mutation)
```

### Decisão 4: NATS vs Kafka vs RabbitMQ

```
                       ┌─ Requisito de throughput? ── Alto (> 1M msg/s) ──► Kafka / Redpanda
                       │
                       ├─ Requisito de simplicidade/leveza? ── Sim ──► NATS JetStream
  Qual message         │                                    │
  broker usar?         │                                    ├─ Precisa persistência? ── Sim ──► NATS JetStream
                       │                                    │
                       │                                    └── Precisa cache + fila? ──► Redis Streams
                       │
                       ├─ Requisito de roteamento complexo? ── Sim ──► RabbitMQ (AMQP, exchanges)
                       │
                       └─ Requisito de multi-tenancy geo-replicação? ── Sim ──► Apache Pulsar

  Recomendação IDEIA: NATS JetStream (primário), Redis Streams (cache+queue), 
                       Kafka (futuro para audit log massivo)
```

### Decisão 5: PostgreSQL vs Turso vs SQLite

```
                       ┌─ Precisa multi-usuário concorrente? ── Sim ── Precisa edge reads? ── Sim ──► Turso (SQLite distribuído)
                       │                                         │                                │
                       │                                         │                               └── Não ──► PostgreSQL
  Qual banco           │                                         │
  de dados?            │                                         └── Não (acima de 10 usuários concorrentes?) ──► PostgreSQL
                       │
                       ├─ Precisa zero-ops, embarcado? ── Sim ── Precisa analytics? ── Sim ──► DuckDB
                       │                                         │                       │
                       │                                         │                       └── Não ──► SQLite
                       │                                         │
                       │                                         └── Precisa vector search? ──► SQLite + sqlite-vec
                       │
                       └─ Precisa de dados massivos (100GB+)? ── Sim ──► PostgreSQL + DuckDB (OLAP)

  Recomendação IDEIA: SQLite + sqlite-vec (MVP), PostgreSQL + pgvector (v1), DuckDB (analytics)
```

### Decisão 6: Auth0 vs Clerk vs Keycloak

```
                       ┌─ Precisa self-hosted, controle total? ── Sim ── Precisa IAM enterprise? ── Sim ──► Keycloak
                       │                                          │
                       │                                          └── Auth leve para MVP? ──► Lucia Auth
  Qual auth            │
  escolher?            ├─ Precisa time-to-market mínimo? ── Sim ──► Clerk (React components prontos)
                       │
                       ├─ Precisa SSO enterprise + MFA + SAML? ── Sim ──► Auth0 (ou Keycloak self-hosted)
                       │
                       └── Orçamento zero? ──► Lucia Auth (SQLite) ou Clerk (free tier 10K MAU)

  Recomendação IDEIA: Lucia Auth (MVP single-user), Clerk (multi-user), Keycloak (enterprise)
```

### Decisão 7: Terraform vs Pulumi vs Dagger

```
                       ┌─ Equipe prefere HCL declarativo? ── Sim ──► Terraform (ou OpenTofu para evitar BSL)
                       │
                       ├─ Equipe prefere TypeScript/Python? ── Sim ──► Pulumi
  Qual IaC             │
  escolher?            ├─ Precisa CI/CD portátil (local = CI)? ── Sim ──► Dagger
                       │
                       └─ Precisa ambos? ──► Pulumi + Dagger (Pulumi para infra, Dagger para pipeline)

  Recomendação IDEIA: OpenTofu (IaC), Dagger (pipeline CI/CD)
```

### Decisão 8: Prometheus vs Datadog vs SigNoz

```
                       ┌─ Orçamento enterprise? ── Sim ──► Datadog (tudo-em-um, $15/host/dia)
                       │
                       ├─ Precisa self-hosted, open-source? ── Sim ──► SigNoz (OpenTelemetry nativo)
  Qual                │                                    │
  observabilidade?    │                                    └── Precisa métricas + logs + tracing? ──► SigNoz > Prometheus + Loki + Jaeger
                       │
                       └─ Precisa apenas métricas? ──► Prometheus + Grafana

  Recomendação IDEIA: Prometheus + Grafana (métricas), LangFuse (LLM), SigNoz (futuro unified)
```

---

## Caminhos de Migração

### Migração 1: In-Memory/JSON → SQLite/DuckDB

**Current:** `MemoryStore` serializa JSON para arquivos. Sem query, sem FTS, sem relacionamentos.

**Target:** SQLite (transacional) + DuckDB (analítico)

```
Etapas:
┌──────┬──────────────────────────────────────────────┬──────────────────┐
│ Passo│ Ação                                          │ Risco           │
├──────┼──────────────────────────────────────────────┼──────────────────┤
│ 1    │ Adicionar better-sqlite3 dependency          │ Baixo           │
│ 2    │ Definir schema inicial: memory_store,        │ Baixo           │
│      │   patterns, conversations, sessions          │                 │
│ 3    │ Migrar MemoryStore para usar SQLite           │ Médio (API)     │
│ 4    │ Adicionar FTS5 para full-text search         │ Baixo           │
│ 5    │ Adicionar sqlite-vec para busca vetorial     │ Médio (embed)   │
│ 6    │ Migrar histórico de sessão p/ SQLite         │ Médio (dados)   │
│ 7    │ Adicionar DuckDB para queries analíticas      │ Baixo           │
│ 8    │ Remover JSON serialização legada             │ Baixo           │
│ 9    │ Testar compatibilidade reversa                │ Crítico         │
│ 10   │ Remover código in-memory bridge              │ Médio           │
└──────┴──────────────────────────────────────────────┴──────────────────┘
```

### Migração 2: Event Bus In-Memory → NATS JetStream

**Current:** EventEmitter-based pub/sub in-memory. Sem persistência, sem consumer groups, sem garantias.

**Target:** NATS + JetStream com streams, consumers, KV store

```
Etapas:
┌──────┬──────────────────────────────────────────────────┬───────────────┐
│ Passo│ Ação                                             │ Risco         │
├──────┼──────────────────────────────────────────────────┼───────────────┤
│ 1    │ Adicionar nats RPC dependency                     │ Baixo         │
│ 2    │ Criar NATSConnectionManager (singleton)           │ Médio         │
│ 3    │ Criar NATSEventBus implementando EventBus         │ Médio (API)   │
│ 4    │ Definir streams: agent_events, audit, system      │ Médio         │
│ 5    │ Implementar dual-publish (in-memory + NATS)       │ Crítico       │
│ 6    │ Validar todos consumers migrados                  │ Crítico       │
│ 7    │ Remover in-memory EventEmitter                    │ Médio         │
│ 8    │ Adicionar JetStream KV para config distrib       │ Médio         │
│ 9    │ Adicionar consumer groups para workers           │ Médio         │
│ 10   │ Remover dual-publish, manter só NATS             │ Baixo         │
└──────┴──────────────────────────────────────────────────┴───────────────┘
```

### Migração 3: Monaco Standalone → Theia Platform

**Current:** `monaco-editor` standalone + React wrapper (`@monaco-editor/react`). Providers custom (completion, hover).

**Target:** Theia Platform com VS Code extension API (~80% compat)

```
Etapas:
┌──────┬────────────────────────────────────────────────────┬──────────────┐
│ Passo│ Ação                                               │ Risco        │
├──────┼────────────────────────────────────────────────────┼──────────────┤
│ 1    │ Theia Architecture Research (completo)              │ Baixo        │
│ 2    │ Criar Theia Blueprint com widget shell básico       │ Médio        │
│ 3    │ Portar React components para Theia widgets          │ Alto         │
│ 4    │ Migrar Monaco standalone → Theia Monaco Widget       │ Alto         │
│ 5    │ Implementar LSP via Theia Language Server           │ Alto         │
│ 6    │ Portar MCP tools como Theia contributions           │ Médio        │
│ 7    │ Manter dual-build (Monaco standalone + Theia)       │ Crítico      │
│ 8    │ Testar compatibilidade VS Code extensions           │ Crítico      │
│ 9    │ Theia Cloud para workspaces remotos                 │ Alto         │
│ 10   │ Depreciar Monaco standalone build                   │ Médio        │
└──────┴────────────────────────────────────────────────────┴──────────────┘
```

### Migração 4: File CRUD REST → NATS Event-Driven

**Current:** `POST /api/files/` REST endpoints para CRUD de arquivos. Request/response síncrono.

**Target:** Event-driven via NATS. File mutations publicam eventos; consumidores reagem.

```
Etapas:
┌──────┬──────────────────────────────────────────────────────┬──────────────┐
│ Passo│ Ação                                                 │ Risco        │
├──────┼──────────────────────────────────────────────────────┼──────────────┤
│ 1    │ Definir schema de eventos FileCreated, FileUpdated,  │ Baixo        │
│      │   FileDeleted, FileMoved                             │              │
│ 2    │ Criar NATS stream "files" com subjects               │ Baixo        │
│ 3    │ Implementar dual-write (REST + publish event)        │ Crítico      │
│ 4    │ Criar FileConsumer: indexar, notificar watchers      │ Médio        │
│ 5    │ Criar FileConsumer: triggers CI, LSP re-diagnose     │ Médio        │
│ 6    │ Migrar FileExplorer para consumir eventos            │ Alto         │
│ 7    │ Remover REST CRUD, manter apenas queries read        │ Médio        │
│ 8    │ Adicionar saga para operações multi-file             │ Alto         │
│ 9    │ Remover dual-write                                   │ Baixo        │
└──────┴──────────────────────────────────────────────────────┴──────────────┘
```

---

## Threat Modeling

### Categoria A: Editor e IDE

| Ameaça | Vetor | Impacto | Mitigação |
|--------|-------|---------|-----------|
| XSS via Monaco | Inserção de texto malicioso no editor → execução de script no contexto do webview | Crítico (execução remota) | Sanitizar output, CSP headers, Monaco isolado em iframe sandbox |
| Path Traversal | File Explorer / LSP acessam caminhos fora do workspace | Alto (leitura de arquivos arbitrários) | Path validation, workspace root binding, sandbox FS |
| File Overwrite | Agente escreve sobre arquivo crítico sem permissão | Alto (perda de dados) | Policy engine (auto/ask/block), version control integration, backup |
| LSP Server Spoofing | Servidor LSP malicioso retorna código/autocomplete malicioso | Médio | Validar origem do LSP, TLS, checksum |
| Monaco Extension Abuse | Extensão maliciosa acessa APIs privilegiadas | Alto | Sandbox de extensões, permission model |
| Terminal Escape | Injeção de comando via terminal | Crítico | node-pty policy, character filtering, ask/confirm em comandos destrutivos |

### Categoria B: IA

| Ameaça | Vetor | Impacto | Mitigação |
|--------|-------|---------|-----------|
| Prompt Injection | Usuário injeta instruções maliciosas no prompt | Alto (bypass de restrições) | LLM Guard, rebuff, OWASP LLM01 mitigations |
| Model Theft | Extração do modelo local via queries repetidas | Alto (perda de IP) | Rate limiting, detecção de padrões de extração, watermarking |
| Data Leakage | Modelo vaza dados de treino ou contexto de outros usuários | Alto (privacidade) | Guardrails output scanning, PII detection, context isolation |
| Jailbreak | Técnicas de bypass (Do Anything Now, etc) | Alto | Multiple guard layers (LLM Guard + custom rules), continuous update |
| Training Data Extraction | Query engenharia reversa do modelo | Médio | Rate limiting, perplexity detection |
| Supply Chain (Modelo) | Modelo comprometido via Ollama/GGUF modificado | Crítico | Checksum verification, SBOM, modelos apenas de sources oficiais |

### Categoria C: Modelos

| Ameaça | Vetor | Impacto | Mitigação |
|--------|-------|---------|-----------|
| Supply Chain Attack | Modelo GGUF trocado por backdoored | Crítico (execução remota via modelo) | Checksums SHA256, signature verification, pinned versions |
| Backdoor Model | Modelo treinado com triggers específicos | Alto (comportamento malicioso) | Red teaming (Garak), input/output monitoring, provenance tracking |
| Model Poisoning | Dados de fine-tuning contaminados | Alto | Data validation, provenance, differential privacy |
| Quantization Attack | Explora erros de quantização para inferir dados | Médio | Non-deterministic outputs noise, rate limiting |
| Reverse Engineering | Extração de pesos via queries | Médio | Access control, rate limiting, query pattern detection |

### Categoria D: Memória

| Ameaça | Vetor | Impacto | Mitigação |
|--------|-------|---------|-----------|
| Data Poisoning | Inserção de dados falsos na memória para manipular agente | Alto (decisões incorretas) | Validation pipeline, provenance tracking, anomaly detection |
| Unauthorized Memory Access | Leitura de memória de outro usuário/sessão | Alto (privacidade) | Row-level security, session isolation, encryption at rest |
| Memory Injection | SQL injection via sqlite-vec/FTS5 | Alto | Parameterized queries, ORM, input sanitization |
| Embedding Leakage | Embeddings revelam informação sensível | Médio | Embedding encryption, access control, low-dimensional projection |
| Vector Store Pollution | Vectors maliciosos forçam falsos positivos em buscas | Médio | Anomaly detection in vector space, outlier removal |
| Graph Injection | Inserção de nós/relações falsos no knowledge graph | Alto | Validation rules, provenance, graph consistency checks |

### Categoria E: Eventos

| Ameaça | Vetor | Impacto | Mitigação |
|--------|-------|---------|-----------|
| Topic Hijacking | Publicação em tópicos não autorizados | Alto (comandos arbitrários) | NATS auth (NKEYS, JWT), ACL por subject, TLS |
| Replay Attack | Re-envio de eventos capturados | Médio (duplicação, estado incorreto) | Idempotency keys, deduplication, timestamps |
| Event Injection | Injeção de eventos falsos no stream | Alto (estado corrompido) | Producer validation, signatures, source attestation |
| Consumer Isolation | Consumer lê eventos de outro tenant | Alto (vazamento de dados) | NATS account isolation, scoped streams, subject filtering |
| Denial of Service | Flood de eventos sobrecarrega JetStream | Médio | Rate limiting, backpressure, stream limits (maxMsgs, maxBytes) |
| Audit Tampering | Modificação do trail de auditoria | Alto (não-repúdio quebrado) | Append-only streams, cryptographic audit trail, periodic hash chain |

### Categoria F: Segurança

| Ameaça | Vetor | Impacto | Mitigação |
|--------|-------|---------|-----------|
| Policy Bypass | Agente executa ação sem passar pelo policy engine | Crítico | Middleware obrigatório, enforcement no runtime, audit |
| Privilege Escalation | Usuário ganha permissões não autorizadas | Alto | RBAC validation em cada request, OPA/Cedar policies |
| OAuth Token Theft | Roubo de JWT/token de acesso | Alto (acesso total) | Short-lived tokens, refresh rotation, binding (sender constraint) |
| Session Hijacking | Sequestro de sessão de agente | Alto | Session binding, device fingerprint, WebSocket token validation |
| Credential Stuffing | Ataque de força bruta em login | Médio | Rate limiting, MFA, account lockout |
| SSRF via Agent | Agente acessa recursos internos da rede | Alto | Network policy, allowed hosts whitelist, sandboxed fetch |

### Categoria G: CI/CD

| Ameaça | Vetor | Impacto | Mitigação |
|--------|-------|---------|-----------|
| Artifact Tampering | Artefato de build modificado entre CI e deploy | Crítico | Signature verification (SLSA), SBOM attestation, checksums |
| Secret Exposure | Secret vazado em log, artefato, ou output de CI | Crítico | Secret scanning (talisman, trufflehog), masked secrets, audit |
| Supply Chain | Dependência maliciosa em build | Crítico | Lockfile, Dependabot/Renovate, npm audit, SCA |
| CI Pipeline Injection | Modificação de workflow YAML para execução arbitrária | Alto | Branch protection, required reviews, signed commits |
| Cache Poisoning | Cache de CI comprometido | Alto | Cache keys imutáveis, checksum validation, isolated caches |
| Deploy Misconfiguration | Config incorreta expõe dados ou serviços | Alto | Infrastructure policy (OPA/Cedar), pre-deploy validation, canary |

### Categoria H: Observabilidade

| Ameaça | Vetor | Impacto | Mitigação |
|--------|-------|---------|-----------|
| Span Injection | Injeção de spans falsos no OpenTelemetry | Médio (alertas falsos, custo) | Sampling control, span validation, rate limiting |
| Metric Flooding | Métricas falsas sobrecarregam Prometheus | Médio | Rate limiting, aggregation, budget alert |
| Log Injection | Logs falsos contaminam Loki/ELK | Médio | Log validation, structured logging, rate limiting |
| Trace Leakage | Dados sensíveis em traces de LLM | Alto (privacidade) | PII redaction em spans, selective recording, attribute filtering |
| Dashboard Manipulation | Modificação de dashboards Grafana | Médio | Grafana RBAC, audit logs |
| Metric-based Recon | Uso de métricas para descobrir infraestrutura | Baixo | Métricas agregadas, sem detalhes internos |

### Categoria I: Dados

| Ameaça | Vetor | Impacto | Mitigação |
|--------|-------|---------|-----------|
| SQL Injection | Query maliciosa via input do usuário | Crítico | Parameterized queries, ORM, input sanitization |
| Data Exfiltration | Extração massiva de dados via API | Alto | Rate limiting, pagination limits, anomaly detection |
| Unauthorized Access | Acesso a dados de outro tenant | Alto | RLS (Row Level Security), auth middleware, encryption |
| Backup Compromise | Backup criptografado exposto | Alto | Encryption at rest (AES-256), key rotation, access audit |
| Schema Poisoning | Modificação de schema para corromper dados | Alto | Migration validation, schema contracts, rollback plan |
| Query Injection via Vector | Embedding query retorna dados não autorizados | Médio | Metadata filtering + RLS, vector collection isolation |

### Categoria J: Desktop

| Ameaça | Vetor | Impacto | Mitigação |
|--------|-------|---------|-----------|
| Binary Tampering | Executável modificado com malware | Crítico | Code signing (Authenticode, notarization), integrity checks (Tauri) |
| IPC Spoofing | Aplicativo malicioso simula IPC commands | Alto | IPC origin validation, authenticated channels, Tauri allowlist |
| Webview Injection | Injeção via webview para acesso ao sistema | Alto | Context isolation (Tauri), CSP, disable node integration |
| File System Abuse | App desktop acessa arquivos fora do workspace | Alto | Tauri FS scope, permission dialogs |
| Update Hijacking | Atualização automática redirecionada para malware | Crítico | Signed updates, HTTPS update URLs, checksum verification |
| Clipboard Poisoning | Dados maliciosos no clipboard | Médio | Clipboard sanitization, paste confirmation (ações críticas) |

### Categoria K: Agentes

| Ameaça | Vetor | Impacto | Mitigação |
|--------|-------|---------|-----------|
| Agent Impersonation | Agente falso se passa por agente legítimo | Alto (ações arbitrárias) | Agent identity (JWT), cryptographic signing, A2A auth |
| Tool Abuse | Agente usa ferramenta de forma maliciosa | Alto | Tool permissions by agent role, input/output validation |
| Resource Exhaustion | Agente cria loops infinitos ou satura recursos | Médio | Timeout, max steps, resource quotas, circuit breaker |
| Collusion | Múltiplos agentes combinam para bypass | Alto | Cross-agent audit, policy intersection, anomaly detection |
| Unauthorized Delegation | Agente delega tarefa para agente não autorizado | Alto | Delegation policy, agent hierarchy validation |
| Agent-to-Agent Injection | Agente injeta instruções maliciosas em outro agente | Alto | A2A message validation, trust boundaries, content scanning |

### Matriz Resumo Threat Modeling

| Categoria | Crítico | Alto | Médio | Total |
|-----------|---------|------|-------|-------|
| A (Editor) | 2 | 2 | 1 | 5 |
| B (IA) | 1 | 4 | 1 | 6 |
| C (Modelos) | 1 | 3 | 1 | 5 |
| D (Memória) | 0 | 3 | 2 | 5 |
| E (Eventos) | 0 | 4 | 2 | 6 |
| F (Segurança) | 1 | 4 | 1 | 6 |
| G (CI/CD) | 2 | 3 | 1 | 6 |
| H (Observab.) | 0 | 1 | 4 | 5 |
| I (Dados) | 1 | 4 | 1 | 6 |
| J (Desktop) | 2 | 2 | 1 | 5 |
| K (Agentes) | 0 | 4 | 2 | 6 |
| **Total** | **10** | **34** | **17** | **61** |

---

## Roadmap Atualizado

### Status de Adoção Atual (v2 update vs v1)

| Tecnologia | v1 Status | v2 Status | Δ |
|------------|-----------|-----------|---|
| Monaco Editor | ✅ | ✅ | — |
| React 18 + Vite | ✅ | ✅ | — |
| WebSocket / SSE | ✅ | ✅ | — |
| MCP | ✅ | ✅ | — |
| Provider Router | ✅ | ✅ | — |
| Ollama | ✅ | ✅ | — |
| GitHub Actions | ✅ | ✅ | — |
| Docker | ✅ | ✅ | — |
| xterm.js | ✅ | ✅ | — |
| LSP | 🟡 | 🟡 | — |
| node-pty | 📖 | 🟡 | ✅ iniciado |
| SQLite | 🟡 | 🟡 | — |
| OWASP LLM Top 10 | 📖 | 📖 | — |
| MITRE ATLAS | 📖 | 📖 | — |
| LangFuse | ❌ | ❌ | — |
| Sentry | ❌ | ❌ | — |
| OpenTelemetry | 🟡 | 🟡 | — |
| Redis | ❌ | ❌ | — |
| Tree-sitter | 📖 | ❌ | ↘ (depriorizado) |
| Theia | 📖 | 📖 | — |
| Electron / Tauri | ❌ | ❌ | — |
| NATS + JetStream | ❌ | ❌ | — |
| PostgreSQL | ❌ | ❌ | — |
| **NOVO: Playwright** | — | ❌ | Novo |
| **NOVO: Clerk** | — | ❌ | Novo |
| **NOVO: PostHog** | — | ❌ | Novo |
| **NOVO: Nx** | — | ❌ | Novo |
| **NOVO: pnpm** | — | 🟡 | Novo (recomendado) |
| **NOVO: Changesets** | — | ❌ | Novo |

### Percentuais Atualizados (com 95 tecnologias)

| Métrica | v1 | v2 | Δ |
|---------|----|----|---|
| Total tecnologias catalogadas | 65 | **95** | +30 |
| Implementadas (✅) | 14 (22%) | **14 (15%)** | -7% (base maior) |
| Esqueleto/parcial (🟡) | 12 (18%) | **13 (14%)** | -4% |
| Não implementadas (❌) | 31 (48%) | **60 (63%)** | +15% |
| Estudadas (📖) | 15 (23%) | **15 (16%)** | -7% |
| Não estudadas (🔬) | 13 (20%) | **8 (8%)** | -12% |
| P0 (MVP obrigatório) | 15 (23%) | **15 (16%)** | -7% |
| P1 (Essencial) | 15 (23%) | **27 (28%)** | +5% |
| P2 (Importante v1.x) | 20 (31%) | **29 (31%)** | — |
| P3 (Desejável v2+) | 15 (23%) | **24 (25%)** | +2% |

### Fase 0: Fundação (Semanas 1-2) — NOVO

| Tecnologia | Ação | Depende de |
|------------|------|------------|
| pnpm | Migrar npm → pnpm workspaces | — |
| Vite + React | Já implementado | — |
| Monaco Editor | Já implementado | — |
| PostHog | Iniciar rastreamento de produto | — |
| Sentry | Captura de erros | — |
| **NOVO: Changesets** | Versionamento monorepo | pnpm |
| **NOVO: Lucia Auth** | Auth embarcada (single-user) | SQLite |

### Fase 1: MVP (Semanas 3-6) — Tecnologias P0 (atualizado)

| Tecnologia | Ação | Depende de |
|------------|------|------------|
| Monaco Editor | ✅ OK | — |
| React 18 + Vite | ✅ OK | — |
| WebSocket / SSE | ✅ OK | — |
| xterm.js | Integrar | node-pty |
| node-pty | Implementar | WebSocket |
| Ollama | ✅ OK | — |
| Provider Router | ✅ OK | — |
| LSP | Integrar Monaco providers | LSP Server |
| SQLite | Implementar persistência | — |
| MCP | ✅ OK (expandir) | — |
| GitHub Actions | ✅ OK | — |
| Docker | ✅ OK | — |
| Message Patterns | ✅ OK (event-bus) | — |
| **NOVO: pnpm** | Migração | — |
| **NOVO: Clerk** | Multi-user auth | Lucia (upgrade) |
| **NOVO: Playwright** | E2E tests | CI/CD |

### Fase 2: v1.1 (Semanas 7-10) — Tecnologias P1 (atualizado)

| Tecnologia | Ação | Depende de |
|------------|------|------------|
| DeepSeek-Coder-V2 / Phi-4 | Configurar via Ollama | — |
| Redis | Implementar cache + pub/sub | SQLite |
| LLM Guard / rebuff | Implementar guardrails | Provider Router |
| OWASP LLM Top 10 | Baseline segurança | — |
| Sentry | Error tracking | — |
| OpenTelemetry | Instrumentar | — |
| LangFuse | Tracing LLM | Provider Router |
| Artifacts Estruturados | Padrão saída IA | Chat UI |
| **NOVO: Nx** | Monorepo build | pnpm |
| **NOVO: esbuild** | Build rápido | Vite |
| **NOVO: Schemathesis** | API fuzzing | OpenAPI |
| **NOVO: DeepEval** | Avaliação LLM | Provider Router |

### Fase 3: v1.2 (Semanas 11-18) — Tecnologias P2 (atualizado)

| Tecnologia | Ação | Depende de |
|------------|------|------------|
| Tauri v2 | Empacotamento desktop | React SPA |
| WebAssembly | Tree-sitter Wasm, plugins | — |
| VS Code Extensions | Bridge compatibilidade | MCP |
| Qwen2.5-Coder / StarCoder2 | Modelos adicionais | — |
| CodeMirror | Chat code blocks | UI |
| Neo4j | Knowledge graph | SQLite |
| DuckDB | Analytics local | SQLite |
| Mem0 / Zep | Memory layer avançada | SQLite |
| GraphRAG | RAG com knowledge graph | Neo4j |
| NATS + JetStream | Upgrade event bus | Event Bus |
| OpenRouter | Gateway multi-provider | Provider Router |
| OPA / Cedar | Policy engine padrão | Policy Engine |
| PostgreSQL + pgvector | Storage relacional | SQLite |
| Kubernetes | Orquestração deploy | Docker |
| OpenTofu | IaC | — |
| Prometheus + Grafana | Monitoramento | OpenTelemetry |
| Loki | Logging centralizado | OTel |
| DAP | Debug integration | LSP |
| JWT / RBAC / OAuth2 | Identidade | Clerk |
| A2A Protocol | Comunicação agentes | MCP |
| **NOVO: PWA** | Service Worker + Offline | React SPA |
| **NOVO: Push Notifications** | Notificações agente | PWA |
| **NOVO: Traefik** | Proxy dev local | Docker/K3s |
| **NOVO: StrykerJS** | Mutation testing | Playwright |
| **NOVO: RAGAS** | RAG evaluation | RAG Pipeline |

### Fase 4: v2+ (Semana 19+) — Tecnologias P3 (atualizado)

| Tecnologia | Ação | Depende de |
|------------|------|------------|
| Theia Platform | Substituição IDE | Tauri/React |
| LangChain / LangGraph | Se graphs complexos | Provider Router |
| Semantic Kernel | Alternativa LangChain | — |
| CrewAI / AutoGen | Multi-agente | Agent Runtime |
| Mamba-2 / SSMs | Pesquisa modelos | — |
| Apache Kafka / Redpanda | Streaming massivo | NATS |
| RabbitMQ / Pulsar | Mensageria adicional | — |
| ZeroMQ | IPC local | — |
| Pinecone / Weaviate / Qdrant / Milvus | Vector DB escala | PostgreSQL |
| MinIO / R2 / Tigris | Object storage | — |
| Turso / libSQL | SQLite distribuído | SQLite |
| Apache Iceberg / Delta Lake | Data lake | DuckDB |
| Flagger | Canary deploy | K8s |
| Unleash / Flagsmith | Feature flags | — |
| ArgoCD / Flux | GitOps | K8s |
| Dagger | Pipeline portátil | CI/CD |
| Garak / PyRIT | Red teaming | — |
| Pact | CDC testing | CI/CD |
| Kong / Tyk | API Gateway | K8s |
| Istio / Linkerd | Service Mesh | K8s |
| Cloudflare Workers | Edge computing | — |
| React Native / Expo | Mobile companion | API |
| Next.js | SSR se necessário | Vite |
| WebTransport | Transporte futuro | — |
| Segment (CDP) | Event routing | PostHog |

### Dependências entre Adoções

```
pnpm ──► Nx ──► esbuild ──► Build otimizado
  │
  ├──► Changesets ──► Versionamento
  │
  └──► Playwright ──► StrykerJS ──► Qualidade

SQLite ──► DuckDB ──► Analytics
  │         │
  │         └──► Iceberg/Delta ──► Data Lake
  │
  ├──► sqlite-vec ──► pgvector ──► Qdrant/Milvus
  │
  ├──► Turso ──► Edge replicação
  │
  └──► PostgreSQL ──► Neon/CockroachDB

Event Bus (mem) ──► NATS JetStream ──► Kafka/Redpanda
                    │
                    └──► A2A Protocol ──► Multi-agent

React (Monaco) ──► Tauri v2 ──► Theia Platform
                    │
                    └──► PWA ──► Push Notifications

Clerk ──► Auth0/Keycloak ──► Enterprise IAM

Provider Router ──► OpenRouter ──► Multi-provider avançado
  │
  ├──► LangFuse ──► DeepEval/LangSmith
  │
  └──► LLM Guard ──► Garak/PyRIT

Policy Engine ──► OPA/Cedar ──► Autorização avançada
```

### Risco por Adoção

| Tecnologia | Risco | Razão | Mitigação |
|------------|-------|-------|-----------|
| Theia Platform | 🔴 Alto | Complexidade alta, reescrita do editor | Dual-build, migração gradual |
| NATS + JetStream | 🟠 Médio | Mudança arquitetural no event bus | Dual-publish, rollback |
| Tauri v2 | 🟠 Médio | Rust não dominado pelo time | Escopo limitado inicial |
| Neo4j / GraphRAG | 🟠 Médio | Stack nova, query Cypher | Prova de conceito antes |
| PostgreSQL + pgvector | 🟠 Médio | Ops burden, migração dados | Começar com SQLite + bridge |
| Nx | 🟢 Baixo | Apenas build, sem impacto runtime | Paralelo com npm scripts |
| Playwright | 🟢 Baixo | Testes isolados | CI parallel |
| Clerk | 🟢 Baixo | Auth externalizada | Lucia como fallback |
| PostHog | 🟢 Baixo | Analytics externo | Self-host opção |
| pnpm | 🟢 Baixo | Gerenciador pacotes | CI test, rollback simples |

---

> **Documento gerado em:** 2026-07-18
> **Versão:** 2.0-suplemento
> **Propósito:** Adição à Matriz Tecnológica v1 — categorias L-R, benchmarks, árvores de decisão, migração, threat modeling e roadmap
> **Total de tecnologias adicionadas:** 30
> **Total de tecnologias na matriz:** 95
> **Próximo passo:** Integrar este suplemento ao MATRIZ-TECNOLOGICA-COMPLETA.md v2 consolidado
