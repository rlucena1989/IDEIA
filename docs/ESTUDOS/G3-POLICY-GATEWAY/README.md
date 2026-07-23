# G3 — Policy Gateway Centralizado

> **Tipo**: `structural-gap`  
> **Status**: ✅ `IMPLEMENTED` — Verificado em 2026-07-22  
> **Data**: 2026-07-15  
> **Metodologia**: Template Permanente de Análise (Fases 1-4)

---

## Fase 1 — Pesquisa e Fundamentação

### 1.1 Resumo Executivo

O `packages/policy-engine/` existe e funciona, mas cada módulo (agent-runtime, api-router, chat-bridge, CLI commands) o chama individualmente com implementações ad-hoc. Não há um gateway centralizado que unifique autorização, rate limiting, validação de entrada e auditoria em um único ponto. Um `packages/policy-gateway/` parcial já existe como scaffold. A centralização elimina duplicação de lógica, garante que toda operação passa pelas mesmas regras e facilita auditoria.

**Decisão recomendada**: ✅ FAZER — Score 4.3, prioridade máxima.

### 1.2 Pesquisa Acadêmica e de Mercado

- **Padrões**: API Gateway pattern, Policy Enforcement Point (PEP) / Policy Decision Point (PDP) do XACML, Sidecar pattern, Middleware Chain.
- **Concorrentes**: GitHub Copilot Enterprise tem um policy gateway centralizado para governança corporativa. VS Code Extension API tem `vscode.lm` com policy checks. Cursor não expõe policy gateway publicamente.
- **Open source**: `express-gateway`, `open-policy-agent` (OPA/Rego), `casbin` (policy enforcement), `authorization-api` (AWS).
- **Papers**: "XACML Policy Language" — OASIS Standard. "Policy-Based Access Control" (PBAC) — NIST.

### 1.3 Análise Técnica

**Arquitetura proposta**:
```
Request → PolicyGateway.evaluate(context)
  ├── 1. Authentication (quem é o usuário)
  ├── 2. Authorization (pode fazer a ação?)
  ├── 3. Rate Limit (não excedeu quota?)
  ├── 4. Input Validation (payload é válido?)
  ├── 5. Resource Policy (regras específicas do recurso)
  ├── 6. Audit Trail (registra decisão)
  └── Result: { allowed: boolean, decision: 'auto'|'ask'|'block', reason: string }
```

**Dependências**: `packages/policy-engine/` (motor de classificação), `packages/event-bus/` (G1, para emitir decisões), `packages/audit-trail/` (log de decisões).

### 1.4 Riscos e Limitações

- **Latência**: Múltiplas verificações encadeadas — mitigação com cache de decisões (TTL configurável).
- **Complexidade**: Muitas regras tornam o gateway difícil de gerenciar — versionamento de policies + testes automatizados.
- **Single point of failure**: Gateway derruba e nada funciona — fallback mode (permit all) em crash detection.

---

## Fase 2 — Matriz de Viabilidade

| Dimensão | Peso | Nota | Pontos |
|----------|:----:|:----:|:------:|
| **Valor para IDE** | 3 | 5 | 15 |
| **Diferenciação** | 2 | 3 | 6 |
| **Sinergia c/ arquitetura** | 2 | 5 | 10 |
| **Custo-benefício** | 2 | 4 | 8 |
| **Maturidade** | 1 | 4 | 4 |

**Score = (15 + 6 + 10 + 8 + 4) / 10 = 4.3** ✅ FAZER

| Esforço | Semanas | Justificativa |
|:-------:|:-------:|---------------|
| **M** | 3-4 | Policy Engine existe, gateway é wrapper; depende de G1 |

---

## Fase 3 — Artefatos

### 3.1 TASK-IDE-16 — Policy Gateway Centralizado

