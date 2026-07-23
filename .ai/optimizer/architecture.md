# AI Devkit — Optimizer Architecture

## 1. Propósito

A camada `optimizer` existe para introduzir uma inteligência de decisão adaptativa no `ai-devkit`. Seu papel é reduzir desperdício operacional e melhorar a precisão da execução.

## 2. Problema que resolve

Sem uma camada de otimização, o sistema tende a:
- usar mais contexto do que o necessário
- chamar mais agentes do que o necessário
- gerar código demais em vez de patches
- repetir soluções já existentes
- aplicar o mesmo pipeline para tarefas de naturezas diferentes

## 3. Princípios arquiteturais

- **Menor caminho seguro** — menor caminho possível preservando segurança e qualidade
- **Decisão antes de execução** — toda ação relevante precedida por decisão estruturada
- **Contexto mínimo viável** — IA recebe apenas contexto suficiente para precisão
- **Reaproveitamento primeiro** — buscar soluções existentes antes de criar novas
- **Patch-first** — mudanças pequenas como diffs mínimos, não geração total
- **Risco proporcional** — quanto maior o risco, maior o controle e supervisão

## 4. Integração com outras camadas

- **Context Builder**: optimizer define o escopo antes da montagem do contexto
- **Scaffold**: optimizer decide se scaffold é necessário ou se patch basta
- **Agentes**: optimizer escolhe o menor número possível de agentes
- **Orquestrador**: optimizer pode definir o grafo mínimo necessário
- **Scanners**: optimizer usa scanners como validação final e sinal de qualidade
