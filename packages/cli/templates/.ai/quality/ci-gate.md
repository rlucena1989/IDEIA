# CI Gate

## GitHub Actions

```yaml
- name: ai-devkit quality
  run: |
    npx ai-devkit validate
    npx ai-devkit quality --min-score 70
```

## O que é verificado

- Arquivos de contexto existem e preenchidos
- Nenhum console.log em produção
- Nenhum secret hardcoded
- Cobertura >= 80%
- Score >= 70
