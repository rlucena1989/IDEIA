# Guia de Início Rápido — IDEIA

> **Transforme ideias em sistemas completos em minutos.**

Este guia mostra como instalar e usar a IDEIA em menos de 5 minutos.

---

## 1. Instalação

```bash
npm install -g @ai-devkit/cli
```

Alternativamente, baixe o binário para sua plataforma em [releases](https://github.com/anomalyco/opencode/releases).

Verifique a instalação:

```bash
ai-devkit --version
```

## 2. Primeiro Projeto

```bash
# Crie um novo projeto
mkdir meu-projeto
cd meu-projeto

# Inicialize a IDEIA
ai-devkit init
```

O comando `init` configura a estrutura do projeto, detecta tecnologias existentes e gera o manifesto de realidade.

## 3. Primeiro Comando

```bash
# Verifique a integridade do projeto
ai-devkit verify
```

O comando `verify` valida a arquitetura, checa dependências, executa lint, typecheck e testes, e retorna um score de qualidade.

## 4. Modo IDE

```bash
# Inicie o ambiente IDE completo
ai-devkit ide
```

Isso abre o Theia-based IDE com:

- Editor Monaco com LSP (autocomplete, hover, definições, refatoração)
- Terminal PTY interativo
- Debug Panel com breakpoints e step-through
- Chat com IA integrado

## 5. Conceitos Principais

### Níveis de Autonomia

| Nível | Nome | Descrição |
|-------|------|-----------|
| N0 | Assistido | Sugestões apenas; usuário executa |
| N1 | Supervisionado | IA executa com aprovação por etapa |
| N2 | Semi-autônomo | IA executa módulos com revisão |
| N3 | Autônomo | IA entrega features completas |
| N4 | Total | IA gerencia todo o ciclo de vida |

### Reality Sync

A IDEIA mantém um **manifesto de realidade** (`REALITY-MANIFEST.md`) que reflete o estado real do código. Qualquer alteração gera drift detection automática, garantindo que documentação e código nunca divergem.

### Self-Optimization

A IDEIA monitora padrões de uso e ajusta automaticamente configurações, cache, e paralelismo para maximizar performance.

---

## Próximos Passos

| Comando | O que faz |
|---------|-----------|
| `ai-devkit generate "um CRUD de usuarios"` | Gera código a partir de descrição |
| `ai-devkit audit` | Auditoria completa de segurança |
| `ai-devkit optimize` | Otimização de performance |
| `ai-devkit docs` | Gera documentação automática |
| `ai-devkit report` | Relatório de qualidade do projeto |

## Documentação Completa

Acesse a documentação completa em [docs/](../README.md) ou execute:

```bash
ai-devkit help
```
