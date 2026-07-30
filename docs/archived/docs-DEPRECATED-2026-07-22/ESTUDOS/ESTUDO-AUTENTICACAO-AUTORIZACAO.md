# Estudo: Autenticação e Autorização — Projeto IDEIA

> **Data:** 2026-07-18
> **Versão:** 1.0
> **Propósito:** Analisar provedores de autenticação, protocolos, modelos de autorização e estratégias de segurança para o ecossistema IDEIA — cobrindo desktop, web, agentes e CI/CD.
> **Template:** `docs/ESTUDOS/TEMPLATE-ANALISE-PERMANENTE.md`

---

## Sumário

1. [Provedores de Autenticação](#1-provedores-de-autenticação)
   - 1.1 Auth0
   - 1.2 Clerk
   - 1.3 Keycloak
   - 1.4 Supabase Auth
   - 1.5 Firebase Auth
   - 1.6 Passport.js
   - 1.7 Lucia Auth
   - 1.8 Comparação Final

2. [Protocolos e Padrões](#2-protocolos-e-padrões)
   - 2.1 OAuth 2.0 + OIDC
   - 2.2 SAML 2.0
   - 2.3 JWT
   - 2.4 WebAuthn / Passkeys
   - 2.5 Magic Links
   - 2.6 MFA/TOTP

3. [Autorização (RBAC/ABAC)](#3-autorização-rbacabac)
   - 3.1 RBAC — Role-Based Access Control
   - 3.2 ABAC — Attribute-Based Access Control
   - 3.3 Cedar (Amazon) — Policy Engine
   - 3.4 OPA — Open Policy Agent
   - 3.5 Políticas por Workspace/Projeto

4. [Integração com IDEIA](#4-integração-com-ideia)
   - 4.1 Autenticação Desktop vs Web
   - 4.2 Theia Cloud Multi-Tenant
   - 4.3 Agent-to-Service Auth
   - 4.4 API Keys para CI/CD
   - 4.5 Token Refresh, Rotação e Revogação

5. [Segurança de Sessão](#5-segurança-de-sessão)
   - 5.1 Session Management
   - 5.2 CSRF
   - 5.3 XSS
   - 5.4 Cookies vs localStorage
   - 5.5 Session Fixation e Hijacking

---

## 1. Provedores de Autenticação

### 1.1 Auth0

Auth0 é uma plataforma completa de autenticação como serviço (SaaS), com suporte a OAuth 2.0, OIDC, SAML, MFA, e integrações com centenas de providers.

| Aspecto | Detalhes |
|---------|----------|
| **Tipo** | SaaS (Auth0, parte da Okta) |
| **Protocolos** | OAuth 2.0, OIDC, SAML 2.0, LDAP |
| **Social Login** | Google, GitHub, GitLab, Microsoft, Apple (80+) |
| **MFA** | TOTP, SMS, Email, Push (Auth0 Guardian), WebAuthn |
| **Passwordless** | Magic Links, SMS, Social |
| **User Management** | Dashboard admin, APIs de CRUD, Anomaly detection |
| **Brute Force Protection** | Nativo (rate limiting + CAPTCHA) |
| **Anomaly Detection** | Login suspeito, breached password detection |
| **Customization** | Universal Login (hosted), Custom Login (embed), Branding |
| **Actions/Rules** | Serverless functions no fluxo de autenticação |
| **Organizations** | Nativo (multi-tenant), SSO por organização |
| **Self-Hosted** | ❌ (apenas SaaS) |
| **Preço** | Gratuito (7K MAU, social connections ilimitados); $23/mês (B2B, Organizations); $36/mês (B2C) |
| **Limitação gratuita** | 7K usuários ativos mensais, 3 ações customizadas |
| **Data Residency** | EUA, UE, APAC, CA |
| **SDK** | Auth0.js, React SDK, Next.js SDK, Express middleware |
| **Node.js Integration** | `express-oauth2-jwt-bearer`, `auth0-react` |
| **Custo projetado (10K MAU)** | ~$230/mês (B2B plan) |

#### Integração com Express

```typescript
import { auth } from 'express-oauth2-jwt-bearer';
import { requiredScopes } from 'express-oauth2-jwt-bearer';

const jwtCheck = auth({
  audience: 'https://api.ideia.dev',
  issuerBaseURL: 'https://ideia.us.auth0.com/',
  tokenSigningAlg: 'RS256',
});

// Routes públicas
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Routes protegidas
app.get('/api/v1/workflows', jwtCheck, async (req, res) => {
  const workflows = await workflowService.list(req.auth!.payload.sub);
  res.json(workflows);
});

// Routes com escopo específico
app.post('/api/v1/workflows', jwtCheck, requiredScopes('write:workflows'), async (req, res) => {
  const workflow = await workflowService.create(req.auth!.payload.sub, req.body);
  res.status(201).json(workflow);
});

// Admin-only
app.delete('/api/v1/users/:id', jwtCheck, requiredScopes('admin:users'), async (req, res) => {
  await userService.delete(req.params.id);
  res.status(204).end();
});
```

#### Vantagens e Desvantagens

```
✅ Prós:
  • Maturidade e confiabilidade (Okta)
  • Suporte a praticamente todos os protocolos
  • Organizations para multi-tenant
  • Actions customizadas (JavaScript serverless)
  • Anomaly detection embutido

❌ Contras:
  • Custo elevado em escala (10K+ MAU)
  • Vendor lock-in (migração complexa)
  • Latência adicional (depende de rede)
  • Limitação de actions no plano gratuito
  • Complexidade da configuração inicial
```

---

### 1.2 Clerk

Clerk é uma plataforma moderna de autenticação developer-first, com foco em experiência do desenvolvedor e componentes pré-construídos para React/Next.js.

| Aspecto | Detalhes |
|---------|----------|
| **Tipo** | SaaS |
| **Protocolos** | OAuth 2.0, OIDC |
| **Social Login** | Google, GitHub, Microsoft, Apple, Discord, Twitter |
| **MFA** | TOTP, SMS, Backup codes |
| **Passwordless** | Magic Links, Email codes, Phone codes |
| **User Management** | Dashboard admin, UserButton, UserProfile |
| **Organizations** | Nativo (multi-tenant com roles) |
| **Componentes UI** | `SignIn`, `SignUp`, `UserButton`, `OrganizationSwitcher` |
| **Next.js** | App Router e Pages Router nativo |
| **Preço** | Gratuito (5K MAU); $25/mês (5K+); $50/mês (15K+) |
| **Custo projetado (10K MAU)** | ~$50/mês |
| **Custom Domains** | ✅ (plano pago) |
| **Self-Hosted** | ❌ |
| **SDK** | `@clerk/nextjs`, `@clerk/react`, `@clerk/express`, `@clerk/clerk-sdk-node` |

#### Integração com React

```tsx
import { ClerkProvider, SignIn, SignUp, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: { colorPrimary: '#6C5CE7' },
      }}
    >
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
        {children}
      </SignedIn>
      <SignedOut>
        <SignIn redirectUrl="/workspace" />
      </SignedOut>
    </ClerkProvider>
  );
}
```

#### Vantagens e Desvantagens

```
✅ Prós:
  • Developer experience superior (componentes prontos)
  • Excelente para Next.js/React
  • Organizations com RBAC nativo
  • Preço competitivo
  • Tempo de integração: horas, não dias

❌ Contras:
  • Ecossistema menor que Auth0
  • Menos protocolos suportados (sem SAML, LDAP)
  • SaaS-only (sem self-hosted)
  • Relativamente novo (2020), menos maduro
  • Personalização de fluxo limitada
```

---

### 1.3 Keycloak

Keycloak é uma solução open source de gerenciamento de identidade e acesso (IAM) mantida pela Red Hat.

| Aspecto | Detalhes |
|---------|----------|
| **Tipo** | Open Source (self-hosted) |
| **Licença** | Apache 2.0 |
| **Protocolos** | OAuth 2.0, OIDC 1.0, SAML 2.0, LDAP |
| **Social Login** | Google, GitHub, Facebook, Twitter (via Identity Providers) |
| **MFA** | TOTP, WebAuthn, OTP via email/SMS |
| **User Federation** | LDAP, Active Directory, Kerberos |
| **Organizations** | Realms (multi-tenant) |
| **Admin Console** | UI web completa para gerenciamento |
| **Theme Customization** | Custom themes (FreeMarker templates) |
| **Event Listeners** | SPI para eventos customizados |
| **Metrics** | Prometheus metrics nativo |
| **Database** | PostgreSQL (recomendado), MySQL, MariaDB, H2 |
| **Clustering** | ✅ (infinispan + JDBC ping) |
| **Preço** | Gratuito (self-hosted); Red Hat SSO (suporte pago) |
| **Custo projetado (10K MAU)** | ~$200/mês (infra 2 vCPU, 4GB RAM + banco) |
| **Node.js Integration** | `keycloak-nodejs-connect`, `keycloak-connect` |

#### Configuração Keycloak

```yaml
# docker-compose.keycloak.yml
version: '3.8'
services:
  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    command:
      - start
      - --hostname-url=https://auth.ideia.dev
      - --http-enabled=true
      - --https-port=8443
      - --db=postgres
      - --db-url=jdbc:postgresql://postgres:5432/keycloak
      - --db-username=keycloak
      - --db-password=${KC_DB_PASSWORD}
    environment:
      KC_BOOTSTRAP_ADMIN_USERNAME: admin
      KC_BOOTSTRAP_ADMIN_PASSWORD: ${KC_ADMIN_PASSWORD}
      KC_HOSTNAME_STRICT: false
      KC_HTTP_RELATIVE_PATH: /auth
      KC_HEALTH_ENABLED: true
      KC_METRICS_ENABLED: true
    ports:
      - "8080:8080"
      - "8443:8443"
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: ${KC_DB_PASSWORD}
    volumes:
      - keycloak-db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U keycloak"]
      interval: 5s

volumes:
  keycloak-db:
```

#### Integração com Express

```typescript
import Keycloak from 'keycloak-connect';
import session from 'express-session';

const memoryStore = new session.MemoryStore();
const keycloak = new Keycloak({ store: memoryStore }, {
  realm: 'ideia',
  'auth-server-url': 'https://auth.ideia.dev/auth',
  'ssl-required': 'external',
  resource: 'ideia-api',
  'bearer-only': true,
  credentials: {
    secret: process.env.KC_CLIENT_SECRET,
  },
  'confidential-port': 0,
  'policy-enforcer': {},
});

app.use(keycloak.middleware());

// Protect routes
app.get('/api/v1/workflows', keycloak.protect('user'), handler);
app.get('/api/v1/admin', keycloak.protect(['admin', 'superadmin']), handler);

// Policy enforcement via Keycloak Authorization Services
app.get('/api/v1/workflows/:id', keycloak.enforcer({
  resource: 'workflow',
  claims: (req) => ({ workflowId: req.params.id }),
}), handler);

// Check permissions programmatically
app.post('/api/v1/workflows', async (req, res) => {
  const permission = await keycloak.enforcer({
    resource: 'workflow',
    scopes: ['create'],
  }, req);
  if (!permission) return res.status(403).json({ error: 'Forbidden' });
  // continue...
});
```

#### Vantagens e Desvantagens

```
✅ Prós:
  • 100% open source, sem vendor lock-in
  • Controle total sobre dados de identidade
  • Suporte a SAML, LDAP, AD (essencial enterprise)
  • Policy-based authorization (Authorization Services)
  • Clustering nativo para HA
  • Comunidade grande e ativa

❌ Contras:
  • Complexidade operacional (manter o servidor)
  • Sobrecarga de recursos (Keycloak é pesado)
  • Curva de aprendizado alta
  • Personalização de UI é complexa (themes FreeMarker)
  • Upgrade entre versões maiores é trabalhoso
  • Latência maior que soluções SaaS embutidas
```

---

### 1.4 Supabase Auth

Supabase Auth é o módulo de autenticação da plataforma Supabase (open source "Firebase alternativo"), integrado nativamente com PostgreSQL.

| Aspecto | Detalhes |
|---------|----------|
| **Tipo** | Open Source + SaaS (managed) |
| **Protocolos** | OAuth 2.0, OIDC |
| **Social Login** | Google, GitHub, GitLab, Bitbucket, Discord, Slack, Apple |
| **MFA** | TOTP (em alpha) |
| **Passwordless** | Magic Links, OTP SMS/Email |
| **User Management** | SQL direto na tabela `auth.users`, Dashboard |
| **Row Level Security (RLS)** | ✅ Nativo (PostgreSQL policies) |
| **Database Integration** | Direto com `auth.uid()` nas queries |
| **Realtime** | ✅ (websocket via `auth` token) |
| **Preço** | Gratuito (50K MAU, 500MB DB); $25/mês (100K MAU, 8GB DB) |
| **Custo projetado (10K MAU)** | Gratuito (até 50K MAU) |
| **Self-Hosted** | ✅ (open source, Docker) |
| **SDK** | `@supabase/supabase-js`, `@supabase/ssr` (Next.js), Flutter, Python |

#### Integração com Next.js

```typescript
// utils/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// API Route
import { createClient } from '@/utils/supabase/server';

export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // RLS will filter by user automatically
  const { data: workflows } = await supabase
    .from('workflows')
    .select('*')
    .order('created_at', { ascending: false });

  return Response.json(workflows);
}
```

#### Row Level Security (RLS)

```sql
-- Exemplo de políticas RLS para IDEIA

-- 1. Usuários veem apenas seus próprios workflows
CREATE POLICY "Users can view own workflows"
  ON workflows FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Membros de organização veem workflows do workspace
CREATE POLICY "Organization members can view workspace workflows"
  ON workflows FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- 3. Admin pode modificar qualquer workflow
CREATE POLICY "Admins can modify all workflows"
  ON workflows FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- 4. Apenas o criador pode deletar
CREATE POLICY "Creator can delete own workflows"
  ON workflows FOR DELETE
  USING (auth.uid() = created_by);

-- 5. Agentes de CI têm acesso via service_role
CREATE POLICY "CI agents can create workflows"
  ON workflows FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
```

#### Vantagens e Desvantagens

```
✅ Prós:
  • Gratuito até 50K MAU (generoso)
  • RLS nativo — autorização no banco de dados
  • Integração direta PostgreSQL (sem ORM extra)
  • Self-hosted disponível
  • Realtime subscriptions via WebSocket
  • Stack unificada (DB + Auth + Storage + Realtime)

❌ Contras:
  • MFA ainda imaturo (apenas TOTP alpha)
  • Sem SAML (enterprise limitado)
  • Sem Organizations nativo (precisa custom implementation)
  • Supabase SaaS lock-in (self-hosted é mais complexo)
  • Menos flexível que Keycloak para cenários complexos
```

---

### 1.5 Firebase Auth

Firebase Auth é o serviço de autenticação do ecossistema Google, amplamente usado em aplicações mobile e web.

| Aspecto | Detalhes |
|---------|----------|
| **Tipo** | SaaS (Google Cloud) |
| **Protocolos** | OAuth 2.0, OIDC |
| **Social Login** | Google, Apple, Facebook, Twitter, GitHub, Microsoft, Yahoo |
| **MFA** | SMS (phone auth), TOTP (beta) |
| **Passwordless** | Magic Links, SMS, Email Link |
| **User Management** | Firebase Console, Admin SDK |
| **Custom Claims** | ✅ (até 1000 bytes, para RBAC) |
| **Session Management** | Firebase Sessions (long-lived) |
| **Anonymous Auth** | ✅ (usuários temporários) |
| **Phone Auth** | ✅ (SMS verification) |
| **Blocking Functions** | Cloud Functions nos hooks de auth |
| **Preço** | Gratuito (50K MAU, phone auth: 10K verificações) |
| **Custo projetado (10K MAU)** | Gratuito |
| **Self-Hosted** | ❌ |
| **SDK** | Firebase SDK v10, `@react-native-firebase/auth`, Admin SDK |

#### Vantagens e Desvantagens

```
✅ Prós:
  • Gratuito para volumes moderados
  • Excelente ecossistema Google/GCP
  • Phone auth maduro (SMS verification)
  • Anonymous auth útil para onboarding
  • SDKs para todas as plataformas

❌ Contras:
  • Google lock-in (difícil migrar)
  • Sem SAML (enterprise)
  • Custom claims limitados (1KB)
  • Organizações não nativas
  • Self-hosted impossível
  • Histórico de mudanças abruptas de preço
  • Políticas de dados (GDPR pode ser problema)
```

---

### 1.6 Passport.js

Passport.js é o middleware de autenticação mais popular para Node.js/Express, com mais de 500 estratégias disponíveis.

| Aspecto | Detalhes |
|---------|----------|
| **Tipo** | Biblioteca (middleware) |
| **Licença** | MIT |
| **Protocolos** | **Qualquer um** (500+ estratégias comunitárias) |
| **Estratégias** | Local (email/senha), OAuth, OIDC, SAML, LDAP, JWT, etc. |
| **Dependências** | Apenas Express |
| **Session** | `express-session` + qualquer store |
| **Flash Messages** | `connect-flash` |
| **Preço** | Gratuito |
| **Manutenção** | Comunitária (algumas estratégias desatualizadas) |

#### Exemplo de Uso

```typescript
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JWTStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

// Estratégia Local
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const user = await User.findByEmail(email);
      if (!user) return done(null, false, { message: 'User not found' });
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return done(null, false, { message: 'Invalid password' });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Estratégia JWT
passport.use(new JWTStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
  issuer: 'ideia.dev',
  audience: 'api.ideia.dev',
}, async (payload, done) => {
  try {
    const user = await User.findById(payload.sub);
    if (!user) return done(null, false);
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// Estratégia Google OAuth
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: '/auth/google/callback',
  scope: ['profile', 'email'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findByOAuth('google', profile.id);
    if (!user) {
      user = await User.create({
        email: profile.emails![0].value,
        name: profile.displayName,
        avatar: profile.photos?.[0].value,
        oauthProvider: 'google',
        oauthId: profile.id,
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// Routes
app.post('/auth/login', passport.authenticate('local', { session: false }), generateTokens);
app.get('/auth/google', passport.authenticate('google'));
app.get('/auth/google/callback', passport.authenticate('google', { session: false }), generateTokens);
app.get('/api/me', passport.authenticate('jwt', { session: false }), (req, res) => res.json(req.user));
```

#### Vantagens e Desvantagens

```
✅ Prós:
  • 100% flexível — qualquer estratégia possível
  • Código aberto, sem dependência externa
  • Controle total sobre o fluxo de auth
  • Ecossistema enorme de estratégias
  • Zero custo operacional

❌ Contras:
  • Você implementa tudo (senha reset, MFA, etc.)
  • Manutenção de estratégias é sua responsabilidade
  • Vulnerabilidades de implementação comuns
  • Não tem dashboard, user management
  • Menos seguro que plataformas dedicadas se mal configurado
  • Escalabilidade da sessão é sua responsabilidade
```

---

### 1.7 Lucia Auth

Lucia é uma biblioteca moderna de autenticação TypeScript-first, projetada para ser agnóstica de framework.

| Aspecto | Detalhes |
|---------|----------|
| **Tipo** | Biblioteca (framework-agnostic) |
| **Licença** | MIT |
| **Protocolos** | OAuth 2.0 (através de adapters), Session-based |
| **Database Adapters** | Prisma, Drizzle, Kysely, Mongoose, PostgreSQL raw, SQLite, PlanetScale |
| **Session** | JWT ou Database sessions |
| **Password Hashing** | bcrypt, scrypt, argon2 |
| **OAuth** | Lucia Auth OAuth (Google, GitHub, Discord, etc.) |
| **Preço** | Gratuito |
| **TypeScript** | ✅ Primeira classe |
| **Framework** | Next.js, SvelteKit, Astro, Nuxt (adapter-based) |

#### Exemplo de Uso

```typescript
import { Lucia } from 'lucia';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import { prisma } from './db';
import { Google } from 'arctic';
import { cookies } from 'next/headers';

const adapter = new PrismaAdapter(prisma.session, prisma.user);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
    },
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    name: attributes.name,
    role: attributes.role,
  }),
});

export const google = new Google(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  'http://localhost:3000/auth/google/callback'
);

// Login handler
export async function POST(req: Request) {
  const { email, password } = await req.json();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const valid = await new Argon2id().verify(user.passwordHash, password);
  if (!valid) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const session = await lucia.createSession(user.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

  return Response.json({ user: { email: user.email, name: user.name } });
}
```

#### Vantagens e Desvantagens

```
✅ Prós:
  • TypeScript-first, tipos excelentes
  • Framework-agnostic (Next.js, SvelteKit, Astro, Nuxt)
  • Database adapter-based (escolha seu DB)
  • Segurança por padrão (httpOnly cookies, CSRF prevention)
  • Moderna e bem documentada
  • Pequena footprint (sem dependências pesadas)

❌ Contras:
  • Ecossistema menor (menos estratégias que Passport)
  • Recursos avançados (MFA, SSO) são manuais
  • Sem dashboard ou admin UI
  • Comunidade ainda crescendo
  • Documentação densa
```

---

### 1.8 Comparação Final

| Característica | Auth0 | Clerk | Keycloak | Supabase | Firebase | Passport.js | Lucia |
|---------------|-------|-------|----------|----------|----------|-------------|-------|
| **Tipo** | SaaS | SaaS | Self-hosted | SaaS+Self | SaaS | Lib | Lib |
| **Open Source** | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **OAuth 2.0 + OIDC** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SAML 2.0** | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **LDAP/AD** | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **MFA** | ✅ Completo | ✅ TOTP | ✅ TOTP+WebAuthn | ⚠️ TOTP alpha | ⚠️ TOTP beta | Manual | Manual |
| **WebAuthn** | ✅ | ✅ | ✅ | ❌ | ❌ | Manual | Manual |
| **Social Login** | 80+ | 10+ | 10+ | 10+ | 10+ | Ilimitado | 7+ |
| **Organizations** | ✅ Nativo | ✅ Nativo | ✅ Realms | ❌ | Custom Claims | Manual | Manual |
| **RLS/Policy** | Actions | Custom | Authorization Services | ✅ RLS SQL | Custom Claims | Manual | Manual |
| **User Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Self-Hosted** | ❌ | ❌ | ✅ | ✅ | ❌ | N/A | N/A |
| **Custo (10K MAU)** | ~$230/mês | ~$50/mês | ~$200/mês (infra) | Gratuito | Gratuito | $0 | $0 |
| **Complexidade** | Média | Baixa | Alta | Baixa | Baixa | Alta | Média |
| **Controle de Dados** | Baixo | Baixo | Total | Médio | Baixo | Total | Total |
| **Vendor Lock-in** | Alto | Alto | Baixo | Médio | Alto | Baixo | Baixo |
| **Tempo de Setup** | Dias | Horas | Semana | Horas | Horas | Semana | Dias |
| **Suporte Enterprise** | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ❌ | ❌ |
| **Node.js SDK** | ✅ Excelente | ✅ Excelente | ✅ | ✅ Excelente | ✅ | ✅ Nativo | ✅ |

#### Recomendação para IDEIA

```
                 ┌──────────────────────────────────────┐
                 │        RECOMENDAÇÃO FINAL             │
                 ├──────────────────────────────────────┤
                 │                                      │
                 │  🏆 Supabase Auth (Primary)           │
                 │     Motivo: Gratuito até 50K MAU,     │
                 │     RLS nativo com PostgreSQL,        │
                 │     stack unificada (DB + Auth +      │
                 │     Storage + Realtime + Edge Func)   │
                 │                                      │
                 │  🥈 Lucia Auth (Desktop/Agent)        │
                 │     Motivo: Self-hosted, leve,        │
                 │     TypeScript-first, ideal para      │
                 │     Electron desktop e agents         │
                 │                                      │
                 │  🥉 Keycloak (Enterprise)              │
                 │     Motivo: SAML + LDAP, necessário   │
                 │     para clientes enterprise          │
                 │                                      │
                 └──────────────────────────────────────┘
```

---

## 2. Protocolos e Padrões

### 2.1 OAuth 2.0 + OIDC (Authorization Code + PKCE)

#### Fluxo Authorization Code + PKCE (Recomendado)

```
  ┌──────┐         ┌──────────┐         ┌──────┐
  │ User │         │   App    │         │ Auth │
  │      │         │ (Client) │         │ Server│
  └──┬───┘         └────┬─────┘         └──┬───┘
     │                  │                  │
     │ 1. Click Login   │                  │
     │─────────────────▶│                  │
     │                  │ 2. Generate       │
     │                  │    code_verifier  │
     │                  │    + code_chalng│
     │                  │                  │
     │ 3. Redirect to   │                  │
     │    Auth Server   │                  │
     │◀─────────────────│                  │
     │                  │                  │
     │ 4. Authenticate  │                  │
     │─────────────────────────────────────▶
     │                  │                  │
     │ 5. Authorize     │                  │
     │    (consent)     │                  │
     │◀────────────────────────────────────│
     │                  │                  │
     │ 6. Auth Code     │                  │
     │    (redirect)    │                  │
     │─────────────────▶│                  │
     │                  │ 7. Code +         │
     │                  │    Verifier       │
     │                  │──────────────────▶│
     │                  │                  │
     │                  │ 8. Verify Code    │
     │                  │    + Verifier     │
     │                  │    = Token        │
     │                  │◀──────────────────│
     │                  │                  │
     │ 9. Access Token  │                  │
     │    + Refresh     │                  │
     │    + ID Token    │                  │
     │◀─────────────────│                  │
```

#### Implementação PKCE

```typescript
import { randomBytes, createHash } from 'crypto';

class PKCEGenerator {
  generateCodeVerifier(): string {
    return randomBytes(32)
      .toString('base64url');
  }

  generateCodeChallenge(verifier: string): string {
    return createHash('sha256')
      .update(verifier)
      .digest('base64url');
  }

  getAuthUrl(clientId: string, redirectUri: string): {
    url: string;
    verifier: string;
    state: string;
  } {
    const verifier = this.generateCodeVerifier();
    const challenge = this.generateCodeChallenge(verifier);
    const state = randomBytes(16).toString('hex');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
      scope: 'openid profile email offline_access',
    });

    return {
      url: `https://auth.ideia.dev/authorize?${params}`,
      verifier,
      state,
    };
  }

  async exchangeCode(code: string, verifier: string): Promise<Tokens> {
    const response = await fetch('https://auth.ideia.dev/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier,
        client_id: process.env.CLIENT_ID!,
        redirect_uri: process.env.REDIRECT_URI!,
      }),
    });

    return response.json();
  }
}
```

#### OIDC ID Token Validation

```typescript
import { jwtVerify, createRemoteJWKSet } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://auth.ideia.dev/.well-known/jwks.json')
);

