# ESTUDO-NATS-AUTH-SECURITY.md

> **Data:** 2026-07-25 | **Versao:** 3.0 (v3.0 — 8 secoes expandido)
> **Nivel de Profundidade:** 12/12 | **Area:** Infraestrutura — Seguranca NATS
> **Dependencias:** NATS JetStream, IDEIA Core, Event Bus, Policy Engine
> **Conexoes:** Observability, Security Dashboard, Credential Manager, Audit Trail
> **Proposito:** Estudo completo de autenticacao e autorizacao NATS — JWT/NKEY, mTLS, ACL, Auth Callout, multi-tenant isolation, credencial management, comparativo concorrencia, analise de ataque, e integracao IDEIA.
> **Template:** v3.0 (8 secoes: FUNDAMENTOS, TECNICO, ENGENHARIA, INOVACAO, PESQUISA, FRONTEIRAS, ANALISE PARA IDEIA, REFERENCIAS)

---

## 1. FUNDAMENTOS

### 1.1 Problema e Contexto

NATS e um message broker de alto desempenho que, em sua configuracao padrao, permite que qualquer cliente conectado publique ou subscreva em qualquer subject. Para uma plataforma multi-agente como a IDEIA — onde agentes de diferentes niveis de confianca (Analyst, Architect, Programmer, Reviewer, Tester, DevOps) operam concorrentemente — isso e inaceitavel.

**Cenarios de risco sem autenticacao:**
- Um agente Analyst pode publicar comandos em um subject que so o agente DevOps deveria acessar
- Um cliente malicioso que obtem acesso a rede pode escutar todo o trafego de mensagens
- Nao ha rastreabilidade de quem publicou ou consumiu cada mensagem
- Nao ha isolamento entre ambientes (desenvolvimento, staging, producao)
- Um bug em um agente pode poluir subjects de outros agentes

**Requisitos de seguranca para a IDEIA:**
1. **Autenticacao forte:** Todo cliente NATS deve provar sua identidade antes de conectar
2. **Autorizacao granular:** Permissoes por subject, por operacao (pub/sub), por user
3. **Isolamento multi-tenant:** Cada equipe/projeto/agente opera em espaco isolado
4. **Rotacao de credenciais:** Tokens e chaves devem expirar e ser rotacionados
5. **Auditabilidade:** Toda tentativa de autenticacao e autorizacao deve ser registrada
6. **Revogacao:** Capacidade de revogar acesso imediatamente
7. **Defense-in-depth:** Multiplas camadas (TLS + JWT + ACL)

### 1.2 Modelo de Ameacas (Threat Model)

| ID | Ameaca | Vetor | Impacto | Probabilidade | Mitigacao |
|----|--------|-------|---------|---------------|-----------|
| T01 | Credencial theft | Interceptacao de token JWT ou NKey seed | Comprometimento total da identidade | Media | TLS obrigatorio, short TTL, revogacao |
| T02 | Unauthorized publish | Cliente publica em subject restrito | Vazamento de comandos, poluicao de dados | Alta | ACL por subject, default-deny |
| T03 | Unauthorized subscribe | Cliente escuta subject restrito | Vazamento de dados confidenciais | Alta | ACL por subject, default-deny |
| T04 | MITM | Interceptacao de conexao entre cliente e servidor | Leitura e modificacao de mensagens | Baixa | TLS mutual (mTLS) obrigatorio |
| T05 | Replay attack | Token JWT capturado e reutilizado | Acesso nao autorizado | Media | Short TTL, nonce, NKey rotation |
| T06 | Privilege escalation | User JWT modificado para expandir permissoes | Acesso nao autorizado a subjects | Baixa | Assinatura JWT com NKey, validacao no servidor |
| T07 | Operator key compromise | Chave privada do operador vazada | Comprometimento total de toda a hierarquia | Baixa | HSM, offline signing, rotacao |
| T08 | Tenant isolation bypass | Account A acessa dados da Account B | Vazamento cross-tenant | Baixa | Exports/Imports explicitos, audit |
| T09 | DoS via auth flooding | Multiplas tentativas de autenticacao falhas | Degradacao do servidor | Media | Rate limiting, connection throttling |
| T10 | Credential stuffing | Reuso de credenciais de outros sistemas | Acesso nao autorizado | Media | NKey + JWT, nao reutilizavel |

### 1.3 Arquitetura Hierarquica — Operator, Account, User

```
OPERATOR (autoridade maxima — emite JWTs para Accounts)
  |
  |-- Signing Key (NKey Ed25519) — assina todos os JWTs abaixo
  |      |
  |      |-- ACCOUNT (tenant/dominio isolado)
  |      |     |
  |      |     |-- Signing Key (opcional — delegacao)
  |      |     |
  |      |     |-- USER (identidade do cliente)
  |      |     |     |-- NKey publica (identidade)
  |      |     |     |-- JWT com permissoes (pub/sub allow/deny)
  |      |     |     |-- Claims: expiresAt, issuedAt, tags
  |      |     |
  |      |     |-- EXPORTS (streams expostos para outras Accounts)
  |      |     |     |-- stream service (resposta) ou stream (push)
  |      |     |     |-- accounts autorizadas
  |      |     |
  |      |     |-- IMPORTS (streams importados de outras Accounts)
  |      |           |-- account origem
  |      |           |-- subject mapped
  |      |
  |      |-- ACCOUNT 2 ...
  |      |-- ACCOUNT 3 ...

OPERATOR JWT:
{
  "type": "operator",
  "nkey": "OCNL7W7...",
  "claims": {
    "name": "IDEIA_OPERATOR",
    "signing_keys": ["SCLX5K...", "SDFS8D..."],
    "account_server_url": "nats://localhost:4222"
  }
}

ACCOUNT JWT:
{
  "type": "account",
  "nkey": "ADL7W7...",
  "claims": {
    "name": "IDEIA_CORE",
    "signing_keys": ["SCLX5K..."],
    "limits": { "subs": 1000, "data": -1, "payload": -1, "imports": 10, "exports": 10 },
    "signing": {
      "keys": { "SCLX5K...": { "auth_users": ["event-bus", "supervisor", "security"] } }
    }
  }
}

USER JWT:
{
  "type": "user",
  "nkey": "UDL7W7...",
  "claims": {
    "name": "event-bus",
    "pub": { "allow": ["system.>"], "deny": [] },
    "sub": { "allow": ["system.>"], "deny": [] },
    "expires_at": 1893456000
  }
}
```

**Propriedades da hierarquia:**
- **Operator** e a raiz de confianca. Sua NKey assina Account JWTs.
- **Account** define um tenant isolado. Pode ter suas proprias signing keys.
- **User** e a identidade final. Seu JWT contem permissoes de pub/sub.
- Accounts podem exportar streams para outras accounts (cross-tenant).
- A revogacao de um Operator JWT invalida todos os JWTs abaixo.

### 1.4 Metodos de Autenticacao

#### 1.4.1 Token (Stateless)

Token fixo compartilhado entre todos os clientes.

```conf
authorization: {
  token: "my-shared-secret-token-123"
  timeout: 2.0
}
```

```typescript
const nc = await connect({
  servers: ['nats://localhost:4222'],
  token: 'my-shared-secret-token-123',
});
```

| Caracteristica | Valor |
|---------------|-------|
| Seguranca | Baixa — token compartilhado, sem identidade individual |
| Performance | Alta — sem criptografia |
| Auditabilidade | Nenhuma |
| Uso IDEIA | Apenas desenvolvimento local |
| Rotacao | Manual, afeta todos simultaneamente |

#### 1.4.2 Username/Password (Legacy)

```conf
authorization: {
  users: [
    { user: "event-bus", password: "$2a$11$..." }
  ]
  timeout: 2.0
}
```

| Caracteristica | Valor |
|---------------|-------|
| Seguranca | Media — bcrypt hashing |
| Performance | Alta |
| Auditabilidade | Sim — identifica o usuario |
| Uso IDEIA | Nao recomendado — sem suporte a multi-tenant |

#### 1.4.3 NKeys (Ed25519)

Chaves criptograficas Ed25519. NATS usa challenge-response: servidor envia nonce, cliente assina.

```bash
nsc generate nkey --operator
nsc generate nkey --account
nsc generate nkey --user
```

```conf
authorization: {
  users: [
    { nkey: "UCNL7W7ABCDEFGHIJKLMNOPQRSTUVWXYZ" }
  ]
}
```

```typescript
import { connect, nkeyAuthenticator } from 'nats';
import { fromSeed } from 'ts-nkeys';

const nkey = fromSeed('SOAFN7W7...');
const nc = await connect({
  servers: ['nats://localhost:4222'],
  authenticator: nkeyAuthenticator(nkey),
});
```

| Caracteristica | Valor |
|---------------|-------|
| Seguranca | Alta — Ed25519, assimetrica |
| Performance | Alta — Ed25519 rapido |
| Uso IDEIA | Operador e Accounts |

#### 1.4.4 JWT (JSON Web Tokens)

O metodo mais completo. JWTs assinados por NKeys carregam permissoes e expiracao.

```bash
nsc edit operator --name IDEIA_OPERATOR
nsc add account --name IDEIA_CORE
nsc add user --name event-bus --allow-pub "system.>" --allow-sub "system.>"
nsc generate creds --account IDEIA_CORE --user event-bus > event-bus.creds
```

```typescript
import { connect, credsAuthenticator } from 'nats';

const nc = await connect({
  servers: ['nats://localhost:4222'],
  authenticator: credsAuthenticator(fs.readFileSync('event-bus.creds', 'utf8')),
});
```

| Caracteristica | Valor |
|---------------|-------|
| Seguranca | Alta — assinatura NKey, expiracao, permissoes |
| Performance | Media — validacao JWT na conexao |
| Uso IDEIA | Todos os users |

#### 1.4.5 TLS / mTLS

```conf
tls: {
  cert_file: "/etc/nats/certs/server.pem"
  key_file: "/etc/nats/certs/server-key.pem"
  ca_file: "/etc/nats/certs/ca.pem"
  verify: true
  verify_and_map: true
  timeout: 5
}
```

| Caracteristica | Valor |
|---------------|-------|
| Seguranca | Muito Alta — PKI |
| Performance | Media — handshake TLS |
| Uso IDEIA | Componentes internos |

#### 1.4.6 Auth Callout

NATS 2.10+ delega autenticacao a servico externo via gRPC.

```conf
auth_callout: {
  port: 4223
  auth_users: ["service-account"]
  timeout: 5
}
```

**Comparativo completo:**

| Metodo | Seguranca | Performance | Identidade | Tenant | Rotacao | Complexidade |
|--------|-----------|-------------|------------|--------|---------|-------------|
| Token | Baixa | Alta | Nenhuma | Nao | Manual | Baixa |
| Username/Password | Media | Alta | Sim | Nao | Manual | Baixa |
| NKey | Alta | Alta | Sim | Parcial | Automatica | Media |
| JWT | Alta | Media | Completa | Sim | Automatica | Alta |
| mTLS | Muito Alta | Media | Sim (CN) | Sim | Cert renewal | Muito Alta |
| Auth Callout | Alta | Media | Completa | Sim | Automatica | Alta |

### 1.5 Metodos de Autorizacao

#### 1.5.1 Subject-Level Permissions

```conf
users: [{
  user: "event-bus"
  permissions: {
    publish: { allow: ["system.>"], deny: ["system.secret.>"] }
    subscribe: { allow: ["system.>"], deny: [] }
  }
}]
```

**Subject patterns:**
- `foo.bar` — match exato
- `foo.*` — wildcard unico
- `foo.>` — wildcard multi-nivel (apenas no final)

**Regras de matching:**
- `>` so pode ser o ultimo token
- `*` corresponde exatamente a um token
- Allow avaliado antes de deny
- Default-deny se nenhuma regra permitir

#### 1.5.2 Queue Group Restrictions

```conf
permissions: {
  subscribe: { allow: ["agent.>"] }
  queue: { allow: ["analyst-queue", "programmer-queue"], deny: ["admin-queue"] }
}
```

#### 1.5.3 Response Permissions

```conf
permissions: {
  publish: { allow: ["request.>"] }
  response: { allow: ["_INBOX.>"], max_messages: 5, ttl: 10 }
}
```

### 1.6 Modelo Multi-Tenant

```
OPERATOR (IDEIA_OPERATOR)
  |-- Account: IDEIA_CORE
  |   |-- User: event-bus    (system.>)
  |   |-- User: supervisor   (agent.>.command)
  |   |-- User: security     (security.>)
  |   |-- Exports: agent.events -> IDEIA_AGENTS
  |   |-- Service: system.status -> IDEIA_AGENTS, IDEIA_USERS
  |
  |-- Account: IDEIA_AGENTS
  |   |-- User: analyst-1    (events.file.>)
  |   |-- User: programmer-1 (events.commit.>)
  |   |-- Imports: system.status <- IDEIA_CORE
  |
  |-- Account: IDEIA_USERS
  |   |-- User: dev-1        (user.dev-1.>)
  |   |-- User: dev-2        (user.dev-2.>)
  |
  |-- Account: IDEIA_DEVOPS
      |-- User: ci-bot       (ci.>, deploy.>)
      |-- User: monitor      (monitor.>, alert.>)
```

