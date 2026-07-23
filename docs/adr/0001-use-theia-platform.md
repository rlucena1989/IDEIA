# ADR 0001: Theia Platform como Base da IDE

**Status:** Accepted  
**Date:** 2026-07-20  
**Deciders:** Equipe IDEIA

## Context

Precisávamos de uma plataforma de IDE extensível que suportasse:

- Múltiplos protocolos (LSP, DAP)
- Plugins ricos (widgets, serviços, contribuições)
- Cloud e desktop
- AI integration nativa (Theia AI)

## Decision

Usar Theia Platform 1.73 como base, com Monaco Editor, Inversify DI e sistema de plugins.

## Consequences

- **Positivo:** LSP/DAP nativos, ecossistema OpenVSX, AI-ready
- **Negativo:** Bundle grande (~15MB), curva de aprendizado do Inversify
- **Mitigação:** Code splitting planejado para Fase 7
