# Tratamento de Erros

## Fluxo
UseCase lanca AppError -> Controller captura -> Resposta JSON

## Formato
```json
{ "error": { "code": "CODIGO", "message": "Mensagem", "details": [] } }
```

## Regras
- Nunca expor stack trace em producao
- Sempre usar AppError para erros de negocio
- Erros inesperados retornam INTERNAL_ERROR (500)
