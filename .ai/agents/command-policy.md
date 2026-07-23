# Command Policy

## Objetivo
Definir quais comandos um agente de IA pode executar autonomamente, quais exigem confirmacao humana e quais sao proibidos.

## Niveis

### Permitido
Comandos de leitura, verificacao e validacao (lint, typecheck, test, build, git status/diff/log).

### Restrito
Comandos que alteram estado do repositorio ou publicam artefatos (commit, push, install, publish). Exigem checkpoint humano.

### Proibido
Comandos destrutivos ou irreversiveis (force push, remocao recursiva, DROP sem depreciacao, exposicao de secrets).

## Referencia
A lista formal fica em `.ai/agents/permissions.yaml`.
