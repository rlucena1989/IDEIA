# Continuidade para IA

## Objetivo

Fazer qualquer modelo de IA continuar o desenvolvimento corretamente, do início ao fim.

## Artefatos essenciais

- ".ai/project-manifest.yaml" — stack, regras, arquitetura
- ".ai/context/ai-handoff.md" — resumo do projeto e regras da IA
- ".ai/tasks/current-task.md" — tarefa atual e critérios de aceite
- ".ai/memory/session-log.md" — histórico do que foi feito
- ".ai/architecture/adr/" — decisões de arquitetura e trade-offs
- ".ai/contracts/" — contratos de integração entre domínios
- ".ai/errors/error-catalog.md" — catálogo de códigos de erro
- ".ai/prompts/" — prompts padronizados para cada tipo de ação
- ".ai/checklists/" — critérios de prontidão e entrega

## Regras de continuidade

1. Sempre comece pela última sessão registrada em ".ai/memory/session-log.md".
2. Sempre confirme o estado do projeto em ".ai/project-manifest.yaml".
3. Nunca mude arquitetura ou contratos sem ADR.
4. Sempre atualize o backlog e a tarefa atual antes da implementação.
5. Use apenas erros listados em ".ai/errors/error-catalog.md".

## Como a IA deve se comportar

- Ler o manifesto e o handoff antes de qualquer alteração
- Perguntar se o escopo não estiver claro
- Nunca ignorar regras ou contratos existentes
- Propor um plano curto antes de codificar
- Validar implementações com testes e checklists
