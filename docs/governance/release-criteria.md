# Critérios de Pronto — v2.1 e v2.2

## v2.1 — Critérios de Release

### Funcionais

- [x] CLI: todos os comandos públicos retornam `CliCommandResult` padronizado
- [x] CLI: `--json` funciona em todos os comandos que listam dados
- [x] Governance: `docs resolve <type>` encontra o documento correto
- [x] Governance: `docs audit` detecta conflitos
- [x] Coverage: `coverage audit` lê relatório e lista gaps
- [x] Planning: `plan create` gera TaskSpec válido
- [x] Planning: `plan validate` bloqueia tarefas incompletas
- [x] Extension: status panel mostra dados reais da CLI
- [x] Extension: métricas panel mostra coverage + docs status
- [x] Extension: ações rápidas disparam comandos CLI

### Não funcionais

- [x] IO: módulos usam `getIO()` em vez de `fs`/`path` direto
- [x] Testes: cobertura dos módulos centrais >= 65%
- [x] Testes: 200+ testes passando
- [x] Build: `npm run build` sem erros
- [x] Observabilidade: comandos registram trace no observability system
- [x] Scorecard: `ai-devkit scorecard` roda sem erros

### Bloqueadores

- [x] Nenhum conflito crítico no `docs audit`
- [x] `plan validate` não bloqueia tarefas válidas (falso positivo = 0)
- [x] Extensão não crasha ao carregar sem CLI instalada

---

## v2.2 — Critérios de Release

### Funcionais

- [x] Coverage: `coverage gaps --severity critical` filtra corretamente
- [x] Coverage: `coverage repair -n 5` repara até 5 gaps por ciclo
- [x] Coverage: `coverage status` mostra estado persistente entre execuções
- [x] Classifier: testes classificados como `useful` ou `cosmetic`
- [x] Pattern: `learn` detecta e registra padrões do código
- [x] MCP: servidor responde a `ai-devkit mcp --serve`

### Não funcionais

- [x] Repair loop: taxa de sucesso >= 75%
- [x] Classificação: precisão >= 90%
- [x] Ciclo autônomo: sem intervenção humana por ciclo completo

### Bloqueadores

- [x] Repair loop não entra em loop infinito (max 10 iterações)
- [x] Classificador não marca teste útil como cosmético (falso negativo < 5%)
- [x] MCP server: timeout de 30s em operações lentas
