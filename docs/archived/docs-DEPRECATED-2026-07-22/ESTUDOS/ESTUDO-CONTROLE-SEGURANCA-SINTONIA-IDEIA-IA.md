# Estudo S24 — Controle, Segurança e Sintonia IDEIA ↔ IA

> **Tipo:** `study`
> **Status:** `draft`
> **Data:** 2026-07-18
> **Propósito:** Garantir que o aumento de autonomia da IDEIA nunca resulte em perda de controle. Definir protocolos de colaboração bidirecional IDEIA↔IA, sistemas de segurança multicamada, perfis de usabilidade adaptativos e mecanismos de continuidade de projetos em produção.

---

## Fase 1: Pesquisa

### 1.1 Contexto

- **Problema:** Com a crescente autonomia da IDEIA (S23 — Self-Optimization, InitiativeEngine, Technology Radar, Auto-ADR), o risco de perda de controle aumenta proporcionalmente. O usuário precisa de garantias absolutas de que:
  1. Nenhuma alteração autônoma quebra o projeto em produção
  2. Decisões humanas são respeitadas e nunca sobrescritas
  3. A IDEIA e a IA trabalham em sintonia, não em competição
  4. Projetos nunca param por falta de decisão humana
  5. A IDEIA sabe quando pedir ajuda à IA e vice-versa
- **Público:**
  - **Usuário (dev/gestor):** Quer controle sem precisar microgerenciar
  - **IA (assistente de código):** Quer contexto, ferramentas e autonomia para agir
  - **IDEIA (plataforma):** Quer garantir que suas ações são seguras e reversíveis
- **Restrições:**
  - Zero alterações não-autorizadas em produção
  - Todo bypass deve ser auditado
  - Mecanismo de "emergency stop" sempre disponível
  - Perfil de usabilidade adaptativo (aprende com o comportamento do usuário)

### 1.2 Riscos Mapeados (Prévios)

| Risco | Probabilidade | Impacto | Categoria |
|-------|--------------|---------|-----------|
| Loop de auto-modificação sem fim | Muito Baixa | Crítico | Técnico |
| Alteração autônoma quebra produção | Baixa | Crítico | Negócio |
| IA e IDEIA divergem em decisão | Média | Alto | Colaboração |
| Usuário não entende o que a IDEIA fez | Alta | Alto | UX |
| Decisão humana ignorada por autonomia | Muito Baixa | Crítico | Segurança |
| Projeto para por falta de decisão | Média | Alto | Continuidade |
| Viés nas recomendações da IDEIA | Média | Médio | Qualidade |
| Dependência excessiva da autonomia | Alta | Médio | Governança |

### 1.3 Abordagens Consideradas

| Abordagem | Descrição | Maturidade |
|-----------|-----------|------------|
| **Autonomy Control Tower** | Painel centralizado com todos os controles de autonomia, emergência, e histórico | Média |
| **Bidirectional Help Protocol (BHP)** | Protocolo formal de ajuda mútua IDEIA↔IA com níveis de urgência | Nova |
| **Usability Profile Engine** | Perfil adaptativo que aprende preferências do usuário ao longo do tempo | Média |
| **Continuity Scheduler** | Escalonador que mantém projetos em andamento mesmo com decisões pendentes | Nova |
| **Safety Circuit Breaker** | Circuito de segurança que desliga autonomia se detectar anomalias | Alta |

---

## Fase 2: Arquitetura de Controle

### 2.1 Autonomy Control Tower

