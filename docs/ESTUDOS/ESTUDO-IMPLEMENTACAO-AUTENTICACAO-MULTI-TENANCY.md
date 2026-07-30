# ESTUDO-IMP-AUTH — Implementação de Autenticação e Multi-Tenancy Enterprise

> **Data:** 2026-07-25
> **Versão:** 1.0
> **Nível de Profundidade:** 6 (Engenharia)
> **Área:** Segurança, Infraestrutura
> **Dependências:** ESTUDO-AUTENTICACAO-AUTORIZACAO, S65 (Enterprise Compliance), S59 (Theia Cloud Multi-tenant)
> **Conexões:** ESTUDO-IMP-QUALIDADE, S14 (Autenticação/Autorização), S58 (Data Strategy)
> **Propósito:** Plano de implementação completo para autenticação, autorização RBAC/ABAC e multi-tenancy na IDEIA.

---

## 1. FUNDAMENTOS

### 1.1 Problema e Contexto

A IDEIA atualmente **não possui autenticação**. Todo o sistema opera sem identidade de usuário, o que bloqueia:

- Multi-tenancy (Theia Cloud, enterprise)
- Auditoria por usuário (quem fez o quê)
- Políticas de segurança baseadas em identidade
- Sessões persistentes entre dispositivos
- Compliance (SOC2, LGPD, GDPR — requisição de acesso)
- Colaboração em tempo real entre usuários

**303 ocorrências** de `process.env` no codebase e **191** de `.env` — sem centralização nem criptografia.

### 1.2 Glossário

| Termo | Definição |
|-------|-----------|
| IdP | Identity Provider (Auth0, Clerk, Keycloak) |
| RBAC | Role-Based Access Control — permissões por papel |
| ABAC | Attribute-Based Access Control — permissões por atributos |
| Tenant | Isolamento lógico de dados/config para um cliente/organização |
| JWT | JSON Web Token — token de autenticação stateless |
| OIDC | OpenID Connect — camada de identidade sobre OAuth 2.0 |
| SCIM | System for Cross-domain Identity Management — provisionamento de usuários |

### 1.3 Arquitetura de Alto Nível

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Usuário   │────▶│   IdP (MVP)  │────▶│  Auth0/Clerk │
│  (Browser)  │     │  (Auth0)     │     │  (Cloud)     │
└──────┬──────┘     └──────┬───────┘     └──────┬───────┘
       │                   │                     │
       │    JWT + OIDC     │                     │
       ▼                   ▼                     ▼
┌──────────────────────────────────────────────────────┐
│                IDEIA Gateway (Traefik/Nginx)           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │ Auth Middleware│ │ Tenant Resolver│ │ Rate Limiter ││
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘│
└─────────┼──────────────────┼──────────────────┼───────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌──────────────────────────────────────────────────────┐
│              Serviços Internos (NATS + CLI)           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │ Policy Engine │  │  Audit Trail │  │  Data Layer  ││
│  │ (com tenant)  │  │(com usuário) │  │(com tenant)  ││
│  └──────────────┘  └──────────────┘  └──────────────┘│
└──────────────────────────────────────────────────────┘
```

---

## 2. TÉCNICO

### 2.1 Provedores de Identidade — Comparação

| Característica | Auth0 | Clerk | Keycloak (Self-hosted) |
|---------------|-------|-------|----------------------|
| Tipo | Cloud/SaaS | Cloud/SaaS | Self-hosted (open-source) |
| Complexidade | Baixa | Baixa | Alta |
| Custo por usuário | Grátis até 7k MAU | Grátis até 10k MAU | Gratuito (infra própria) |
| MFA | ✅ | ✅ | ✅ |
| SSO/SAML | ✅ (enterprise) | ✅ (enterprise) | ✅ |
| SCIM | ✅ (enterprise) | ✅ (enterprise) | ✅ |
| Multi-tenant nativo | ✅ Organizations | ✅ | ✅ (realms) |
| Theia integration | ⚠️ Custom | ⚠️ Custom | ⚠️ Custom |
| RBAC | ✅ | ✅ | ✅ |
| ABAC | ⚠️ Custom | ❌ | ✅ Custom |
| Audit logs | ✅ | ✅ | ✅ |
| **Recomendação** | **MVP** | Alternativa | **Enterprise** |

### 2.2 Modelo de Dados de Identidade

```typescript
// packages/ideia-auth/src/types.ts
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  tenantIds: string[];
  roles: string[];
  permissions: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  lastLoginAt: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  settings: TenantSettings;
  features: string[]; // Feature flags por tenant
  createdAt: string;
}

