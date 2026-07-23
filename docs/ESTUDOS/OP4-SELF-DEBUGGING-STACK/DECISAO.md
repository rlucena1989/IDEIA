# DECISÃO: OP4 — Self-Debugging Stack

**Data:** 2026-07-22
**Score:** 3.3 (AGENDAR)
**Decisão:** ADIADO — Deferido conforme recomendação do estudo

## Motivação
O estudo OP4 propõe um pacote unificado de auto-debug (DAP + Multi-LSP + AI Debug Agent). Score 3.3 indica prioridade média. O estudo recomenda "revisar quando DAP tiver adoção mais ampla."

## Status Atual
- DebugPanel funcional no Theia Plugin (`packages/ideia-plugin/src/browser/DebugPanel.tsx`)
- DAP client implementado (`packages/ideia-plugin/src/browser/dap-client.ts`)
- LSP com 8 providers em 5 linguagens

## Próximo Review
- Data sugerida: 2026-10-15
- Gatilho para reavaliação: adoção do DAP em >3 projetos reais
