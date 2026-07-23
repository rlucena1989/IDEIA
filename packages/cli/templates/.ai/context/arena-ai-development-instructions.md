# Instruções para Desenvolvimento do próprio AI-DevKit (Arena.ai)

## Contexto

Este arquivo existe porque o AI-DevKit está sendo desenvolvido usando o
próprio AI-DevKit como framework de contexto (dogfooding). Isso exige cuidado
extra para não confundir:

- o `.ai/` que descreve COMO desenvolver o DevKit;
- com um `.ai/` gerado pelo DevKit DENTRO de um projeto consumidor de teste.

## Regras específicas para quem desenvolve o DevKit (Arena.ai, GPT, Claude)

1. **Nunca marcar tarefa como `[x]` sem comando de verificação executado.**
   Ver `.ai/tasks/master-plan.md` e a regra de ouro no topo do arquivo.

2. **Sempre testar em 3 camadas antes de reportar sucesso:**

   ```bash
   # 1. Build da CLI
   cd packages/cli && npm run build

   # 2. Prevention suite completa
   npm run ai:prevention

   # 3. Ciclo prove ponta a ponta
   node dist/index.js prove
   ```

3. **Ao corrigir um check, sempre rodar o teste NEGATIVO também** (o check
   deve continuar detectando o problema real quando ele existe, não só
   parar de dar falso positivo).

4. **Divergência entre monorepo e installer-only é esperada, mas deve ser
   documentada.** Ver `04-PATCH-propagar-checks-installer-only.md`.

## Última auditoria completa

05/07/2026 — ver pacote `ai-devkit-hardening-package.zip` para lista completa
de bloqueadores e correções aplicadas/pendentes.
