# Politica de Release

## Versionamento

Este projeto segue Semantic Versioning (MAJOR.MINOR.PATCH).

- MAJOR: mudancas incompativeis de API.
- MINOR: novas funcionalidades compativeis.
- PATCH: correcoes de bugs compativeis.

## Processo

1. Mudancas relevantes devem ter um changeset em `.changeset/`.
2. Tarefas concluidas sao registradas em `.ai/tasks/done.md`.
3. Antes de uma release, execute `npm run ai:release:notes` para gerar o rascunho de notas.
4. Revise manualmente o rascunho antes de publicar.

## Limites

- Esta politica NAO automatiza publicacao (npm publish, tags, deploy).
- Publicacao de releases continua sendo uma decisao humana explicita.
