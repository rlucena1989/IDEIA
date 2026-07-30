# ADR-024: Cost Optimization & FinOps Framework

- **Status:** Aceito (pendente implementacao)
- **Data:** 2026-07-24
- **Referencia:** S67 (Cost Optimization & FinOps)

## Contexto
Custos de operacao (LLM APIs, cloud infra, CI/CD) crescem linearmente com uso e exponencialmente com automacao multiagente. Sem FinOps, projetos em N3/N4 tornam-se inviaveis economicamente.

## Decisao
1. Extender `@ideia/prompt-economy/BudgetTracker` com rastreamento de custo real
2. Adicionar `CostAwareRouter` em `@ideia/llm-provider` para selecao de modelo por budget
3. Criar `FinOpsEngine` em `@ideia/economic-control` com:
   - `CostCollector`: coleta dados de LLM, cloud, CI/CD
   - `BudgetTracker`: monitora budget vs gasto real
   - `CostOptimizer`: recomenda acoes de otimizacao
4. Adicionar Cost Dashboard como Theia widget

## Consequencias
- Economia estimada de 30-50% em custos LLM
- Visibilidade de custos por projeto/modelo/time
- Alertas de estouro de budget
- ~8 semanas de implementacao
