# Roadmap v2.1 â€” EstabilizaÃ§Ã£o

> Foco: confiabilidade, testabilidade, consistÃªncia documental, execuÃ§Ã£o previsÃ­vel.

## Ordem de implementaÃ§Ã£o (por pontuaÃ§Ã£o decrescente)

| Prioridade | Feature | Score | Justificativa |
|------------|---------|-------|---------------|
| 1 | Autonomy Status Persistence | 39 | Base para qualquer ciclo autÃ´nomo; baixo risco e esforÃ§o |
| 2 | IO Isolation (F04) | 24 | Infraestrutura de testabilidade; desacopla IO real |
| 3 | Governance Docs + Policy | 23 | Fonte de verdade; risco mÃ­nimo, alto impacto |
| 4 | Coverage Reader | 23 | PrÃ©-requisito para qualquer ciclo de cobertura |
| 5 | CLI Consolidation (F04) | 21 | Padroniza retorno, erros e contratos da CLI |
| 6 | Audit System | 18 | Rastreabilidade e detecÃ§Ã£o de desvios |
| 7 | Document Resolver | 17 | ResoluÃ§Ã£o automÃ¡tica de documento por tipo de tarefa |
| 8 | Contract Validation | 17 | Contratos first; evita breaking changes |
| 9 | Scorecard System | 17 | MÃ©tricas de maturidade visÃ­veis |
| 10 | Extension Backlog View | 17 | Backlog visÃ­vel no cockpit |
| 11 | Planning System (F02) | 16 | TaskSpec + ExecutionPlan |
| 12 | Task Validator | 16 | Bloqueia tarefas incompletas |
| 13 | Context Store | 16 | Estado persistente de contexto |
| 14 | Extension Metrics View | 16 | MÃ©tricas no cockpit |
| 15 | Document Audit | 15 | DetecÃ§Ã£o de conflitos documentais |
| 16 | Extension Cockpit (F05) | 13 | Painel principal de operaÃ§Ã£o |
| 17 | Release System | 12 | Gerenciamento de releases |
| 18 | Security Baseline | 11 | Checks de seguranÃ§a bÃ¡sicos |
| 19 | Runtime Hooks | 10 | Hooks de ciclo de vida |
| 20 | Observability | 7 | MÃ©tricas e tracing |
| 21 | Compliance Mapping | 6 | Mapeamento de frameworks regulatÃ³rios |
| 22 | Code Generators (31) | 5 | GeraÃ§Ã£o de cÃ³digo |
| 23 | Adapters (13 langs) | 3 | Suporte multilinguagem |

## CritÃ©rios de pronto da v2.1

- [ ] CLI consolidada: comandos seguem CliCommandResult padronizado
- [ ] GovernanÃ§a documental: registry + resolver + policy + audit funcionais
- [ ] Coverage reader: lÃª relatÃ³rios e produz gaps
- [ ] Planning: cria, valida e executa planos
- [ ] Cockpit: status + backlog + mÃ©tricas visÃ­veis na extensÃ£o
- [ ] IO isolado: testes nÃ£o dependem de IO real
- [ ] Scorecard: exibe maturidade do projeto
- [ ] Audit: detecta conflitos e gera relatÃ³rios
- [ ] Contratos: validaÃ§Ã£o de contratos funcionando

---

# Roadmap v2.2 â€” Autonomia Progressiva

> Foco: ciclos autÃ´nomos, reparo orientado por evidÃªncia, menos intervenÃ§Ã£o humana.

## Ordem de implementaÃ§Ã£o (por pontuaÃ§Ã£o decrescente)

| Prioridade | Feature | Score | Justificativa |
|------------|---------|-------|---------------|
| 1 | Gap Prioritizer | 17 | Prioriza gaps por severidade; base para repair loop |
| 2 | Test Quality Classifier | 17 | Distingue testes Ãºteis de cosmÃ©ticos |
| 3 | Test Repair Loop | 10 | Ciclo completo: identifica â†’ repara â†’ valida |
| 4 | Pattern Learning | 5 | Aprende padrÃµes do cÃ³digo para sugestÃµes |
| 5 | MCP Server | 5 | IntegraÃ§Ã£o com IDEs via Model Context Protocol |

## CritÃ©rios de pronto da v2.2

- [ ] Gap prioritizer: gaps classificados (critical/important/optional/cosmetic)
- [ ] Repair loop: repara N gaps por ciclo automaticamente
- [ ] Qualidade: testes classificados por relevÃ¢ncia
- [ ] Estado persistente: autonomia salva e recuperÃ¡vel
- [ ] Pattern learning: padrÃµes detectados e registrados
- [ ] MCP: servidor rodando e integrÃ¡vel

---

# Post-v2.2 (nÃ£o entra agora)

| Feature | Motivo |
|---------|--------|
| Multi-agent Platform | Risco 8, dependÃªncias 5, -39 pontos |
| Plugin System | Risco 5, depende de arquitetura mais madura |
| RAG Engine | Risco 5, depende de base de conhecimento sÃ³lida |
| AI Engineer | Risco 7, escopo muito amplo |
| Local AI Engine | Risco 6, alto esforÃ§o (8) |
| Cognitive Coprocessor | Risco 6, depende de IA madura |
