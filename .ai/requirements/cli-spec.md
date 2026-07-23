# CLI Spec

Especificação funcional dos comandos do `ai-devkit` CLI, com contrato de
entrada/saída esperado. Esta é a fonte de verdade para o que cada comando
DEVE fazer — usada para detectar quando um comando é "estrutura oca".

## Comandos e contratos

### `init [project-name] [--flavor] [--force] [--dry-run]`
- Exit 0 em sucesso; exit 1 em flavor inválido.
- `--dry-run` NUNCA altera o filesystem.
- `--force` sempre cria backup em `.ai/backups/setup/` antes de sobrescrever.

### `status`
- Sempre reflete o estado real do projeto atual (não cacheado de execução anterior).

### `verify`
- Deve rodar `run-prevention-suite.js` e falhar se qualquer check crítico falhar.

### `audit`
- Deve ser tão rigoroso quanto `prove` (ver patch P0.6). Nunca pode reportar
  sucesso quando `prove` reportaria falha.

### `prove`
- Deve rodar o ciclo E2E completo, incluindo varredura por passivos//estrutura oca
  com allowlist contextual (ver patch P0.2).

### `adapter list|detect|validate`
- Cada subcomando deve ter lógica real e testável — proibido retornar apenas `--help`.

### `sync`
- Deve gerar relatório real em `.ai/reports/latest-sync-report.json` (ver P1.1).

## Como usar este arquivo
Antes de reportar qualquer comando como "funcionando", compare o comportamento
real contra o contrato descrito aqui.
