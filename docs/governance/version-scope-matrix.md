# Matriz de Escopo por Versão

## v2.1 — Estabilização (24 features)

```
Módulo            Features                        Esforço Total
──────────────────────────────────────────────────────────────
CLI               CLI Consolidation (F04)         5
                  IO Isolation (F04)              2
                  ─────────────────────           7

Governance        Governance Docs                 3
                  Document Resolver               4
                  Document Policy                 3
                  Document Audit                  4
                  ─────────────────────           14

Planning          Planning System (F02)           5
                  Task Validator                  4
                  ─────────────────────           9

Coverage          Coverage Reader                 3
                  Autonomy Status Persistence     2
                  ─────────────────────           5

Extension         Cockpit (F05)                   6
                  Backlog View                    3
                  Metrics View                    3
                  ─────────────────────           12

Quality           Audit System                    4
                  Scorecard System                4
                  Contract Validation             4
                  Security Baseline               5
                  Compliance Mapping              5
                  ─────────────────────           22

Infrastructure    Context Store                   4
                  Observability                   5
                  Runtime Hooks                   4
                  Release System                  5
                  ─────────────────────           18

Legacy            Code Generators (31)            8
                  Adapters (13 langs)             8
                  ─────────────────────           16

Total                                             ~103
```

## v2.2 — Autonomia (5 features)

```
Módulo            Features                        Esforço Total
──────────────────────────────────────────────────────────────
Coverage          Gap Prioritizer                 4
                  Test Quality Classifier         3
                  Test Repair Loop                6
                  ─────────────────────           13

Learning          Pattern Learning                5
                  ─────────────────────           5

Integration       MCP Server                      5
                  ─────────────────────           5

Total                                             ~23
```

## post-v2.2 (6 features — não implementar agora)

```
Módulo            Features                        Esforço Total
──────────────────────────────────────────────────────────────
Platform          Multi-agent Platform            9
                  Plugin System                   6
                  ─────────────────────           15

AI                RAG Engine                      7
                  AI Engineer                     9
                  Local AI Engine                 8
                  Cognitive Coprocessor           7
                  ─────────────────────           31

Total                                             ~46
```

## Dependências entre versões

```
v2.1 ◄───────────────────────────────── v2.2
  ├── Coverage Reader ◄───────────────── Gap Prioritizer
  ├── Autonomy Status Persistence ◄───── Test Quality Classifier
  ├── CLI Consolidation ◄─────────────── Test Repair Loop
  └── Scorecard System ◄──────────────── Pattern Learning

v2.2 ◄───────────────────────────── post-v2.2
  ├── Gap Prioritizer ◄────────────── Multi-agent Platform
  ├── Pattern Learning ◄───────────── RAG Engine
  └── MCP Server ◄─────────────────── Plugin System
```

## Riscos Identificados

| Risco                              | Severidade | Mitigação                              |
| ---------------------------------- | ---------- | -------------------------------------- |
| v2.1 escopo grande (24 features)   | Média      | Priorizar por score; entregar em ondas |
| Adapters com esforço 8 mas score 3 | Baixa      | Não melhorar; manter como está         |
| Repair loop pode danificar testes  | Alta       | Backup + rollback automático           |
| Multi-agent Platform adiada        | Média      | Decisão consciente; v2.2 primeiro      |
| Dependência entre v2.1 → v2.2      | Baixa      | Planejamento sequencial garante        |