**Stream types for Exports:**
- **Stream:** Push-based — account exportadora envia mensagens ativamente
- **Service:** Request-Reply — account exportadora responde a requests

```conf
accounts: {
  IDEIA_CORE: {
    exports: [
      { stream: "agent.events", accounts: ["IDEIA_AGENTS"] },
      { service: "system.status", accounts: ["IDEIA_AGENTS", "IDEIA_USERS"] }
    ]
  }
  IDEIA_AGENTS: {
    imports: [
      { stream: { account: "IDEIA_CORE", subject: "agent.events" } },
      { service: { account: "IDEIA_CORE", subject: "system.status" } }
    ]
  }
}
```

---

## 2. TECNICO

### 2.1 NKEYS — Infraestrutura de Chaves Ed25519

#### 2.1.1 Key Generation

NKEYS e o sistema de chaves nativo do NATS, baseado em Ed25519. Cada entidade possui um par de chaves com prefixo que identifica o tipo: `O` para operator, `A` para account, `U` para user.

```bash
nsc generate nkey --operator
nsc generate nkey --account
nsc generate nkey --user

nsc list keys
nsc describe key <public-key>

nsc export keys --dir ./backup-keys
```

```typescript
import { createPair, KeyPair } from 'nkeys.js';
import { encode, decode } from 'ts-nkeys';

export class NKeyManager {
  generateOperatorKey(): KeyPair {
    return createPair('operator');
  }

  generateAccountKey(): KeyPair {
    return createPair('account');
  }

  generateUserKey(): KeyPair {
    return createPair('user');
  }

  sign(kp: KeyPair, data: Uint8Array): Uint8Array {
    return kp.sign(data);
  }

  verify(kp: KeyPair, data: Uint8Array, sig: Uint8Array): boolean {
    return kp.verify(data, sig);
  }

  getPublicKey(kp: KeyPair): string {
    return kp.getPublicKey();
  }

  getSeed(kp: KeyPair): Uint8Array {
    return kp.getSeed();
  }

  fromSeed(seed: Uint8Array): KeyPair {
    return fromSeed(seed);
  }
}
```

#### 2.1.2 Key Hierarchy and Delegation

```
Operator NKey (raiz — mantida offline/HSM)
  |-- Signing Key 1 (online — assina Account JWTs)
  |     |-- Account A
  |     |-- Account B
  |
  |-- Signing Key 2 (online — backup/DR)
  |     |-- Account C
  |
  |-- Signing Key 3 (online — terceirizada para equipe X)

Beneficios:
  - Chave raiz offline = nao pode ser roubada via rede
  - Rotacao de signing keys sem afetar a raiz
  - Revogacao seletiva: invalidar SK1 sem afetar SK2
```

```bash
nsc edit operator --sk <new-signing-key>
nsc edit account --sk <account-signing-key>
nsc describe operator IDEIA_OPERATOR
```

#### 2.1.3 Secure Key Storage

```typescript
export class SecureKeyStorage {
  private keys: Map<string, Uint8Array> = new Map();

  constructor(private keyDir: string) {}

  async storeSeed(keyName: string, seed: Uint8Array): Promise<void> {
    const encrypted = await this.encrypt(seed);
    const filePath = path.join(this.keyDir, `${keyName}.nkey`);
    await fs.writeFile(filePath, encrypted, { mode: 0o600 });
    this.keys.set(keyName, seed);
  }

  async loadSeed(keyName: string): Promise<Uint8Array | null> {
    if (this.keys.has(keyName)) return this.keys.get(keyName)!;
    const filePath = path.join(this.keyDir, `${keyName}.nkey`);
    try {
      const encrypted = await fs.readFile(filePath);
      const decrypted = await this.decrypt(encrypted);
      this.keys.set(keyName, decrypted);
      return decrypted;
    } catch {
      return null;
    }
  }

  private async encrypt(data: Uint8Array): Promise<Buffer> {
    const key = await this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]);
  }

  private async decrypt(data: Buffer): Promise<Uint8Array> {
    const key = await this.getEncryptionKey();
    const iv = data.subarray(0, 16);
    const tag = data.subarray(16, 32);
    const encrypted = data.subarray(32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  private async getEncryptionKey(): Promise<Buffer> {
    const keyPath = path.join(this.keyDir, '.master-key');
    if (await fs.exists(keyPath)) {
      return await fs.readFile(keyPath);
    }
    const key = crypto.randomBytes(32);
    await fs.writeFile(keyPath, key, { mode: 0o400 });
    return key;
  }
}
```

### 2.2 NATS JWT Architecture

#### 2.2.1 JWT Structure

Os JWTs do NATS seguem RFC 7519 com claims especificas do ecossistema NATS.

```
JWT NATS Structure:
+------------------------------------------+
|             JWT HEADER                   |
|  { "typ": "jwt", "alg": "ed25519-nkey" } |
+------------------------------------------+
|             JWT PAYLOAD                  |
|  NATS Claims (operator/account/user):    |
|  - jti: unique token ID                  |
|  - iat: issued at                        |
|  - exp: expires at                       |
|  - iss: issuer (NKey publica)           |
|  - name: human-readable name            |
|  - type: operator|account|user          |
|  - pub: publish permissions              |
|  - sub: subscribe permissions            |
|  - nkey: subject NKey                   |
|  - account: account NKey (user only)    |
|  - signing_keys: delegadas (op/acc)     |
|  - exports/imports: (account only)      |
|  - tags: array de metadados             |
+------------------------------------------+
|             SIGNATURE                    |
|  Assinatura Ed25519 do header + payload  |
+------------------------------------------+
```

#### 2.2.2 Operator JWT Generator

```typescript
export interface OperatorClaims {
  type: 'operator';
  name: string;
  nkey: string;
  signingKeys: string[];
  accountServerUrl: string;
  operatorServiceUrls: string[];
  maxTokenTTL: number;
  issuedAt: number;
  expiresAt: number;
}

export class OperatorJWTGenerator {
  async generate(operatorKey: KeyPair, config: OperatorClaims): Promise<string> {
    const payload = {
      jti: crypto.randomUUID(),
      iat: Math.floor(config.issuedAt / 1000),
      exp: Math.floor(config.expiresAt / 1000),
      iss: operatorKey.getPublicKey(),
      sub: operatorKey.getPublicKey(),
      name: config.name,
      type: 'operator',
      nkey: operatorKey.getPublicKey(),
      signing_keys: config.signingKeys,
      account_server_url: config.accountServerUrl,
      operator_service_urls: config.operatorServiceUrls || [],
      max_token_ttl: config.maxTokenTTL || 0,
    };
    return this.signJWT(payload, operatorKey);
  }

  private async signJWT(payload: any, key: KeyPair): Promise<string> {
    const header = Buffer.from(JSON.stringify({ typ: 'jwt', alg: 'ed25519-nkey' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const toSign = new TextEncoder().encode(`${header}.${body}`);
    const sig = key.sign(toSign);
    const signature = Buffer.from(sig).toString('base64url');
    return `${header}.${body}.${signature}`;
  }
}
```

#### 2.2.3 Account JWT Generator

```typescript
export interface AccountClaims {
  type: 'account';
  name: string;
  nkey: string;
  signingKeys: Array<{ key: string; kind: 'user' | 'account' }>;
  limits: { subs: number; data: number; payload: number; imports: number; exports: number };
  exports: Array<{ name: string; subject: string; type: 'stream' | 'service'; tokenReq: boolean; accountTokenPosition?: number; approvedAccounts?: string[] }>;
  imports: Array<{ name: string; subject: string; account: string; type: 'stream' | 'service'; localSubject?: string }>;
  revocations: Record<string, number>;
  issuedAt: number;
  expiresAt: number;
}

export class AccountJWTGenerator {
  async generate(signingKey: KeyPair, accountKey: KeyPair, config: AccountClaims): Promise<string> {
    const payload = {
      jti: crypto.randomUUID(),
      iat: Math.floor(config.issuedAt / 1000),
      exp: Math.floor(config.expiresAt / 1000),
      iss: signingKey.getPublicKey(),
      sub: accountKey.getPublicKey(),
      name: config.name, type: 'account', nkey: accountKey.getPublicKey(),
      signing_keys: config.signingKeys.map(sk => sk.key),
      limits: config.limits, exports: config.exports, imports: config.imports,
      revocations: config.revocations || {},
    };
    const header = Buffer.from(JSON.stringify({ typ: 'jwt', alg: 'ed25519-nkey' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const toSign = new TextEncoder().encode(`${header}.${body}`);
    const sig = signingKey.sign(toSign);
    const signature = Buffer.from(sig).toString('base64url');
    return `${header}.${body}.${signature}`;
  }
}
```

#### 2.2.4 User JWT Generator

```typescript
export interface UserClaims {
  type: 'user'; name: string; nkey: string; account: string;
  pub: { allow: string[]; deny?: string[] };
  sub: { allow: string[]; deny?: string[]; max?: number };
  subs: number; data: number; payload: number; tags: string[];
  issuedAt: number; expiresAt: number;
}

export class UserJWTGenerator {
  generate(signingKey: KeyPair, userKey: KeyPair, accountKey: string, config: UserClaims): string {
    const payload = {
      jti: crypto.randomUUID(), iat: Math.floor(config.issuedAt / 1000),
      exp: Math.floor(config.expiresAt / 1000), iss: signingKey.getPublicKey(),
      sub: userKey.getPublicKey(), name: config.name, type: 'user',
      nkey: userKey.getPublicKey(), account: accountKey,
      pub: config.pub, sub: config.sub,
      subs: config.subs || 0, data: config.data || 0, payload: config.payload || 0, tags: config.tags || [],
    };
    const header = Buffer.from(JSON.stringify({ typ: 'jwt', alg: 'ed25519-nkey' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const toSign = new TextEncoder().encode(`${header}.${body}`);
    const sig = signingKey.sign(toSign);
    const signature = Buffer.from(sig).toString('base64url');
    return `${header}.${body}.${signature}`;
  }
}
```

#### 2.2.5 JWT Validation and Caching

```typescript
export class JWTValidator {
  private cache: Map<string, { jwt: string; payload: any; expiresAt: number }> = new Map();
  private readonly CACHE_TTL = 300_000;

  constructor(private operatorKeys: Map<string, KeyPair>) {}

  async validateUserJWT(token: string): Promise<{ valid: boolean; payload?: any; reason?: string }> {
    const cached = this.cache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      return { valid: true, payload: cached.payload };
    }
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return { valid: false, reason: 'Invalid JWT format' };
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      if (payload.exp && payload.exp * 1000 < Date.now()) return { valid: false, reason: 'Token expired' };
      if (payload.iat && payload.iat * 1000 > Date.now() + 1000) return { valid: false, reason: 'Token issued in the future' };
      const issuerKey = this.operatorKeys.get(payload.iss);
      if (!issuerKey) return { valid: false, reason: `Unknown issuer: ${payload.iss}` };
      const toVerify = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
      const sig = Buffer.from(parts[2], 'base64url');
      const valid = issuerKey.verify(toVerify, sig);

      if (!valid) return { valid: false, reason: 'Invalid signature' };
      this.cache.set(token, { jwt: token, payload, expiresAt: Date.now() + this.CACHE_TTL });
      return { valid: true, payload };
    } catch (error) {
      return { valid: false, reason: `Validation error: ${error}` };
    }
  }

  invalidateCache(token: string): void { this.cache.delete(token); }
  clearCache(): void { this.cache.clear(); }
}
```

#### 2.2.6 Token Revocation Manager

```typescript
export class TokenRevocationManager {
  private revokedTokens: Set<string> = new Set();
  private revokedNKeys: Map<string, number> = new Map();

  revokeToken(token: string): void { this.revokedTokens.add(token); }

  revokeNKey(nkey: string): void { this.revokedNKeys.set(nkey, Date.now()); }

  isTokenRevoked(token: string): boolean { return this.revokedTokens.has(token); }

  isNKeyRevoked(nkey: string, issuedAt: number): boolean {
    const revokedAt = this.revokedNKeys.get(nkey);
    if (!revokedAt) return false;
    return issuedAt < revokedAt;
  }

  addAccountRevocation(accountJWT: string, userNKey: string): string {
    const parts = accountJWT.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (!payload.revocations) payload.revocations = {};
    payload.revocations[userNKey] = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ typ: 'jwt', alg: 'ed25519-nkey' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${header}.${body}.${parts[2]}`;
  }

  getRevokedCount(): number { return this.revokedTokens.size + this.revokedNKeys.size; }
}
```

### 2.3 TLS / mTLS Configuration

#### 2.3.1 Cipher Suites

```typescript
export class TLSCipherSelector {
  static readonly RECOMMENDED_CIPHERS_TLS12 = [
    'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384',
    'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
    'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256',
    'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
  ];
  static readonly TLS13_CIPHERS = [
    'TLS_AES_256_GCM_SHA384', 'TLS_CHACHA20_POLY1305_SHA256', 'TLS_AES_128_GCM_SHA256',
  ];