interface TenantSettings {
  maxUsers: number;
  maxProjects: number;
  maxStorageGB: number;
  allowedProviders: string[];
  dataRetentionDays: number;
  complianceMode: 'standard' | 'lgpd' | 'gdpr' | 'soc2';
}
```

### 2.3 Middleware de Autenticação

```typescript
// packages/security-middleware/src/auth-middleware.ts
class AuthMiddleware {
  constructor(
    private idp: IdentityProvider,
    private tenantResolver: TenantResolver,
    private policyEngine: PolicyEngine
  ) {}

  async authenticate(token: string): Promise<AuthContext> {
    const payload = await this.idp.verifyToken(token);
    const tenant = await this.tenantResolver.resolve(payload.tenantId);
    return {
      user: payload,
      tenant,
      permissions: await this.policyEngine.evaluate(payload.roles, tenant.settings),
      isExpired: Date.now() > payload.exp * 1000,
    };
  }

  // Decorator para rotas protegidas
  requirePermission(permission: string) {
    return (target: any, key: string, descriptor: PropertyDescriptor) => {
      const original = descriptor.value;
      descriptor.value = function (...args: any[]) {
        const ctx = args.find(a => a instanceof AuthContext);
        if (!ctx || !ctx.permissions.includes(permission)) {
          throw new AppError('FORBIDDEN', 'Missing permission: ' + permission);
        }
        return original.apply(this, args);
      };
    };
  }
}
```

---

## 3. ENGENHARIA

### 3.1 Integração com Ecossistema IDEIA

```
Pacote: @ideia/ideia-auth (novo)
Depende de: @ideia/policy-engine, @ideia/audit-trail, @ideia/data-layer
Consumido por: @ideia/cli, @ideia/ideia-plugin, @ideia/theia-cloud, @ideia/api-server
```

#### Integração com CLI

```typescript
// packages/cli/src/commands/auth.ts
class AuthCommand {
  async login(options: { provider?: string; tenant?: string }): Promise<void> {
    // Inicia OIDC flow → redireciona para browser
    const authUrl = await this.auth.initLogin({ tenant: options.tenant });
    console.log(`Abra: ${authUrl}`);
    const token = await this.auth.waitForCallback();
    this.config.set('auth.token', token);
    this.config.set('auth.user', token.user);
    console.log(`✅ Logado como ${token.user.email}`);
  }

  async logout(): Promise<void> {
    this.config.delete('auth.token');
    this.config.delete('auth.user');
    console.log('✅ Deslogado');
  }

  async whoami(): Promise<void> {
    const token = this.config.get('auth.token');
    if (!token) { console.log('❌ Não logado'); return; }
    const user = await this.auth.verify(token);
    console.log(`👤 ${user.name} (${user.email})`);
    console.log(`🏢 Tenant: ${user.tenantIds.join(', ')}`);
    console.log(`🎭 Roles: ${user.roles.join(', ')}`);
  }
}
```

#### Integração com Theia Plugin

```typescript
// packages/ideia-plugin/src/browser/auth-contribution.ts
@injectable()
export class AuthContribution implements FrontendApplicationContribution {
  async onStart(app: FrontendApplication): Promise<void> {
    const token = localStorage.getItem('ideia-auth-token');
    if (!token) {
      this.messageService.warn('Faça login para usar recursos IDEIA');
      this.openLoginDialog();
      return;
    }
    await this.authService.initialize(token);
  }
}
```

### 3.2 Multi-Tenancy na Camada de Dados

```typescript
// Abordagem: Row-Level Security (RLS) no PostgreSQL
// Vantagem: isolamento garantido no banco, sem vazamento acidental

-- Exemplo de migração para suporte a tenant
ALTER TABLE projects ADD COLUMN tenant_id VARCHAR(64) NOT NULL;
ALTER TABLE conversations ADD COLUMN tenant_id VARCHAR(64) NOT NULL;
ALTER TABLE memory_records ADD COLUMN tenant_id VARCHAR(64) NOT NULL;

