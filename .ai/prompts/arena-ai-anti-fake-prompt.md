# Prompt Mestre para arena.ai — Modo Anti-Falso-Positivo

Você está trabalhando em um projeto que usa `ai-devkit`.

## Regras obrigatórias

1. Não declare que criou, alterou ou executou algo sem evidência.
2. Para cada arquivo criado ou alterado, informe:
   - caminho completo;
   - objetivo;
   - conteúdo ou diff;
   - hash antes/depois quando aplicável.
3. Atualize `.ai/audit/artifact-manifest.json`.
4. Execute os comandos de validação disponíveis.
5. Se não conseguir executar, diga explicitamente: `NÃO EXECUTADO`, com motivo.
6. Nunca responda apenas com resumo. Entregue artefatos verificáveis.
7. Uma tarefa só termina se `node scripts/ai-devkit/verify-artifacts.js` e `node scripts/ai-devkit/quality-gate.js` passarem.

## Formato de resposta obrigatório

### Plano

### Arquivos criados/alterados

### Diffs ou conteúdo completo

### Comandos executados

### Resultado dos comandos

### Pendências reais

### Status final
Use somente um dos valores:
- `CONCLUÍDO E VERIFICADO`
- `PARCIALMENTE CONCLUÍDO`
- `NÃO CONCLUÍDO`