```
┌──────────────────────────────────────────────────────────────────┐
│                    AUTONOMY CONTROL TOWER                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ STATUS PANEL  │  │ EMERGENCY    │  │ DECISION LOG           │ │
│  │               │  │ CONTROLS     │  │                        │ │
│  │ ● Autonomy:   │  │              │  │ [2026-07-18 14:32]     │ │
│  │   Active      │  │ [EMERGENCY   │  │   Auto-fix: LICENSE    │ │
│  │ ● Level:      │  │  STOP]      │  │   Status: OK           │ │
│  │   Autonomous  │  │              │  │ [2026-07-18 14:28]     │ │
│  │ ● Health:     │  │ [PAUSE ALL]  │  │   Tech Radar: Redis    │ │
│  │   98%         │  │              │  │   Action: Recommend    │ │
│  │ ● Last Fix:   │  │ [ROLLBACK    │  │   Decision: Approved   │ │
│  │   2min ago    │  │  LAST]       │  │                        │ │
│  │ ● Pending:    │  │              │  │ [VIEW ALL →]           │ │
│  │   3 decisions  │  │              │  │                        │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ACTIVITY TIMELINE                                        │   │
│  │  ● 14:32 │ Auto-fix LICENSE created │ →  ✓ Success       │   │
│  │  ● 14:28 │ Tech Radar: Redis 7.4    │ →  ⏳ Pending human │   │
│  │  ● 14:25 │ User changed level       │ →  assisted→auto   │   │
│  │  ● 14:00 │ Cycle #47 complete       │ →  3 fixes applied  │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

**Componentes:**
- **Status Panel:** Nível atual, saúde, última ação, decisões pendentes
- **Emergency Controls:** STOP, PAUSE, ROLLBACK LAST — sempre acessíveis
- **Decision Log:** Histórico completo e auditável de todas as decisões autônomas
- **Activity Timeline:** Linha do tempo visual das ações da IDEIA

### 2.2 Safety Circuit Breaker (5 Gatilhos)

| Gatilho | Condição | Ação | Recuperação |
|---------|----------|------|-------------|
| **Loop Detection** | > 5 auto-fixes no mesmo arquivo em 1h | PAUSE autononia + alerta | Manual (humano) |
| **Regression Spike** | Test coverage cai > 5% após auto-fix | ROLLBACK + bloqueio | Após verificação |
| **Breakage Chain** | 3+ contratos quebrados em sequência | PAUSE + diagnóstico | Auto após correção |
| **Resource Exhaustion** | Memória > 80% ou CPU > 90% | DEGRADED (só scan) | Auto quando normalizar |
| **User Override** | Usuário clica STOP | STOP imediato | Manual (humano) |

### 2.3 Níveis de Controle (Matriz Decisão × Autonomia)

| Tipo de Decisão | Passive | Assisted | Autonomous | Emergency |
|----------------|---------|----------|------------|-----------|
| **Auto-fix: LICENSE missing** | Reporta | Pergunta | Executa | Executa |
| **Auto-fix: package.json version** | Reporta | Pergunta | Executa | Executa |
| **Auto-fix: .env tracked** | Reporta | Pergunta | Pergunta** | Executa |
| **Auto-fix: dependency update** | Reporta | Pergunta | Executa (minor) | Executa |
| **Technology Radar: new dep** | Reporta | Pergunta | Pergunta | Skip |
| **Self-modify: initiative code** | Bloqueia | Bloqueia | Pergunta | Bloqueia |
| **Self-modify: core contract** | Bloqueia | Bloqueia | Bloqueia | Bloqueia |
| **Project auto-optimization** | Reporta | Pergunta | Executa | Executa |
| **Cross-space operation** | Bloqueia | Bloqueia | Bloqueia | Bloqueia** |

**Legenda:**
- **Reporta:** Apenas notifica no painel
- **Pergunta:** Cria uma decisão pendente para o humano
- **Executa:** Realiza a ação automaticamente
- **Bloqueia:** Não executa de forma alguma
- **Pergunta****: Pergunta, mas se não respondido em 1h, executa
- **Bloqueia****: Bloqueia sempre, mesmo em emergência

---

## Fase 3: Protocolo de Sintonia IDEIA ↔ IA (BHP)

### 3.1 Bidirectional Help Protocol (BHP)

A IDEIA e a IA trabalham em sintonia perfeita através do BHP, um protocolo formal de ajuda mútua.

```
┌─────────────────────────────────────────────────────────────────────┐
│                   BHP — BIDIRECTIONAL HELP PROTOCOL                  │
│                                                                      │
│  ┌────────────────┐          ┌────────────────┐                     │
│  │     IDEIA      │◄────────►│      IA        │                     │
│  │  (Platform)    │   BHP    │  (Assistant)   │                     │
│  │                │─────────►│                │                     │
│  │  Fornece:      │  HELP    │  Fornece:      │                     │
│  │  • Contexto    │◄─────────┤  • Estratégia  │                     │
│  │  • Métricas    │  HELP    │  • Plano       │                     │
│  │  • Comandos    │          │  • Código      │                     │
│  │  • Histórico   │          │  • Explicação  │                     │
│  │  • Perfil      │          │  • Sugestões   │                     │
│  └────────────────┘          └────────────────┘                     │
│            │                        │                               │
│            ▼                        ▼                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 DECISION ENGINE                              │   │
│  │  Une informação da IDEIA + estratégia da IA → decisão       │   │
│  │  Se consenso → executa                                      │   │
│  │  Se divergência → escalation para humano                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Tipos de Ajuda