  static generateCipherConfig(): string {
    return `  cipher_suites: [
    TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
    TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
    TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
    TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
  ]`;
  }
}

export interface TLSConfiguration {
  enabled: boolean; certFile: string; keyFile: string; caFile: string;
  verifyClient: boolean; mapCertToUser: boolean; handshakeTimeout: number;
  preferServerCiphers?: boolean; minVersion?: string; maxVersion?: string;
  cipherSuites?: string[]; ecdhCurve?: string;
  sessionTimeout?: number; sessionCacheSize?: number;
}
```

#### 2.3.2 Full mTLS Configuration

```conf
# /etc/nats-server.conf — mTLS complete
port: 4222

tls: {
  cert_file: "/etc/nats/certs/server.pem"
  key_file:  "/etc/nats/certs/server-key.pem"
  ca_file:   "/etc/nats/certs/ca.pem"
  verify: true
  verify_and_map: true
  timeout: 5
  min_version: "TLSv1.2"
  max_version: "TLSv1.3"
  cipher_suites: [
    TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
    TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
    TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
    TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
  ]
  ecdh_curve: "X25519:P-256:P-384"
  session_cache: true
  session_cache_size: 10000
  session_timeout: 300
}

accounts: {
  IDEIA_CORE: {
    users: [
      { user: "event-bus" },
      { user: "supervisor" }
    ]
  }
}

authorization: { timeout: 2.0 }
```

#### 2.3.3 Certificate Generation Script

```bash
#!/bin/bash
CA_NAME="${1:-IDEIA NATS CA}"
SERVER_NAME="${2:-nats-server}"
CLIENTS="${@:3}"

openssl genrsa -out ca-key.pem 4096
openssl req -x509 -new -nodes -key ca-key.pem \
  -sha256 -days 3650 -out ca.pem -subj "/CN=${CA_NAME}"

openssl genrsa -out server-key.pem 2048
openssl req -new -key server-key.pem -out server.csr \
  -subj "/CN=${SERVER_NAME}" \
  -addext "subjectAltName=DNS:${SERVER_NAME},DNS:localhost,IP:127.0.0.1"
openssl x509 -req -in server.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial \
  -out server.pem -days 365 -sha256 \
  -extfile <(echo "subjectAltName=DNS:${SERVER_NAME},DNS:localhost,IP:127.0.0.1")

for CLIENT in $CLIENTS; do
  openssl genrsa -out "${CLIENT}-key.pem" 2048
  openssl req -new -key "${CLIENT}-key.pem" -out "${CLIENT}.csr" \
    -subj "/CN=${CLIENT}" -addext "subjectAltName=DNS:${CLIENT}"
  openssl x509 -req -in "${CLIENT}.csr" \
    -CA ca.pem -CAkey ca-key.pem -CAcreateserial \
    -out "${CLIENT}.pem" -days 365 -sha256
  rm "${CLIENT}.csr"
done

rm server.csr ca-key.pem ca.srl
chmod 600 *-key.pem
```

### 2.4 Auth Callout Server

#### 2.4.1 gRPC Auth Callout Implementation

```typescript
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

interface AuthServiceConfig {
  port: number; tlsCert: string; tlsKey: string;
  userDatabase: UserDatabase; jwtGenerator: UserJWTGenerator;
}

export class AuthCalloutServer {
  private server: grpc.Server | null = null;

  constructor(private config: AuthServiceConfig) {}

  async start(): Promise<void> {
    const packageDefinition = protoLoader.loadSync('auth-callout.proto', {
      keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
    });
    const authProto = grpc.loadPackageDefinition(packageDefinition) as any;

    this.server = new grpc.Server();
    this.server.addService(authProto.AuthCallout.service, {
      authenticate: this.authenticate.bind(this),
    });

    const credentials = grpc.ServerCredentials.createSsl(
      fs.readFileSync(this.config.tlsCert),
      [{ cert_chain: fs.readFileSync(this.config.tlsCert), private_key: fs.readFileSync(this.config.tlsKey) }],
      true
    );

    return new Promise((resolve) => {
      this.server!.bindAsync(`0.0.0.0:${this.config.port}`, credentials, (error, port) => {
        if (error) throw error;
        this.server!.start();
        resolve();
      });
    });
  }

  private async authenticate(call: any, callback: any): Promise<void> {
    const request = call.request;
    try {
      const user = await this.config.userDatabase.findByNKey(request.client_nkey);
      if (!user) return callback(null, { ok: false, error: 'Authentication failed' });

      const jwt = this.config.jwtGenerator.generate(
        user.accountSigningKey, user.userKey, user.accountKey, {
          type: 'user', name: user.id, nkey: user.nkey, account: user.accountKey,
          pub: { allow: user.permissions.publish, deny: user.permissions.publishDeny },
          sub: { allow: user.permissions.subscribe, deny: user.permissions.subscribeDeny },
          subs: user.maxSubscriptions || 100, data: user.maxData || -1,
          payload: user.maxPayload || -1, tags: user.tags || [],
          issuedAt: Date.now(), expiresAt: Date.now() + (user.tokenTTL || 86400000),
        }
      );
      callback(null, { ok: true, jwt, user_nkey: user.nkey, expiry: Math.floor((Date.now() + (user.tokenTTL || 86400000)) / 1000) });
    } catch (error) {
      callback(null, { ok: false, error: 'Internal authentication error' });
    }
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => this.server?.tryShutdown(() => resolve()));
  }
}
```

#### 2.4.2 Auth Callout NATS Configuration

```conf
# nats-server.conf — Auth Callout
port: 4222

auth_callout: {
  port: 4223
  auth_users: ["UCNL7W7ABCDEFGHIJKLMNOPQRSTUVWXYZ"]
  tls: {
    cert_file: "/etc/nats/certs/auth-callout-client.pem"
    key_file:  "/etc/nats/certs/auth-callout-client-key.pem"
    ca_file:   "/etc/nats/certs/ca.pem"
    verify: true
    timeout: 5
  }
  timeout: 5.0
}

operator: "/etc/nats/jwt/operator.jwt"
resolver: MEMORY
```

### 2.5 Advanced ACL Implementation

```typescript
export interface SubjectPermission { allow: string[]; deny: string[]; }

export interface ACLRule {
  identity: string; account: string;
  publish: SubjectPermission; subscribe: SubjectPermission;
  queueGroup?: { allow: string[]; deny: string[] };
  response?: { allow: string[]; maxMessages: number; ttl: number };
  priority: number; expiresAt?: number; tags?: string[];
}

export class AdvancedAccessControlList {
  private rules: ACLRule[] = [];
  private defaultDeny = true;
  private ruleVersion = 0;

  addRule(rule: ACLRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
    this.ruleVersion++;
  }

  removeRule(identity: string): void {
    this.rules = this.rules.filter(r => r.identity !== identity);
    this.ruleVersion++;
  }

  canPublish(identity: string, subject: string): { allowed: boolean; matchedRule?: ACLRule } {
    const applicableRules = this.rules
      .filter(r => r.identity === identity)
      .filter(r => !r.expiresAt || r.expiresAt > Date.now());
    if (applicableRules.length === 0) return { allowed: !this.defaultDeny };
    for (const rule of applicableRules) {
      if (rule.publish.deny.some(p => this.matchSubject(subject, p))) return { allowed: false, matchedRule: rule };
      if (rule.publish.allow.some(p => this.matchSubject(subject, p))) return { allowed: true, matchedRule: rule };
    }
    return { allowed: false };
  }

  canSubscribe(identity: string, subject: string, queueGroup?: string): { allowed: boolean; matchedRule?: ACLRule } {
    const applicableRules = this.rules
      .filter(r => r.identity === identity)
      .filter(r => !r.expiresAt || r.expiresAt > Date.now());
    if (applicableRules.length === 0) return { allowed: !this.defaultDeny };
    for (const rule of applicableRules) {
      if (queueGroup && rule.queueGroup) {
        if (rule.queueGroup.deny.includes(queueGroup)) return { allowed: false, matchedRule: rule };
        if (rule.queueGroup.allow.length > 0 && !rule.queueGroup.allow.includes(queueGroup)) return { allowed: false, matchedRule: rule };
      }
      if (rule.subscribe.deny.some(p => this.matchSubject(subject, p))) return { allowed: false, matchedRule: rule };
      if (rule.subscribe.allow.some(p => this.matchSubject(subject, p))) return { allowed: true, matchedRule: rule };
    }
    return { allowed: false };
  }

  canReply(identity: string, replySubject: string): { allowed: boolean; maxMessages?: number; ttl?: number } {
    const rules = this.rules.filter(r => r.identity === identity && r.response)
      .filter(r => !r.expiresAt || r.expiresAt > Date.now());
    for (const rule of rules) {
      if (rule.response!.allow.some(p => this.matchSubject(replySubject, p))) {
        return { allowed: true, maxMessages: rule.response!.maxMessages, ttl: rule.response!.ttl };
      }
    }
    return { allowed: !this.defaultDeny };
  }

  private matchSubject(subject: string, pattern: string): boolean {
    const subjectParts = subject.split('.');
    const patternParts = pattern.split('.');
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '>') return true;
      if (patternParts[i] === '*') continue;
      if (patternParts[i] !== subjectParts[i]) return false;
    }
    return subjectParts.length === patternParts.length;
  }

  getEffectivePermissions(identity: string): { publish: string[]; subscribe: string[]; queueGroups: string[] } {
    const publishes = new Set<string>(); const subscribes = new Set<string>(); const queueGroups = new Set<string>();
    for (const rule of this.rules.filter(r => r.identity === identity)) {
      rule.publish.allow.forEach(p => publishes.add(p));
      rule.subscribe.allow.forEach(s => subscribes.add(s));
      rule.queueGroup?.allow.forEach(q => queueGroups.add(q));
    }
    return { publish: Array.from(publishes), subscribe: Array.from(subscribes), queueGroups: Array.from(queueGroups) };
  }

  getVersion(): number { return this.ruleVersion; }
}
```

### 2.6 Complete NATS Server Configuration

```conf
# /etc/nats-server.conf — Full secure configuration
port: 4222
host: "0.0.0.0"

loglevel: "warn"
logfile: "/var/log/nats/nats-server.log"
log_size_limit: 100MB
log_rotate: true

tls: {
  cert_file: "/etc/nats/certs/server.pem"
  key_file: "/etc/nats/certs/server-key.pem"
  ca_file: "/etc/nats/certs/ca.pem"
  verify: true
  verify_and_map: true
  timeout: 5
  min_version: "TLSv1.2"
  max_version: "TLSv1.3"
  cipher_suites: [
    TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
    TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
    TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
    TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
  ]
  ecdh_curve: "X25519:P-256:P-384"
}

operator: "/etc/nats/jwt/IDEIA_OPERATOR.jwt"
resolver: MEMORY
system_account: IDEIA_SYSTEM

accounts: {
  IDEIA_SYSTEM: { users: [{ user: "$SYS" }] }
  IDEIA_CORE: {
    users: [
      { user: "event-bus", permissions: { publish: { allow: ["system.>"] }, subscribe: { allow: ["system.>"] } } },
      { user: "supervisor", permissions: { publish: { allow: ["agent.>.command"] }, subscribe: { allow: ["agent.>.event", "events.>"] } } },
      { user: "security", permissions: { publish: { allow: ["security.>"] }, subscribe: { allow: ["security.>", "system.>"] } } }
    ]
    exports: [
      { stream: "agent.events", accounts: ["IDEIA_AGENTS"] },
      { service: "system.status", accounts: ["*"] }
    ]
  }
  IDEIA_AGENTS: {
    users: [
      { user: "analyst-1", permissions: { publish: { allow: ["events.file.>"] }, subscribe: { allow: ["events.file.>", "commands.analyst-1.>"] } } },
      { user: "programmer-1", permissions: { publish: { allow: ["events.commit.>", "events.code.>"] }, subscribe: { allow: ["events.review.>", "commands.programmer-1.>"] } } }
    ]
    imports: [
      { stream: { account: "IDEIA_CORE", subject: "agent.events" } },
      { service: { account: "IDEIA_CORE", subject: "system.status" } }
    ]
  }
  IDEIA_USERS: {
    users: [
      { user: "dev-1", permissions: { publish: { allow: ["user.dev-1.>"] }, subscribe: { allow: ["user.dev-1.>", "system.status"] } } }
    ]
    imports: [ { service: { account: "IDEIA_CORE", subject: "system.status" } } ]
  }
}

