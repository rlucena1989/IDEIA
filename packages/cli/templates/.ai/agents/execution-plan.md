# Execution Plan (Agentes)

Este arquivo descreve a ordem de execução recomendada entre os agentes do
AI-DevKit para uma feature típica, do discovery à entrega.

## Ordem de execução

1. **Architect** — gera/atualiza ADR se a feature envolve decisão estrutural.
2. **Documenter** — preenche `feature-brief.md` a partir da ideia inicial.
3. **Implementer** — segue `implementation-plan.md`, gera DTOs/entidades/use cases.
4. **Tester** — gera testes unitários e e2e para o fluxo crítico da feature.
5. **Reviewer** — roda checklist de `code-review-checklist.md`.
6. **Debugger** — só entra em ação se `ai-devkit prove` falhar após a implementação.

## Critério de handoff entre agentes

Cada agente só pode passar a tarefa para o próximo depois de rodar:

```bash
ai-devkit status
```

e confirmar que a seção relevante (Architecture/Quality/Security) está OK.

## Estado atual de automação

Esta orquestração ainda é **manual/sequencial** — não há orquestrador
automático conectando os agentes (ver Roadmap Fase 3 — Multi-Agent
Orchestration, ainda "Planned").
