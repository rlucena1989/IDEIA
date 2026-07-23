# AI Devkit — Optimizer Layer

## Visão geral

A camada `optimizer` adiciona inteligência de decisão ao `ai-devkit` para reduzir custo, tokens, latência e retrabalho.

Ela atua antes da geração, antes da orquestração e antes da escrita, decidindo:

- se a IA realmente precisa ser usada
- qual o menor contexto necessário
- qual agente deve atuar
- se o resultado pode ser patch mínimo
- qual o risco da alteração
- qual a qualidade do resultado

## Objetivo

A meta desta camada é otimizar o uso do `ai-devkit` em três dimensões:

1. **Economia** — menos tokens, menos chamadas, menos contexto, menos reprocessamento
2. **Velocidade** — menos etapas, menos agentes, menos geração desnecessária
3. **Qualidade** — maior aderência ao projeto, menor risco de regressão, maior reaproveitamento

## Componentes

- `Impact Router` — Classifica a tarefa e escolhe o pipeline mínimo
- `Context Minimizer` — Seleciona só o contexto estritamente necessário
- `Patch Engine` — IA trabalha em diff, não em reescrita integral
- `Repository Memory` — Memória local de padrões, decisões e soluções recorrentes
- `Quality Scoring` — Avalia se a mudança é boa estruturalmente
- `Risk Scoring` — Avalia quão perigosa a mudança é

## Fluxo recomendado

1. classificar a tarefa
2. calcular risco
3. minimizar contexto
4. consultar memória do repositório
5. decidir entre patch, scaffold ou execução por agente
6. validar com scanners
7. avaliar qualidade
8. aprovar ou bloquear
