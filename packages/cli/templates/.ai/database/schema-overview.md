# Database Schema Overview

Este arquivo deve ser mantido sincronizado com o schema real do banco de dados
(ex: `schema.prisma`, migrations, ou equivalente).

## Como gerar/atualizar este documento

Este arquivo NÃO deve ser preenchido manualmente com texto solto. Ele deve ser
gerado ou atualizado a partir do schema real do ORM em uso:

```bash
# Exemplo para Prisma:
npx prisma generate
# então documentar manualmente apenas o resumo de alto nível das tabelas,
# nunca duplicar o schema completo aqui (fonte de verdade = arquivo do ORM).
```

## Estrutura esperada

```markdown
## Tabelas principais

- users (id, email, created_at, ...)
- <tabela>: <propósito de uma linha>

## Relacionamentos principais

- users 1:N orders
```

## Estado atual

Nenhum schema de banco de dados foi gerado para este projeto ainda. Assim que
o primeiro modelo for criado via `ai-devkit generate entity`, este arquivo
deve ser atualizado com o resumo real das tabelas.