interface IDTokenClaims {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  picture?: string;
  role?: string;
}

async function verifyIDToken(token: string, expectedNonce?: string): Promise<IDTokenClaims> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: 'https://auth.ideia.dev',
    audience: 'ideia-api',
  });

  const claims = payload as unknown as IDTokenClaims;

  // Validate nonce (anti-replay)
  if (expectedNonce && claims.nonce !== expectedNonce) {
    throw new Error('Invalid nonce');
  }

  // Check token freshness
  if (claims.iat < Date.now() / 1000 - 300) { // 5 min max
    throw new Error('Token too old');
  }

  return claims;
}
```

#### Refresh Token Rotation

```typescript
class TokenRotationManager {
  private usedRefreshTokens: Set<string> = new Set();
  private readonly ROTATION_WINDOW = 60_000; // 1 min

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // Check if refresh token was already used (replay attack)
    if (this.usedRefreshTokens.has(refreshToken)) {
      // Reuse detected! Revoke all tokens for this user
      await this.revokeAllUserTokens(this.decodeToken(refreshToken).sub);
      throw new Error('Refresh token reuse detected');
    }

    this.usedRefreshTokens.add(refreshToken);

    const response = await fetch('https://auth.ideia.dev/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.CLIENT_ID!,
      }),
    });

    const tokens = await response.json();

    // Clean up old tokens after rotation window
    setTimeout(() => {
      this.usedRefreshTokens.delete(refreshToken);
    }, this.ROTATION_WINDOW);

    return tokens;
  }

  private async revokeAllUserTokens(userId: string): Promise<void> {
    // Revoke all sessions for this user
    await fetch('https://auth.ideia.dev/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.CLIENT_ID!,
        user_id: userId,
      }),
    });
  }
}
```

---

### 2.2 SAML 2.0

SAML é essencial para integração enterprise com provedores de identidade corporativos (Azure AD, Okta, OneLogin).

#### Configuração SAML no Keycloak

```xml
<!-- SP Metadata - ideia-api -->
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                  entityID="https://api.ideia.dev/saml/metadata">
  <SPSSODescriptor AuthnRequestsSigned="true"
                   WantAssertionsSigned="true"
                   protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <KeyDescriptor use="signing">
      <KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
        <X509Data>
          <X509Certificate>MIID...</X509Certificate>
        </X509Data>
      </KeyInfo>
    </KeyDescriptor>
    <AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="https://api.ideia.dev/auth/saml/callback"
      index="1" />
    <AttributeConsumingService index="1">
      <RequestedAttribute Name="email" isRequired="true" />
      <RequestedAttribute Name="firstName" isRequired="false" />
      <RequestedAttribute Name="lastName" isRequired="false" />
    </AttributeConsumingService>
  </SPSSODescriptor>
