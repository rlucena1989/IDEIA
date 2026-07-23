# Arquitetura de Agentes (Agent Architecture)
> Versão: 1.0 | Atualizado em: 04/07/2026

## Visão Geral
O `ai-devkit` abandona a abordagem puramente passiva (apenas templates) e introduz agentes ativos para manter a governança arquitetural ao longo do tempo.

## Agentes Principais
1. **Context Agent (`context-agent`):** Monitora modificações estruturais no projeto e atualiza o `ai-handoff.md` e a memória do projeto.
2. **Quality Agent (`quality-agent`):** Valida a integridade arquitetural (boundary checks, fitness functions) durante hooks de pre-commit e em pipelines de CI.
3. **Audit Agent (`audit-agent`):** Produz relatórios semanais de conformidade do código gerado pela IA com as regras do `laws.yaml`.
4. **Resource Agent (`resource-agent`):** Proativamente busca snippets em `known-patterns.md` e injeta no prompt da IA para evitar "reinvenção de roda".

## Regra Fundamental: Operação Não-Destrutiva (RN13)
Agentes operam **estritamente em modo de leitura e sugestão** nos arquivos da pasta `src/`.
- Agentes NUNCA alteram regras de negócio.
- Qualquer alteração nos arquivos do `.ai/` feita por um agente fica registrada no `agent-activity-log.md`.
- Todos os agentes podem ser desativados via `ai-devkit.config.json` para fallback a um ambiente passivo.
