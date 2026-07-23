# Examples

Este diretório contém exemplos de uso da IDEIA.

## Como usar

```bash
# Iniciar um projeto de exemplo
ideia init meu-projeto --template api

# Dentro do projeto, usar o chat para descrever features
# "Adicione autenticação JWT"
# "Crie testes unitários para o controller de usuários"
# "Gere documentação da API"
```

## Templates disponíveis

- `api` — API REST com Express/Fastify
- `cli` — CLI tool com yargs/commander
- `lib` — Biblioteca TypeScript
- `plugin` — Plugin Theia IDEIA
- `adapter` — Adapter para linguagem externa (go, rust, python, etc.)

## Exemplos visuais

Veja a [demo script](../docs/marketing/demo-script.md) para um passo a passo guiado.

Para exemplos de código gerado pela IDEIA, inicie qualquer projeto e use o comando:

```bash
ideia generate api task-manager
```
