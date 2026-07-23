# Guidelines de API

## Versionamento
/api/v1/ | Nomenclatura: plural + kebab-case

## Paginacao obrigatoria
```json
{ "data": [], "meta": { "total": 0, "page": 1, "perPage": 20, "totalPages": 0 } }
```

## Status HTTP
200 GET | 201 POST | 204 DELETE | 400 invalido | 401 sem auth | 403 sem permissao | 404 nao encontrado | 409 conflito | 500 interno
