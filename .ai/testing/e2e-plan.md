# Plano de Testes E2E

## Objetivo

Definir os fluxos criticos que devem ser cobertos por testes end-to-end.

## Fluxos sugeridos

1. Autenticacao (login/logout).
2. Fluxo principal de negocio do produto.
3. Casos de erro criticos (permissao negada, dados invalidos).

## Ferramentas

Utilize `jest.e2e.config.js` como base para specs `*.e2e-spec.ts` em `tests/e2e/`.
