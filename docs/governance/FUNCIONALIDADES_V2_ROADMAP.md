# Roadmap v2.1 — Estabilização

> Foco: confiabilidade, testabilidade, consistência documental, execução previsível.

## Ordem de implementação (por pontuação decrescente)

| Prioridade | Feature | Score | Justificativa |
|------------|---------|-------|---------------|
| 1 | Autonomy Status Persistence | 39 | Base para qualquer ciclo autônomo; baixo risco e esforço |
| 2 | IO Isolation (F04) | 24 | Infraestrutura de testabilidade; desacopla IO real |
| 3 | Governance Docs + Policy | 23 | Fonte de verdade; risco mínimo, alto impacto |
| 4 | Coverage Reader | 23 | Pré-requisito para qualquer ciclo de cobertura |
| 5 | CLI Consolidation (F04) | 21 | Padroniza retorno, erros e contratos da CLI |
| 6 | Audit System | 18 | Rastreabilidade e detecção de desvios |
| 7 | Document Resolver | 17 | Resolução automática de documento por tipo de tarefa |
| 8 | Contract Validation | 17 | Contratos first; evita breaking changes |
| 9 | Scorecard System | 17 | Métricas de maturidade visíveis |
| 10 | Extension Backlog View | 17 | Backlog visível no cockpit |
| 11 | Planning System (F02) | 16 | TaskSpec + ExecutionPlan |
| 12 | Task Validator | 16 | Bloqueia tarefas incompletas |
| 13 | Context Store | 16 | Estado persistente de contexto |
| 14 | Extension Metrics View | 16 | Métricas no cockpit |
| 15 | Document Audit | 15 | Detecção de conflitos documentais |
| 16 | Extension Cockpit (F05) | 13 | Painel principal de operação |
| 17 | Release System | 12 | Gerenciamento de releases |
| 18 | Security Baseline | 11 | Checks de segurança básicos |
| 19 | Runtime Hooks | 10 | Hooks de ciclo de vida |
| 20 | Observability | 7 | Métricas e tracing |
| 21 | Compliance Mapping | 6 | Mapeamento de frameworks regulatórios |
| 22 | Code Generators (31) | 5 | Geração de código |
| 23 | Adapters (13 langs) | 3 | Suporte multilinguagem |

## Critérios de pronto da v2.1

- [x] CLI consolidada: comandos seguem CliCommandResult padronizado
- [x] Governança documental: registry + resolver + policy + audit funcionais
- [x] Coverage reader: lê relatórios e produz gaps
- [x] Planning: cria, valida e executa planos
- [x] Cockpit: status + backlog + métricas visíveis na extensão
- [x] IO isolado: testes não dependem de IO real
- [x] Scorecard: exibe maturidade do projeto
- [x] Audit: detecta conflitos e gera relatórios
- [x] Contratos: validação de contratos funcionando

**Status v2.1**: ✅ COMPLETA (2026-07-27)

---

# Roadmap v2.2 — Autonomia Progressiva

> Foco: ciclos autônomos, reparo orientado por evidência, menos intervenção humana.

## Ordem de implementação (por pontuação decrescente)

| Prioridade | Feature | Score | Justificativa |
|------------|---------|-------|---------------|
| 1 | Gap Prioritizer | 17 | Prioriza gaps por severidade; base para repair loop |
| 2 | Test Quality Classifier | 17 | Distingue testes úteis de cosméticos |
| 3 | Test Repair Loop | 10 | Ciclo completo: identifica → repara → valida |
| 4 | Pattern Learning | 5 | Aprende padrões do código para sugestões |
| 5 | MCP Server | 5 | Integração com IDEs via Model Context Protocol |

## Critérios de pronto da v2.2

- [x] Gap prioritizer: gaps classificados (critical/important/optional/cosmetic)
- [x] Repair loop: repara N gaps por ciclo automaticamente
- [x] Qualidade: testes classificados por relevância
- [x] Estado persistente: autonomia salva e recuperável
- [x] Pattern learning: padrões detectados e registrados
- [x] MCP: servidor rodando e integrável

**Status v2.2**: ✅ COMPLETA (2026-07-27)

---

# Roadmap v2.3 — Qualidade & Governança

> Foco: completar checklist items, tracking contínuo, qualidade documental.

## Status Atual (2026-07-27)

- **Total arquivos com checkboxes**: 115
- **Itens não marcados**: 1449
- **Itens marcados**: 327
- **Completion geral**: 18.4%

## Prioridades v2.3

| Prioridade | Arquivo | Unchecked | Esforço Estimado |
|------------|---------|-----------|------------------|
| 1 | ESTUDO-S54-PERFORMANCE-OPTIMIZATION.md | 56 | ~4h |
| 2 | ESTUDO-S63-VISUAL-AGENT-DEBUGGER.md | 52 | ~4h |
| 3 | ESTUDO-S65-ENTERPRISE-COMPLIANCE.md | 51 | ~4h |
| 4 | ESTUDO-D09-IPC-SECURITY-MODEL.md | 50 | ~4h |
| 5 | ESTUDO-AI-SAFETY-ALIGNMENT.md | 47 | ~4h |

## Critérios de pronto da v2.3

- [ ] Top 5 arquivos com mais unchecked items concluídos
- [ ] Completion geral > 50%
- [ ] Sistema de tracking contínuo operacional
- [ ] Checklist audit automatizado

---

# Post-v2.2 (não entra agora)

| Feature | Motivo |
|---------|--------|
| Multi-agent Platform | Risco 8, dependências 5, -39 pontos |
| Plugin System | Risco 5, depende de arquitetura mais madura |
| RAG Engine | Risco 5, depende de base de conhecimento sólida |
| AI Engineer | Risco 7, escopo muito amplo |
| Local AI Engine | Risco 6, alto esforço (8) |
