# API Reference

## CLI Commands

A CLI da IDEIA expõe 51 comandos organizados por domínio:

### Scaffold & Init

| Comando | Descrição |
|---|---|
| `ideia init <name>` | Cria novo projeto IDEIA |
| `ideia generate <type> [name]` | Gera scaffold (api, lib, cli, plugin, adapter) |
| `ideia generate adapter <lang>` | Gera adapter para linguagem (go, rust, python, java, kotlin, swift, php, ruby, elixir, haskell, zig, scala, dart, nestjs, fastapi) |

### Quality & Audit

| Comando | Descrição |
|---|---|
| `ideia audit [--ci]` | Auditoria completa do projeto |
| `ideia audit verify` | Verifica integridade do audit trail |
| `ideia verify` | Verifica qualidade (lint, types, testes, cobertura) |
| `ideia coverage` | Relatório de cobertura |
| `ideia drift` | Detecta drift entre docs e código |

### Security

| Comando | Descrição |
|---|---|
| `ideia policy list` | Lista políticas de segurança |
| `ideia policy check <action>` | Verifica se ação é permitida |
| `ideia policy allow <action>` | Permite ação (nível dev) |
| `ideia policy request-approve <action>` | Solicita aprovação (nível tech-lead) |
| `ideia compliance run` | Executa checks de compliance (LGPD/HIPAA/GDPR/SOC2) |
| `ideia compliance report` | Gera relatório de compliance |
| `ideia pentest` | Executa pentest automatizado (7 categorias) |
| `ideia sbom` | Gera SBOM CycloneDX 1.5 |

### Documentation

| Comando | Descrição |
|---|---|
| `ideia docs generate` | Gera documentação automática |
| `ideia docs enforce` | Verifica integridade documental |
| `ideia docs gap` | Detecta gaps na documentação |
| `ideia report` | Gera relatório do projeto |

### Workflow & Agents

| Comando | Descrição |
|---|---|
| `ideia workflow run <name>` | Executa workflow |
| `ideia workflow list` | Lista workflows disponíveis |
| `ideia agents list` | Lista agentes disponíveis |
| `ideia agents run <task>` | Executa tarefa com agente |

### Memory & Evolution

| Comando | Descrição |
|---|---|
| `ideia memory store <key> <value>` | Armazena contexto entre sessões |
| `ideia memory get <key>` | Recupera contexto |
| `ideia memory search <query>` | Busca na memória persistente |
| `ideia memory tag <key> <tag>` | Adiciona tag |
| `ideia memory by-tag <tag>` | Lista por tag |
| `ideia evolution run` | Executa ciclo de evolução adaptativa |
| `ideia optimize` | Otimiza performance e recursos |

### System

| Comando | Descrição |
|---|---|
| `ideia start` | Inicia a IDE |
| `ideia doctor` | Diagnóstico do sistema |
| `ideia config get/set <key> <value>` | Gerencia configuração |
| `ideia cache clean` | Limpa cache |
| `ideia context` | Contexto do projeto |
| `ideia status` | Status dos providers |

## Programmatic API (Node.js)

```typescript
import { createIDEIA } from '@ideia/core';

const ideia = createIDEIA({
  llm: { provider: 'ollama', model: 'llama3' },
  policy: { level: 2 },
});

// Executar prompt
const result = await ideia.execute('Crie um CRUD de usuários');

// Verificar política
await ideia.policy.check('shell:execute', { command: 'npm test' });

// Audit trail
await ideia.audit.log('user:create', { userId: '123' }, req.user);
const chain = await ideia.audit.verifyChain();
```

## Event Bus API (NATS)

```typescript
import { NatsConnection } from '@ideia/event-bus';

const nc = new NatsConnection({ url: 'nats://localhost:4222' });
await nc.connect();

// Pub/Sub
await nc.publish('task.created', { id: '123' });
nc.subscribe('task.created', (msg) => console.log(msg));

// Request-Reply
const response = await nc.request('agent.run', { task: 'review' }, { timeout: 30000 });

// KV Store
await nc.kvPut('config:theme', 'dark');
const theme = await nc.kvGet('config:theme');
```

## Policy Engine

```typescript
import { PolicyEngine } from '@ideia/policy-engine';

const engine = new PolicyEngine({ level: 2 });
const result = await engine.evaluate('file:write', {
  path: '/project/src/main.ts',
  content: '...',
});

if (result.allowed) {
  // Executar ação
} else {
  console.log(`Bloqueado: ${result.reason}`);
  // Solicitar aprovação: result.approvalRequired
}
```

## More

Consulte a documentação de cada pacote em `packages/*/README.md` para APIs específicas.
