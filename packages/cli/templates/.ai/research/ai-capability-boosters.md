# AI Capability Boosters

Lista de técnicas usadas pelo AI-DevKit para aumentar a qualidade das
respostas de LLMs durante o desenvolvimento assistido.

## Técnicas ativas (comprovadas em uso)

- **Context Packs**: redução de ruído via `ai-devkit context pack`.
- **Contract-First**: forçar definição de interface antes de implementação
  (ver `.ai/laws.yaml`, regra `contract_first: true`).

## Técnicas descritas mas não comprovadas nesta auditoria

- **Property-Based Testing** para lógica complexa (Token Optimization Engine).
- **Mutation Testing** para validar qualidade da suíte de testes.

## Regra de manutenção

Uma técnica só pode ser movida de "descrita" para "ativa/comprovada" quando
houver um comando executável que demonstre seu uso real no projeto (script,
config de ferramenta de mutation testing, etc.). Simplesmente documentar a
técnica em prosa NÃO é suficiente — isso é exatamente o padrão de "estrutura
oca" identificado nesta auditoria.