</EntityDescriptor>
```

#### SAML para IDEIA

```typescript
// saml-strategy.ts
import { MultiSamlStrategy } from 'passport-saml';

export const samlStrategy = new MultiSamlStrategy(
  {
    passReqToCallback: true,
    getSamlOptions: async (req, done) => {
      // Multi-tenant: cada organização tem seu IdP
      const tenantId = req.query.tenant || req.body.tenant;
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      done(null, {
        entryPoint: tenant.samlEntryPoint,
        issuer: `https://api.ideia.dev/saml/${tenantId}`,
        cert: tenant.samlCert,
        privateKey: process.env.SAML_PRIVATE_KEY,
        signatureAlgorithm: 'sha256',
        digestAlgorithm: 'sha256',
        identifierFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:emailAddress',
      });
    },
  },
  async (req, profile, done) => {
    try {
      const email = profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
      const name = profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];

      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: { email, name, authProvider: 'saml' },
        });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
);
```

---

### 2.3 JWT (Access + Refresh Tokens)

#### Estrutura dos Tokens

```typescript
interface AccessTokenPayload {
  sub: string;           // User ID
  iss: 'ideia.dev';      // Issuer
  aud: 'api.ideia.dev';  // Audience
  exp: number;           // Expiration (15 min)
  iat: number;           // Issued at
  jti: string;           // JWT ID (unique, for revocation)
  role: 'admin' | 'developer' | 'viewer';
  workspaceIds: string[]; // Accessible workspaces
  permissions: string[];  // Fine-grained permissions
}

interface RefreshTokenPayload {
  sub: string;
  iss: 'ideia.dev';
  aud: 'api.ideia.dev';
  exp: number;           // Expiration (7 days)
  iat: number;
  jti: string;
  family: string;        // Token family (for rotation tracking)
  version: number;       // Incremented on rotation
}
```

#### Geração de Tokens

```typescript
import { SignJWT, importPKCS8 } from 'jose';

const privateKey = await importPKCS8(process.env.JWT_PRIVATE_KEY!, 'RS256');
const publicKey = await importSPKI(process.env.JWT_PUBLIC_KEY!, 'RS256');

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

async function generateTokenPair(user: User): Promise<TokenPair> {
  const jti = crypto.randomUUID();
  const family = crypto.randomUUID();

  const accessToken = await new SignJWT({
    sub: user.id,
    role: user.role,
    workspaceIds: user.workspaceIds,
    permissions: user.permissions,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer('ideia.dev')
    .setAudience('api.ideia.dev')
    .setIssuedAt()
    .setExpirationTime('15m')
    .setJti(jti)
    .sign(privateKey);

  const refreshToken = await new SignJWT({
    sub: user.id,
    family,
    version: 1,
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer('ideia.dev')
    .setAudience('api.ideia.dev')
    .setIssuedAt()
    .setExpirationTime('7d')
    .setJti(crypto.randomUUID())
    .sign(privateKey);

  return { accessToken, refreshToken, expiresIn: 900 };
}
```

#### Verificação de Tokens

```typescript
import { jwtVerify, createLocalJWKSet } from 'jose';

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, publicKey, {
    issuer: 'ideia.dev',
    audience: 'api.ideia.dev',
    algorithms: ['RS256'],
  });

  const now = Math.floor(Date.now() / 1000);

  // Additional checks
  if (payload.nbf && payload.nbf > now) {
    throw new TokenNotYetValidError();
  }

  // Check revocation (via Redis or DB)
  const revoked = await checkTokenRevocation(payload.jti as string);
  if (revoked) {
    throw new TokenRevokedError();
  }

  return payload as unknown as AccessTokenPayload;
}
```

---

### 2.4 WebAuthn / Passkeys

WebAuthn permite autenticação sem senha usando biometria (Face ID, Touch ID), security keys (YubiKey) ou plataforma (Windows Hello).

#### Registro

```typescript
// Server: Generate registration options
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';

async function startRegistration(user: User) {
  const options = await generateRegistrationOptions({
    rpName: 'IDEIA',
    rpID: 'ideia.dev',
    userName: user.email,
    attestationType: 'none',
    excludeCredentials: user.passkeys.map(key => ({
      id: key.credentialID,
      type: 'public-key',
      transports: ['internal', 'usb', 'ble', 'nfc'],
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  });

  // Store challenge for verification
  await prisma.passkeyChallenge.create({
    data: {
      userId: user.id,
      challenge: options.challenge,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
    },
  });

  return options;
}

// Server: Verify registration
async function completeRegistration(user: User, response: RegistrationResponseJSON) {
  const challenge = await prisma.passkeyChallenge.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!challenge) throw new Error('No pending registration');

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: 'https://ideia.dev',
    expectedRPID: 'ideia.dev',
  });

  if (!verification.verified) throw new Error('Verification failed');

  await prisma.passkey.create({
    data: {
      userId: user.id,
      credentialID: verification.registrationInfo!.credentialID,
      credentialPublicKey: Buffer.from(verification.registrationInfo!.credentialPublicKey),
      counter: verification.registrationInfo!.counter,
      transports: response.response.transports,
    },
  });

  await prisma.passkeyChallenge.update({
    where: { id: challenge.id },
    data: { usedAt: new Date() },
  });

  return { verified: true };
}
```

#### Autenticação

```typescript
// Server: Generate authentication options
async function startAuthentication(user: User) {
  const passkeys = await prisma.passkey.findMany({
    where: { userId: user.id },
  });

  const options = await generateAuthenticationOptions({
    rpID: 'ideia.dev',
    allowCredentials: passkeys.map(key => ({
      id: key.credentialID,
      type: 'public-key',
      transports: key.transports as AuthenticatorTransport[],
    })),
    userVerification: 'preferred',
  });

  await prisma.passkeyChallenge.create({
    data: {
      userId: user.id,
      challenge: options.challenge,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  return options;
}

// Server: Verify authentication
async function completeAuthentication(user: User, response: AuthenticationResponseJSON) {
  const passkey = await prisma.passkey.findFirst({
    where: { userId: user.id },
  });

  if (!passkey) throw new Error('Passkey not found');

  const challenge = await prisma.passkeyChallenge.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge!.challenge,
    expectedOrigin: 'https://ideia.dev',
    expectedRPID: 'ideia.dev',
    credential: {
      id: passkey.credentialID,
      publicKey: passkey.credentialPublicKey,
      counter: passkey.counter,
      transports: passkey.transports as AuthenticatorTransport[],
    },
  });

  if (verification.verified) {
    await prisma.passkey.update({
      where: { id: passkey.id },
      data: { counter: verification.authenticationInfo!.newCounter },
    });
  }

  return verification;
}
```

---

### 2.5 Magic Links

```typescript
class MagicLinkService {
  private readonly LINK_EXPIRY = 15 * 60 * 1000; // 15 min

  async sendMagicLink(email: string): Promise<void> {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(token, 10);

    // Store token
    await prisma.magicLink.create({
      data: {
        email,
        tokenHash: hashedToken,
        expiresAt: new Date(Date.now() + this.LINK_EXPIRY),
      },
    });

    const link = `https://ideia.dev/auth/callback?token=${token}&email=${encodeURIComponent(email)}`;

    // Send email
    await this.emailService.send({
      to: email,
      subject: 'Login to IDEIA',
      html: `<a href="${link}">Click to login</a>
             <p>Link expires in 15 minutes</p>`,
    });
  }

  async verifyMagicLink(token: string, email: string): Promise<User> {
    const magicLink = await prisma.magicLink.findFirst({
      where: {
        email,
        usedAt: null,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!magicLink) throw new Error('Magic link not found or expired');

    const valid = await bcrypt.compare(token, magicLink.tokenHash);
    if (!valid) throw new Error('Invalid token');

    // Mark as used
    await prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() },
    });

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, authProvider: 'magic_link' },
      });
    }

    return user;
  }
}
```

---

### 2.6 MFA/TOTP

```typescript
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

