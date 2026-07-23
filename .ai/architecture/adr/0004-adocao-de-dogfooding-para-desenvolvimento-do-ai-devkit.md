# ADR-0004 -- Adocao de Dogfooding para Desenvolvimento do AI-Devkit

## Status: aceito | Data: 2026-07-07

## Contexto
O AI-Devkit e uma plataforma de governanca para desenvolvimento assistido por IA
que oferece geradores, validadores, quality gates e gerenciamento de contexto.
A equipe de desenvolvimento estava editando arquivos manualmente sem utilizar
as proprias ferramentas do kit, ignorando seus 38+ geradores, 10 checkadores
de prevencao, CLI com 13 comandos e sistema de ADR.

Isso criava uma desconexao entre o que o produto oferece e como ele e desenvolvido,
impedindo a deteccao precoce de bugs, placeholders e inconsistencias no proprio
codigo-fonte do kit.

## Decisao
Adotar dogfooding completo: cada etapa do desenvolvimento do AI-Devkit deve passar
pelos proprios quality gates do kit antes de ser considerado concluido.

O fluxo obrigatorio e:
1. `ai-devkit status` — verificar saude antes de comecar
2. `ai:adr:new` — registrar decisoes arquiteturais
3. `ai:scan` — verificar regras arquiteturais apos implementacao
4. `ai:quality:gate` — validacao completa antes de commitar
5. `ai:c4` — atualizar diagramas de arquitetura

## Consequencias
- Positivo: bugs e placeholders sao detectados antes de chegar ao repositorio
- Positivo: a equipe experimenta o produto como um usuario real
- Positivo: a documentacao arquitetural (ADRs, C4) se mantem atualizada
- Negativo: o ciclo de desenvolvimento fica 1-2 minutos mais lento (quality gates)
- Negativo: alguns checkadores podem precisar de ajustes para nao gerar falsos positivos

## Alternativas consideradas
- Nao usar dogfooding: descartada porque permite que bugs passem despercebidos
- Usar apenas verificacao manual: descartada por ser propensa a erro e esquecimento