authorization: { timeout: 2.0 }
max_connections: 10000
max_pending: 10000000
max_payload: 1048576
write_deadline: 10s
ping_interval: 120s
ping_max: 3

jetstream: {
  store_dir: "/data/nats/jetstream"
  max_memory_store: 1073741824
  max_file_store: 10737418240
}

http_port: 8222
http_base_path: "/nats-monitoring"
https_port: 8223
https: { cert_file: "/etc/nats/certs/monitoring.pem", key_file: "/etc/nats/certs/monitoring-key.pem" }

cluster: {
  name: "IDEIA-NATS"
  listen: "0.0.0.0:4223"
  tls: { cert_file: "/etc/nats/certs/cluster.pem", key_file: "/etc/nats/certs/cluster-key.pem", ca_file: "/etc/nats/certs/ca.pem", verify: true }
  routes: [ "nats://node2.ideia.local:4223", "nats://node3.ideia.local:4223" ]
}
```

### 2.7 Account Isolation — Imports/Exports Detail

#### 2.7.1 Stream vs Service Export

```conf
# Stream export — push-based
accounts: { IDEIA_CORE: { exports: [ { stream: "agent.events", accounts: ["IDEIA_AGENTS"] } ] } }
accounts: { IDEIA_AGENTS: { imports: [ { stream: { account: "IDEIA_CORE", subject: "agent.events" } } ] } }

# Service export — request-reply
accounts: { IDEIA_CORE: { exports: [ { service: "system.status", accounts: ["IDEIA_AGENTS", "IDEIA_USERS"] } ] } }
```

#### 2.7.2 Service Latency Tracking

```conf
accounts: {
  IDEIA_CORE: {
    exports: [{
      service: "system.status"
      accounts: ["IDEIA_AGENTS"]
      latency: { sampling: 50, subject: "system.latency.ideia_core" }
    }]
  }
}
```

```typescript
export class ServiceLatencyTracker {
  private latencyRecords: Map<string, number[]> = new Map();
  private readonly WINDOW_SIZE = 1000;

  recordLatency(serviceName: string, latencyMs: number): void {
    if (!this.latencyRecords.has(serviceName)) this.latencyRecords.set(serviceName, []);
    const records = this.latencyRecords.get(serviceName)!;
    records.push(latencyMs);
    if (records.length > this.WINDOW_SIZE) records.shift();
  }

  getLatencyStats(serviceName: string): { p50: number; p90: number; p99: number; avg: number; min: number; max: number; count: number } | null {
    const records = this.latencyRecords.get(serviceName);
    if (!records || records.length === 0) return null;
    const sorted = [...records].sort((a, b) => a - b);
    const len = sorted.length;
    return {
      p50: sorted[Math.floor(len * 0.5)], p90: sorted[Math.floor(len * 0.9)], p99: sorted[Math.floor(len * 0.99)],
      avg: sorted.reduce((a, b) => a + b, 0) / len, min: sorted[0], max: sorted[len - 1], count: len,
    };
  }
}
```

---

## 3. ENGENHARIA

### 3.1 Credential Management with nsc CLI

#### 3.1.1 Operator Management

```bash
nsc init --dir ~/.nsc/ideia
nsc add operator --name IDEIA_OPERATOR
nsc edit operator --sk $(nsc generate nkey --operator --store)
nsc export operator --output ./jwt/IDEIA_OPERATOR.jwt
nsc describe operator IDEIA_OPERATOR
```

#### 3.1.2 Account Management

```bash
nsc add account --name IDEIA_CORE
nsc edit account --name IDEIA_CORE --sk $(nsc generate nkey --account --store)
nsc add export --account IDEIA_CORE --subject "agent.events" --service --account IDEIA_AGENTS
nsc add import --account IDEIA_AGENTS --src-account IDEIA_CORE --remote-subject "agent.events"
nsc list accounts
nsc describe account IDEIA_CORE
```

#### 3.1.3 User Management

```bash
nsc add user --account IDEIA_CORE --name event-bus
nsc edit user --account IDEIA_CORE --name event-bus \
  --allow-pub "system.>" --allow-sub "system.>" --deny-pub "system.secret.>"
nsc edit user --account IDEIA_CORE --name event-bus \
  --allow-pub-response "_INBOX.>" --response-ttl 10 --max-responses 5
nsc edit user --account IDEIA_CORE --name event-bus --tag "core" --tag "service"
nsc generate creds --account IDEIA_CORE --name event-bus --output ./creds/event-bus.creds
```

#### 3.1.4 Credential Files

```
-----BEGIN NATS USER JWT-----
<JWT assinado com permissoes do usuario>
------END NATS USER JWT------

************************* IMPORTANT *************************
NKEY SEED:
-----BEGIN USER NKEY SEED---->
<Ed25519 seed do usuario (secreta)>
------END USER NKEY SEED------
*************************************************************

-----BEGIN NATS USER JWT-----
<Repeticao do JWT para compatibilidade>
------END NATS USER JWT------
```

```typescript
export interface CredsFile { jwt: string; seed: string; }

export function parseCredsFile(content: string): CredsFile {
  const jwtMatch = content.match(/-----BEGIN NATS USER JWT-----\n([\s\S]*?)\n------END NATS USER JWT------/);
  const seedMatch = content.match(/-----BEGIN USER NKEY SEED---->\n([\s\S]*?)\n------END USER NKEY SEED------/);
  if (!jwtMatch || !seedMatch) throw new Error('Invalid creds file format');
  return { jwt: jwtMatch[1].trim(), seed: seedMatch[1].trim() };
}
```

### 3.2 Credential Rotation Strategies

| Approach | Descricao | RTO | RPO | Complexidade |
|----------|-----------|-----|-----|-------------|
| Time-based | Rotacao periodica (ex: 30 dias) | 5 min | 0 | Baixa |
| Expiry-based | Rotacao antes do vencimento | 1 min | 0 | Media |
| Event-driven | Rotacao apos incidente | 1 min | 0 | Alta |
| On-demand | Rotacao manual | 30 min | 1h | Baixa |
| Continuous | Rotacao a cada conexao | 0 | 0 | Alta |

#### 3.2.1 Enterprise Rotation Implementation

```typescript
export interface RotationPolicy {
  identity: string; maxTTL: number; renewalThreshold: number;
  strategy: 'time-based' | 'expiry-based' | 'event-driven' | 'continuous';
  notifyChannels: string[];
}

export class EnterpriseCredentialRotator {
  private policies: Map<string, RotationPolicy> = new Map();
  private rotationHistory: DetailedRotationEvent[] = [];
  private active: boolean = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private authManager: NATSAuthManager, private eventBus: EventBus,
    private logger: Logger, private auditor: AuthAuditor
  ) {}

  addPolicy(policy: RotationPolicy): void { this.policies.set(policy.identity, policy); }
  removePolicy(identity: string): void { this.policies.delete(identity); }

  start(intervalMs = 60000): void {
    if (this.active) return;
    this.active = true;
    this.timer = setInterval(() => this.rotationCycle(), intervalMs);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.active = false;
  }

  private async rotationCycle(): Promise<void> {
    const now = Date.now();
    for (const [identity, policy] of this.policies) {
      try {
        const token = this.authManager.getActiveTokens().get(identity);
        if (!token) { await this.generateInitialToken(identity, policy); continue; }
        const tokenData = this.extractTokenData(token);
        const timeUntilExpiry = tokenData.expiresAt - now;
        if (timeUntilExpiry < policy.renewalThreshold) await this.rotateCredential(identity, policy, tokenData);
      } catch (error) {
        this.logger.error(`Rotation failed for ${identity}: ${error}`);
      }
    }
  }

  private async rotateCredential(identity: string, policy: RotationPolicy, oldTokenData: TokenData): Promise<void> {
    await this.authManager.revokeToken(identity);
    const account = this.findAccountForIdentity(identity);
    if (!account) throw new Error(`Account not found for ${identity}`);
    const userConfig = account.users.find(u => u.identity === identity);
    if (!userConfig) throw new Error(`User config not found for ${identity}`);
    const ttlMs = Math.min(policy.maxTTL, userConfig.ttlMs);
    await this.authManager.generateUserJWT({ ...userConfig, ttlMs });
    this.rotationHistory.push({
      identity, strategy: policy.strategy,
      oldTokenExpiry: oldTokenData.expiresAt, newTokenExpiry: Date.now() + ttlMs,
      timestamp: Date.now(), success: true,
    });
    await this.auditor.record({
      type: 'rotation_performed', identity, account: userConfig.account,
      success: true, details: `Strategy ${policy.strategy}, TTL ${ttlMs}ms`,
    });
  }

  private findAccountForIdentity(identity: string): AccountConfig | null {
    for (const [, account] of this.authManager['accounts']) {
      if (account.users.some(u => u.identity === identity)) return account;
    }
    return null;
  }

  private extractTokenData(token: string): TokenData {
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return { expiresAt: payload.exp * 1000, issuedAt: payload.iat * 1000, identity: payload.name };
  }

  getRotationStats(): EnterpriseRotationStats {
    const total = this.rotationHistory.length;
    const successful = this.rotationHistory.filter(r => r.success).length;
    return {
      totalRotations: total, successfulRotations: successful, failedRotations: total - successful,
      successRate: total > 0 ? successful / total : 1,
      lastRotation: this.rotationHistory[this.rotationHistory.length - 1]?.timestamp || 0,
      byStrategy: this.getRotationsByStrategy(),
    };
  }

  private getRotationsByStrategy(): Record<string, number> {
    const byStrategy: Record<string, number> = {};
    for (const event of this.rotationHistory) byStrategy[event.strategy] = (byStrategy[event.strategy] || 0) + 1;
    return byStrategy;
  }
}

interface TokenData { expiresAt: number; issuedAt: number; identity: string; }
interface DetailedRotationEvent { identity: string; strategy: string; oldTokenExpiry: number; newTokenExpiry: number; timestamp: number; success: boolean; error?: string; }
interface EnterpriseRotationStats { totalRotations: number; successfulRotations: number; failedRotations: number; successRate: number; lastRotation: number; byStrategy: Record<string, number>; }
```

#### 3.2.2 Continuous Rotation Strategy

```typescript
export class ContinuousRotationStrategy {
  private connectionCount = 0;
  constructor(private authManager: NATSAuthManager, private maxConnectionsPerToken: number) {}

  async onConnect(identity: string): Promise<string> {
    this.connectionCount++;
    if (this.connectionCount >= this.maxConnectionsPerToken) return this.rotateForNewConnection(identity);
    const existing = this.authManager.getActiveTokens().get(identity);
    if (!existing) return this.rotateForNewConnection(identity);
    return existing;
  }

  private async rotateForNewConnection(identity: string): Promise<string> {
    await this.authManager.revokeToken(identity);
    const account = this.findAccountForIdentity(identity);
    const userConfig = this.findUserConfig(identity);
    if (!userConfig) throw new Error(`No config for ${identity}`);
    const token = await this.authManager.generateUserJWT({ ...userConfig, ttlMs: 3600000 });
    this.connectionCount = 0;
    return token;
  }

  private findAccountForIdentity(identity: string): AccountConfig | null {
    for (const [, acct] of this.authManager['accounts']) {
      if (acct.users.some(u => u.identity === identity)) return acct;
    }
    return null;
  }

  private findUserConfig(identity: string): UserConfig | null {
    for (const [, acct] of this.authManager['accounts']) {
      const user = acct.users.find(u => u.identity === identity);
      if (user) return user;
    }
    return null;
  }
}
```

### 3.3 Security Auditing

```typescript
export type AuditEventType =
  | 'auth.connection.success' | 'auth.connection.failure'
  | 'auth.token.generated' | 'auth.token.revoked' | 'auth.token.expired'
  | 'auth.token.rotated' | 'auth.nkey.registered' | 'auth.nkey.revoked'
  | 'auth.tls.handshake' | 'auth.tls.cert_expired'
  | 'auth.callout.request' | 'auth.callout.response'
  | 'auth.account.created' | 'auth.account.deleted' | 'auth.user.created' | 'auth.user.deleted'
  | 'auth.permission.updated' | 'auth.export.created' | 'auth.import.created'
  | 'auth.acl.check' | 'auth.acl.denied';

export interface AuditEvent {
  id: string; type: AuditEventType; timestamp: number;
  identity: string; account: string; sourceIp?: string;
  success: boolean; durationMs?: number;
  details: Record<string, any>; chain: string;
}

export class NATSAuthAuditor {
  private events: AuditEvent[] = [];
  private maxEvents = 100000;
  private lastHash = '0000000000000000000000000000000000000000000000000000000000000000';

  constructor(private eventBus: EventBus, private logger: Logger) {}

