# Arquitetura de Frontend

## Objetivo

Documentar a organizacao de pastas, gerenciamento de estado e comunicacao com a API.

## Estrutura sugerida

```
src/
  components/
  pages/
  hooks/
  services/
  state/
  styles/
```

## Comunicacao com backend

- Utilize os contratos definidos em `docs/api/openapi.yaml`.
- Sincronize tipos gerados com o backend sempre que possivel.
