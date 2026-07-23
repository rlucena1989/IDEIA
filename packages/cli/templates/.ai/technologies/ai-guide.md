# Guia de IA para Entrega de Qualidade Internacional

## Objetivo

Fornecer um processo model-agnostic que permite entregar software com qualidade de nível Apple, Google e Microsoft.

## Princípios

- Model-agnostic: qualquer modelo deve trabalhar a partir de artefatos e regras, não de recursos proprietários.
- Contract-First: defina contratos antes de implementar.
- Test-First: gere testes e critérios de aceite junto com a implementação.
- Observability-Driven: planeje telemetria e alertas desde o início.
- Security-by-Design: incorpore segurança em todas as fases.

## Fluxo do desenvolvimento

1. Discovery: documentar visão, personas, requisitos e riscos.
2. Planning: definir módulos, casos de uso e contratos.
3. Implementation: escrever código guiado por contratos e testes.
4. Review: usar prompts padrão e checklists de qualidade.
5. Release: validar readiness e deploy seguro.
6. Operação: monitorar, iterar e registrar lessons learned.

## Artefatos essenciais

- .ai/project-manifest.yaml
- .ai/context/ai-handoff.md
- .ai/tasks/current-task.md
- .ai/memory/session-log.md
- .ai/architecture/adr/
- .ai/contracts/
- .ai/errors/error-catalog.md
- .ai/checklists/
- .ai/technologies/

## Continuidade

- Atualize o contexto e a memória de sessão após cada iteração.
- Registre todas as decisões em ADRs.
- Use checklists para garantir consistência.