-- RLS Policy: usuário só vê dados do seu tenant
CREATE POLICY tenant_isolation ON projects
  USING (tenant_id = current_setting('app.tenant_id')::VARCHAR);

-- Habilitar RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_records ENABLE ROW LEVEL SECURITY;
```

### 3.3 Pipeline de Implementação

```
FASE 0 — Pré-Auth (Sprint 1, ~8h)
├── Centralizar process.env em config module dedicado
├── Criar @ideia/ideia-auth package (estrutura)
├── Definir schemas User + Tenant (Zod)
└── Remover secrets do código-fonte

FASE 1 — Auth MVP (Sprint 2-3, ~80h)
├── Integrar Auth0 (ou Clerk) — cloud IdP
├── Login OIDC + JWT verification
├── Auth middleware para CLI + Theia plugin
├── Comandos: login, logout, whoami
├── Audit trail por usuário
└── Testes de autenticação e autorização

FASE 2 — RBAC (Sprint 4-5, ~60h)
├── Modelo de roles (admin, dev, viewer, auditor)
├── Permission mapping por comando/rota
├── Policy engine integrado com roles
├── CLI: role management (assign, revoke, list)
└── Theia: UI de gerenciamento de permissões

FASE 3 — Multi-Tenancy (Sprint 6-8, ~120h)
├── Tenant isolation (RLS + schemas separados)
├── Tenant provisioning API
├── Feature flags por tenant
├── Rate limiting por tenant
├── Billing integration (Stripe)
├── Theia Cloud multi-tenant wiring
└── Testes de isolamento entre tenants

FASE 4 — Enterprise (Sprint 9-12, ~100h)
├── SSO/SAML (Azure AD, Google Workspace, Okta)
├── SCIM provisioning
├── ABAC (attribute-based policies)
├── Audit export (SOC2-compliant)
├── Compliance reports por tenant
└── Self-service admin dashboard
```

### 3.4 Segurança

| Aspecto | Implementação |
|---------|--------------|
| Token storage | HTTP-only cookies (web) / keychain (desktop) |
| Token refresh | Silent refresh via refresh_token |
| CSRF | Double-submit cookie pattern |
| Rate limit | 100 req/min por usuário, 1000/min por tenant |
| Session invalidation | Token blacklist via NATS KV |
| MFA | TOTP (via IdP) |
| Audit | Cada login/logout/token refresh registrado |

---

## 4. INOVAÇÃO

### 4.1 Confiança Zero (Zero Trust) na IDEIA

```
Nunca confie, sempre verifique — mesmo dentro da rede interna

