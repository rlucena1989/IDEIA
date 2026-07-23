# Quality Gates

## Gates mínimos

```bash
node scripts/ai-devkit/verify-artifacts.js
npm run lint
npm run typecheck
npm run test
npm run build
```

## Gate e2e

```bash
npm run test:e2e
```

## Política

Falhou um gate, a entrega não pode ser marcada como concluída.
