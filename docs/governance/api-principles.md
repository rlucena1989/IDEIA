# Princípios de API — v3 Platform

---

## 1. Contratos primeiro

Toda capability da plataforma **deve ter contrato definido** antes da implementação.
O contrato inclui: entrada, saída, erros, persistência, autorização.

```
❌ Antes (v2):
  function handleCoverageAudit() { ... }  // sem tipo de entrada/saída explícito

✅ Depois (v3):
  POST /api/v1/autonomy/audit
  Request:  { scope?: string; json?: boolean }
  Response: { ok: boolean; data: CoverageAuditOutput; meta: ResponseMeta }
```

---

## 2. Resposta padronizada

Toda resposta usa envelope `ApiResponse<T>`:

```typescript
{
  ok: true,
  data: { ... },
  meta: {
    timestamp: "2026-07-13T00:00:00Z",
    version: "3.0.0",
    duration: 145  // ms
  }
}
```

Em caso de erro:

```typescript
{
  ok: false,
  error: {
    code: "DOCUMENT_NOT_FOUND",
    message: "Nenhum documento encontrado para o tipo 'unknown-task'",
    details: { taskType: "unknown-task", availableTypes: ["execution", "tests"] }
  },
  meta: { timestamp: "...", version: "3.0.0", duration: 12 }
}
```

---

## 3. Versionamento semântico

| Componente  | Versão       | Estratégia                        |
| ----------- | ------------ | --------------------------------- |
| API REST    | v1, v2, etc. | URL prefix (`/api/v1/...`)        |
| Contratos   | SemVer       | Breaking change = nova versão     |
| SDK Cliente | SemVer       | Matching API version              |
| Plugin SDK  | SemVer       | Breaking change = migração guiada |

---

## 4. Estado explícito

APIs que lidam com estado devem:

- Declarar no contrato se há persistência
- Retornar estado atual em cada resposta
- Suportar idempotência (mesma requisição = mesmo resultado)

```
PUT  /api/v1/planning/plans/:id  → idempotente
POST /api/v1/autonomy/cycle      → não idempotente (cria novo ciclo)
```

---

## 5. Paginação

Listas usam paginação cursor-based:

```
Request:  GET /api/v1/governance/sources?cursor=abc&limit=20
Response: {
  data: [ ... ],
  meta: {
    nextCursor: "def",
    hasMore: true,
    total: 150
  }
}
```

---

## 6. Tratamento de erros

Códigos de erro padronizados:

| Código               | Significado                     | HTTP Status |
| -------------------- | ------------------------------- | ----------- |
| `INVALID_INPUT`      | Entrada inválida                | 400         |
| `NOT_FOUND`          | Recurso não encontrado          | 404         |
| `BLOCKED`            | Operação bloqueada por política | 422         |
| `CONFLICT`           | Conflito detectado              | 409         |
| `RATE_LIMITED`       | Muitas requisições              | 429         |
| `INTERNAL_ERROR`     | Erro interno                    | 500         |
| `DEPENDENCY_FAILURE` | Serviço dependente falhou       | 503         |

---

## 7. Observabilidade

Toda requisição deve:

- Gerar trace ID (`x-trace-id` header)
- Registrar duração no audit log
- Retornar `meta.duration` na resposta
- Expor métricas no endpoint `/api/v1/metrics`

---

## 8. Compatibilidade retroativa

| Prática                                          | Obrigatório?  |
| ------------------------------------------------ | ------------- |
| Campos novos em respostas são opcionais          | Sim           |
| Campos removidos são deprecated 2 releases antes | Sim           |
| Headers antigos ainda funcionam                  | Sim (6 meses) |
| Endpoints antigos redirecionam                   | Sim (301)     |

---

## 9. Rate limiting

| Cliente              | Limite       | Janela |
| -------------------- | ------------ | ------ |
| CLI local            | 1000 req/min | 1 min  |
| VS Code Extension    | 300 req/min  | 1 min  |
| Web UI               | 100 req/min  | 1 min  |
| API Key (automation) | 5000 req/min | 1 min  |

---

## 10. Autenticação (futuro)

Para v3.0, autenticação é opcional (modo single-user local).
Para v3.1+, será obrigatório:

- **API Key** para automação
- **JWT** para usuários
- **OAuth2** para integração com GitHub/GitLab

```
Request:
  Authorization: Bearer <api-key>
  x-trace-id: <uuid>
  Content-Type: application/json
```
