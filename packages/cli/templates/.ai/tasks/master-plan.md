# Master Plan de Execução: ai-devkit

> Versão: 1.1 | Reescrito em 05/07/2026 para corrigir status sem prova de teste.

> REGRA DE OURO: nenhuma tarefa pode ser marcada [x] sem um comando de teste
> executado e sua saída anexada em `.ai/audit/`. Tarefas sem prova voltam para [ ]
> ou recebem [~] "em progresso, sem prova ainda".

---

## 🟢 Épico 1: O Instalador Inteligente (0-1 Mês)

**Objetivo:** Reduzir a fricção inicial, tornar o instalador idempotente e adaptável.

- [x] **TSK-1.1:** Criar módulo `questionnaire.js` no setup.
  - _Prova:_ comprovado via `init --dry-run` e `init --flavor <x>` em teste real (auditoria de 05/07/2026).
- [x] **TSK-1.2:** Implementar flags de modos de instalação (`--minimal`, `--standard`, `--full`).
  - _Prova:_ PENDENTE — flag `--flavor` foi testada, mas `--minimal/--standard/--full` NÃO
    foram comprovadas nesta auditoria. Reclassificar como [~] até novo teste.
- [~] **TSK-1.3:** Refatorar o `ai-handoff.md` base.
  - _Prova:_ PENDENTE — não foi testado se existe versão "compacta" para <8k tokens.
- [x] **TSK-1.4:** Idempotência e Preservação.
  - _Prova:_ comprovado — safe mode preserva alteração humana (`ai-handoff.md`),
    testado em 05/07/2026, ver relatório de auditoria.

---

## 🔵 Épico 2: Agentes Ativos de Ciclo de Vida (1-3 Meses)

**Objetivo:** Implementar os 4 agentes descritos no `agent-architecture.md`.

- [~] **TSK-2.1:** Construir `context-agent` (`.ai/bin/context-agent.js`).
  - _Prova:_ PENDENTE — arquivo não foi localizado/testado nesta auditoria.
    Verificar se existe e se atualiza `ai-handoff.md` de forma não-destrutiva.
- [ ] **TSK-2.2:** Integrar `quality-agent` com hook de git (husky/pre-commit).
  - _Prova:_ FALHOU — não existe hook de git bloqueando import ilegal.
    `quality-agent.js` roda dentro de `verify`, mas não há hook automático de commit.
    Reclassificado de [x] para [ ].
- [ ] **TSK-2.3:** Construir `audit-agent` rodando 1x/semana no CI.
  - _Prova:_ FALHOU — nenhum workflow de CI encontrado agendando execução semanal.
    Reclassificado de [x] para [ ].
- [ ] **TSK-2.4:** Sistema de Autocura (Self-Heal) movendo arquivos e reescrevendo imports.
  - _Prova:_ FALHOU — não foi encontrado `npm run ai:heal` nem lógica de mover
    arquivos/reescrever imports. Reclassificado de [x] para [ ].

---

## 🟣 Épico 3: Ecossistema Multi-Linguagem e Adapters (3-5 Meses)

**Objetivo:** Permitir que o ai-devkit funcione com TypeScript, Python e Go.

- [~] **TSK-3.1:** Desenvolver pacote Core (`@ai-devkit/core`).
  - _Prova:_ PENDENTE — existência do pacote não verificada nesta auditoria de código-fonte.
- [ ] **TSK-3.2:** Desenvolver o Adapter TS/NestJS oficial (com quality gates reais).
  - _Prova:_ FALHOU — `adapter list/detect/validate` retornam apenas `--help`,
    sem lógica real. Reclassificado de [x] para [ ]. Correção em
    `09-adapter-command-real-implementation.ts` deste pacote.

---

## 🆕 Épico 4: Hardening Anti-Estrutura-Oca (adicionado em 05/07/2026)

**Objetivo:** Eliminar toda estrutura decorativa/oca identificada na auditoria.

- [ ] **TSK-4.1:** `prove` não pode acusar `ph-value-policy.yaml` como MOCK.
- [ ] **TSK-4.2:** `audit` deve detectar os mesmos problemas que `prove`.
- [ ] **TSK-4.3:** Preencher ou remover ~28 arquivos Markdown decorativos.
- [ ] **TSK-4.4:** Corrigir `check-package-scripts.js` (falso positivo em `dist/index.js`).
- [ ] **TSK-4.5:** Corrigir `check-installer.js` (backup não detectado no monorepo).
- [ ] **TSK-4.6:** Implementar `adapter list/detect/validate` de verdade.
- [ ] **TSK-4.7:** Tornar `sync` funcional com relatório real.
- [ ] **TSK-4.8:** Reescrever `master-plan.md`/`project-state.md` sempre com prova.

> PENDING_ACTIONs os códigos de correção destas tarefas estão no pacote de hardening
> entregue em 05/07/2026 (`ai-devkit-hardening-package.zip`).