class MFAService {
  private readonly ISSUER = 'IDEIA';

  async setupTOTP(userId: string): Promise<{
    secret: string;
    qrCode: string;
    recoveryCodes: string[];
  }> {
    const secret = authenticator.generateSecret();
    const serviceName = `${this.ISSUER}:${userId}`;

    const otpauth = authenticator.keyuri(userId, this.ISSUER, secret);
    const qrCode = await QRCode.toDataURL(otpauth);

    // Generate recovery codes
    const recoveryCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex')
    );

    // Store hashed secret and recovery codes
    await prisma.userMFA.upsert({
      where: { userId },
      create: {
        userId,
        totpSecret: secret,
        recoveryCodes: await Promise.all(
          recoveryCodes.map(code => bcrypt.hash(code, 10))
        ),
        enabled: false,
      },
      update: {
        totpSecret: secret,
      },
    });

    return { secret, qrCode, recoveryCodes };
  }

  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    const mfa = await prisma.userMFA.findUnique({ where: { userId } });
    if (!mfa?.totpSecret) return false;

    return authenticator.verify({
      token,
      secret: mfa.totpSecret,
    });
  }

  async enableMFA(userId: string, token: string): Promise<void> {
    const valid = await this.verifyTOTP(userId, token);
    if (!valid) throw new Error('Invalid TOTP token');

    await prisma.userMFA.update({
      where: { userId },
      data: { enabled: true },
    });
  }

  async verifyWithRecoveryCode(userId: string, code: string): Promise<boolean> {
    const mfa = await prisma.userMFA.findUnique({ where: { userId } });
    if (!mfa) return false;

    for (const hashedCode of mfa.recoveryCodes) {
      const valid = await bcrypt.compare(code, hashedCode);
      if (valid) {
        // Remove used recovery code
        const remaining = mfa.recoveryCodes.filter(hc => hc !== hashedCode);
        await prisma.userMFA.update({
          where: { userId },
          data: { recoveryCodes: remaining },
        });
        return true;
      }
    }

    return false;
  }
}
```

---

## 3. Autorização (RBAC/ABAC)

### 3.1 RBAC — Role-Based Access Control

#### Modelo de Dados

```prisma
// schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      UserRole @default(DEVELOPER)
  workspaceMembers WorkspaceMember[]
  permissions Permission[]
}

enum UserRole {
  ADMIN
  DEVELOPER
  VIEWER
}

model Workspace {
  id      String  @id @default(cuid())
  name    String
  slug    String  @unique
  members WorkspaceMember[]
  projects Project[]
}

model WorkspaceMember {
  id          String          @id @default(cuid())
  workspaceId String
  workspace   Workspace       @relation(fields: [workspaceId], references: [id])
  userId      String
  user        User            @relation(fields: [userId], references: [id])
  role        WorkspaceRole   @default(DEVELOPER)

  @@unique([workspaceId, userId])
}

enum WorkspaceRole {
  OWNER
  ADMIN
  DEVELOPER
  VIEWER
}

model Permission {
  id          String  @id @default(cuid())
  userId      String
  user        User    @relation(fields: [userId], references: [id])
  resource    String  // e.g., "workflow:123"
  action      String  // e.g., "read", "write", "delete"
}
```

#### RBAC Enforcement

```typescript
// middleware/rbac.ts
type Role = 'ADMIN' | 'DEVELOPER' | 'VIEWER';

const ROLE_HIERARCHY: Record<Role, number> = {
  VIEWER: 1,
  DEVELOPER: 2,
  ADMIN: 3,
};

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  VIEWER: [
    'workflow:read',
    'project:read',
    'analysis:read',
  ],
  DEVELOPER: [
    'workflow:read',
    'workflow:create',
    'workflow:update',
    'project:read',
    'project:create',
    'project:update',
    'analysis:read',
    'analysis:create',
    'code:read',
    'code:create',
  ],
  ADMIN: [
    '*',  // All permissions
  ],
};

