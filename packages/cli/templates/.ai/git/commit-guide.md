# Guia de Commits (Conventional Commits)

## Formato

```
<tipo>(<escopo opcional>): <descricao curta>

<corpo opcional>

<rodape opcional>
```

## Tipos permitidos

- `feat`: nova funcionalidade
- `fix`: correcao de bug
- `docs`: apenas documentacao
- `style`: formatacao, sem mudanca de logica
- `refactor`: refatoracao sem mudar comportamento
- `perf`: melhoria de performance
- `test`: adicao ou correcao de testes
- `build`: mudancas de build ou dependencias
- `ci`: mudancas de pipeline de CI
- `chore`: tarefas de manutencao
- `revert`: reversao de commit anterior

## Exemplos

- `feat(auth): adicionar login com refresh token`
- `fix(billing): corrigir calculo de imposto`

## Validacao

O arquivo `commitlint.config.js` valida o formato via commitlint (instalar `@commitlint/cli` e `@commitlint/config-conventional` quando necessario).
