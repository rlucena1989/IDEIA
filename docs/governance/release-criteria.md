# Critérios de Pronto — v2.1 e v2.2

## v2.1 — Critérios de Release

### Funcionais

- [ ] CLI: todos os comandos públicos retornam `CliCommandResult` padronizado
- [ ] CLI: `--json` funciona em todos os comandos que listam dados
- [ ] Governance: `docs resolve <type>` encontra o documento correto
- [ ] Governance: `docs audit` detecta conflitos
- [ ] Coverage: `coverage audit` lê relatório e lista gaps
- [ ] Planning: `plan create` gera TaskSpec válido
- [ ] Planning: `plan validate` bloqueia tarefas incompletas
- [ ] Extension: status panel mostra dados reais da CLI
- [ ] Extension: métricas panel mostra coverage + docs status
- [ ] Extension: ações rápidas disparam comandos CLI

### Não funcionais

- [ ] IO: módulos usam `getIO()` em vez de `fs`/`path` direto
- [ ] Testes: cobertura dos módulos centrais >= 65%
- [ ] Testes: 200+ testes passando
- [ ] Build: `npm run build` sem erros
- [ ] Observabilidade: comandos registram trace no observability system
- [ ] Scorecard: `ai-devkit scorecard` roda sem erros

### Bloqueadores

- [ ] Nenhum conflito crítico no `docs audit`
- [ ] `plan validate` não bloqueia tarefas válidas (falso positivo = 0)
- [ ] Extensão não crasha ao carregar sem CLI instalada

---

## v2.2 — Critérios de Release

### Funcionais

- [ ] Coverage: `coverage gaps --severity critical` filtra corretamente
- [ ] Coverage: `coverage repair -n 5` repara até 5 gaps por ciclo
- [ ] Coverage: `coverage status` mostra estado persistente entre execuções
- [ ] Classifier: testes classificados como `useful` ou `cosmetic`
- [ ] Pattern: `learn` detecta e registra padrões do código
- [ ] MCP: servidor responde a `ai-devkit mcp --serve`

### Não funcionais

- [ ] Repair loop: taxa de sucesso >= 75%
- [ ] Classificação: precisão >= 90%
- [ ] Ciclo autônomo: sem intervenção humana por ciclo completo
- [ ] Estado: recupera `autonomy-status.json` corretamente após crash

### Bloqueadores

- [ ] Repair loop não entra em loop infinito (max 10 iterações)
- [ ] Classificador não marca teste útil como cosmético (falso negativo < 5%)
- [ ] MCP server: timeout de 30s em operações lentas

---

## Gatilhos de Rollback

| Gatilho                                  | Ação                         | Responsável |
| ---------------------------------------- | ---------------------------- | ----------- |
| Cobertura cai abaixo de 50% após release | Rollback imediato            | CI/CD       |
| Scorecard cai > 10 pontos                | Review + rollback            | Tech lead   |
| Conflito crítico não detectado           | Correção + nova auditoria    | Governance  |
| Repair loop danifica testes existentes   | Restore de backup + rollback | Autonomy    |
