# Test Impact Analysis

## Objetivo

Ajudar a IA a decidir quais testes rodar e criar conforme os arquivos alterados, reduzindo tempo e aumentando confiança.

---

## Regras

| Arquivo alterado | Testes obrigatórios |
|---|---|
| Entidade de domínio | Unit tests da entidade + use cases relacionados |
| Use case/service | Unit tests + integration tests |
| Controller/route | Contract tests + integration tests |
| DTO/schema | Contract tests + validation tests |
| Repository | Integration tests com banco/test container |
| Migration | Migration test + rollback test |
| UI component | Component test + accessibility check |
| Page/screen | E2E test + visual check |
| Auth/security | Security tests + permission matrix |
| Config/CI | Pipeline dry-run quando possível |
| Design system | Visual regression + component tests |
| UX flow | E2E + accessibility + responsive review |

---

## Comando esperado

```bash
ai-devkit test impact --changed-files file1,file2
```

## Saída esperada

```json
{
  "requiredTests": [
    "unit",
    "integration",
    "contract",
    "e2e",
    "accessibility"
  ],
  "commands": [
    "npm test -- users",
    "npm run test:contract",
    "npm run test:e2e"
  ],
  "risk": "medium"
}
```

---

## Critério de aceite

A IA nunca deve alterar código sem indicar quais testes são necessários para validar a alteração.