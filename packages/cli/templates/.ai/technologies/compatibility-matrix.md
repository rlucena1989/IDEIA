# Compatibility Matrix

Matriz de compatibilidade entre flavors suportados pelo AI-DevKit e recursos
do CLI.

| Flavor  | init | generators     | quality gates  | adapter validate       |
| ------- | ---- | -------------- | -------------- | ---------------------- |
| nestjs  | ✅   | ✅             | ✅             | ⚠️ pendente (ver P0.7) |
| express | ✅   | ⚠️ parcial     | ⚠️ parcial     | ⚠️ pendente (ver P0.7) |
| fastify | ✅   | ⚠️ parcial     | ⚠️ parcial     | ⚠️ pendente (ver P0.7) |
| fastapi | ✅   | ⚠️ não testado | ⚠️ não testado | ⚠️ pendente (ver P0.7) |
| go      | ✅   | ⚠️ não testado | ⚠️ não testado | ⚠️ pendente (ver P0.7) |

## Legenda

- ✅ Comprovado via teste real de CLI.
- ⚠️ Não comprovado nesta auditoria — requer teste antes de marcar como ✅.

## Como atualizar esta matriz

Rode, para cada flavor:

```bash
node dist/index.js init . --flavor <flavor>
node dist/index.js verify
node dist/index.js adapter validate
```

Só marque ✅ com a saída real desses 3 comandos.
