# Maturity Model

Este documento define os níveis de maturidade que um projeto usando o
AI-DevKit pode atingir, e os critérios objetivos para cada nível.

## Nível 0 — Instalado

- `.ai/` presente no repositório.
- `project-manifest.yaml` preenchido com stack real (não os valores padrão de template).

## Nível 1 — Verificável

- `ai-devkit verify` passa sem erros.
- `ai-devkit status` reporta 100/100 de forma consistente entre execuções.

## Nível 2 — Auditável

- `ai-devkit audit` e `ai-devkit prove` são consistentes entre si (mesmo resultado
  para os mesmos problemas).
- `artifact-manifest.json` é atualizado a cada geração de código por IA.

## Nível 3 — Autônomo

- Hooks de git ativos bloqueando violações de arquitetura antes do commit.
- CI executando `ai-devkit prove` em toda PR.

## Como medir o nível atual

Rode:

```bash
ai-devkit status
ai-devkit verify
ai-devkit prove
```

E compare o resultado com os critérios acima. Não assuma nível sem executar.
