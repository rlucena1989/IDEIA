# ADR-025: AI-Assisted Code Debugging Architecture

- **Status:** Aceito (pendente implementacao)
- **Data:** 2026-07-24
- **Referencia:** S68 (AI-Assisted Code Debugging)

## Contexto
Debugging consome ~50% do tempo de desenvolvimento. Ferramentas atuais (DAP, LSP) oferecem suporte estrutural mas nao assistencia inteligente para analise de erros, root cause identification e auto-fix.

## Decisao
1. Criar `packages/ai-debug` com:
   - **ErrorNormalizer**: parsing + enrichment + classificacao de erros
   - **RCAEngine**: analise multi-estrategia (AST, dataflow, git blame, LLM)
   - **FixSuggestionEngine**: geracao de fixes por pattern, LLM e transform
   - **FixValidator**: type check + tests + regression detection
2. Integrar com DAP existente (DebugPanel, breakpoints, stack)
3. Adicionar comandos REPL: `/explain`, `/fix`, `/rootcause`, `/trace`
4. Bridge com S63 (Agent Debugger) para debug agente→codigo

## Consequencias
- Reducao estimada de ~40% no tempo de debugging
- Root cause identification automatizada
- Sugestoes de fix com validacao
- ~8 semanas de implementacao