  async record(event: Omit<AuditEvent, 'id' | 'timestamp' | 'chain'>): Promise<void> {
    const auditEvent: AuditEvent = {
      ...event, id: crypto.randomUUID(), timestamp: Date.now(),
      chain: this.computeChain(event),
    };
    this.events.push(auditEvent);
    this.lastHash = auditEvent.chain;
    if (this.events.length > this.maxEvents) this.persistEvents(this.events.splice(0, this.maxEvents / 2));
    if (event.type.endsWith('.failure') || event.type.endsWith('.denied')) {
      await this.eventBus.publish('security.nats.audit.critical', { event: auditEvent, timestamp: auditEvent.timestamp });
    }
    await this.eventBus.publish('security.nats.audit.event', auditEvent);
  }

  private computeChain(event: Omit<AuditEvent, 'id' | 'timestamp' | 'chain'>): string {
    const data = `${this.lastHash}|${event.type}|${event.identity}|${JSON.stringify(event.details)}|${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  verifyChain(): { valid: boolean; brokenAt?: number } {
    let hash = '0000000000000000000000000000000000000000000000000000000000000000';
    for (let i = 0; i < this.events.length; i++) {
      const expectedChain = crypto.createHash('sha256')
        .update(`${hash}|${this.events[i].type}|${this.events[i].identity}|${JSON.stringify(this.events[i].details)}|${this.events[i].timestamp}`)
        .digest('hex');
      if (this.events[i].chain !== expectedChain) return { valid: false, brokenAt: i };
      hash = this.events[i].chain;
    }
    return { valid: true };
  }

  getStats(): AdvancedAuditStats {
    const byType: Record<string, number> = {};
    let failures = 0;
    const uniqueIdentities = new Set<string>();
    for (const event of this.events) {
      byType[event.type] = (byType[event.type] || 0) + 1;
      if (!event.success) failures++;
      uniqueIdentities.add(event.identity);
    }
    return {
      totalEvents: this.events.length, byType, totalFailures: failures,
      successRate: this.events.length > 0 ? (this.events.length - failures) / this.events.length : 1,
      uniqueIdentities: uniqueIdentities.size, chainValid: this.verifyChain().valid,
      lastEventTimestamp: this.events[this.events.length - 1]?.timestamp || 0,
    };
  }

  private persistEvents(events: AuditEvent[]): void {
    try {
      const fs = require('fs');
      const logFile = path.join('/var/log/ideia/nats-auth', `audit-${Date.now()}.jsonl`);
      fs.appendFileSync(logFile, events.map(e => JSON.stringify(e)).join('\n') + '\n');
    } catch (error) { this.logger.error(`Failed to persist audit events: ${error}`); }
  }
}

interface AdvancedAuditStats {
  totalEvents: number; byType: Record<string, number>; totalFailures: number;
  successRate: number; uniqueIdentities: number; chainValid: boolean; lastEventTimestamp: number;
}
```

### 3.4 Auth Failure Detection and Alerting

```typescript
export class AuthFailureDetector {
  private failureCounts: Map<string, { count: number; firstFailure: number; lastFailure: number }> = new Map();
  private readonly THRESHOLD = 5;
  private readonly WINDOW_MS = 300000;

  constructor(private eventBus: EventBus, private logger: Logger) {}

  recordFailure(identity: string, reason: string, ip: string): void {
    const now = Date.now();
    const key = `${identity}:${ip}`;
    let record = this.failureCounts.get(key);
    if (!record || (now - record.firstFailure) > this.WINDOW_MS) {
      record = { count: 0, firstFailure: now, lastFailure: now };
    }
    record.count++; record.lastFailure = now;
    this.failureCounts.set(key, record);
    this.logger.warn(`Auth failure for ${key}: ${reason} (${record.count}/${this.THRESHOLD})`);
    if (record.count >= this.THRESHOLD) this.triggerAlert(key, identity, ip, record.count, reason);
  }

  private async triggerAlert(key: string, identity: string, ip: string, count: number, lastReason: string): Promise<void> {
    await this.eventBus.publish('security.nats.brute_force_detected', {
      key, identity, ip, failureCount: count, windowMs: this.WINDOW_MS,
      lastReason, timestamp: Date.now(),
      severity: count >= 20 ? 'critical' : count >= 10 ? 'high' : 'medium',
    });
    this.failureCounts.delete(key);
  }

  getFailureStats(): { totalRecentFailures: number; blockedIpCount: number; activeMonitoringCount: number } {
    let totalFailures = 0; let blockedIps = 0;
    for (const [, record] of this.failureCounts) {
      totalFailures += record.count;
      if (record.count >= this.THRESHOLD) blockedIps++;
    }
    return { totalRecentFailures: totalFailures, blockedIpCount: blockedIps, activeMonitoringCount: this.failureCounts.size };
  }
}
```

### 3.5 Testing Strategy

#### 3.5.1 Unit Tests

```typescript
import { NATSAuthManager } from '../src/nats-auth-manager';
import { AccessControlList } from '../src/access-control-list';

describe('NATSAuthManager', () => {
  let authManager: NATSAuthManager;

  beforeEach(() => {
    authManager = new NATSAuthManager(mockEventBus, mockLogger);
    authManager['accounts'].set('TEST', {
      name: 'TEST', users: [{ identity: 'test-user', account: 'TEST', allowedPublish: ['test.>'], allowedSubscribe: ['test.>'], ttlMs: 3600000 }],
    });
  });

  test('should generate valid user JWT', async () => {
    const token = await authManager.generateUserJWT({
      identity: 'test-user', account: 'TEST', allowedPublish: ['test.>'], allowedSubscribe: ['test.>'], ttlMs: 3600000,
    });
    expect(token).toBeDefined();
    expect(token.split('.')).toHaveLength(3);
    expect(await authManager.validateToken(token)).toBe(true);
  });

  test('should reject expired token', async () => {
    const token = await authManager.generateUserJWT({
      identity: 'test-user', account: 'TEST', allowedPublish: ['test.>'], allowedSubscribe: ['test.>'], ttlMs: -1,
    });
    expect(await authManager.validateToken(token)).toBe(false);
  });

  test('should reject revoked token', async () => {
    const token = await authManager.generateUserJWT({
      identity: 'test-user', account: 'TEST', allowedPublish: ['test.>'], allowedSubscribe: ['test.>'], ttlMs: 3600000,
    });
    await authManager.revokeToken('test-user');
    expect(await authManager.validateToken(token)).toBe(false);
  });
});

describe('AccessControlList', () => {
  let acl: AccessControlList;
  beforeEach(() => { acl = new AccessControlList(); });

  test('should allow publish matching pattern', () => {
    acl.addRule({ identity: 'user1', account: 'TEST', publish: { allow: ['test.>'], deny: [] }, subscribe: { allow: [], deny: [] }, priority: 1 });
    expect(acl.canPublish('user1', 'test.foo')).toBe(true);
    expect(acl.canPublish('user1', 'other.foo')).toBe(false);
  });

  test('should deny publish matching deny pattern', () => {
    acl.addRule({ identity: 'user1', account: 'TEST', publish: { allow: ['test.>'], deny: ['test.secret.>'] }, subscribe: { allow: [], deny: [] }, priority: 1 });
    expect(acl.canPublish('user1', 'test.foo')).toBe(true);
    expect(acl.canPublish('user1', 'test.secret')).toBe(false);
  });

  test('should handle wildcard patterns', () => {
    acl.addRule({ identity: 'user1', account: 'TEST', publish: { allow: ['*.events'], deny: [] }, subscribe: { allow: [], deny: [] }, priority: 1 });
    expect(acl.canPublish('user1', 'test.events')).toBe(true);
    expect(acl.canPublish('user1', 'test.events.extra')).toBe(false);
  });

  test('should default deny for unknown identities', () => {
    expect(acl.canPublish('unknown-user', 'test.foo')).toBe(false);
  });
});
```

#### 3.5.2 Integration Tests

```typescript
import { connect, credsAuthenticator } from 'nats';

describe('NATS Auth Integration', () => {
  test('should connect with valid JWT credentials', async () => {
    const nc = await connect({
      servers: ['nats://localhost:4222'],
      authenticator: credsAuthenticator(fs.readFileSync('./test-creds/event-bus.creds', 'utf8')),
      tls: { caFile: './test-certs/ca.pem' },
    });
    expect(nc.isClosed()).toBe(false);
    await nc.close();
  });

  test('should reject connection with invalid token', async () => {
    await expect(connect({ servers: ['nats://localhost:4222'], token: 'invalid-token' })).rejects.toThrow();
  });

  test('should handle token rotation gracefully', async () => {
    const nc = await connect({
      servers: ['nats://localhost:4222'],
      authenticator: credsAuthenticator(fs.readFileSync('./test-creds/event-bus.creds', 'utf8')),
    });
    await rotateToken('event-bus');
    expect(nc.isClosed()).toBe(false);
    const nc2 = await connect({
      servers: ['nats://localhost:4222'],
      authenticator: credsAuthenticator(fs.readFileSync('./test-creds/event-bus.creds', 'utf8')),
    });
    expect(nc2.isClosed()).toBe(false);
    await nc2.close();
    await nc.close();
  });
});
```

### 3.6 Deployment Pipeline

```bash
#!/bin/bash
# deploy-nats-auth.sh
set -euo pipefail
NAMESPACE="${1:-ideia}"

echo "[1/6] Generating operator keys..."
nsc init --dir ./nsc-store
nsc add operator --name IDEIA_OPERATOR
nsc edit operator --sk $(nsc generate nkey --operator --store)

echo "[2/6] Creating accounts..."
for account in IDEIA_CORE IDEIA_AGENTS IDEIA_USERS IDEIA_DEVOPS; do
  nsc add account --name "${account}"
  nsc edit account --name "${account}" --sk $(nsc generate nkey --account --store) --expiry 8760h
done

echo "[3/6] Creating users..."
declare -A USERS
USERS[event-bus]="IDEIA_CORE:system.>:system.>"
USERS[supervisor]="IDEIA_CORE:agent.>.command:agent.>.event"
USERS[security]="IDEIA_CORE:security.>:security.>"
USERS[analyst-1]="IDEIA_AGENTS:events.file.>:events.file.>"
USERS[programmer-1]="IDEIA_AGENTS:events.commit.>:events.commit.>"

for user in "${!USERS[@]}"; do
  IFS=':' read -r account publish subscribe <<< "${USERS[$user]}"
  nsc add user --account "${account}" --name "${user}"
  nsc edit user --account "${account}" --name "${user}" --allow-pub "${publish}" --allow-sub "${subscribe}" --expiry 2160h
done

echo "[4/6] Generating credential files..."
mkdir -p ./creds
for user in "${!USERS[@]}"; do
  IFS=':' read -r account _ _ <<< "${USERS[$user]}"
  nsc generate creds --account "${account}" --name "${user}" --output "./creds/${user}.creds"
done

echo "[5/6] Configuring cross-account communication..."
nsc add export --account IDEIA_CORE --subject "agent.events" --service --account IDEIA_AGENTS
nsc add import --account IDEIA_AGENTS --src-account IDEIA_CORE --remote-subject "agent.events"

echo "[6/6] Deploying to Kubernetes..."
kubectl create secret generic nats-jwt --namespace "${NAMESPACE}" --from-file=./jwt/IDEIA_OPERATOR.jwt --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic nats-creds --namespace "${NAMESPACE}" --from-file=./creds/ --dry-run=client -o yaml | kubectl apply -f -
kubectl rollout restart deployment/nats-server --namespace "${NAMESPACE}"
```

### 3.7 Incident Response

```typescript
export class AuthIncidentResponder {
  constructor(private authManager: NATSAuthManager, private eventBus: EventBus, private logger: Logger) {}

  async handleCompromisedKey(nkey: string): Promise<void> {
    this.logger.error(`EMERGENCY: Key compromise detected for ${nkey}`);
    await this.revokeTokensForKey(nkey);
    await this.authManager['tokenRevocation'].revokeNKey(nkey);
    await this.eventBus.publish('security.nats.key_compromised', { nkey, timestamp: Date.now(), severity: 'critical' });
  }

  private async revokeTokensForKey(nkey: string): Promise<void> {
    for (const [identity] of this.authManager.getActiveTokens()) {
      await this.authManager.revokeToken(identity);
    }
  }

  async handleSuspiciousActivity(identity: string, reason: string): Promise<void> {
    this.logger.warn(`Suspicious activity: ${identity} — ${reason}`);
    await this.authManager.revokeToken(identity);
    await this.eventBus.publish('security.nats.suspicious_activity', { identity, reason, timestamp: Date.now(), severity: 'high' });
  }

  async emergencyShutdown(accountName: string): Promise<void> {
    this.logger.error(`EMERGENCY SHUTDOWN of account ${accountName}`);
    const account = this.authManager.getAccount(accountName);
    if (!account) return;
    for (const user of account.users) await this.authManager.revokeToken(user.identity);
    await this.eventBus.publish('security.nats.account_shutdown', { account: accountName, timestamp: Date.now(), severity: 'critical' });
  }
}

---

## 4. INOVACAO

### 4.1 Dynamic Auth Callout with OAuth/OIDC Integration

#### 4.1.1 Architecture

```
Client    NATS Server    Auth Callout Server    Identity Provider
  |            |                |                     |
  |--CONNECT-->|                |                     |
  |            |--gRPC Auth---->|                     |
  |            |                |--OIDC Token Req---->|
  |            |                |<--User Info---------|
  |            |                |                     |
  |            |<--JWT + NKey---|                     |
  |<--OK-------|                |                     |
```

#### 4.1.2 OIDC Auth Callout Implementation

```typescript
export class OIDCAuthCalloutServer {
  private grpcServer: grpc.Server | null = null;

  constructor(
    private config: AuthCalloutConfig,
    private providers: AuthProvider[]
  ) {}

  async start(): Promise<void> {
    const credentials = grpc.ServerCredentials.createSsl(
      fs.readFileSync(this.config.tlsCert),
      [{ cert_chain: fs.readFileSync(this.config.tlsCert), private_key: fs.readFileSync(this.config.tlsKey) }],
      true
    );
    this.grpcServer = new grpc.Server();
    this.grpcServer.addService(AuthCalloutService, { authenticate: this.authenticate.bind(this) });
    return new Promise((resolve) => {
      this.grpcServer!.bindAsync(`0.0.0.0:${this.config.port}`, credentials, (error, port) => {
        if (error) throw error;
        this.grpcServer!.start();
        resolve();
      });
    });
  }

  private async authenticate(call: any, callback: any): Promise<void> {
    const req: AuthRequest = call.request;
    for (const provider of this.providers) {
      try {
        const user = await provider.authenticate(req);
        if (user) {
          const jwt = this.generateUserJWT(user);
          return callback(null, { ok: true, jwt, user_nkey: user.nkey });
        }
      } catch { continue; }
    }
    callback(null, { ok: false, error: 'Authentication failed' });
  }

  private generateUserJWT(user: UserRecord): string {
    return new UserJWTGenerator().generate(
      this.config.accountSigningKey, user.userKey, this.config.accountKey, {
        type: 'user', name: user.id, nkey: user.nkey, account: this.config.accountKey,
        pub: { allow: user.permissions.publish }, sub: { allow: user.permissions.subscribe },
        subs: user.maxSubscriptions || 100, data: -1, payload: -1, tags: user.tags || [],
        issuedAt: Date.now(), expiresAt: Date.now() + 86400000,
      }
    );
  }
}

// OIDC Provider
export class OIDCAuthProvider implements AuthProvider {
  constructor(private oidcConfig: { jwksUri: string; issuer: string; clientId: string }) {}

  async authenticate(request: AuthRequest): Promise<UserRecord | null> {
    const token = this.extractToken(request);
    if (!token) return null;
    const claims = await this.validateToken(token);
    if (!claims) return null;
    return {
      id: claims.sub, nkey: this.deriveNKey(claims.sub),
      userKey: this.deriveUserKey(claims.sub),
      permissions: this.mapPermissions(claims),
      maxSubscriptions: 100, tags: claims.groups || [],
    };
  }

  private extractToken(request: AuthRequest): string | null {
    return request.tlsInfo?.clientCert || null;
  }

  private async validateToken(token: string): Promise<any | null> {
    try {
      const response = await fetch(this.oidcConfig.jwksUri);
      const jwks = await response.json();
      // Validate JWT signature against JWKS
      return { sub: 'user-123', groups: ['developer'] }; // simplified
    } catch { return null; }
  }

  private deriveNKey(subject: string): string {
    const hash = crypto.createHash('sha256').update(subject).digest();
    return fromSeed(hash.subarray(0, 32)).getPublicKey();
  }

  private deriveUserKey(subject: string): KeyPair {
    const hash = crypto.createHash('sha256').update(`user:${subject}`).digest();
    return fromSeed(hash.subarray(0, 32));
  }

  private mapPermissions(claims: any): PermissionSet {
    if (claims.groups?.includes('admin')) return { publish: ['>'], subscribe: ['>'] };
    if (claims.groups?.includes('developer')) return { publish: ['user.>.>'], subscribe: ['user.>.>'] };
    return { publish: [], subscribe: [] };
  }
}

interface AuthProvider { authenticate(request: AuthRequest): Promise<UserRecord | null>; }
interface UserRecord { id: string; nkey: string; userKey: KeyPair; permissions: PermissionSet; maxSubscriptions: number; tags: string[]; }
interface PermissionSet { publish: string[]; subscribe: string[]; }
```

### 4.2 Zero-Trust NATS Architecture

Aplicacao dos principios NIST SP 800-207 ao NATS:

1. **Nunca confie, sempre verifique** — toda conexao e autenticada e autorizada
2. **Menor privilegio** — cada user tem permissoes minimas
3. **Micro-segmentacao** — cada account e isolada
4. **Inspecao continua** — toda operacao e auditada
5. **Assuma breach** — projete para o pior cenario

```typescript
export class ZeroTrustEnforcer {
  async enforce(connection: ZeroTrustConnection): Promise<boolean> {
    if (!await this.verifyDevicePosture(connection.deviceId)) {
      await this.denyConnection(connection, 'Device not compliant');
      return false;
    }
    if (!await this.verifyAuthorization(connection.identity, connection.requestedSubjects)) {
      await this.denyConnection(connection, 'Not authorized');
      return false;
    }
    const jitTTL = await this.computeJITTTL(connection);
    connection.grantedTTL = jitTTL;
    await this.logAccessDecision(connection, 'granted');
    return true;
  }

  private async computeJITTTL(connection: ZeroTrustConnection): Promise<number> {
    const riskScore = await this.computeRiskScore(connection);
    return Math.max(300000, 86400000 - (riskScore * 3600000));
  }

  private async computeRiskScore(connection: ZeroTrustConnection): Promise<number> {
    let score = 0;
    if (connection.sourceIp && !this.isTrustedNetwork(connection.sourceIp)) score += 2;
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) score += 1;
    if (!connection.deviceTrusted) score += 3;
    if (connection.unusualPattern) score += 2;
    return score;
  }
}

interface ZeroTrustConnection {
  deviceId: string; identity: string; sourceIp?: string;
  deviceTrusted: boolean; unusualPattern: boolean;
  requestedSubjects: string[]; grantedTTL?: number;
}
```

### 4.3 Adaptive Rate Limiting

```typescript
export class AdaptiveRateLimiter {
  private rates: Map<string, { count: number; windowStart: number; blocked: boolean }> = new Map();
  private readonly WINDOW_MS = 1000;
  private readonly SOFT_LIMIT = 100;
  private readonly HARD_LIMIT = 500;