| Tipo | Direção | Descrição | Gatilho |
|------|---------|-----------|---------|
| **⚠️ HELP!** | IA → IDEIA | IA precisa de contexto ou ferramentas | Comando complexo, falta de informações |
| **⚠️ HELP!** | IDEIA → IA | IDEIA precisa de estratégia ou código | Decisão ambígua, padrão não reconhecido |
| **📊 STATS** | IDEIA → IA | IDEIA fornece métricas e perfil de usabilidade | Início de sessão, mudança de contexto |
| **📋 PLAN** | IA → IDEIA | IA submete plano de execução | Antes de qualquer ação autônoma |
| **✅ APPROVE** | IDEIA → IA | IDEIA aprova execução | Plano dentro das regras de autonomia |
| **❌ REJECT** | IDEIA → IA | IDEIA rejeita execução | Plano viola regras de segurança |
| **❓ CLARIFY** | IDEIA → IA | IDEIA pede esclarecimentos | Plano ambíguo ou incompleto |
| **🔄 ADAPT** | IDEIA → IA | Ajusta comportamento baseado em perfil | Mudança de padrão de uso detectada |

### 3.3 Fluxo BHP Completo

```
IA: "Vou criar um CRUD de usuários com autenticação"
  → IDEIA.analyze(intent)
    → Fornece contexto: projeto usa NestJS + PostgreSQL
    → Fornece perfil: usuário prefere DTOs com Zod
    → Fornece métricas: cobertura atual 45%, alvo 80%
  → IA.plan(contexto + perfil + métricas)
    → Gera plano: [entity, dto, service, controller, test, docs]
  → IDEIA.evaluate(plan)
    → Verifica: plano dentro da política? Sim
    → Verifica: plano compatível com contratos C1-C18? Sim
    → APPROVE: "Plano aprovado. Executar?"
  → IA.execute(plan)
    → Gera código + testes
  → IDEIA.verify(resultado)
    → Roda linter, typecheck, testes
    → Atualiza cobertura (agora 52%)
    → Registra no audit trail
    → "CRUD criado. Cobertura: 52% (+7%). Continuar?"
```

### 3.4 Usability Profile Engine

A IDEIA constrói um perfil de usabilidade do usuário ao longo do tempo:

```
Perfil do Usuário (aprendido após 100+ interações):
├── Preferências Técnicas
│   ├── Linguagens favoritas: TypeScript, Go
│   ├── Frameworks: NestJS, React
│   ├── Padrões: Clean Architecture, DDD
│   └── Testes: Jest (unit + integration)
├── Comportamento de Autonomia
│   ├── Nível preferido: assisted (60% das vezes)
│   ├── Trocou para autonomous: 30% (tarefas repetitivas)
│   ├── Trocou para passive: 10% (auditoria)
│   ├── Aprova auto-fixes: 85% das vezes
│   ├── Rejeita auto-fixes: 15% (quase sempre .env related)
│   └── Tempo médio para responder: 2min
├── Métricas de Qualidade
│   ├── Coverage target preferido: 80%
│   ├── Lint strictness: alta
│   └── Review depth: profunda
└── Padrões de Trabalho
    ├── Horário mais produtivo: 8h-12h
    ├── Commits por dia: 5-10
    ├── Preferência por automação: alta
    └── Tolerância a riscos: baixa
```

**O perfil é usado para:**
- Sugerir o nível de autonomia ideal no momento certo
- Ajustar o comportamento da IA (estilo de código, profundidade de explicação)
- Prever decisões do usuário (auto-aprovar se match > 90%)
- Detectar anomalias (comportamento diferente do perfil → alerta)

### 3.5 Decision Continuity Engine

Projetos NUNCA param por falta de decisão humana:

```
Status: AGUARDANDO DECISÃO HUMANA (checkpoint #42)
├── ⏳ Tempo decorrido: 5min
├── 👤 Decisor: João (tech-lead)
├── ⚠️ Impacto: Bloqueia deploy de 3 serviços
│
└── Ações da IDEIA (continuidade):
    ├── ✅ Auto-continue em: 55min (se não responder)
    ├── 🔄 Tarefas alternativas sugeridas: [refatorar module X, docs Y]
    ├── 📋 Escalation: Tech-lead → Manager (em 30min)
    └── 🚀 Deploy: Pipeline em hold, mas dev continua

═══════════════════════════════════════════════

Status: DECISÃO AUTÔNOMA (com perfil adaptativo)
├── Decisão: Auto-fix LICENSE (match perfil: 95%)
├── ⏱️ Tempo economizado: 2min (vs esperar aprovação)
├── 📊 Histórico: 47/50 auto-fixes aprovados (94%)
│
└── Ações da IDEIA:
    ├── Executou sem perguntar (match > 90%)
    ├── Notificou no painel (dismissible)
    └── Se rejeitado: rollback + ajustar perfil
```

**Regras de Continuidade:**

| Situação | Ação da IDEIA | Prazo |
|----------|--------------|-------|
| Decisão pendente há < 5min | Aguarda normalmente | — |
| Decisão pendente há 5-15min | Sugere tarefas alternativas | Imediato |
| Decisão pendente há 15-30min | Escalation para próximo nível | 15min |
| Decisão pendente há 30-60min | Auto-continue (se perfil permitir) | 30min |
| Decisão pendente > 60min | Auto-continue forçado (com rollback disponível) | Imediato |
| Perfil match > 90% | Auto-decide sem perguntar | Imediato |
| Perfil match 70-90% | Pergunta mas já prepara execução | 2s |
| Perfil match < 70% | Pergunta e aguarda | — |

---

## Fase 4: Segurança e Recuperação

### 4.1 Camadas de Segurança (7 Layers)

