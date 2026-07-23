# Log de Decisão de Versão — v2.1 e v2.2

## Formato

```
YYYY-MM-DD | Feature | Decisão | Motivo
```

---

## Decisões

```
2026-07-13 | CLI Consolidation (F04)       | v2.1    | Estabiliza base. Risk=2, baixo esforço (5).
2026-07-13 | Governance Docs (registry)    | v2.1    | Fonte de verdade central. Risk=1.
2026-07-13 | Document Resolver             | v2.1    | Resolução automática de documento. Risk=2.
2026-07-13 | Document Policy               | v2.1    | Políticas de execução documentadas. Risk=1.
2026-07-13 | Document Audit                | v2.1    | Detecção de conflitos. Risk=2.
2026-07-13 | Planning System (F02)         | v2.1    | TaskSpec + ExecutionPlan. Risk=2.
2026-07-13 | Task Validator                | v2.1    | Bloqueia tarefas incompletas. Risk=2.
2026-07-13 | Coverage Reader               | v2.1    | Pré-requisito de cobertura. Risk=1.
2026-07-13 | Gap Prioritizer               | v2.2    | Autonomia de priorização. Risk=2.
2026-07-13 | Test Quality Classifier       | v2.2    | Classificação autônoma. Risk=2.
2026-07-13 | Test Repair Loop              | v2.2    | Ciclo autônomo. Risk=4 (aceitável).
2026-07-13 | Autonomy Status Persistence   | v2.1    | Base para autonomia futura. Risk=1.
2026-07-13 | Extension Cockpit (F05)       | v2.1    | Interface operacional. Risk=3.
2026-07-13 | Extension Backlog View        | v2.1    | Backlog visível. Risk=1.
2026-07-13 | Extension Metrics View        | v2.1    | Métricas visíveis. Risk=1.
2026-07-13 | Security Baseline             | v2.1    | Segurança básica. Risk=3.
2026-07-13 | Compliance Mapping            | v2.1    | Mapeamento regulatório. Risk=4.
2026-07-13 | Contract Validation           | v2.1    | Contratos first. Risk=2.
2026-07-13 | Scorecard System              | v2.1    | Maturidade. Risk=1.
2026-07-13 | Audit System                  | v2.1    | Rastreabilidade. Risk=1.
2026-07-13 | Observability                 | v2.1    | Métricas e tracing. Risk=3.
2026-07-13 | IO Isolation (F04)            | v2.1    | Testabilidade. Risk=1.
2026-07-13 | Code Generators (31)          | v2.1    | Geração de código. Risk=2.
2026-07-13 | Adapters (13 langs)           | v2.1    | Suporte multilíngue. Risk=3.
2026-07-13 | Pattern Learning              | v2.2    | Autonomia de aprendizado. Risk=4.
2026-07-13 | Context Store                 | v2.1    | Estado de contexto. Risk=2.
2026-07-13 | Multi-agent Platform          | post-v2.2 | Risk=8, dep=5. Fora de escopo agora.
2026-07-13 | Plugin System                 | post-v2.2 | Risk=5, depende de base madura.
2026-07-13 | RAG Engine                    | post-v2.2 | Risk=5, esforço alto.
2026-07-13 | AI Engineer                   | post-v2.2 | Risk=7, escopo muito amplo.
2026-07-13 | Local AI Engine               | post-v2.2 | Risk=6, esforço 8.
2026-07-13 | Cognitive Coprocessor         | post-v2.2 | Risk=6, depende de IA madura.
2026-07-13 | Release System                | v2.1    | Releases gerenciáveis. Risk=2.
2026-07-13 | Runtime Hooks                 | v2.1    | Hooks de ciclo de vida. Risk=4.
2026-07-13 | MCP Server                    | v2.2    | Integração com IDEs. Risk=4.
```

## Resumo

| Período | Target    | Features | Critério usado                       |
| ------- | --------- | -------- | ------------------------------------ |
| Agora   | v2.1      | 24       | `stabilizesBase && risk <= 4`        |
| Próximo | v2.2      | 5        | `boostsAutonomy && risk <= 6`        |
| Futuro  | post-v2.2 | 6        | Alto risco ou baixo retorno imediato |
