# Especificação do Questionário Inteligente

> Versão: 1.0 | Atualizado em: 04/07/2026

## Propósito

Substituir o trabalho manual de preenchimento inicial dos arquivos `.ai/` reduzindo a barreira de adoção. Quando ativado, ele infere o estado do projeto e faz perguntas estratégicas.

## Fluxo de Execução

1. **Fase de Descoberta Automática:**
   - Varre o diretório em busca de indicadores (`package.json` -> JS/TS, `.git` -> repo, `docker-compose.yml` -> infra).
   - Levanta hipóteses: "Parece ser uma API Node com NestJS".
2. **Confirmação:**
   - Apresenta as hipóteses ao dev: "Detectei TypeScript e NestJS. Confirma? [Y/n]".
   - Apenas preenche o `project-manifest.yaml` após o "Y".
3. **Fase de Negócio (Decisão Humana Obrigatória):**
   - Pergunta o _Problema que resolve_, _Para quem_ e _Métricas_.
   - A IA pode sugerir baseado no README existente, mas requer aprovação.

## Restrições (RN12)

- Nunca realizar auto-fill (preenchimento silencioso) de dados sensíveis ao domínio ou decisões de negócio puras.
- Todas as hipóteses rejeitadas pelo usuário devem alimentar a base local de exclusão para que o questionário não pergunte de novo.