```
┌─────────────────────────────────────────────────────────────┐
│  L7 — HUMAN OVERRIDE     (STOP/PAUSE/ROLLBACK buttons)      │
├─────────────────────────────────────────────────────────────┤
│  L6 — SAFETY CIRCUIT     (Loop/Regression/Breakage detect)  │
├─────────────────────────────────────────────────────────────┤
│  L5 — AUTONOMY POLICY    (Matriz decisão × nível)           │
├─────────────────────────────────────────────────────────────┤
│  L4 — CONTRACT ENFORCE   (C1-C18 validation antes de agir)  │
├─────────────────────────────────────────────────────────────┤
│  L3 — SCOPE ISOLATION    (Self-space × Project-space)       │
├─────────────────────────────────────────────────────────────┤
│  L2 — AUDIT TRAIL        (Hash chain, imutável)             │
├─────────────────────────────────────────────────────────────┤
│  L1 — ROLLBACK READY     (Backup antes de cada alteração)   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Emergency Stop (E-Stop)

Acionado por:
1. Botão físico no painel (sempre visível)
2. Comando CLI: `ai-devkit emergency stop`
3. Atalho de teclado: `Ctrl+Alt+Shift+E`
4. API: `POST /api/emergency/stop`
5. Detecção automática (Safety Circuit Breaker)

**Efeitos do E-Stop:**
1. Para imediatamente todo ciclo autônomo em andamento
2. Bloqueia novos ciclos de iniciarem
3. Salva checkpoint do estado atual
4. Notifica todos os listeners (WebSocket, EventBus)
5. Registra no audit trail com severidade CRITICAL
6. Entra em modo "safety" (apenas scan, sem auto-fix)

**Recuperação do E-Stop:**
1. Humano analisa o checkpoint salvos
2. Decide: ROLLBACK, CONTINUE, ou RESUME
3. Se ROLLBACK: reverte todas as alterações do último ciclo
4. Se CONTINUE: mantém alterações, mas desativa auto-mode
5. Se RESUME: volta ao modo anterior

### 4.3 Rollback Automático

Cada alteração autônoma gera automaticamente:

```
┌────────────────────────────────────────────┐
│ ROLLBACK POINT #47                         │
│ Data: 2026-07-18 14:32:15                  │
│ Escopo: self-space                         │
│ Tipo: auto-fix                             │
│ Ações:                                     │
│   1. [file:create] /usr/lib/ideia/LICENSE  │
│      Backup: /tmp/rollback/47/LICENSE.bak  │
│   2. [config:set] package.json: version    │
│      Anterior: "1.0.0"                     │
│      Novo: "1.0.1"                         │
│ Status: active                             │
│ Comando: ai-devkit emergency rollback 47   │
└────────────────────────────────────────────┘
```

### 4.4 Matriz de Recuperação

| Cenário | Detecção | Ação | Tempo Recuperação |
|---------|----------|------|-------------------|
| Auto-fix quebra teste | TestScanner pós-fix | Rollback automático | <10s |
| Loop de auto-modificação | Safety Circuit | E-Stop + alerta | <5s |
| Contrato quebrado | ContractScanner | Rollback do contrato | <30s |
| Perfil de decisão anômalo | Usability Profiler | Alerta + reduz autonomia | <1s |
| Recurso exausto | PerfScanner | Degraded mode | <2s |
| Decisão humana ignorada | Audit Trail | E-Stop + investigação | Imediato |
| Violação de isolamento | ScopeScanner | Bloqueio + alerta | <50ms |

---

## Fase 5: Implementação

### 5.1 Comandos do Sistema de Controle

| Comando | Descrição | Nível |
|---------|-----------|-------|
| `ai-devkit emergency stop` | Para toda autonomia imediatamente | Segurança |
| `ai-devkit emergency pause` | Pausa ciclos em andamento | Segurança |
| `ai-devkit emergency rollback <id>` | Reverte alteração específica | Segurança |
| `ai-devkit emergency resume` | Retoma operação normal | Segurança |
| `ai-devkit autonomy status` | Mostra status atual de autonomia | Monitor |
| `ai-devkit autonomy timeline` | Histórico de decisões e ações | Monitor |
| `ai-devkit profile show` | Mostra perfil de usabilidade | Config |
| `ai-devkit profile reset` | Reseta perfil aprendido | Config |
| `ai-devkit bhp help` | IDEIA pede ajuda à IA | Colaboração |
| `ai-devkit bhp status` | Status do protocolo BHP | Colaboração |

### 5.2 Eventos do Sistema de Controle

| Evento | Publisher | Subscriber | Severidade |
|--------|-----------|------------|------------|
| `control.emergency.stop` | E-Stop | Todos os cycles, EventBus | 🔴 CRITICAL |
| `control.emergency.pause` | Safety Circuit | InitiativeEngine, ScannerPool | 🔴 HIGH |
| `control.emergency.rollback` | Human/System | AutonomousEditor, RealitySync | 🟠 MEDIUM |
| `control.autonomy.changed` | User/Safety | EventBus, AuditTrail, Profile | 🟢 INFO |
| `control.contract.broken` | ContractScanner | SafetyCircuit, AuditTrail | 🔴 CRITICAL |
| `control.loop.detected` | SafetyCircuit | E-Stop, EventBus | 🔴 CRITICAL |
| `control.profile.updated` | ProfileEngine | EventBus, AI, Autonomy | 🟢 INFO |
| `control.bhp.help.requested` | IDEIA/AI | AI/IDEIA, DecisionEngine | 🟠 MEDIUM |
| `control.bhp.plan.submitted` | AI | IDEIA, DecisionEngine | 🟢 INFO |
| `control.bhp.decision` | DecisionEngine | AI, IDEIA, Executor | 🟠 MEDIUM |

### 5.3 Tasks Geradas

| Task | Descrição | Esforço | Prioridade |
|------|-----------|---------|------------|
| TASK-IDEIA-S24-01 | Autonomy Control Tower (React panel) | 2-3 sem | P0 |
| TASK-IDEIA-S24-02 | Safety Circuit Breaker (5 gatilhos) | 2 sem | P0 |
| TASK-IDEIA-S24-03 | Bidirectional Help Protocol (BHP) | 3 sem | P0 |
| TASK-IDEIA-S24-04 | Usability Profile Engine | 2 sem | P1 |
| TASK-IDEIA-S24-05 | Decision Continuity Engine | 2 sem | P0 |
| TASK-IDEIA-S24-06 | E-Stop + Emergency Rollback | 1 sem | P0 |
| TASK-IDEIA-S24-07 | 7-Layer Safety Architecture | 2 sem | P0 |
| TASK-IDEIA-S24-08 | CLI commands de controle | 1 sem | P1 |
| TASK-IDEIA-S24-09 | Eventos de controle no EventBus | 1 sem | P1 |
| TASK-IDEIA-S24-10 | Testes de segurança (chaos engineering) | 2 sem | P1 |

### 5.4 Critérios de Sucesso

- Zero incidentes de perda de controle em produção
- Tempo de rollback < 30s para qualquer alteração autônoma
- Perfil de usabilidade acurado após 50 interações (> 90% match)
- Projetos nunca param por falta de decisão humana
- IDEIA ↔ IA colaboram sem conflitos de decisão
- E-Stop funcional em < 1s em qualquer cenário

---

## Conexões com Estudos Existentes

| Estudo | Conexão |
|--------|---------|
| S4 — Segurança | PolicyEngine + SafetyCircuit + 7 Layers |
| S14 — Autenticação | E-Stop requer autenticação |
| S18 — AI Safety | AlignmentScore para BHP |
| S23 — Auto-Evolução | SafetyCircuit protege auto-fix |
| C19 — Isolamento | Scope Isolation Layer |
| C9 — Policy Engine | Autonomy Policy Matrix |
| C8 — Audit Trail | Rollback Points + Hash Chain |
| InitiativeEngine | SafetyCircuit monitora ciclos |

---

## Documentos Gerados

- [x] Estudo: `docs/ESTUDOS/ESTUDO-CONTROLE-SEGURANCA-SINTONIA-IDEIA-IA.md`
- [ ] ADR: `docs/adr/ADR-013-controle-sintonia.md` (pendente)
- [ ] Tarefas: TASK-IDEIA-S24-01 a TASK-IDEIA-S24-10
- [ ] Gap: GAPS-PRODUCAO-IDE.md atualizado

---

## Intensificação

### Riscos Detalhados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:------------:|:-------:|-----------|
| **False positive in Safety Circuit** — Alarme disparado sem necessidade, interrompendo fluxo legítimo | Alta | Médio | Adaptive thresholds com aprendizado por perfil; cooldown entre disparos; override documentado |
| **BHP protocol overhead** — Mensagens BHP aumentam latência em operações simples | Média | Baixo | BHP apenas para opções N3-N4; cache de decisões frequentes; timeout configurável |
| **E-Stop not triggered when needed** — Falha no mecanismo de parada de emergência | Baixa | Crítico | Teste funcional semanal; heartbeat do E-Stop; fallback via kill switch físico (CLI `--force-stop`) |
| **Audit trail bypass** — Operação crítica não registrada no audit trail | Baixa | Crítico | Hash chain obrigatória; validação pós-operação; alerta se gap no chain |

### Métricas de Sucesso

| Métrica | Atual | Target | Ferramenta |
|---------|:-----:|:------:|-----------|
| E-Stop response time | N/A | ≤100ms | Benchmarks no trigger |
| BHP throughput | N/A | ≥100 msg/s | Benchmarks no protocolo |
| Rollback success rate | 0% (manual) | ≥99% | Testes de rollback automatizados |
| False positive rate (Safety) | N/A | ≤1% | Monitoramento contínuo |

### Timeline

| Fase | Semanas | Entregas |
|------|:-------:|----------|
| **Phase 1: Control Tower + E-Stop** | 1-3 | Control Tower com dashboard; E-Stop multi-canal (CLI + API + UI); heartbeat monitor; testes semanais |
| **Phase 2: BHP + Safety Circuit** | 4-6 | Protocolo BHP bidirecional IDEIA↔IA; Safety Circuit com 7 layers; adaptive thresholds |
| **Phase 3: Continuity + Profile** | 7-10 | Continuity engine para produção; perfil de segurança adaptativo; rollback automático |

### Plano de Testes

| Tipo | Escopo | Ferramenta |
|------|--------|-----------|
| **Unit** | Cada safety trigger (E-Stop, Circuit, BHP validation); cálculo de AlignmentScore; parser de política | Vitest |
| **Integration** | BHP message flow IDEIA ↔ IA; Safety Circuit → Rollback pipeline; E-Stop → Kill chain completo | Vitest + NATS test |
| **E2E** | E-Stop via CLI, API e UI; rollback de alteração em produção; continuity failover | Playwright + k6 |

### Conexões com Estudos

| Estudo | Conexão |
|--------|---------|
| **S23 — Self-Optimization** | SafetyCircuit protege ciclos de auto-evolução; E-Stop pode interromper evolução descontrolada |
| **S25 — Perfis** | Perfil do usuário determina sensibilidade do Safety Circuit e nível de BHP |
| **T1 — Topologia** | Contratos C8 (Audit Trail), C9 (Policy Engine), C19 (Isolamento) são implementados aqui |
| **S18 — AI Safety** | BHP usa AlignmentScore definido no S18 |
| **INT — Intensificação** | Este estudo é alvo de intensificação para score ≥ 4 |