```markdown
# Tarefa — Policy Gateway Centralizado

## ID: TASK-IDE-16 | Módulo: policy-gateway | Tipo: feature

## Objetivo: Implementar gateway centralizado que unifica autorização, rate limiting, validação e auditoria em middleware chain.

## Dependências
- TASK-IDE-14 (Event Bus) — emitir decisões de policy
- `packages/policy-engine/` — motor de classificação existente

## Critérios de aceite
### Subtarefa 16.1 — Core Gateway
- [ ] `PolicyGateway.evaluate(context)` executa chain completa
- [ ] Chain configurável: plugins podem ser inseridos/removidos
- [ ] Resultado tipado: `PolicyDecision { allowed, decision, reason, context }`

### Subtarefa 16.2 — Middleware Chain
- [ ] AuthMiddleware (valida token JWT)
- [ ] RateLimitMiddleware (token bucket ou sliding window)
- [ ] PolicyMiddleware (consulta policy-engine)
- [ ] AuditMiddleware (registra no audit-trail)

### Subtarefa 16.3 — Migração dos clientes
- [ ] `api-router` usa PolicyGateway em vez de chamar policy-engine diretamente
- [ ] `agent-runtime` usa PolicyGateway
- [ ] `chat-bridge` usa PolicyGateway para tool calls

## Arquivos que PODEM ser alterados
- `packages/policy-gateway/src/` (core, middleware chain)
- `packages/cli/src/ide/api-router.ts` (substituir chamadas diretas)
- `packages/agent-runtime/src/` (substituir chamadas diretas)

## Riscos
- Performance: chain inteira para cada request — cache de decisões frequentes
- Regressão: módulos podem se comportar diferente com gateway — testes A/B

## Verificação
- [ ] Testes de cada middleware individualmente
- [ ] Teste de integração: chain completa simulando auto/ask/block
- [ ] Benchmark: latência da chain vs chamada direta
```

### 3.2 Contratos

**Contrato: policy-gateway → policy-engine**
- `policyEngine.evaluatePolicy(resource, action, context)` → `PolicyVerdict`
- Gateway adiciona contexto enriquecido (user, rate, validation) antes de chamar

**Contrato: policy-gateway → audit-trail**
- `auditTrail.append('policy:decision', { gatewayId, decision, context })`
- Cada decisão do gateway é registrada automaticamente

### 3.3 CHANGELOG Entry

```markdown
## 2026-07-15 — G3: Policy Gateway Centralizado

### Arquivos novos
| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | `docs/ESTUDOS/G3-POLICY-GATEWAY/README.md` | Análise completa do gap estrutural |
```

---

## Fase 4 — Ciclo de Vida

```
[CRIAÇÃO] docs/ESTUDOS/G3-POLICY-GATEWAY/README.md
  │
  ├──> PESQUISA (Fase 1) → Policy Engine existe; gateway é wrapper
  │
  ├──> ANÁLISE (Fase 2) → Score 4.3 — ✅ FAZER (prioridade máxima)
  │     │
  │     └──> GERA TAREFA → TASK-IDE-16
  │           │
  │           └──> IMPLEMENTA → Gateway + 3 clientes migrados
  │
  └──> REVISÃO PERIÓDICA → a cada 3 meses (próximo: 2026-10-15)
```

---

## Integração com Código (2026-07-22)

**Status:** ✅ **Implementado** (F6 — Segurança e Governança)

Este gap foi resolvido na **Fase 6 (Segurança e Governança)**:

| Componente | Package | Status |
|-----------|---------|--------|
| Policy Engine | `packages/policy-engine/` | 27 patterns (Linux + Windows + PowerShell) |
| Approval Flow | `packages/cli/src/approval/` | 3 níveis (dev → tech-lead → security) |
| Output Validation | `packages/cli/src/utils/output-validator.ts` | 31 regras PII + 25 secret patterns |
| Audit Trail | `packages/audit-trail/` | SHA-256 chain + verifyChain() |
| Sandbox | `packages/terminal-sandbox/` | `vm.Script` com contexto isolado |

---

## Referências

- `packages/policy-engine/` — motor completo (27 patterns)
- `packages/policy-gateway/` — gateway integrado
- XACML — OASIS Standard (Policy Enforcement/Decision Point)
- OPA (Open Policy Agent) — referência para policies declarativas
- "Policy-Based Access Control" — NIST Special Publication 800-162