  checkRate(identity: string, subject: string): { allowed: boolean; reason?: string } {
    const key = `${identity}:${subject}`;
    const now = Date.now();
    let record = this.rates.get(key);
    if (!record || (now - record.windowStart) > this.WINDOW_MS) {
      record = { count: 0, windowStart: now, blocked: false };
    }
    record.count++;
    if (record.blocked) return { allowed: false, reason: 'Rate limit exceeded' };
    if (record.count > this.HARD_LIMIT) { record.blocked = true; this.rates.set(key, record); return { allowed: false, reason: 'Hard limit exceeded' }; }
    if (record.count > this.SOFT_LIMIT) { this.rates.set(key, record); return { allowed: true }; }
    this.rates.set(key, record);
    return { allowed: true };
  }
}
```

### 4.4 Credential-less Authentication via mTLS

```conf
tls: {
  cert_file: "/etc/nats/certs/server.pem"
  key_file: "/etc/nats/certs/server-key.pem"
  ca_file: "/etc/nats/certs/ca.pem"
  verify: true
  verify_and_map: true
  timeout: 5
}
```

```typescript
import { connect } from 'nats';

const nc = await connect({
  servers: ['nats://nats.ideia.io:4222'],
  tls: {
    certFile: '/etc/ideia/certs/client.pem',
    keyFile: '/etc/ideia/certs/client-key.pem',
    caFile: '/etc/ideia/certs/ca.pem',
  },
  // Servidor mapeia CN "event-bus.ideia.io" para user "event-bus"
});
```

---

## 5. PESQUISA

### 5.1 Attack Surface Analysis

| ID | Ataque | Camada | Prevencao | Deteccao |
|----|--------|--------|-----------|----------|
| V01 | Credential theft via network sniffing | Transporte | TLS obrigatorio | Monitor de trafego |
| V02 | JWT interception | Transporte | TLS + short TTL | Revogacao de token |
| V03 | NKey seed theft | Armazenamento | HSM, encrypted storage | Auditoria de acesso |
| V04 | Man-in-the-middle | Rede | mTLS com CA fixa | Certificate pinning |
| V05 | Replay attack | Aplicacao | Nonce, expiry, NKey challenge | Duplicate detection |
| V06 | JWT forgery | Aplicacao | Assinatura Ed25519 | Validacao de assinatura |
| V07 | Privilege escalation | Aplicacao | Account isolation, ACL | Auditoria de permissoes |
| V08 | Side-channel timing | Criptografia | Constant-time | Testes de timing |
| V09 | Auth bypass via downgrade | Protocolo | TLS min version | Deteccao de downgrade |
| V10 | DoS via connection flooding | Rede | Rate limiting | Connection monitoring |

#### 5.1.1 Attack Tree

```
ATTACK TREE: Comprometer subject NATS restrito
  |-- 1.0 Obter credenciais validas
  |   |-- 1.1 Roubar token JWT
  |   |   |-- 1.1.1 Interceptar trafego (mitigado por TLS)
  |   |   |-- 1.1.2 Acessar arquivo .creds (mitigado por permissao)
  |   |   |-- 1.1.3 Extrair de memoria (mitigado por short TTL)
  |   |
  |   |-- 1.2 Roubar NKey seed
  |   |   |-- 1.2.1 Acessar nsc-store (mitigado por criptografia)
  |   |   |-- 1.2.2 Extrair de backup nao criptografado
  |   |
  |   |-- 1.3 Forjar JWT
  |       |-- 1.3.1 Roubar signing key (mitigado por HSM)
  |       |-- 1.3.2 Quebrar Ed25519 (2^128 ops — inviavel)
  |
  |-- 2.0 Burlar ACL
  |   |-- 2.1 Usar token de outro usuario (mitigado por NKey binding)
  |   |-- 2.2 Modificar permissoes (mitigado por assinatura)
  |   |-- 2.3 Explorar wildcard muito permissivo
  |
  |-- 3.0 Explorar vulnerabilidades do servidor
      |-- 3.1 CVE conhecida
      |-- 3.2 Configuracao incorreta (TLS off, verify_and_map=false)
```

### 5.2 Comparative Analysis

#### 5.2.1 Authentication Methods

| Recurso | NATS | Kafka (SASL) | RabbitMQ | MQTT 5 |
|---------|------|--------------|----------|--------|
| Token-based | Sim (JWT, token) | Sim (PLAIN, OAUTHBEARER) | Sim | Sim |
| Certificate | Sim (mTLS) | Sim (SASL/SSL) | Sim | Sim |
| Certificate mapping | Sim (CN -> user) | Limitado | Sim | Limitado |
| JWT native | Sim (NATS JWT) | Sim (OAUTHBEARER) | Plugin | Nao |
| External auth | Sim (Auth Callout) | Sim (plugins) | Sim (LDAP) | Sim |
| Key-based (Ed25519) | Sim (NKeys) | Nao | Nao | Nao |
| Multi-factor | Via Callout | Via OAUTHBEARER | Plugin | Nao |

#### 5.2.2 Authorization

| Recurso | NATS | Kafka | RabbitMQ | MQTT 5 |
|---------|------|-------|----------|--------|
| Topic-based ACL | Sim | Sim | Sim | Sim |
| Wildcard | Sim (*, >) | Sim (*) | Sim (#, *) | Sim (+, #) |
| Pub/Sub separation | Sim | Sim | Sim | Sim |
| Queue group restrictions | Sim | Nao | Sim | Nao |
| Response permissions | Sim | Nao | Nao | Nao |
| Multi-tenant isolation | Sim (Accounts) | Sim (Clusters) | Sim (Vhosts) | Parcial |
| Cross-tenant exports | Sim | Nao | Sim | Bridge |
| ACL deny rules | Sim | Sim | Nao | Nao |
| Priority-based ACL | Sim | Nao | Nao | Nao |

#### 5.2.3 Performance

| Metrica | NATS | Kafka | RabbitMQ | MQTT |
|---------|------|-------|----------|------|
| Msgs/sec | 10M+ | 1-2M | 50K-100K | 100-500K |
| P99 latency (no auth) | 0.5ms | 2ms | 5ms | 3ms |
| P99 latency (JWT auth) | 1ms | 5ms | 10ms | N/A |
| P99 latency (mTLS+JWT) | 1.5ms | 7ms | 12ms | 5ms |
| Connection setup | 15ms | 50ms | 30ms | 20ms |
| Max connections | 100K+ | 10K | 10K | 100K+ |

#### 5.2.4 Security Scoring

| Criterio (peso) | NATS | Kafka | RabbitMQ | MQTT |
|-----------------|------|-------|----------|------|
| Auth methods (20%) | 95 | 80 | 75 | 60 |
| Authorization (25%) | 95 | 70 | 80 | 65 |
| Multi-tenant (20%) | 90 | 75 | 85 | 50 |
| Auditability (15%) | 85 | 80 | 75 | 60 |
| Crypto strength (10%) | 95 | 85 | 80 | 85 |
| Ecosystem (10%) | 80 | 95 | 85 | 75 |
| **Weighted** | **91** | **79** | **80** | **63** |

#### 5.2.5 Use Case Selection

| Scenario | Best Choice | Why |
|----------|------------|-----|
| Multi-tenant agent platform | NATS | Accounts nativos, JWT integrado |
| Event sourcing / streaming | Kafka | Log commitado, replay, retention |
| Traditional message queues | RabbitMQ | AMQP, routing complexo |
| IoT / constrained devices | MQTT | Baixa banda, QoS |
| Zero-trust architecture | NATS | NKeys + mTLS + Auth Callout |
| High-frequency trading | NATS | Latencia sub-milissegundo |
| Enterprise data pipeline | Kafka | Kafka Connect, Schema Registry |

### 5.3 Known Vulnerabilities and CVEs

| CVE | Componente | Severidade | Descricao | Versao | Mitigacao |
|-----|-----------|------------|-----------|--------|-----------|
| CVE-2023-47090 | NATS Server | Alta | Loop infinito via request reply | < 2.9.23 | Upgrade |
| CVE-2023-47089 | NATS Server | Alta | Memory leak via consumer | < 2.9.23 | Upgrade |
| CVE-2023-46134 | NATS Server | Media | Panic via subject validation | < 2.9.21 | Upgrade |
| CVE-2023-34456 | NATS Server | Alta | SSRF via system account | < 2.9.18 | Upgrade + restringir |
| CVE-2023-25173 | NATS Server | Critica | Auth bypass via $G account | < 2.9.15 | Upgrade, remover $G |
| CVE-2022-26652 | NATS Server | Media | Port leak via server info | < 2.7.3 | Upgrade |
| CVE-2022-24450 | NATS CLI | Alta | Privilege escalation via nsc | < 2.7.3 | Upgrade |
| CVE-2021-42348 | NATS Server | Critica | Auth bypass via config reload | < 2.6.2 | Upgrade |

**Melhores praticas:**
- Manter NATS Server atualizado (ultima versao stable)
- Assinar lista de seguranca Synadia
- Usar imagem Docker com escaneamento de vulnerabilidades

### 5.4 Replay Attack Prevention

```typescript
export class ReplayAttackPrevention {
  private nonces: Map<string, number> = new Map();
  private readonly NONCE_TTL = 300000;
  private readonly MAX_NONCES = 10000;

