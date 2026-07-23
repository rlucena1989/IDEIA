# G4 — Schema Registry / Catálogo de Contratos

> **Tipo**: `structural-gap`  
> **Status**: ✅ `IMPLEMENTED` — Verificado em 2026-07-22 (como packages/schema-registry/ separado)  
> **Data**: 2026-07-15  
> **Metodologia**: Template Permanente de Análise (Fases 1-4)

---

## Fase 1 — Pesquisa e Fundamentação

### 1.1 Resumo Executivo

20+ schemas (interfaces, tipos, DTOs) são recriados independentemente entre os 23 pacotes do monorepo. Exemplos: `MemoryStore` tem 2 interfaces incompatíveis em lugares diferentes; tipos de evento são definidos ad-hoc em cada módulo. Um Schema Registry centralizado garante que todo contrato entre módulos tenha uma única fonte de verdade, com versionamento e validação automática.

**Decisão recomendada**: ✅ FAZER — Score 3.9, prioridade alta.

### 1.2 Pesquisa Acadêmica e de Mercado

- **Padrões**: Schema Registry (Kafka/Confluent), Contract-First Development, API-first, OpenAPI/AsyncAPI specs, JSON Schema, Protobuf.
- **Concorrentes**: Cursor usa um schema registry interno para tipos compartilhados entre agentes. Windsurf tem um catálogo de interfaces para plugins.
- **Open source**: `@apidevtools/json-schema-ref-parser`, `@sinclair/typebox` (runtime validators), `zod` (schema validation), `confluent-schema-registry`, `protobuf`.
- **Papers**: "Contract-First Development with OpenAPI" — SmartBear. "Schema on Read vs. Schema on Write" — Martin Kleppmann, "Designing Data-Intensive Applications".

### 1.3 Análise Técnica

**Arquitetura proposta**:
```
packages/contracts/ (já existe, expandir)
  ├── src/events/     ← todos os tipos de evento do Event Bus
  ├── src/jobs/       ← tipos de job do Task Queue
  ├── src/policies/   ← tipos de policy do Policy Engine
  ├── src/agents/     ← interfaces do Agent Runtime
  ├── src/commands/   ← schemas de comandos CLI
  ├── src/api/        ← DTOs REST (request/response)
  ├── src/common/     ← tipos base (User, Session, Project, etc.)
  └── validator.ts    ← runtime validator unificado (Zod/Ajv)
```

**Dependências**: `packages/contracts/` (já existe com 6 tipos-base). O registry adiciona:
- Catálogo pesquisável de schemas (nome, versão, módulo dono)
- Validação cross-schema (ex: schema A referencia schema B)
- Geração automática de tipos TypeScript a partir de schemas JSON

### 1.4 Riscos e Limitações

- **Adoption friction**: Módulos existentes precisam migrar — esforço alto para baixo ganho imediato (~20% cobertura inicial).
- **Versionamento**: Schemas mudam — breaking changes precisam de mecanismo de depreciação e migração.
- **Overhead**: Validar schemas em runtime tem custo — mitigado com validação condicional (dev-only no MVP).

---

## Fase 2 — Matriz de Viabilidade

| Dimensão | Peso | Nota | Pontos |
|----------|:----:|:----:|:------:|
| **Valor para IDE** | 3 | 4 | 12 |
| **Diferenciação** | 2 | 4 | 8 |
| **Sinergia c/ arquitetura** | 2 | 5 | 10 |
| **Custo-benefício** | 2 | 3 | 6 |
| **Maturidade** | 1 | 3 | 3 |

**Score = (12 + 8 + 10 + 6 + 3) / 10 = 3.9** ✅ FAZER

| Esforço | Semanas | Justificativa |
|:-------:|:-------:|---------------|
| **M** | 3-4 | Contracts já existe; registry é extensão + migração gradual |

---

## Fase 3 — Artefatos

### 3.1 TASK-IDE-17 — Schema Registry e Catálogo de Contratos

