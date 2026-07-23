# Plano de Migração — v2 → v3

> Fase: **pre-v3**. Estratégia: encapsular → abstrair → contratar → migrar por borda.

---

## Princípios

1. **Não parar a v2** — v2 continua operando durante a migração
2. **Migrar por borda** — começar pelos limites do sistema (CLI → API)
3. **Contratos primeiro** — definir API antes de implementar
4. **Reverter sem trauma** — manter compatibilidade com configs existentes

---

## Fases da Migração

### Fase M1 — Encapsular (agora, dentro da v2)

| Ação                                                         | Módulo               | Esforço | Risco |
| ------------------------------------------------------------ | -------------------- | ------- | ----- |
| Extrair lógica de commands/*.ts para domain/                 | CLI (85 comandos)    | Alto    | Médio |
| Centralizar IO em getIO()                                    | Todos                | Médio   | Baixo |
| Criar abstração de armazenamento (SettingsStore, StateStore) | governance, coverage | Médio   | Baixo |
| Tipar todos os schemas de JSON                               | data/*.json          | Baixo   | Baixo |

**Critério de pronto:** Nenhum comando chama `fs` ou `path` diretamente.

---

### Fase M2 — Abstrair (pós M1)

| Ação                                                    | Módulo             | Esforço | Risco |
| ------------------------------------------------------- | ------------------ | ------- | ----- |
| Separar transporte de domínio na CLI                    | CLI                | Alto    | Médio |
| Criar interfaces de execução (TaskEngine, PlanExecutor) | planning, runtime  | Alto    | Alto  |
| Estado persistente com contrato                         | coverage/status.ts | Médio   | Baixo |
| Multi-provedor de storage (fs local → opcional API)     | governance         | Médio   | Médio |

**Critério de pronto:** CLI pode ser substituída por outro transporte sem mudar domínio.

---

### Fase M3 — Contratar (pós M2)

| Ação                                        | Módulo    | Esforço | Risco |
| ------------------------------------------- | --------- | ------- | ----- |
| Implementar servidor REST (Fastify/Express) | novo      | Alto    | Alto  |
| Adaptar CLI para chamar API                 | CLI       | Alto    | Alto  |
| Adaptar extensão para chamar API            | extension | Médio   | Médio |
| Criar SDK de cliente                        | novo      | Médio   | Médio |

**Critério de pronto:** `ai-devkit status` funciona tanto via CLI direta quanto via API.

---

### Fase M4 — Migrar Núcleo (pós M3)

| Ação                                     | Módulo     | Esforço | Risco |
| ---------------------------------------- | ---------- | ------- | ----- |
| Mover governance para serviço dedicado   | governance | Alto    | Alto  |
| Mover planning para serviço com estado   | planning   | Alto    | Alto  |
| Mover autonomy para pipeline orquestrado | coverage   | Alto    | Alto  |
| Plugin system com SDK formal             | plugins    | Alto    | Alto  |

**Critério de pronto:** v3 pode rodar sem CLI instalada (apenas servidor + cliente).

---

## Ordem recomendada

```
Ordem | Ação                    | Módulo          | Fase
──────┼─────────────────────────┼─────────────────┼──────
1     │ Abstrair IO             │ Todos           │ M1
2     │ Tipar schemas JSON      │ data/           │ M1
3     │ Extrair domain/         │ CLI commands    │ M1
4     │ Interfaces de execução  │ planning, runtim│ M2
5     │ State store com contrato│ coverage        │ M2
6     │ Servidor REST           │ novo            │ M3
7     │ CLI como adapter        │ CLI             │ M3
8     │ Extension como cliente  │ extension       │ M3
9     │ SDK de cliente          │ novo            │ M3
10    │ Governance service      │ governance      │ M4
11    │ Planning service        │ planning        │ M4
12    │ Autonomy pipeline       │ coverage        │ M4
13    │ Plugin SDK              │ plugins         │ M4
```

---

## Compatibilidade retroativa

| v2 Feature                 | v3 Compatibilidade         | Plano                               |
| -------------------------- | -------------------------- | ----------------------------------- |
| settings.json              | ✅ Migrado automaticamente | Leitura no primeiro startup v3      |
| .ai/tasks/*.md             | ✅ ↔ Leitura + escrita     | Sincronização bidirecional          |
| autonomy-status.json       | ✅ Lido como fallback      | Substituído por state store         |
| project_history.json       | ❌ Descontinuado           | Substituído por audit log           |
| Comandos CLI existentes    | ✅ 100% compatível         | CLI v2 convive lado a lado          |
| Extensão VS Code existente | ✅ Compatível              | Fallback para CLI direta se API off |

---

## Riscos

| Risco                                       | Probabilidade | Impacto | Mitigação                                                       |
| ------------------------------------------- | ------------- | ------- | --------------------------------------------------------------- |
| Quebra de scripts que usam stdout da CLI    | Alta          | Alto    | Manter CLI v2 como fallback por 2 releases                      |
| Migração de 85 comandos leva meses          | Alta          | Médio   | Priorizar domínios mais usados (governance, planning, coverage) |
| Settings.json sem schema quebra na migração | Média         | Alto    | Validar schema antes de migrar                                  |
| Adapters multilíngue (13) perdem suporte    | Média         | Médio   | Pluginizar antes de descontinuar                                |
| Runtime (49 módulos) difícil de desacoplar  | Alta          | Alto    | Refatoração incremental, não total                              |
| Extensão perde performance chamando API     | Média         | Médio   | Cache local + polling inteligente                               |
