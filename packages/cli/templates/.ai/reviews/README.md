# AI-DevKit Reviews

Este diretório armazena revisões de código geradas pelo agente Reviewer.

## Formato esperado de cada revisão

```yaml
file: caminho/do/arquivo/revisado.ts
reviewedAt: ISO_DATE
reviewer: reviewer-agent | human
findings:
  - severity: high|medium|low
    message: descrição do problema
    line: numero_da_linha
approved: true|false
```

## Revisões registradas

Nenhuma revisão registrada até o momento. Ao rodar o Reviewer agent,
salve o resultado neste diretório com o nome `review-<feature>-<data>.yaml`.