├── Cada requisição → re-autentica (JWT)
├── Cada serviço → mTLS entre serviços
├── Cada ação → policy evaluation (ABAC)
├── Cada acesso a dado → RLS check
├── Cada sessão → session binding (IP + device fingerprint)
└── Rotação contínua de chaves
```

### 4.2 Diferenciação Competitiva

| Aspecto | IDEIA | Concorrência |
|---------|-------|--------------|
| Auth integrado ao fluxo de IA | Comando `ai-devkit` requer login | Ferramentas de IA sem auth |
| Multi-tenancy nativo | Cada tenant tem seu pipeline de IA isolado | Monotenant |
| Policy engine + ABAC | Regras de segurança aplicadas a ações da IA | Sem política de IA |
| Audit chain com identidade | SHA-256 chain + usuário + ação | Log simples |

---

## 5. PESQUISA

### 5.1 Referências Técnicas

| Paper/Fonte | Ano | Contribuição |
|-------------|-----|-------------|
| OAuth 2.0 (RFC 6749) | 2012 | Framework de autorização |
| OpenID Connect (RFC 7519) | 2014 | Camada de identidade sobre OAuth |
| "Zero Trust Architecture" (NIST SP 800-207) | 2020 | Modelo de confiança zero |
| "BeyondCorp" (Google) | 2020 | Acesso zero trust corporativo |
| Row-Level Security (PostgreSQL) | 2016 | Isolamento de dados por tenant |

---

## 6. FRONTEIRAS

### 6.1 Problemas em Aberto

| Problema | Impacto | Abordagens Atuais | Gap |
|----------|---------|-------------------|-----|
| Auth para agentes autônomos | Alto | API keys estáticas | Agentes precisam de identidade própria |
| Delegação de permissão para IA | Médio | Role impersonation | IA age como usuário, não como ela mesma |
| Tenant hopping (vazamento entre tenants) | Crítico | RLS + schemas | Testes de isolamento são complexos |
| Revogação de acesso em tempo real | Alto | Token blacklist | Latência entre revogação e生效 |

### 6.2 Roteiro de Pesquisa

| Horizonte | Tópico | Esforço | Risco |
|-----------|--------|---------|-------|
| Curto | Auth MVP (Auth0) | 80h | Baixo |
| Médio | Multi-tenancy + RBAC | 180h | Médio |
| Longo | Zero Trust + ABAC + agent identity | 200h | Alto |

---

## 7. ANÁLISE PARA IDEIA

### 7.1 O Que Existe no Codebase

| Package | O Que Tem | O Que Falta |
|---------|-----------|-------------|
| @ideia/ideia-auth | Package skeleton | Implementação real |
| @ideia/policy-engine | 27 patterns, RBAC básico | Integração com usuário/tenant |
| @ideia/sso | 6 arquivos, estrutura SSO | IdP integration real |
| @ideia/audit-trail | SHA-256 chain | Inclusão de user/tenant |
| @ideia/theia-cloud | 6 arquivos | Auth integration |
| @ideia/data-layer | RLS não implementado | Tenant isolation |

### 7.2 Plano de Implementação Prioritário

| Prioridade | Passo | Esforço | Bloqueia |
|------------|-------|---------|----------|
| 🔴 P0 | Centralizar secrets (process.env → config) | 8h | Tudo |
| 🔴 P0 | Auth0 integration + login/logout | 40h | RBAC, multi-tenant |
| 🟠 P1 | RBAC com policy engine | 40h | Autorização granular |
| 🟠 P1 | Audit trail com identidade | 8h | Compliance |
| 🟡 P2 | Multi-tenancy (RLS) | 80h | Theia Cloud |
| 🟡 P2 | Theia plugin com auth | 16h | UX unificada |
| 🟢 P3 | SSO/SAML enterprise | 40h | Enterprise |
| 🟢 P3 | SCIM provisioning | 20h | Enterprise |

### 7.3 Pipeline de Verificação

```bash
# Testes de autenticação
npx jest packages/ideia-auth/ --coverage

# Verificação de isolamento entre tenants
npx tsx scripts/test-tenant-isolation.ts

# Pentest de autenticação
npx tsx scripts/security-pentest.ts --categories auth

# Compliance check
npx tsx packages/compliance/src/check-auth.ts

# Verificação de secrets hardening
npx tsx scripts/audit/check-secrets-centralization.ts
```

### 7.4 Métricas de Sucesso

| Métrica | Atual | Alvo (Fase 1) | Alvo (Final) |
|---------|-------|---------------|--------------|
| Login funcional | ❌ | ✅ | ✅ |
| Cobertura de auth nas rotas | 0% | 80% | 100% |
| Isolamento entre tenants | ❌ | ❌ | ✅ verificado |
| Tempo de login (P50) | — | < 2s | < 1s |
| Testes de auth | 0 | > 50 | > 200 |

### 7.5 Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Auth0 custo inesperado | Média | Médio | Clerk como fallback gratuito |
| RLS performance impacto | Média | Alto | Benchmark queries com/sem RLS |
| Migração de dados para multi-tenant | Alta | Alto | Script de migrição testado + rollback |
| User experience degradada (login obrigatório) | Média | Médio | Modo offline/anônimo para features básicas |

---

## 8. REFERÊNCIAS

### 8.1 Documentação Oficial
- Auth0: https://auth0.com/docs
- Clerk: https://clerk.com/docs
- Keycloak: https://www.keycloak.org/documentation
- OAuth 2.0: https://oauth.net/2/
- OpenID Connect: https://openid.net/connect/

### 8.2 Projetos Relacionados
- NextAuth.js: inspiração para flow de autenticação
- ZenStack: inspiração para RLS + policy
- Casbin: policy engine alternativo

---

> **Score de Maturidade:** 82/100 ✅
> **Próximo passo:** Iniciar Fase 0 — centralizar secrets (2h de trabalho) + criar package @ideia/ideia-auth
