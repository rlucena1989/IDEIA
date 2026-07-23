# Document Priority — Hierarquia de Prioridade Documental

## Regra de Precedência

Em caso de divergência entre documentos, a precedência segue esta ordem:

1. **Arquivo de tarefa atual** (`current-task.md`)
2. **Documento de procedimento específico** (ex: `coverage-autonomy-procedure.md`)
3. **Backlog** (`backlog.md`)
4. **Roadmap** (`FUNCIONALIDADES_V2_ROADMAP.md`)
5. **Master Plan** (`master-plan.md`)
6. **Catálogo e visão ampla** (`AI-DEVKIT-CATALOGO-COMPLETO.md`)

## Regra Prática

| Quando precisar de...    | Consulte                          |
| ------------------------ | --------------------------------- |
| Planejamento macro       | `master-plan.md`                  |
| Execução imediata        | `current-task.md`                 |
| Fila de trabalho         | `backlog.md`                      |
| Ciclo autônomo de testes | `coverage-autonomy-procedure.md`  |
| Avaliação de testes      | `teste-autonomy.md`               |
| Roadmap funcional        | `FUNCIONALIDADES_V2_ROADMAP.md`   |
| Métricas de sucesso      | `FUNCIONALIDADES_V2_METRICS.md`   |
| Relação entre módulos    | `FUNCIONALIDADES_V2_MATRIX.md`    |
| Melhorias e propostas    | `FUNCIONALIDADES_V2_PROPOSALS.md` |
| Visão de longo prazo     | `future-plans.md`                 |
| Catálogo geral           | `AI-DEVKIT-CATALOGO-COMPLETO.md`  |
| Regras arquiteturais     | `.ai/laws.yaml`                   |

## Prioridade por Categoria (valores numéricos)

| Categoria   | Faixa de Prioridade |
| ----------- | ------------------- |
| `task`      | 100                 |
| `policy`    | 90-100              |
| `procedure` | 85-95               |
| `plan`      | 80-90               |
| `roadmap`   | 70-80               |
| `metric`    | 45-75               |
| `reference` | 50-70               |