function requireRole(minimumRole: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user!.role as Role;
    const minLevel = ROLE_HIERARCHY[minimumRole];
    const userLevel = ROLE_HIERARCHY[userRole];

    if (userLevel < minLevel) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Requires ${minimumRole} role, but user has ${userRole}`,
      });
    }

    next();
  };
}

function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user!;

    // Admin has all permissions
    if (user.role === 'ADMIN') return next();

    // Check role-based permissions
    const rolePerms = ROLE_PERMISSIONS[user.role as Role];
    if (rolePerms.includes('*') || rolePerms.includes(permission)) {
      return next();
    }

    // Check custom permissions
    const customPerm = await prisma.permission.findFirst({
      where: {
        userId: user.id,
        resource: req.params.resourceId || '*',
        action: permission,
      },
    });

    if (customPerm) return next();

    return res.status(403).json({ error: 'Forbidden', message: `Missing permission: ${permission}` });
  };
}

// Usage
app.get('/api/v1/workflows', requireRole('VIEWER'), handler);
app.post('/api/v1/workflows', requireRole('DEVELOPER'), handler);
app.delete('/api/v1/workflows/:id', requirePermission('workflow:delete'), handler);
```

---

### 3.2 ABAC — Attribute-Based Access Control

ABAC oferece autorização mais granular que RBAC, baseada em atributos do usuário, recurso, ambiente e ação.

```typescript
// policies/abac-engine.ts
interface AuthContext {
  user: {
    id: string;
    role: string;
    department: string;
    clearance: number;
    workspaceIds: string[];
  };
  resource: {
    type: string;
    id: string;
    ownerId: string;
    workspaceId: string;
    classification: 'public' | 'internal' | 'confidential' | 'secret';
    tags: string[];
  };
  action: 'create' | 'read' | 'update' | 'delete' | 'admin';
  environment: {
    time: Date;
    ip: string;
    device: 'desktop' | 'web' | 'mobile' | 'api';
    mfaVerified: boolean;
  };
}

interface ABACRule {
  name: string;
  effect: 'allow' | 'deny';
  condition: (ctx: AuthContext) => Promise<boolean> | boolean;
  priority: number;
}

class ABACEngine {
  private rules: ABACRule[] = [];

  addRule(rule: ABACRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  async evaluate(ctx: AuthContext): Promise<{ allowed: boolean; rule?: string }> {
    // Deny by default
    for (const rule of this.rules) {
      const matches = await rule.condition(ctx);
      if (matches) {
        return {
          allowed: rule.effect === 'allow',
          rule: rule.name,
        };
      }
    }

    return { allowed: false, rule: 'default-deny' };
  }
}

// Rules definition
const abac = new ABACEngine();

abac.addRule({
  name: 'Owner full access',
  effect: 'allow',
  priority: 100,
  condition: (ctx) => ctx.user.id === ctx.resource.ownerId,
});

abac.addRule({
  name: 'Workspace member read access',
  effect: 'allow',
  priority: 90,
  condition: (ctx) =>
    ctx.action === 'read' &&
    ctx.user.workspaceIds.includes(ctx.resource.workspaceId),
});

abac.addRule({
  name: 'Confidential requires clearance',
  effect: 'allow',
  priority: 80,
  condition: (ctx) =>
    ctx.resource.classification === 'confidential' &&
    ctx.user.clearance >= 5 &&
    ctx.environment.mfaVerified,
});

abac.addRule({
  name: 'Secret requires admin + MFA + desktop',
  effect: 'allow',
  priority: 70,
  condition: (ctx) =>
    ctx.resource.classification === 'secret' &&
    ctx.user.role === 'ADMIN' &&
    ctx.environment.mfaVerified &&
    ctx.environment.device === 'desktop',
});

abac.addRule({
  name: 'Block outside business hours (confidential+)',
  effect: 'deny',
  priority: 60,
  condition: (ctx) => {
    if (ctx.resource.classification === 'public') return false;
    const hour = ctx.environment.time.getHours();
    return hour < 8 || hour > 18;
  },
});

abac.addRule({
  name: 'Department-based access',
  effect: 'allow',
  priority: 50,
  condition: (ctx) =>
    ctx.action === 'read' &&
    ctx.resource.tags.includes(ctx.user.department),
});
```

---

### 3.3 Cedar (Amazon) — Policy Engine

Cedar é a linguagem de políticas da Amazon (usada no AWS Verified Permissions), formalmente verificada e projetada para autorização em larga escala. **Já consta nos ADRs da IDEIA.**

#### Exemplo de Política Cedar

```cedar
// policies/workflows.cedar
// Especifica quem pode acessar workflows

// Admin pode fazer tudo
permit(
  principal in Role::Admin,
  action in [Action::"workflow:*"],
  resource
);

// Desenvolvedor pode criar e modificar workflows do seu workspace
permit(
  principal in Role::Developer,
  action in [Action::"workflow:create", Action::"workflow:update"],
  resource is Workflow
)
when {
  resource.workspaceId in principal.workspaces
};

// Viewer pode apenas ler
permit(
  principal in Role::Viewer,
  action == Action::"workflow:read",
  resource is Workflow
)
when {
  resource.workspaceId in principal.workspaces
};

// Context-based: security audit
permit(
  principal,
  action == Action::"workflow:read",
  resource is Workflow
)
when {
  resource.classification == Classification::"security-audit"
  && context.time.hour >= 9
  && context.time.hour <= 18
  && context.mfa == true
};

// Deny by default
forbid(
  principal,
  action,
  resource
)
unless {
  resource == Resource::"public"
};
```

#### Cedar SDK Integration

```typescript
import { CedarEngine } from '@cedar-policy/cedar-wasm';

interface EvaluationRequest {
  principal: { type: string; id: string };
  action: string;
  resource: { type: string; id: string; attributes: Record<string, any> };
  context: Record<string, any>;
}

class CedarPolicyEngine {
  private engine: CedarEngine;

  constructor(policies: string) {
    this.engine = new CedarEngine(policies);
  }

  async authorize(request: EvaluationRequest): Promise<{
    decision: 'Allow' | 'Deny';
    diagnostics?: any;
  }> {
    const result = this.engine.isAuthorized({
      principal: {
        type: request.principal.type,
        id: request.principal.id,
      },
      action: {
        type: 'Action',
        id: request.action,
      },
      resource: {
        type: request.resource.type,
        id: request.resource.id,
        attributes: request.resource.attributes,
      },
      context: request.context,
    });

    return result;
  }

  async authorizeBatch(requests: EvaluationRequest[]): Promise<any[]> {
    return Promise.all(requests.map(r => this.authorize(r)));
  }

  // Middleware para Express
  middleware(resourceType: string, action: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const result = await this.authorize({
        principal: { type: 'User', id: req.user!.id },
        action,
        resource: {
          type: resourceType,
          id: req.params.id || '*',
          attributes: req.resource || {},
        },
        context: {
          time: new Date().toISOString(),
          ip: req.ip,
          mfa: req.session?.mfaVerified || false,
        },
      });

      if (result.decision === 'Deny') {
        return res.status(403).json({
          error: 'Forbidden',
          reason: result.diagnostics?.reason?.join(', '),
        });
      }

      next();
    };
  }
}

// Uso
const policies = `
  permit(
    principal in Role::Admin,
    action == Action::"workflow:delete",
    resource
  );
`;

const cedar = new CedarPolicyEngine(policies);
app.delete(
  '/api/v1/workflows/:id',
  cedar.middleware('Workflow', 'workflow:delete'),
  workflowDeleteHandler
);
```

#### Cedar vs OPA

| Aspecto | Cedar | OPA (Rego) |
|---------|-------|------------|
| **Criador** | Amazon (AWS Verified Permissions) | CNCF (Styra) |
| **Linguagem** | Cedar (específica para auth) | Rego (Turing-completo) |
| **Verificação Formal** | ✅ (model checking automático) | ❌ |
| **Performance** | ~10μs por avaliação | ~50-100μs por avaliação |
| **Partial Evaluation** | ✅ | ✅ |
| **Policy as Code** | ✅ | ✅ |
| **AWS Integration** | ✅ (Cognito, API Gateway, S3) | Através de proxies |
| **Self-Hosted** | ❌ (wasm bundle) | ✅ (OPA server) |
| **Ecossistema** | Emergente (2023+) | Maduro (2016+) |
| **SDK TypeScript** | `@cedar-policy/cedar-wasm` | `@open-policy-agent/opa-wasm` |
| **Complexidade** | Baixa | Alta (Rego é mais poderoso mas complexo) |

---

### 3.4 OPA — Open Policy Agent

OPA é o padrão da indústria para autorização em cloud-native, usando a linguagem Rego.

#### Exemplo de Política Rego

```rego
package ideia.authz

import future.keywords.if
import future.keywords.in

# Default deny
default allow := false

# Admin can do everything
allow if {
    input.user.role == "admin"
}

# Developer can manage workflows in their workspace
allow if {
    input.user.role == "developer"
    input.action in ["create", "read", "update"]
    input.resource.workspace_id in input.user.workspaces
}

# Viewer can only read
allow if {
    input.user.role == "viewer"
    input.action == "read"
    input.resource.workspace_id in input.user.workspaces
}

# Rate limiting: max 100 operations per minute
allow if {
    input.user.queries_per_minute < 100
}

# Context-aware: require MFA for sensitive actions
allow if {
    input.action in ["delete", "admin"]
    input.user.mfa_verified == true
}

# Resource-level: only owner can delete
allow if {
    input.action == "delete"
    input.resource.owner_id == input.user.id
}

# Workspace isolation
deny["User not in workspace"] if {
    not input.resource.public
    not input.resource.workspace_id in input.user.workspaces
}

# Audit logging
audit_log := {
    "user": input.user.id,
    "action": input.action,
    "resource": input.resource.id,
    "decision": allow,
    "timestamp": now(),
}
```

#### OPA Integration

```typescript
import OPA from '@open-policy-agent/opa-wasm';

class OPAPolicyEngine {
  private opa: any;

  async loadPolicy(policyPath: string): Promise<void> {
    const wasm = await fetch(policyPath).then(r => r.arrayBuffer());
    this.opa = await OPA.loadPolicy(new Uint8Array(wasm));
  }

  async evaluate(input: any): Promise<{
    allow: boolean;
    deny?: string[];
    audit: any;
  }> {
    const result = this.opa.evaluate(input);
    return result;
  }
}

// Middleware OPA com cache
async function opaAuthzMiddleware(req: Request, res: Response, next: NextFunction) {
  const input = {
    user: {
      id: req.user!.id,
      role: req.user!.role,
      workspaces: req.user!.workspaceIds,
      mfa_verified: req.session?.mfaVerified || false,
      queries_per_minute: req.user!.queryCount,
    },
    action: extractAction(req.method),
    resource: {
      id: req.params.id,
      type: extractResourceType(req.path),
      workspace_id: req.params.workspaceId || req.body?.workspaceId,
      owner_id: req.resource?.ownerId,
      public: req.resource?.public || false,
    },
  };

  const decision = await opa.evaluate(input);

  if (!decision.allow) {
    return res.status(403).json({
      error: 'Forbidden',
      reasons: decision.deny,
    });
  }

  // Attach audit info to request
  req.authzAudit = decision.audit;
  next();
}
```

---

### 3.5 Políticas por Workspace/Projeto

#### Hierarquia de Políticas

```
Global Policies (aplicam a todos)
  └── Organization Policies (org-wide)
        └── Workspace Policies (workspace-specific)
              └── Project Policies (project-specific)
                    └── Resource Policies (per-workflow/recurso)

Cada nível herda do nível superior, mas pode:
  - Reforçar (mais restritivo)
  - Exceção (menos restritivo, com justificativa)
```

#### Implementação

```typescript
// policies/hierarchical-policy-engine.ts
interface PolicyLevel {
  type: 'global' | 'organization' | 'workspace' | 'project' | 'resource';
  entityId: string;
  policies: PolicyRule[];
  overrides?: PolicyOverride[];
}

interface PolicyRule {
  id: string;
  effect: 'allow' | 'deny';
  principals: string[];  // roles or user IDs
  actions: string[];
  resources: string[];
  conditions?: PolicyCondition[];
  justification?: string;
}

interface PolicyOverride {
  ruleId: string;
  effect: 'allow' | 'deny';
  justification: string;  // Audit trail
  expiresAt?: Date;
  approvedBy: string;
}

class HierarchicalPolicyEngine {
  async evaluate(
    user: User,
    action: string,
    resource: Resource,
    context: PolicyContext
  ): Promise<PolicyDecision> {
    // Collect policies from all levels
    const policies = await this.collectPolicies(resource);

    // Sort by specificity (most specific first)
    const sorted = this.sortBySpecificity(policies, resource);

    // Apply policies in order
    for (const rule of sorted) {
      if (!this.matchesPrincipal(rule, user)) continue;
      if (!this.matchesAction(rule, action)) continue;
      if (!this.matchesResource(rule, resource)) continue;

      // Check conditions
      if (rule.conditions) {
        const conditionsMet = await this.evaluateConditions(rule.conditions, context);
        if (!conditionsMet) continue;
      }

      // Check if override exists
      const override = await this.findOverride(rule.id, resource);
      if (override) {
        await this.auditLog('policy_override_applied', {
          ruleId: rule.id,
          userId: user.id,
          action,
          resource: resource.id,
          justification: override.justification,
        });

        return {
          allowed: override.effect === 'allow',
          appliedRule: rule.id,
          overridden: true,
          justification: override.justification,
        };
      }

      return {
        allowed: rule.effect === 'allow',
        appliedRule: rule.id,
      };
    }

    // Default deny
    return { allowed: false, appliedRule: 'default-deny' };
  }

  private async collectPolicies(resource: Resource): Promise<PolicyRule[]> {
    const policies: PolicyRule[] = [];

    // Global
    policies.push(...await this.getGlobalPolicies());

    // Organization (if applicable)
    if (resource.organizationId) {
      policies.push(...await this.getOrgPolicies(resource.organizationId));
    }

    // Workspace
    if (resource.workspaceId) {
      policies.push(...await this.getWorkspacePolicies(resource.workspaceId));
    }

    // Project
    if (resource.projectId) {
      policies.push(...await this.getProjectPolicies(resource.projectId));
    }

    // Resource-level (direct)
    policies.push(...await this.getResourcePolicies(resource.id));

    return policies;
  }

  private sortBySpecificity(policies: PolicyRule[], resource: Resource): PolicyRule[] {
    const levelOrder = ['resource', 'project', 'workspace', 'organization', 'global'];
    return policies.sort((a, b) => {
      const aIdx = levelOrder.indexOf(this.getRuleLevel(a, resource));
      const bIdx = levelOrder.indexOf(this.getRuleLevel(b, resource));
      return aIdx - bIdx;  // Most specific first
    });
  }
}
```

---

## 4. Integração com IDEIA

### 4.1 Autenticação Desktop vs Web

#### Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                     DESKTOP (Electron/Tauri)                     │
│                                                                  │
│  ┌─────────────┐     Local IPC     ┌────────────────────────┐   │
│  │ Main Process │◄────────────────►│ Renderer (Monaco)      │   │
│  │  (Node.js)   │                  │  (React, Agent UI)     │   │
│  └──────┬───────┘                  └────────────────────────┘   │
│         │                                                        │
│         │ OAuth PKCE via                                          │
│         │ system browser                                          │
│         │ + local token storage                                   │
│         │ (safeStorage, keytar)                                   │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  Token Store                                                  ││
│  │  - Access token (15 min)                                     ││
│  │  - Refresh token (7 days, encrypted)                         ││
│  │  - Device credentials (WebAuthn)                             ││
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      WEB (Theia Cloud)                           │
│                                                                  │
│  ┌──────────────┐     Same-origin     ┌──────────────────────┐  │
│  │  Browser      │◄───────────────────►│  Theia Frontend      │  │
│  │  (Secure)     │                     │  (React, Monaco)     │  │
│  └──────┬────────┘                     └──────────────────────┘  │
│         │                                                         │
│         │ OAuth PKCE via                                          │
│         │ browser redirect                                        │
│         │ + httpOnly cookies                                      │
│         ▼                                                         │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Session Store                                                │ │
│  │  - httpOnly cookie (server-side session)                     │ │
│  │  - CSRF token in cookie + header                             │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Desktop Token Management

```typescript
// desktop/auth-manager.ts
import safeStorage from 'safe-storage';
import keytar from 'keytar';

const SERVICE_NAME = 'ideia-desktop';
const ACCOUNT_NAME = 'auth-tokens';

class DesktopAuthManager {
  private currentTokens: TokenPair | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  async getValidToken(): Promise<string> {
    // Check in-memory tokens
    if (this.currentTokens) {
      const payload = decodeJWT(this.currentTokens.accessToken);
      if (payload.exp > Date.now() / 1000 + 60) {
        return this.currentTokens.accessToken;
      }
      // Token expiring soon, refresh
      return this.refreshTokens();
    }

    // Load from encrypted storage
    await this.loadFromStorage();
    if (this.currentTokens) {
      return this.getValidToken();
    }

    // No tokens, must login
    throw new AuthError('Not authenticated');
  }

  async login(): Promise<void> {
    // Open system browser for OAuth PKCE flow
    const auth = new PKCEGenerator();
    const { url, verifier, state } = auth.getAuthUrl(
      process.env.CLIENT_ID!,
      'ideia://auth/callback'
    );

    // Listen for callback via deep link or local server
    const code = await this.listenForCallback(state);

    // Exchange code for tokens
    this.currentTokens = await auth.exchangeCode(code, verifier);

    // Store encrypted
    await this.saveToStorage();

    // Schedule refresh
    this.scheduleTokenRefresh();
  }

  private async saveToStorage(): Promise<void> {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(
        JSON.stringify(this.currentTokens)
      );
      require('fs').writeFileSync(
        this.getTokenPath(),
        encrypted
      );
    } else {
      // Fallback to keytar
      await keytar.setPassword(
        SERVICE_NAME,
        ACCOUNT_NAME,
        JSON.stringify(this.currentTokens)
      );
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      let data: string | null = null;

      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = require('fs').readFileSync(this.getTokenPath());
        data = safeStorage.decryptString(encrypted);
      } else {
        data = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      }

      if (data) {
        this.currentTokens = JSON.parse(data);
      }
    } catch {
      this.currentTokens = null;
    }
  }

  private scheduleTokenRefresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);

    // Refresh 1 minute before expiration
    const payload = decodeJWT(this.currentTokens!.accessToken);
    const refreshIn = (payload.exp * 1000 - Date.now() - 60_000);

    this.refreshTimer = setTimeout(() => {
      this.refreshTokens();
    }, Math.max(refreshIn, 10_000));
  }

  private async refreshTokens(): Promise<string> {
    const tokens = await tokenRotation.refreshAccessToken(
      this.currentTokens!.refreshToken
    );
    this.currentTokens = tokens;
    await this.saveToStorage();
    this.scheduleTokenRefresh();
    return tokens.accessToken;
  }

  async logout(): Promise<void> {
    this.currentTokens = null;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);

    if (safeStorage.isEncryptionAvailable()) {
      try { require('fs').unlinkSync(this.getTokenPath()); } catch {}
    } else {
      await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    }
  }

  private async listenForCallback(expectedState: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // For Electron: register deep link protocol 'ideia://'
      // For Tauri: use Tauri's event system
      const server = require('http').createServer((req: any, res: any) => {
        const url = new URL(req.url!, 'http://localhost');
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        if (state !== expectedState) {
          reject(new Error('State mismatch'));
          return;
        }

        res.end('Authentication successful! You can close this window.');
        server.close();
        resolve(code!);
      });

      server.listen(3456, '127.0.0.1');
    });
  }
}
```

---

### 4.2 Theia Cloud Multi-Tenant Auth

```typescript
// theia-cloud/auth-middleware.ts
// Multi-tenant authentication for Theia Cloud workspaces

interface Tenant {
  id: string;
  domain: string;
  authProvider: 'supabase' | 'keycloak' | 'auth0';
  authConfig: Record<string, string>;
  allowedDomains: string[];
}

class TheiaCloudAuth {
  private tenants: Map<string, Tenant> = new Map();

  // Resolve tenant from request (subdomain or header)
  resolveTenant(req: Request): Tenant | null {
    // By subdomain: team1.ideia.dev
    const host = req.headers.host || '';
    const subdomain = host.split('.')[0];
    const tenant = this.tenants.get(subdomain);
    if (tenant) return tenant;

    // By header: X-Tenant-ID
    const tenantId = req.headers['x-tenant-id'] as string;
    return this.tenants.get(tenantId) || null;
  }

  // Tenant-aware JWT verification
  async verifyToken(token: string, tenant: Tenant): Promise<JWTPayload> {
    switch (tenant.authProvider) {
      case 'supabase':
        return this.verifySupabaseToken(token, tenant);
      case 'keycloak':
        return this.verifyKeycloakToken(token, tenant);
      case 'auth0':
        return this.verifyAuth0Token(token, tenant);
    }
  }

  private async verifySupabaseToken(token: string, tenant: Tenant): Promise<JWTPayload> {
    const supabase = createClient(
      tenant.authConfig.url,
      tenant.authConfig.anonKey
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) throw new AuthError(error.message);
    return user!;
  }

  // Middleware: authenticate within tenant context
  async middleware(req: Request, res: Response, next: NextFunction) {
    const tenant = this.resolveTenant(req);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing token' });
    }

    try {
      const user = await this.verifyToken(authHeader.slice(7), tenant);
      req.user = user;
      req.tenant = tenant;

      // Verify user is member of this tenant's workspace
      const isMember = await this.checkTenantMembership(user, tenant);
      if (!isMember) {
        return res.status(403).json({ error: 'Not a member of this tenant' });
      }

      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  // Tenant-scoped workspace provisioning
  async provisionWorkspace(tenant: Tenant, user: User): Promise<Workspace> {
    // Theia Cloud workspace with tenant-specific resources
    const workspace = await this.cloudService.createWorkspace({
      name: `${tenant.id}-${user.id}`,
      image: 'ideia/workspace:latest',
      resources: {
        cpu: tenant.tier === 'enterprise' ? 4 : 2,
        memory: tenant.tier === 'enterprise' ? '8Gi' : '4Gi',
        storage: tenant.tier === 'enterprise' ? '50Gi' : '10Gi',
      },
      env: {
        TENANT_ID: tenant.id,
        AUTH_PROVIDER: tenant.authProvider,
      },
      network: {
        allowedDomains: tenant.allowedDomains,
      },
    });

    return workspace;
  }
}
```

---

### 4.3 Agent-to-Service Auth

Agentes (Analyst, Programmer, Reviewer, etc.) se comunicam entre si via NATS. Essa comunicação precisa ser autenticada.

```typescript
// agents/auth-agent.ts
import { connect, NatsConnection, JwtAuth } from 'nats';

class AgentAuthManager {
  // Agent identity — cada agente tem uma credencial única
  private agentCredentials: Map<string, AgentCredential> = new Map();

  constructor() {
    this.registerAgent('analyst', process.env.ANALYST_API_KEY!);
    this.registerAgent('programmer', process.env.PROGRAMMER_API_KEY!);
    this.registerAgent('reviewer', process.env.REVIEWER_API_KEY!);
    this.registerAgent('tester', process.env.TESTER_API_KEY!);
  }

  registerAgent(agentId: string, apiKey: string): void {
    // API Key → JWT → NATS credential
    const jwt = this.createAgentJWT(agentId, apiKey);
    this.agentCredentials.set(agentId, { apiKey, jwt });
  }

  private createAgentJWT(agentId: string, apiKey: string): string {
    // Create a signed JWT identifying the agent
    return jwt.sign(
      {
        sub: `agent:${agentId}`,
        type: 'agent',
        permissions: this.getAgentPermissions(agentId),
      },
      apiKey,
      { expiresIn: '24h', issuer: 'ideia-internal' }
    );
  }

  async connectAsAgent(agentId: string): Promise<NatsConnection> {
    const cred = this.agentCredentials.get(agentId);
    if (!cred) throw new Error(`Agent ${agentId} not registered`);

    // Connect to NATS with agent JWT
    return connect({
      servers: process.env.NATS_SERVERS || 'nats://localhost:4222',
      authenticator: new JwtAuth(cred.jwt),
    });
  }

  // NATS middleware — valida que Publisher é agente autorizado
  natsAuthMiddleware() {
    return async (subject: string, data: Uint8Array, reply?: string) => {
      // Extract agent identity from NATS client certificate
      const clientInfo = this.extractClientIdentity();

      if (!clientInfo || clientInfo.type !== 'agent') {
        throw new Error('Unauthorized: only agents can publish to this subject');
      }

      // Check agent has permission for this subject
      const allowed = this.checkSubjectPermission(clientInfo.sub, subject);
      if (!allowed) {
        throw new Error(`Agent ${clientInfo.sub} cannot publish to ${subject}`);
      }
    };
  }

  private checkSubjectPermission(agentSubject: string, subject: string): boolean {
    const agentId = agentSubject.replace('agent:', '');
    const permissions = AGENT_SUBJECT_PERMISSIONS[agentId] || [];

    return permissions.some(p => {
      const regex = new RegExp(`^${p.replace(/\*/g, '.*')}$`);
      return regex.test(subject);
    });
  }
}

// Permissões de subjects por agente
const AGENT_SUBJECT_PERMISSIONS: Record<string, string[]> = {
  'analyst': [
    'agent.analysis.*',
    'workflow.state.*',
    'memory.write',
  ],
  'programmer': [
    'agent.analysis.completed',
    'agent.code.*',
    'workflow.state.*',
    'memory.write',
    'memory.read',
  ],
  'reviewer': [
    'agent.code.generated',
    'agent.review.*',
    'workflow.state.*',
    'memory.read',
  ],
  'tester': [
    'agent.code.generated',
    'agent.review.completed',
    'agent.test.*',
    'workflow.state.*',
  ],
};
```

#### Service-to-Service Auth (mTLS)

```typescript
import { createServer } from 'https';
import { readFileSync } from 'fs';

// mTLS para comunicação entre microsserviços
const serverOptions = {
  key: readFileSync('certs/server.key'),
  cert: readFileSync('certs/server.crt'),
  ca: readFileSync('certs/ca.crt'),
  requestCert: true,
  rejectUnauthorized: true,
};

const server = createServer(serverOptions, (req, res) => {
  const clientCert = req.socket.getPeerCertificate();
  const serviceName = clientCert.subject.CN;

  // Verificar se o certificado é de um serviço conhecido
  if (!ALLOWED_SERVICES.includes(serviceName)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  // Autorização baseada no certificado
  req.service = { name: serviceName };
  // continua...
});

// Client mTLS
import { request } from 'https';

const clientOptions = {
  hostname: 'workflow-service.internal',
  port: 443,
  path: '/api/v1/workflows',
  key: readFileSync('certs/client.key'),
  cert: readFileSync('certs/client.crt'),
  ca: readFileSync('certs/ca.crt'),
};

const req = request(clientOptions, (res) => {
  // Handle response
});
```

---

### 4.4 API Keys para CI/CD

```typescript
// api-keys/api-key-manager.ts
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

interface APIKey {
  id: string;
  prefix: string;    // First 8 chars (for identification)
  hash: string;      // bcrypt hash of the full key
  name: string;      // Human-readable name
  scopes: string[];  // Permissions
  expiresAt: Date | null;
  createdBy: string;
  lastUsedAt: Date | null;
  revoked: boolean;
}

class APIKeyManager {
  private readonly KEY_PREFIX = 'ideia_';

  async createKey(params: {
    name: string;
    scopes: string[];
    expiresInDays?: number;
    createdBy: string;
  }): Promise<{ key: string; id: string }> {
    // Generate full key: ideia_XXXXXXXXX
    const rawKey = this.KEY_PREFIX + randomBytes(32).toString('base64url');
    const prefix = rawKey.slice(0, 15); // ideia_ + 8 chars

    const keyData = {
      prefix,
      hash: await bcrypt.hash(rawKey, 12),
      name: params.name,
      scopes: params.scopes,
      expiresAt: params.expiresInDays
        ? new Date(Date.now() + params.expiresInDays * 86400000)
        : null,
      createdBy: params.createdBy,
      revoked: false,
    };

    const { id } = await prisma.apiKey.create({ data: keyData });

    // Return full key only once
    return { key: rawKey, id };
  }

  async validateKey(key: string): Promise<{
    valid: boolean;
    scopes?: string[];
    error?: string;
  }> {
    if (!key.startsWith(this.KEY_PREFIX)) {
      return { valid: false, error: 'Invalid key format' };
    }

    const prefix = key.slice(0, 15);
    const storedKey = await prisma.apiKey.findUnique({
      where: { prefix },
    });

    if (!storedKey) {
      return { valid: false, error: 'Key not found' };
    }

    if (storedKey.revoked) {
      return { valid: false, error: 'Key revoked' };
    }

    if (storedKey.expiresAt && storedKey.expiresAt < new Date()) {
      return { valid: false, error: 'Key expired' };
    }

    const valid = await bcrypt.compare(key, storedKey.hash);
    if (!valid) {
      return { valid: false, error: 'Invalid key' };
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: storedKey.id },
      data: { lastUsedAt: new Date() },
    });

    return { valid: true, scopes: storedKey.scopes };
  }

  async revokeKey(id: string): Promise<void> {
    await prisma.apiKey.update({
      where: { id },
      data: { revoked: true },
    });
  }

  async rotateKey(id: string): Promise<string> {
    const oldKey = await prisma.apiKey.findUnique({ where: { id } });
    if (!oldKey) throw new Error('Key not found');

    // Revoke old
    await this.revokeKey(id);

    // Create new with same params
    const { key } = await this.createKey({
      name: oldKey.name,
      scopes: oldKey.scopes,
      createdBy: oldKey.createdBy,
    });

    return key;
  }

  // Middleware for CI/CD endpoints
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }

      const result = await this.validateKey(apiKey);
      if (!result.valid) {
        return res.status(401).json({ error: result.error });
      }

      // Attach scopes to request
      req.apiKey = { scopes: result.scopes };
      next();
    };
  }

  // Scope check middleware
  requireScope(scope: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.apiKey?.scopes.includes(scope)) {
        return res.status(403).json({
          error: `Missing required scope: ${scope}`,
        });
      }
      next();
    };
  }
}

// Scopes predefinidos
export const API_SCOPES = {
  WORKFLOW_READ: 'workflow:read',
  WORKFLOW_WRITE: 'workflow:write',
  WORKFLOW_DELETE: 'workflow:delete',
  AGENT_EXECUTE: 'agent:execute',
  ADMIN_USERS: 'admin:users',
  ADMIN_KEYS: 'admin:api-keys',
  CI_PIPELINE: 'ci:pipeline',     // Full CI/CD access
  CI_READONLY: 'ci:readonly',     // Read-only CI status
} as const;
```

---

### 4.5 Token Refresh, Rotação e Revogação

```typescript
// tokens/token-lifecycle.ts
class TokenLifecycleManager {
  // Redis-based token blacklist (fast revogação)
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  // Revogar token específico
  async revokeToken(jti: string, expiresIn: number): Promise<void> {
    await this.redis.set(
      `revoked:${jti}`,
      'true',
      'EX',
      expiresIn  // Keep until token would have expired
    );
  }

  // Revogar todos os tokens de um usuário (forçar logout)
  async revokeAllUserTokens(userId: string): Promise<void> {
    // Increment user's token version — todos os tokens com version < current são inválidos
    await this.redis.incr(`token-version:${userId}`);
  }

  // Verificar se token foi revogado
  async isTokenRevoked(jti: string): Promise<boolean> {
    const revoked = await this.redis.get(`revoked:${jti}`);
    return revoked === 'true';
  }

  // Refresh token com rotação
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    const payload = await verifyRefreshToken(refreshToken);

    // Check if token version is still valid
    const currentVersion = await this.redis.get(`token-version:${payload.sub}`);
    if (currentVersion && payload.version < parseInt(currentVersion)) {
      throw new TokenRevokedError('User tokens have been revoked');
    }

    // Check if this refresh token was already used (rotation)
    const familyKey = `token-family:${payload.family}`;
    const lastVersion = await this.redis.get(familyKey);

    if (lastVersion && parseInt(lastVersion) >= payload.version) {
      // Reuse detected! This means the previous token was stolen.
      // Revoke all tokens for this user.
      await this.revokeAllUserTokens(payload.sub);
      await this.auditSecurityEvent('refresh_token_reuse', {
        userId: payload.sub,
        family: payload.family,
        version: payload.version,
        ip: /* current IP */,
      });
      throw new TokenReuseDetectedError();
    }

    // Mark current version as used
    await this.redis.set(familyKey, payload.version.toString(), 'EX', 7 * 86400);

    // Generate new tokens
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UserNotFoundError();

    const newTokens = await generateTokenPair(user);
    return newTokens;
  }

  // Verificação completa de token a cada request
  async verifyRequest(req: Request): Promise<JWTPayload> {
    const token = extractBearerToken(req);
    if (!token) throw new AuthError('No token');

    let payload: JWTPayload;
    try {
      payload = await verifyAccessToken(token);
    } catch (err) {
      throw new AuthError('Invalid token');
    }

    // Check global revocation
    const revoked = await this.isTokenRevoked(payload.jti);
    if (revoked) throw new TokenRevokedError();

    // Check user-level revocation
    const userVersion = await this.redis.get(`token-version:${payload.sub}`);
    if (userVersion && payload.version < parseInt(userVersion)) {
      throw new TokenRevokedError('Token version outdated');
    }

    return payload;
  }

  // Auditoria de eventos de segurança
  private async auditSecurityEvent(
    event: string,
    metadata: Record<string, any>
  ): Promise<void> {
    await fetch('http://audit-service:4000/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        severity: 'high',
        ...metadata,
      }),
    });
  }
}
```

---

## 5. Segurança de Sessão

### 5.1 Session Management

#### Server-Side Sessions (Recomendado para Web)

```typescript
import session from 'express-session';
import connectRedis from 'connect-redis';
import Redis from 'ioredis';

const RedisStore = connectRedis(session);
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  keyPrefix: 'session:',
});

// Session configuration
app.use(session({
  store: new RedisStore({
    client: redisClient,
    ttl: 86400, // 24 hours
    prefix: 'sess:',
  }),
  secret: process.env.SESSION_SECRET,
  name: 'ideia.sid',  // Custom cookie name (not default 'connect.sid')
  resave: false,
  saveUninitialized: false,
  rolling: true,       // Refresh TTL on each request
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
    domain: process.env.COOKIE_DOMAIN,
  },
}));
```

#### Session vs JWT

| Aspecto | Server-Side Session | JWT |
|---------|--------------------|-----|
| **Armazenamento** | Redis/DB | No cliente (browser/localStorage) |
| **Revogação** | Imediata (apagar do Redis) | Difícil (blacklist necessária) |
| **Escalabilidade** | Store centralizada (Redis) | Stateless (escalonamento fácil) |
| **Latência** | 1-3ms (Redis lookup) | 0ms (verificação local) |
| **Payload** | Pequeno (session ID) | Maior (claims no token) |
| **CSRF** | Proteção nativa (cookie) | Requer double-submit pattern |
| **XSS** | Cookie httpOnly protege | localStorage é acessível via JS |
| **Mobile/Desktop** | Requer adaptability | Mais simples |
| **Recomendação** | **Web (Theia Cloud)** | **Desktop + API** |

---

### 5.2 CSRF Protection

```typescript
import csrf from 'csrf';
import { doubleCsrf } from 'csrf-csrf';

const tokens = new csrf();

// Double Submit Cookie Pattern
// 1. GET request → gera token e seta cookie
// 2. POST request → token no header E cookie são comparados
export function csrfProtection() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      // Generate and set CSRF token cookie
      const secret = await tokens.secret();
      const csrfToken = tokens.create(secret);
      res.cookie('csrf-token', csrfToken, {
        httpOnly: false,  // JavaScript needs to read it
        secure: true,
        sameSite: 'strict',
        path: '/',
      });
      req.csrfSecret = secret;
      return next();
    }

    // For mutating methods: validate
    const cookieToken = req.cookies['csrf-token'];
    const headerToken = req.headers['x-csrf-token'] as string;

    if (!cookieToken || !headerToken) {
      return res.status(403).json({ error: 'Missing CSRF tokens' });
    }

    if (!tokens.verify(req.csrfSecret, cookieToken) || cookieToken !== headerToken) {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }

    next();
  };
}

// Alternative: SameSite cookie + origin check
function csrfCheck(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const origin = req.headers.origin || req.headers['x-forwarded-host'];
  const allowedOrigins = [
    'https://ideia.dev',
    'https://*.ideia.dev',
    'chrome-extension://*',  // Desktop app
  ];

  if (origin && !allowedOrigins.some(o => matchOrigin(o, origin))) {
    return res.status(403).json({ error: 'Invalid origin' });
  }

  next();
}
```

---

### 5.3 XSS Prevention

```typescript
// helmet config
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",  // Necessário para Monaco
        "'unsafe-eval'",    // Necessário para Monaco (web workers)
        'https://cdn.jsdelivr.net',
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
      ],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: [
        "'self'",
        'https://api.ideia.dev',
        'wss://api.ideia.dev',
        'https://auth.ideia.dev',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
      workerSrc: ["'self'", 'blob:'],  // Monaco web workers
    },
  },
  crossOriginEmbedderPolicy: false,  // Monaco precisa de cross-origin
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));

// Input sanitization
import DOMPurify from 'isomorphic-dompurify';

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],    // No HTML tags allowed
    ALLOWED_ATTR: [],    // No attributes allowed
    STRIP_ALL: true,     // Strip everything
  });
}

// Output encoding
function encodeForHTML(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// React: dangerouslySetInnerHTML é bloqueado por lint rule
// Preferir componentes React que escapam automaticamente
```

---

### 5.4 HttpOnly Cookies vs localStorage

| Aspecto | httpOnly Cookie | localStorage |
|---------|---------------|-------------|
| **Acesso JS** | ❌ Inacessível | ✅ Acessível (document.localStorage) |
| **XSS** | ✅ Imune (JS não lê) | ❌ Vulnerável |
| **CSRF** | ⚠️ Requer proteção extra | ✅ Imune |
| **Tamanho** | Limitado (~4KB) | 5-10MB |
| **Expiração** | Gerenciada pelo servidor | Manual (JS) |
| **Subdomínios** | Configurável via `domain` | Por origem (não compartilha) |
| **Mobile** | Requer cookie manager | Nativo |
| **API Clients** | ❌ Difícil (curl, Postman) | ✅ Fácil (incluir header) |

#### Estratégia Híbrida

```typescript
// Web: httpOnly cookie para session ID + CSRF token cookie
// API/Desktop: Bearer JWT (localStorage ou keytar)
// CI/CD: API Key (header X-API-Key)

function getAuthStrategy(context: 'web' | 'desktop' | 'api' | 'ci') {
  switch (context) {
    case 'web':
      return {
        type: 'session_cookie',
        tokenStorage: 'httpOnly cookie',
        csrfProtection: true,
        refreshMechanism: 'cookie rotation',
      };
    case 'desktop':
      return {
        type: 'jwt_bearer',
        tokenStorage: 'safeStorage/keytar (encrypted)',
        csrfProtection: false,
        refreshMechanism: 'refresh token rotation',
      };
    case 'api':
      return {
        type: 'jwt_bearer',
        tokenStorage: 'in-memory',
        csrfProtection: false,
        refreshMechanism: 'refresh token',
      };
    case 'ci':
      return {
        type: 'api_key',
        tokenStorage: 'environment variable',
        csrfProtection: false,
        refreshMechanism: 'key rotation',
      };
  }
}
```

---

### 5.5 Session Fixation e Hijacking Prevention

```typescript
class SessionSecurity {
  // 1. Regenerate session ID após login
  async afterLogin(req: Request, user: User): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    req.session.userId = user.id;
    req.session.createdAt = Date.now();
    req.session.ip = req.ip;
    req.session.userAgent = req.headers['user-agent'];
  }

  // 2. Session fingerprinting
  validateSessionFingerprint(req: Request): boolean {
    const session = req.session;

    // Check if IP changed drastically
    if (session.ip && session.ip !== req.ip) {
      // IP change within same session — potential hijacking
      this.logSecurityEvent('session_ip_change', {
        sessionId: req.sessionID,
        oldIp: session.ip,
        newIp: req.ip,
      });
      return false;
    }

    // Check user agent
    if (session.userAgent && session.userAgent !== req.headers['user-agent']) {
      this.logSecurityEvent('session_ua_change', {
        sessionId: req.sessionID,
        oldUA: session.userAgent,
        newUA: req.headers['user-agent'],
      });
      return false;
    }

    return true;
  }

  // 3. Absolute timeout (força re-login após 24h mesmo com atividade)
  checkAbsoluteTimeout(req: Request): boolean {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (req.session.createdAt && Date.now() - req.session.createdAt > maxAge) {
      req.session.destroy((err) => {});
      return false;
    }
    return true;
  }

  // 4. Concurrent session limit
  async enforceSessionLimit(userId: string, maxSessions: number = 5): Promise<void> {
    const activeSessions = await this.getActiveSessionCount(userId);

    if (activeSessions >= maxSessions) {
      // Expire oldest session
      const oldestSession = await this.getOldestSession(userId);
      if (oldestSession) {
        await this.destroySession(oldestSession.id);
        this.logSecurityEvent('session_limit_reached', {
          userId,
          activeSessions,
          maxSessions,
          expiredSessionId: oldestSession.id,
        });
      }
    }
  }

  // 5. Idle timeout
  getIdleTimeout(role: string): number {
    const timeouts: Record<string, number> = {
      'admin': 15 * 60 * 1000,       // 15 min
      'developer': 60 * 60 * 1000,   // 1 hour
      'viewer': 4 * 60 * 60 * 1000,  // 4 hours
    };
    return timeouts[role] || 60 * 60 * 1000;
  }

  // 6. Middleware completo
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.session.userId) return next();

      // Fingerprint validation
      if (!this.validateSessionFingerprint(req)) {
        req.session.destroy((err) => {});
        return res.status(401).json({
          error: 'Session validation failed. Please login again.',
          code: 'SESSION_HIJACKED',
        });
      }

      // Absolute timeout
      if (!this.checkAbsoluteTimeout(req)) {
        return res.status(401).json({
          error: 'Session expired. Please login again.',
          code: 'SESSION_EXPIRED',
        });
      }

      // Idle timeout
      const idleTimeout = this.getIdleTimeout(req.session.role);
      if (req.session.lastActivity && Date.now() - req.session.lastActivity > idleTimeout) {
        req.session.destroy((err) => {});
        return res.status(401).json({
          error: 'Session idle timeout. Please login again.',
          code: 'SESSION_IDLE',
        });
      }

      req.session.lastActivity = Date.now();
      next();
    };
  }

  private async logSecurityEvent(event: string, data: any): Promise<void> {
    await prisma.securityAudit.create({
      data: {
        event,
        metadata: data,
        timestamp: new Date(),
        severity: 'high',
      },
    });
  }
}
```

#### Resumo de Contramedidas

| Ameaça | Contramedida | Implementação |
|--------|-------------|---------------|
| **Session Fixation** | Regenerar session ID no login | `session.regenerate()` |
| **Session Hijacking** | Fingerprint (IP + UA) | Validado a cada request |
| **Session Prediction** | IDs aleatórios (crypto) | `uuid` seguro |
| **Man-in-the-Middle** | HTTPS + HSTS | `helmet()`, `Strict-Transport-Security` |
| **XSS** | httpOnly cookies + CSP | `helmet.contentSecurityPolicy` |
| **CSRF** | Double-submit cookie + SameSite | `csrf-csrf`, `sameSite: 'lax'` |
| **Replay Attack** | Nonce + timestamp check | OIDC `nonce`, JWT `iat` check |
| **Token Theft** | Rotação + fingerprint | Refresh token rotation |
| **Brute Force** | Rate limiting + account lockout | `express-rate-limit`, Redis |
| **Credential Stuffing** | Breached password detection | HaveIBeenPwned API, Auth0 Anomaly Detection |

---

## Referências

- [Auth0 Documentation](https://auth0.com/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Cedar Policy Language](https://www.cedarpolicy.com)
- [OPA Documentation](https://www.openpolicyagent.org/docs)
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [OIDC Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [WebAuthn Level 2](https://www.w3.org/TR/webauthn-2/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP LLM Top 10](https://genai.owasp.org)
- `docs/ESTUDOS/ESTUDO-QUALIDADE-TOTAL-IDEIA.md` — Qualidade e segurança
- `docs/ESTUDOS/MATRIZ-TECNOLOGICA-COMPLETA.md` — Stack tecnológico
- `AGENTS.md` — ADRs e regras de arquitetura

---

## Intensificação: Roteiro de Implementação

### Tasks Geradas

1. **Implementar OAuth 2.0 + OIDC Flow (`packages/auth/`)**
   - Provider router com suporte a Authorization Code + PKCE
   - Token refresh automático com rotação de refresh tokens
   - Session management com cookies HttpOnly + CSRF tokens
   - Base: seção 2.1 (protocolos), 5.1-5.4 (sessão)

2. **Integrar Clerk como auth primário**
   - SDK `@clerk/nextjs` + `@clerk/express` nos microsserviços
   - Componentes `SignIn`/`SignUp`/`UserButton` no frontend Theia
   - Organizations com RBAC nativo para workspaces multi-tenant
   - Base: seção 1.2 (Clerk), 4.2 (multi-tenant)

3. **Implementar RBAC + ABAC com Cedar Policy Engine**
   - Migrar do regex-based policy (`policy-engine/src/policy.ts`) para Cedar
   - Políticas por workspace/projeto com roles customizáveis
   - Integração com OPA sidecar para avaliação em tempo real
   - Base: seção 3.1-3.5 (RBAC/ABAC/Cedar)

4. **Implementar WebAuthn / Passkeys**
   - Registro e autenticação via `navigator.credentials.create()` / `get()`
   - Fallback para TOTP quando WebAuthn não disponível
   - Suporte a security keys (FIDO2) e platform authenticators
   - Base: seção 2.4 (WebAuthn/Passkeys), 2.6 (MFA/TOTP)

5. **Implementar Agent-to-Service Auth**
   - Service-to-service com mTLS + JWT mutual authentication
   - API Keys para CI/CD com rate limiting por scope
   - Token revocation via Redis allowlist + NATS event
   - Base: seção 4.3 (agent-to-service), 4.4 (CI/CD API keys)

6. **Implementar Session Management e Segurança**
   - Session store em Redis com TTL configurável
   - CSRF double-submit cookie pattern
   - Session fixation protection na troca de roles
   - Anomaly detection (login geográfico suspeito, brute force)
   - Base: seção 5.1-5.5 (sessão, CSRF, XSS)

7. **Contract Tests para Auth Flows**
   - Pact CDC para contratos entre auth gateway e microsserviços
   - Testes de compatibilidade Clerk ↔ RBAC ↔ API Gateway
   - Base: seção 1.8 (comparação final), contratos do S10v2

### Tecnologias Recomendadas

| Prioridade | Tecnologia | Uso | Justificativa |
|------------|-----------|-----|---------------|
| P0 | Clerk | Auth primário SaaS | Developer experience superior, Organizations nativo, custo 5x menor que Auth0 |
| P0 | Cedar (AWS) | Policy Engine | Substitui regex frágil, policy-as-code, integração OPA |
| P0 | Redis | Session store | Cache distribuído, TTL nativo, já no stack |
| P1 | WebAuthn API | Passkeys/MFA | Sem dependência externa, suporte nativo em browsers modernos |
| P1 | OPA | Policy evaluation | Sidecar para Cedar policies, avaliação em tempo real |
| P2 | Auth0 | Fallback enterprise | SAML 2.0, LDAP, organizations complexas |
| P2 | Lucia Auth | Self-hosted | Controle total sobre dados de autenticação |
| P2 | TOTP (speakeasy) | MFA offline | Sem dependência de SMS/email |

### Conexões com Estudos

- **S10v2** (Empilhamento/Contratos) — Contratos C1-C8 integram auth layer com event bus e API Gateway
- **S4** (Segurança/Governança) — Policies Cedar espelham regras de segurança do prompt governor
- **S14** (Autenticação/Autorização) — Este estudo é o S14, referência central
- **E3** (Qualidade) — Testes de contrato Pact para auth flows
- **AGENTS.md** — Regras de `AppError` com código e status HTTP para auth failures

### Riscos de Implementação

1. **Vendor lock-in (Clerk)** — SaaS-only; migração para Auth0 ou Lucia exige reescrita de todo o auth layer. Mitigação: abstrair atrás de interface `AuthProvider` com adapter pattern.
2. **Latência de autenticação em desktop** — Clerk/Auth0 exigem chamadas de rede mesmo para cache local. Mitigação: session cache offline + JWT validation local com JWKS rotacionado.
3. **Complexidade RBAC+ABAC com Cedar** — Cedar tem curva de aprendizado íngreme e ecossistema pequeno (AWS-only). Mitigação: começar com RBAC puro, adicionar ABAC incrementalmente.
4. **WebAuthn cross-browser** — `navigator.credentials` não é uniforme entre browsers e plataformas (mobile vs desktop). Mitigação: fallback progressivo com TOTP.
5. **Revogação de token em tempo real** — JWT revogado não pode ser invalidado sem check em banco. Mitigação: Redis allowlist com TTL do JWT; NATS event para broadcast de revogação.

---

## Intensificação

### ADR References

| ADR | Título | Relação |
|-----|--------|---------|
| ADR-016 | Security Layers Architecture | Camadas de segurança que integram auth, policy engine e audit |
| ADR-008 | API Gateway Pattern | Gateway centraliza validação de tokens e escopos |
| ADR-012 | Event-Driven Auth Flows | NATS como backbone para eventos de revogação e refresh |
| ADR-004 | Multi-Tenant Isolation | Organizations/Clerk separação por workspace |

### Métricas

| Métrica | Alvo | Medição | Frequência |
|---------|------|---------|------------|
| Auth response time (p95) | <200ms | APM (OpenTelemetry) | Contínuo |
| Login success rate | >99.5% | Logs de autenticação | Diário |
| Token refresh overhead | <50ms | Tracing distribuído | Contínuo |
| JWT validation throughput | >5000 req/s | k6 load test | Semanal |
| MFA enrollment coverage | >80% | Auditoria de usuários | Mensal |
| RBAC policy evaluation | <10ms | Benchmarks do Cedar | Por release |
| Auth test coverage | >90% | Jest/Vitest coverage | Por PR |
| Security audit pass rate | 100% | GAPS-PRODUCAO-IDE | Por release |

### Timeline

| Fase | Período | Marcos |
|------|---------|--------|
| **Phase 1: Clerk Foundation** | Semanas 1-4 | Integração Clerk SaaS, Organizations multi-tenant, Componentes React (`@clerk/nextjs`), Express middleware para APIs |
| **Phase 2: OAuth2/OIDC** | Semanas 5-8 | OAuth2 flow completo, OIDC discovery, Social login (Google, GitHub, GitLab), JWT custom claims para agentes |
| **Phase 3: RBAC/ABAC + Cedar** | Semanas 9-12 | Cedar policy engine substitui regex, RBAC por workspace/projeto, ABAC para agentes (scopes dinâmicos), OPA sidecar para decisões complexas |
| **Phase 4: Enterprise** | Semanas 13-16 | WebAuthn/Passkeys, SAML 2.0 (Auth0 fallback), Session cache offline (desktop), Auth health dashboard |

### Cross-References

- **S4** (Segurança/Governança) — ADR-016 security layers; políticas Cedar inseparáveis do prompt governor
- **S24** (Controle de Acesso) — RBAC/ABAC decisions documentadas como contratos de acesso; `AccessDecision` como value object cross-cutting
- **S10v2** (Empilhamento/Contratos) — Contratos C1-C8 integram auth layer com event bus, API Gateway e schema registry
- **E3** (Qualidade Total) — Quality Gates 3-4 incluem autenticação em smoke tests, E2E e load tests