```markdown
# Tarefa — Schema Registry / Catálogo de Contratos

## ID: TASK-IDE-17 | Módulo: contracts | Tipo: refactor

## Objetivo: Criar schema registry com catálogo pesquisável, validação cross-schema e versionamento dentro de packages/contracts/.

## Dependências
- TASK-IDE-06 (Contract Types Adoption) — tipos-base já em uso

## Critérios de aceite
### Subtarefa 17.1 — Schema Registry Core
- [ ] `SchemaRegistry.register(schema)` com name + version + moduleOwner
- [ ] `SchemaRegistry.resolve('module:name@version')` → schema
- [ ] `SchemaRegistry.list()` com filtros (module, type)
- [ ] Validação de dependências cross-schema

### Subtarefa 17.2 — Catálogo de Schemas
- [ ] Schemas de evento (G1) registrados no registry
- [ ] Schemas de job (G2) registrados
- [ ] Schemas de policy (G3) registrados
- [ ] Schemas de API REST registrados
- [ ] Schemas de comando CLI registrados

### Subtarefa 17.3 — Runtime Validator
- [ ] `validate(schemaName, data)` usando Zod/Ajv
- [ ] Validação em modo dev-only (sem overhead em prod)
- [ ] Erro descritivo com path + expected + received

## Arquivos que PODEM ser alterados
- `packages/contracts/src/` (novas subpastas + validator)
- `packages/policy-engine/src/` (migrar para schemas registrados)

## Arquivos que NÃO devem ser alterados
- `packages/adapter-*` (fora do escopo)
- `packages/web-ui/` (muda depois)

## Riscos
- Migração gradual: módulos antigos ignoram registry até v2
- Breaking changes: versionamento semântico (major.minor.patch) obrigatório

## Verificação
- [ ] Testes: register, resolve, validate, cross-schema refs
- [ ] Teste de integração: schema usado em 3 módulos diferentes
```

### 3.2 Contratos

**Contrato: contracts → todos os módulos**
- `SchemaRegistry` é o único ponto de definição de tipos compartilhados
- Módulos importam schemas de `@ai-devkit/contracts` em vez de redefinir

### 3.3 CHANGELOG Entry

```markdown
## 2026-07-15 — G4: Schema Registry / Catálogo de Contratos

### Arquivos novos
| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | `docs/ESTUDOS/G4-SCHEMA-REGISTRY/README.md` | Análise completa do gap estrutural |
```

---

## Fase 4 — Ciclo de Vida

```
[CRIAÇÃO] docs/ESTUDOS/G4-SCHEMA-REGISTRY/README.md
  │
  ├──> PESQUISA (Fase 1) → 20+ schemas duplicados, contracts existe
  │
  ├──> ANÁLISE (Fase 2) → Score 3.9 — ✅ FAZER
  │     │
  │     └──> GERA TAREFA → TASK-IDE-17
  │           │
  │           └──> IMPLEMENTA → Registry + catálogo + validator
  │
  └──> REVISÃO PERIÓDICA → a cada 3 meses (próximo: 2026-10-15)
```

---

## Integração com Código (2026-07-22)

**Status:** ✅ **Implementado** (F6 — Segurança e Governança)

Centralização de schemas implementada na **Fase 6**:

| Componente | Package | Status |
|-----------|---------|--------|
| Schema Registry | `packages/schema-registry/` | Registro centralizado + validação |
| Contratos Zod | 13 adapters | Schemas com validação runtime |
| Contract Testing | `scripts/contract-test/` | Pact CDC |
| DTO Validation | `packages/cli/src/contracts/` | `Contract.pre()` em todos os DTOs |

---

## Referências

- `packages/contracts/` — pacote expandido
- Confluent Schema Registry — referência para versionamento
- Zod — runtime validation library
- "Designing Data-Intensive Applications" — Martin Kleppmann (Schema on Read/Write)
- OpenAPI 3.1 Spec — referência para schemas REST
