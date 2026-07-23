# ADR 0003: Context Engineering e Redução de Tokens

## Status
Proposto

## Contexto
Enviar o projeto inteiro para um modelo é caro, lento e aumenta alucinações. O ai-devkit precisa fornecer contexto mínimo, correto e verificável.

## Decisão
Adicionar uma camada de context engineering composta por:

- `project-index.json`;
- `dependency-map.md`;
- `api-map.md`;
- `ui-map.md`;
- context packs por tarefa;
- seleção de arquivos relevantes;
- resumos incrementais.

## Consequências
- Redução significativa de tokens.
- Menos ambiguidade para modelos locais e remotos.
- Melhor rastreabilidade.
- Necessidade de scripts de atualização e validação.
