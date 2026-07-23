# Estratégia Multi-Linguagem (Multi-Lang Strategy)
> Versão: 1.0 | Atualizado em: 04/07/2026

## Visão Geral
O núcleo do `ai-devkit` (governança, ADRs, padrões de prompts, memory) é universal e agnóstico de linguagem. No entanto, para ser efetivo, ele deve se integrar aos ecossistemas específicos (build, teste, linting) da stack alvo.

A solução baseia-se no padrão **Core + Adapters**:
1. **Core Universal (`.ai/` raiz):** Regras de negócio, leis arquiteturais, prompts de ciclo de vida e histórico de decisões.
2. **Adapters Específicos:** Plugins (ex: `@ai-devkit/adapter-typescript`, `@ai-devkit/adapter-python`) que traduzem os quality gates lógicos em comandos práticos (ex: `eslint`, `flake8`, `jest`, `pytest`).

## Diretrizes
- Cada prompt no core universal deve ser formulado sem assumir sintaxe de linguagem.
- O `setup.js` aceita a flag `--lang <linguagem>` para carregar o adapter apropriado. Se omitido, tenta auto-detectar baseado nos arquivos de dependências (`package.json`, `requirements.txt`, `go.mod`).
- **Idempotência:** A troca ou adição de um adapter não deve corromper os arquivos de arquitetura universais.

## Suporte a Múltiplas Stacks (Polyglot Repositories)
Para monorepos ou projetos heterogêneos (ex: frontend TS + backend Go), o `.ai/project-manifest.yaml` suporta múltiplas chaves de adapters, ativando comandos de qualidade específicos baseados no caminho do arquivo (scoping).
