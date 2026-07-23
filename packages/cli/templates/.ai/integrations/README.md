# AI-DevKit Integrations

Este diretório documenta integrações externas configuradas para o projeto.

## Integrações suportadas pelo DevKit

| Ferramenta | Status                                     | Config exportada             |
| ---------- | ------------------------------------------ | ---------------------------- |
| Cursor     | Ver `.ai/rules/*.cursor` (se aplicável)    | `ai-devkit adapter validate` |
| Windsurf   | Ver `.ai/rules/*.windsurf` (se aplicável)  | `ai-devkit adapter validate` |
| Aider      | Ver `.ai/templates/aider-task-template.md` | Manual                       |

## Como adicionar uma nova integração

1. Criar o arquivo de configuração específico da ferramenta.
2. Documentar aqui com uma linha na tabela acima.
3. Adicionar teste em `check-portability.js` se a integração afetar múltiplos SOs.
