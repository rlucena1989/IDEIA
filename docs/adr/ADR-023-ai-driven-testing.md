# ADR-023: AI-Driven Testing Architecture

- **Status:** Aceito (pendente implementacao)
- **Data:** 2026-07-24
- **Referencia:** S66 (AI-Driven Testing)

## Contexto
Testes de software consomem ~35% do tempo de desenvolvimento. Manter suites de teste atualizadas e garantir cobertura de mutacao sao desafios continuos que podem ser enderecados por IA.

## Decisao
1. Criar `packages/ai-testing` com 3 modulos principais:
   - **ContextAnalyzer**: AST parser + dependency graph + type info
   - **TestPlanner**: Classifica tipo de teste (unit/integration/e2e) por criterios
   - **TestGenerator**: Gera testes via LLM com prompt enriquecido
   - **TestValidator**: Compila + executa + verifica cobertura
2. Integrar com `test-quality-classifier.ts` e `test-repair-loop.ts` existentes
3. Usar `prompt-economy` para budget de tokens
4. Mutation gap analysis via StrykerJS

## Consequencias
- Reducao estimada de ~60% no tempo de escrita de testes
- Mutation score de ~45% para ~75%
- 4 modulos, ~9 semanas de implementacao
