# Matriz de PriorizaÃ§Ã£o v2.1 / v2.2

> Gerado pelo modelo `version-priority.ts` â€” Fase 6.

## CritÃ©rio de pontuaÃ§Ã£o

```
benefit  = impact + (stabilizesBase ? 20 : 0) + (boostsAutonomy ? 15 : 0)
penalty  = risk + effort + dependencyCount * 5
score    = benefit - penalty
```

## Matriz

| # | Feature | Impact | Risk | Effort | Deps | Estabiliza | Autonomia | Score | Target |
|---|---------|--------|------|--------|------|------------|-----------|-------|--------|
| 1 | CLI Consolidation (F04) | 8 | 2 | 5 | 0 | Sim | NÃ£o | **21** | v2.1 |
| 2 | Governance Docs (registry) | 7 | 1 | 3 | 0 | Sim | NÃ£o | **23** | v2.1 |
| 3 | Document Resolver | 8 | 2 | 4 | 1 | Sim | NÃ£o | **17** | v2.1 |
| 4 | Document Policy | 7 | 1 | 3 | 0 | Sim | NÃ£o | **23** | v2.1 |
| 5 | Document Audit | 6 | 2 | 4 | 1 | Sim | NÃ£o | **15** | v2.1 |
| 6 | Planning System (F02) | 8 | 2 | 5 | 1 | Sim | NÃ£o | **16** | v2.1 |
| 7 | Task Validator | 7 | 2 | 4 | 1 | Sim | NÃ£o | **16** | v2.1 |
| 8 | Coverage Reader | 7 | 1 | 3 | 0 | Sim | NÃ£o | **23** | v2.1 |
| 9 | Gap Prioritizer | 8 | 2 | 4 | 1 | NÃ£o | Sim | **17** | v2.2 |
| 10 | Test Quality Classifier | 7 | 2 | 3 | 1 | NÃ£o | Sim | **17** | v2.2 |
| 11 | Test Repair Loop | 9 | 4 | 6 | 2 | NÃ£o | Sim | **10** | v2.2 |
| 12 | Autonomy Status Persistence | 7 | 1 | 2 | 0 | Sim | Sim | **39** | v2.1 |
| 13 | Extension Cockpit (F05) | 8 | 3 | 6 | 1 | Sim | NÃ£o | **13** | v2.1 |
| 14 | Extension Backlog View | 6 | 1 | 3 | 1 | Sim | NÃ£o | **17** | v2.1 |
| 15 | Extension Metrics View | 5 | 1 | 3 | 1 | Sim | NÃ£o | **16** | v2.1 |
| 16 | Security Baseline | 9 | 3 | 5 | 2 | Sim | NÃ£o | **11** | v2.1 |
| 17 | Compliance Mapping | 7 | 4 | 5 | 2 | Sim | NÃ£o | **6** | v2.1 |
| 18 | Contract Validation | 8 | 2 | 4 | 1 | Sim | NÃ£o | **17** | v2.1 |
| 19 | Scorecard System | 7 | 1 | 4 | 1 | Sim | NÃ£o | **17** | v2.1 |
| 20 | Audit System | 8 | 1 | 4 | 1 | Sim | NÃ£o | **18** | v2.1 |
| 21 | Observability | 7 | 3 | 5 | 2 | Sim | NÃ£o | **7** | v2.1 |
| 22 | IO Isolation (F04) | 6 | 1 | 2 | 0 | Sim | NÃ£o | **24** | v2.1 |
| 23 | Code Generators (31) | 8 | 2 | 8 | 3 | Sim | NÃ£o | **5** | v2.1 |
| 24 | Adapters (13 langs) | 7 | 3 | 8 | 3 | Sim | NÃ£o | **3** | v2.1 |
| 25 | Pattern Learning | 6 | 4 | 5 | 2 | NÃ£o | Sim | **5** | v2.2 |
| 26 | Context Store | 7 | 2 | 4 | 1 | Sim | NÃ£o | **16** | v2.1 |
| 27 | Multi-agent Platform | 9 | 8 | 9 | 5 | NÃ£o | NÃ£o | **-39** | post-v2.2 |
| 28 | Plugin System | 6 | 5 | 6 | 3 | NÃ£o | NÃ£o | **-8** | post-v2.2 |
| 29 | RAG Engine | 7 | 5 | 7 | 3 | NÃ£o | Sim | **-8** | post-v2.2 |
| 30 | AI Engineer | 8 | 7 | 9 | 4 | NÃ£o | Sim | **-17** | post-v2.2 |
| 31 | Local AI Engine | 7 | 6 | 8 | 3 | NÃ£o | NÃ£o | **-12** | post-v2.2 |
| 32 | Cognitive Coprocessor | 7 | 6 | 7 | 3 | NÃ£o | NÃ£o | **-9** | post-v2.2 |
| 33 | Release System | 6 | 2 | 5 | 2 | Sim | NÃ£o | **12** | v2.1 |
| 34 | Runtime Hooks | 5 | 4 | 4 | 2 | Sim | NÃ£o | **10** | v2.1 |
| 35 | MCP Server | 6 | 4 | 5 | 2 | NÃ£o | Sim | **5** | v2.2 |

## DistribuiÃ§Ã£o

| Target | Count | Features |
|--------|-------|----------|
| **v2.1** | 24 | 1-8, 12-20, 21-24, 26, 33-34 |
| **v2.2** | 5 | 9-11, 25, 35 |
| **post-v2.2** | 6 | 27-32 |
