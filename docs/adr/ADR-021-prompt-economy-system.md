# ADR-021: Prompt Economy System

- **Status:** Implementado
- **Data:** 2026-07-24 (convertido de 0008-prompt-economy para ADR-XXX)
- **Decisão:** Sistema de otimizacao de tokens com compressor, budget, router, cache

## Contexto
Cada prompt enviado para LLM consome tokens e custos. Otimizacao e essencial para escalar.

## Decisao
- ContextCompressor: compressao inteligente de contexto
- BudgetTracker: rastreamento de orcamento de tokens por sessao/projeto
- ComplexityRouter: roteamento baseado em complexidade da tarefa
- LLMCache: cache de respostas para consultas repetidas
- EarlyExitDecider: decisoes simples sem LLM
- 38 testes passando
