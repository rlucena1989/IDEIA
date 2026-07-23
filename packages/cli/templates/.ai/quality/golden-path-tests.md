# Golden Path Tests

Testes que cobrem os fluxos mais críticos do usuário — se estes falharem,
o produto está quebrado para o caso de uso principal.

## Golden Paths definidos para o próprio AI-DevKit

1. **Instalação limpa → primeiro projeto funcional**

   ```bash
   bash install.sh
   ai-devkit init . --flavor nestjs
   ai-devkit status
   ```

   Critério: `status` retorna 100/100.

2. **Ciclo completo de verificação**

   ```bash
   ai-devkit verify
   ai-devkit audit
   ai-devkit prove
   ```

   Critério: os 3 comandos são consistentes entre si (nenhum reporta sucesso
   quando outro reporta falha para o mesmo problema).

3. **Preservação de trabalho humano**
   ```bash
   # editar .ai/context/ai-handoff.md manualmente
   ai-devkit init . --flavor nestjs   # sem --force
   ```
   Critério: edição manual preservada.

## Status (auditoria 05/07/2026)

- Golden Path 1: ✅ comprovado.
- Golden Path 2: ❌ falhou (prove falha, audit não detecta o mesmo problema).
- Golden Path 3: ✅ comprovado.
