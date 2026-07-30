# ADR-018: CLI with 173 Commands (V2.1)

- **Status:** Implementado
- **Data:** 2026-07-24 (convertido de 0005-cli para ADR-XXX)
- **Decisão:** CLI usando Commander.js com ~173 comandos

## Contexto
A CLI da IDEIA e a interface primaria para usuarios e IAs.

## Decisao
- Framework: Commander.js
- Todos os comandos retornam `CliCommandResult` com `success()`/`failure()`
- Output padrao: JSON via `--json`, verbose via `--verbose`
- Audit trail de todos os comandos
- Prompt pipeline integrado (guard, classify, enrich, optimize, plan, format)