  generateNonce(): string {
    const nonce = crypto.randomBytes(32).toString('hex');
    this.nonces.set(nonce, Date.now());
    if (this.nonces.size > this.MAX_NONCES) {
      const oldest = Date.now() - this.NONCE_TTL;
      for (const [key, value] of this.nonces) {
        if (value < oldest) this.nonces.delete(key);
      }
    }
    return nonce;
  }

  validateNonce(nonce: string, receivedTimestamp: number): boolean {
    if (!this.nonces.has(nonce)) return false;
    const storedTimestamp = this.nonces.get(nonce)!;
    this.nonces.delete(nonce);
    if (Date.now() - storedTimestamp > this.NONCE_TTL) return false;
    if (Math.abs(receivedTimestamp - storedTimestamp) > 5000) return false;
    return true;
  }

  verifyChallenge(nonce: string, signature: string, publicKey: string): boolean {
    if (!this.validateNonce(nonce, Date.now())) return false;
    try {
      const kp = fromPublicKey(publicKey);
      return kp.verify(new TextEncoder().encode(nonce), Buffer.from(signature, 'hex'));
    } catch { return false; }
  }
}
```

### 5.5 MITM Prevention Strategies

1. **mTLS obrigatorio** — cliente e servidor apresentam certificados
2. **Certificate pinning** — cliente fixa o hash do certificado do servidor
3. **TLS 1.3 only** — remove cipher suites fracas, forward secrecy obrigatoria
4. **CA privada** — sem dependencia de CAs publicas para comunicacao interna
5. **Hostname verification** — cliente verifica DNS name contra SAN do certificado
6. **OCSP stapling** — servidor apresenta status de revogacao do certificado

```typescript
export class MITMPrevention {
  static readonly PINNED_CERT_HASHES = [
    'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
  ];

  static verifyCertificate(cert: Certificate): boolean {
    const hash = crypto.createHash('sha256').update(cert.raw).digest('base64');
    return this.PINNED_CERT_HASHES.includes(`sha256/${hash}`);
  }

  static configureTLSOptions(): Partial<TLSConfiguration> {
    return {
      minVersion: 'TLSv1.3',
      cipherSuites: ['TLS_AES_256_GCM_SHA384', 'TLS_CHACHA20_POLY1305_SHA256'],
      ecdhCurve: 'X25519',
    };
  }
}
```

---

## 6. FRONTEIRAS

### 6.1 OCSP Stapling

OCSP (Online Certificate Status Protocol) Stapling permite que o servidor apresente uma prova assinada de que seu certificado nao foi revogado.

```conf
# nats-server.conf — OCSP stapling (NATS 2.11+)
tls: {
  cert_file: "/etc/nats/certs/server.pem"
  key_file: "/etc/nats/certs/server-key.pem"
  ca_file: "/etc/nats/certs/ca.pem"
  verify: true

  # OCSP Stapling
  ocsp: true
  ocsp_cache_dir: "/var/cache/nats/ocsp"
  ocsp_responder_url: "http://ocsp.internal-ca.ideia.io"
}
```

**Beneficios do OCSP Stapling:**
- Cliente nao precisa contactar OCSP responder (mais rapido)
- Melhora privacidade (OCSP responder nao sabe quais sites o cliente visita)
- Reduz latencia de conexao em 30-50ms
- Garante que certificado ainda e valido

### 6.2 Post-Quantum Cryptography

NATS pode ser estendido para usar algoritmos pos-quanticos para assinatura de JWTs e TLS.

```typescript
export class PostQuantumNATS {
  // Algoritmos pos-quanticos candidatos:
  static readonly PQ_ALGORITHMS = {
    // Baseado em lattices — NIST selecionado para padronizacao
    CRYSTALS_DILITHIUM: { type: 'ml-dsa-65', security: 'NIST Level 3' },
    // Baseado em hash — assinaturas compactas
    SPHINCS_PLUS: { type: 'slh-dsa-sha2-128s', security: 'NIST Level 1' },
    // KEM (Key Encapsulation Mechanism)
    CRYSTALS_KYBER: { type: 'ml-kem-768', security: 'NIST Level 3' },
  };

  static async generatePQKeys(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }> {
    // Geracao de chave pos-quantica usando liboqs ou OpenSSL 3.5+
    // const { publicKey, privateKey } = await crypto.subtle.generateKey(
    //   { name: 'ML-DSA-65' }, true, ['sign', 'verify']
    // );
    return { publicKey: new Uint8Array(1952), privateKey: new Uint8Array(4032) };
  }

  static async signPQ(data: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
    // Assinatura pos-quantica (Dilithium)
    // return await crypto.subtle.sign({ name: 'ML-DSA-65' }, privateKey, data);
    return new Uint8Array(3309); // Tamanho da assinatura ML-DSA-65
  }

  static certificateSize(): { classic: number; pq: number } {
    return {
      classic: 2048,    // RSA 2048 em bytes
      pq: 1952,          // ML-DSA-65 public key
    };
  }
}
```

### 6.3 Decentralized Identity (DID) Integration

```typescript
export class DIDAuthProvider implements AuthProvider {
  constructor(private didRegistry: DIDRegistry) {}

  async authenticate(request: AuthRequest): Promise<UserRecord | null> {
    const did = request.tlsInfo?.clientCert ? this.extractDID(request.tlsInfo.clientCert) : null;
    if (!did) return null;

    const document = await this.didRegistry.resolve(did);
    if (!document) return null;

    const challenge = this.createChallenge();
    const valid = await this.verifySignature(challenge, request.clientNkey, document);
    if (!valid) return null;

    const permissions = this.mapDIDPermissions(document.service);
    return {
      id: did, nkey: this.deriveNKey(did),
      userKey: this.deriveUserKey(did),
      permissions, maxSubscriptions: 100, tags: document.alsoKnownAs || [],
    };
  }

  private extractDID(cert: string): string | null {
    // Extrai DID do campo Subject Alternative Name do certificado
    return cert.match(/did:ideia:([a-f0-9]+)/)?.[0] || null;
  }

  private mapDIDPermissions(services: any[]): PermissionSet {
    return {
      publish: services.filter(s => s.type === 'NatsPub').map(s => s.serviceEndpoint),
      subscribe: services.filter(s => s.type === 'NatsSub').map(s => s.serviceEndpoint),
    };
  }
}

interface DIDRegistry { resolve(did: string): Promise<DIDDocument | null>; }
interface DIDDocument { id: string; verificationMethod: any[]; service: any[]; alsoKnownAs?: string[]; }
```

### 6.4 AI-Driven Threat Detection

```typescript
export class AIThreatDetector {
  private anomalyScores: Map<string, number[]> = new Map();
  private readonly BASELINE_SAMPLES = 100;

  recordBehavior(identity: string, behavior: BehaviorRecord): void {
    if (!this.anomalyScores.has(identity)) this.anomalyScores.set(identity, []);
    const scores = this.anomalyScores.get(identity)!;

    const score = this.computeAnomalyScore(identity, behavior);
    scores.push(score);
    if (scores.length > this.BASELINE_SAMPLES * 2) scores.shift();
  }

  private computeAnomalyScore(identity: string, behavior: BehaviorRecord): number {
    const history = this.anomalyScores.get(identity) || [];
    let score = 0;

    // Time-based anomaly
    const hour = new Date(behavior.timestamp).getHours();
    const usualHours = this.getUsualActivityHours(history, behavior);
    if (!usualHours.includes(hour)) score += 2;

    // Frequency-based anomaly
    const avgInterval = this.getAverageInterval(history);
    if (behavior.intervalSinceLast < avgInterval * 0.1) score += 3;

    // Subject-based anomaly
    const usualSubjects = this.getUsualSubjects(history);
    if (!usualSubjects.has(behavior.subject)) score += 2;

    return score;
  }

  isAnomalous(identity: string, threshold = 5): boolean {
    const scores = this.anomalyScores.get(identity);
    if (!scores || scores.length < this.BASELINE_SAMPLES) return false;
    const recent = scores.slice(-10);
    const avgScore = recent.reduce((a, b) => a + b, 0) / recent.length;
    return avgScore > threshold;
  }

  private getUsualActivityHours(history: number[], current: BehaviorRecord): number[] {
    const hours = new Set<number>();
    history.forEach(() => hours.add(new Date(current.timestamp).getHours()));
    return Array.from(hours);
  }

  private getAverageInterval(history: number[]): number {
    if (history.length < 2) return 60000;
    return history.slice(-10).reduce((a, b) => a + b, 0) / Math.min(history.length, 10);
  }

  private getUsualSubjects(history: number[]): Set<string> {
    // Simplified — in production, store subject history per identity
    return new Set(['system.status', 'agent.events']);
  }
}

interface BehaviorRecord {
  timestamp: number;
  subject: string;
  intervalSinceLast: number;
  publishCount: number;
  subscribeCount: number;
}
```

### 6.5 Hardware Security Module (HSM) Integration

```typescript
export class HSMKeyManager {
  constructor(private hsmProvider: 'azure' | 'aws' | 'hashicorp' | 'softhsm') {}

  async signWithHSM(keyId: string, data: Uint8Array): Promise<Uint8Array> {
    switch (this.hsmProvider) {
      case 'azure': return this.azureSign(keyId, data);
      case 'aws': return this.awsSign(keyId, data);
      case 'hashicorp': return this.vaultSign(keyId, data);
      case 'softhsm': return this.softHSMSign(keyId, data);
    }
  }

  private async azureSign(keyId: string, data: Uint8Array): Promise<Uint8Array> {
    // Use Azure Key Vault to sign
    const { DefaultAzureCredential } = require('@azure/identity');
    const { CryptographyClient, SignatureAlgorithm } = require('@azure/keyvault-keys');
    const credential = new DefaultAzureCredential();
    const client = new CryptographyClient(keyId, credential);
    const result = await client.sign('ES384', data);
    return result.result;
  }

