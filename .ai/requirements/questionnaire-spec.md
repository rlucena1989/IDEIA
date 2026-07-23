# Questionnaire Spec

Especificação do questionário inteligente usado durante `init` para inferir
configurações do projeto sem perguntar tudo manualmente.

## Perguntas condicionais

```yaml
- id: has_existing_package_json
  condition: auto-detected (verifica se package.json existe no cwd)
  ifTrue: pular pergunta de "nome do projeto" e "gerenciador de pacotes"
  ifFalse: perguntar nome do projeto e gerenciador de pacotes preferido

- id: flavor
  condition: sempre perguntar, exceto se --flavor for passado via flag
  options: [nestjs, express, fastify, fastapi, go]

- id: install_mode
  condition: sempre perguntar, exceto se --minimal/--standard/--full for passado
  options: [minimal, standard, full]
```

## Status de implementação (auditoria 05/07/2026)
- `--flavor` via flag: ✅ comprovado por teste real.
- Questionário interativo completo: ⚠️ NÃO comprovado nesta auditoria —
  os testes usaram apenas flags diretas, nunca o modo interativo.
- `--minimal/--standard/--full`: ⚠️ NÃO comprovado — reclassificado em
  `master-plan.md` de `[x]` para `[~]`.

## Ação pendente
Testar explicitamente o modo interativo (sem flags) e as 3 flags de modo de
instalação antes de marcar TSK-1.2/1.3 como `[x]` novamente.