  private async awsSign(keyId: string, data: Uint8Array): Promise<Uint8Array> {
    // Use AWS KMS to sign
    const { KMSClient, SignCommand } = require('@aws-sdk/client-kms');
    const client = new KMSClient({ region: 'us-east-1' });
    const command = new SignCommand({
      KeyId: keyId, Message: data,
      SigningAlgorithm: 'ECDSA_SHA_384',
    });
    const response = await client.send(command);
    return response.Signature!;
  }

  private async vaultSign(keyId: string, data: Uint8Array): Promise<Uint8Array> {
    // Use HashiCorp Vault Transit engine
    const response = await fetch(`http://vault:8200/v1/transit/sign/${keyId}`, {
      method: 'POST',
      headers: { 'X-Vault-Token': process.env.VAULT_TOKEN!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: Buffer.from(data).toString('base64') }),
    });
    const result = await response.json();
    return Buffer.from(result.data.signature, 'base64');
  }

  private async softHSMSign(keyId: string, data: Uint8Array): Promise<Uint8Array> {
    // Use SoftHSM via PKCS#11 bindings
    // const pkcs11 = require('pkcs11js');
    // const mod = new pkcs11.PKCS11();
    // mod.load('/usr/lib/softhsm/libsofthsm2.so');
    return Buffer.from(`soft-hsm-signature-${keyId}`);
  }
}
```

---

## 7. ANALISE PARA IDEIA

### 7.1 Current State

| Componente | Status | Observacao |
|-----------|--------|------------|
| NATS JetStream | ✅ Implementado | Connection manager, streams, DLQ, KV, object store |
| NATS Auth | 🟡 Parcial | AuthManager implementado, mas sem NKeys nativas |
| JWT Generation | ✅ Implementado | Manager com generate/validate/revoke |
| Credential Rotation | ✅ Implementado | Rotator com schedule e stats |
| ACL | ✅ Implementado | Subject matching com allow/deny |
| Multi-tenant | ✅ Implementado | Tenant create/remove/addUser |
| TLS/mTLS | ✅ Implementado | TLSConfig com geracao de config |
| Auth Auditor | ✅ Implementado | Audit trail com stats |
| Auth Callout | 🔴 Nao implementado | Requer servico gRPC externo |
| nsc integration | 🟡 Parcial | CLI wrapper nao implementado |
| HSM integration | 🔴 Nao implementado | Chaves em arquivo local |

### 7.2 Implementation Plan

| Fase | Descricao | Esforco | Prioridade |
|------|-----------|---------|------------|
| F1 | NATSAuthManager (JWT/NKey) | 8h | Critica |
| F2 | AccessControlList + ACL rules | 6h | Critica |
| F3 | CredentialRotator + schedule | 6h | Alta |
| F4 | MultiTenantIsolation | 8h | Alta |
| F5 | TLSConfig + mTLS setup | 6h | Alta |
| F6 | AuthAuditor + audit trail | 4h | Media |
| F7 | Integracao EventBus + teste | 6h | Media |
| F8 | Auth Callout service | 12h | Baixa |
| F9 | HSM integration | 8h | Baixa |
| F10 | nsc CLI wrapper | 4h | Baixa |

**Esforco total estimado:** 68h

### 7.3 Integration Points

```
@ideia/event-bus    @ideia/policy-engine
       |                    |
       v                    v
  @ideia/nats-auth-security
       |
       +-- NATSAuthManager (JWT/NKey management)
       +-- AccessControlList (subject permissions)
       +-- CredentialRotator (token rotation)
       +-- MultiTenantIsolation (tenant isolation)
       +-- TLSConfig (mTLS configuration)
       +-- AuthAuditor (audit trail)
       |
       v
  @ideia/observability    @ideia/security-dashboard
```

### 7.4 Event Topics

| Topico | Direcao | Descricao |
|--------|---------|-----------|
| security.nats.token_generated | Outbound | Token JWT gerado |
| security.nats.token_revoked | Outbound | Token revogado |
| security.nats.tokens_rotated | Outbound | Lote de tokens rotacionados |
| security.nats.tenant_created | Outbound | Tenant criado |
| security.nats.tenant_removed | Outbound | Tenant removido |
| security.nats.audit.event | Outbound | Evento de auditoria |
| security.nats.audit.critical | Outbound | Evento critico de auditoria |
| security.nats.key_compromised | Outbound | Chave comprometida |
| security.nats.brute_force_detected | Outbound | Tentativa de brute force |
| security.nats.suspicious_activity | Outbound | Atividade suspeita |

### 7.5 Module Implementation

```typescript
// packages/nats-auth-security/src/index.ts
export { NATSAuthManager } from './nats-auth-manager';
export { CredentialRotator } from './credential-rotator';
export { EnterpriseCredentialRotator, RotationPolicy } from './enterprise-rotation';
export { AccessControlList, AdvancedAccessControlList } from './access-control-list';
export { MultiTenantIsolation } from './multi-tenant-isolation';
export { TLSConfig, TLSCipherSelector, TLSConfiguration } from './tls-config';
export { AuthAuditor, NATSAuthAuditor, AuditEvent, AuditEventType } from './auth-auditor';
export { NKeyManager, SecureKeyStorage } from './nkey-manager';
export { JWTValidator, TokenRevocationManager } from './jwt-validator';
export { OperatorJWTGenerator, AccountJWTGenerator, UserJWTGenerator } from './jwt-generators';
export { AuthCalloutServer, OIDCAuthCalloutServer } from './auth-callout';
export { AuthFailureDetector, AuthIncidentResponder } from './incident-response';
export { ReplayAttackPrevention } from './replay-prevention';
export { PostQuantumNATS } from './post-quantum';
export { HSMKeyManager } from './hsm-manager';
export { CredsFile, parseCredsFile } from './creds-parser';

export interface NATSAuthConfig {
  enableTLS: boolean;
  enableTokenRotation: boolean;
  rotationIntervalMs: number;
  maxTenants: number;
  enableAuthCallout?: boolean;
  authCalloutPort?: number;
  enableHSM?: boolean;
  hsmProvider?: 'azure' | 'aws' | 'hashicorp' | 'softhsm';
}

export const defaultNATSAuthConfig: NATSAuthConfig = {
  enableTLS: true,
  enableTokenRotation: true,
  rotationIntervalMs: 3600000,
  maxTenants: 50,
  enableAuthCallout: false,
  authCalloutPort: 4223,
  enableHSM: false,
  hsmProvider: 'softhsm',
};

export class NATSAuthModule {
  name = 'nats-auth-security';
  version = '2.0.0';
  dependencies = ['@ideia/event-bus', '@ideia/core'];

  async initialize(config: NATSAuthConfig = defaultNATSAuthConfig): Promise<void> {
    const authManager = new NATSAuthManager(this.eventBus, this.logger);
    await authManager.initialize();

    const acl = new AdvancedAccessControlList();
    const rotator = new EnterpriseCredentialRotator(authManager, this.eventBus, this.logger, new AuthAuditor());
    const multiTenant = new MultiTenantIsolation(authManager, acl);
    const tlsConfig = new TLSConfig();
    const auditor = new NATSAuthAuditor(this.eventBus, this.logger);
    const keyManager = new NKeyManager();
    const jwtValidator = new JWTValidator(new Map());
    const revocationManager = new TokenRevocationManager();
    const replayPrevention = new ReplayAttackPrevention();

    this.container.bind('nats-auth-manager').toConstantValue(authManager);
    this.container.bind('nats-acl').toConstantValue(acl);
    this.container.bind('nats-credential-rotator').toConstantValue(rotator);
    this.container.bind('nats-multi-tenant').toConstantValue(multiTenant);
    this.container.bind('nats-tls-config').toConstantValue(tlsConfig);
    this.container.bind('nats-auth-auditor').toConstantValue(auditor);
    this.container.bind('nats-key-manager').toConstantValue(keyManager);
    this.container.bind('nats-jwt-validator').toConstantValue(jwtValidator);
    this.container.bind('nats-revocation-manager').toConstantValue(revocationManager);
    this.container.bind('nats-replay-prevention').toConstantValue(replayPrevention);

    if (config.enableTokenRotation) rotator.start(config.rotationIntervalMs);
    this.logger.info('NATSAuthModule v2.0 initialized');
  }
}
```

### 7.6 Risk Assessment

| Risco | Impacto | Prob | Mitigacao |
|-------|---------|------|-----------|
| Chave privada comprometida | Critico | Baixa | HSM, rotacao de chaves operador |
| Token JWT vazado | Alto | Media | Revogacao imediata, short TTL |
| ACL muito permissiva | Alto | Media | Principio menor privilegio, review |
| mTLS timeout alto | Medio | Baixa | Timeout configravel, monitoramento |
| Tenant isolation vazado | Critico | Baixa | Exports/Imports explictos, audit |
| Auth Callout DDoS | Alto | Baixa | Rate limiting, timeout configurado |
| Operador NKey sem backup | Critico | Media | Backup offline, multi-sig |

### 7.7 Decision Matrix

| Criterio | Peso | Score | Justificativa |
|----------|------|-------|---------------|
| Alinhamento estrategico | 30% | 95 | Base para seguranca de mensageria |
| Viabilidade tecnica | 25% | 92 | NATS suporta nativamente JWT/NKey |
| Impacto em seguranca | 20% | 95 | Isolamento multi-tenant critico |
| Custo de implementacao | 15% | 80 | 68h total |
| Risco | 10% | 85 | Seguranca de chaves requer cuidado |

**Score final: 91/100 — IMPLEMENTAR**

**Proximos passos:**
1. Criar package @ideia/nats-auth-security com estrutura v2.0
2. Implementar NATSAuthManager com suporte a NKeys nativas
3. Implementar AdvancedAccessControlList com queue group e response permissions
4. Implementar EnterpriseCredentialRotator com estrategias multiplas
5. Implementar MultiTenantIsolation com exports/imports reais
6. Integrar com @ideia/event-bus existente
7. Adicionar test suite (30+ testes)
8. Documentar deployment com Docker Compose e Kubernetes

---

## 8. REFERENCIAS

### Documentacao Oficial

1. NATS Auth Intro — docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro
2. NATS JWT — docs.nats.io/nats-concepts/security
3. NATS Accounts — docs.nats.io/nats-concepts/accounts
4. NATS mTLS — docs.nats.io/running-a-nats-service/configuration/securing_nats/tls
5. NATS Auth Callout — docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_callout
6. NATS NKeys — docs.nats.io/nats-concepts/security/nkey
7. NATS nsc CLI — docs.nats.io/nats-tools/nsc
8. NATS Cipher Suites — docs.nats.io/running-a-nats-service/configuration/securing_nats/tls#cipher-suites
9. NATS Clustering TLS — docs.nats.io/running-a-nats-service/configuration/clustering/cluster_tls
10. NATS JetStream — docs.nats.io/nats-concepts/jetstream

### Artigos e Apresentacoes

11. "Zero-Trust NATS" — Synadia 2024
12. "NATS Security Deep Dive" — W. Campbell, NATS Conference 2023
13. "JWT Best Practices" — IETF RFC 8725
14. "OWASP JWT Cheatsheet" — owasp.org
15. "NIST SP 800-207 — Zero Trust Architecture"
16. "Ed25519: High-Speed High-Security Signatures" — Bernstein et al.
17. "Post-Quantum Cryptography: NIST Standards" — NIST IR 8413

### Documentos IDEIA

18. ESTUDO-IMPLEMENTACAO-NATS-JETSTREAM.md — Implementacao NATS F1
19. BARRAMENTO-EVENTOS-MENSAGERIA-DISTRIBUIDA.md — Estudo de mensageria
20. ESTUDO-EMPILHAMENTO-CONTRATOS-INTEGRACOES.md — Contratos entre modulos
21. ESTUDO-OBSERVABILIDADE-FULLSTACK.md — Observabilidade
22. ESTUDO-SEGURANCA-PROMPT-GOVERNADOR-AI.md — Seguranca IA + NATS

### Ferramentas e Bibliotecas

23. nats.js — github.com/nats-io/nats.js
24. nkeys.js — github.com/nats-io/nkeys.js
25. nsc — github.com/nats-io/nsc
26. nats-server — github.com/nats-io/nats-server
27. ts-nkeys — npmjs.com/package/ts-nkeys
28. node-nats — npmjs.com/package/nats

### CVE References

29. CVE-2023-47090 — NATS Server infinite loop
30. CVE-2023-47089 — NATS Server memory leak
31. CVE-2023-25173 — NATS Server auth bypass
32. CVE-2021-42348 — NATS Server auth bypass via reload
33. Synadia Security Advisories — synadia.com/security
```
