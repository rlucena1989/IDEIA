# Estudo S25 — Ajustes de Usuário, Perfis e Configuração da IDEIA

> **Tipo:** `study`
> **Status:** `draft`
> **Data:** 2026-07-18
> **Propósito:** Definir o sistema de configuração, perfis de usuário e ajustes finos que permitem a cada usuário adaptar a IDEIA ao seu estilo, contexto e necessidades — desde o iniciante que quer "só funcionar" até o expert que quer controle granular sobre cada aspecto da autonomia.

---

## Fase 1: Pesquisa

### 1.1 Contexto

- **Problema:** Com 24 estudos, 66 packages, 130+ comandos CLI, 18 contratos, 5 níveis de autonomia, 10 scanners, 2 espaços (self/project), 3 protocolos (BHP/MCP/A2A) — a IDEIA se torna complexa demais para o usuário comum. Cada usuário tem necessidades diferentes, tolerância a risco diferente, e familiaridade técnica diferente. Sem um sistema de ajustes adequado, a IDEIA será subutilizada (muito complexa) ou perigosa (configurada sem entender).
- **Público:**
  - **Iniciante:** Quer "só funcionar" — setup zero, configuração automática, explicações simples
  - **Dev experiente:** Quer controle granular, pode ajustar cada parâmetro
  - **Tech-lead/Gestor:** Quer políticas de equipe, conformidade, relatórios
  - **Integrador:** Quer API de configuração para automatizar setup
- **Restrições:**
  - Configuração nunca deve exigir edição manual de JSON/YAML
  - Toda configuração deve ter um valor padrão seguro (safe defaults)
  - Mudanças de configuração devem ser versionadas e reversíveis
  - Deve funcionar offline (sem depender de servidor externo)

### 1.2 Personas e Necessidades

| Persona | Nível Técnico | Tolerância a Risco | Preferência de Autonomia | O que mais valoriza |
|---------|--------------|-------------------|-------------------------|-------------------|
| **Ana — Iniciante** | Baixo | Mínima | Passive | "Só funciona", setup zero |
| **Carlos — Dev Fullstack** | Alto | Moderada | Assisted | Controle sem microgerenciar |
| **Diana — Tech Lead** | Muito Alto | Baixa (equipe) | Assisted c/ override | Políticas de equipe, relatórios |
| **Eduardo — SRE** | Expert | Alta | Autonomous | Automação total, scripts |
| **Fernanda — Gestora** | Baixo | Mínima | Passive | Dashboard, métricas, compliance |

---

## Fase 2: Arquitetura de Configuração

### 2.1 Sistema de Perfis (Presets)

Perfis prontos que configuram dezenas de parâmetros de uma vez:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    IDEIA — ONBOARDING WIZARD                        │
│                                                                     │
│  👋 Qual perfil melhor descreve você?                               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🧑‍💻  SOLO DEV                                          │   │
│  │     "Trabalho sozinho em projetos pessoais"                 │   │
│  │     Autonomia: Assisted | Risco: Baixo | Scans: Básicos    │   │
│  │     [ESCOLHER]                                             │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  👥  TECH LEAD                                            │   │
│  │     "Lidero um time de desenvolvimento"                    │   │
│  │     Autonomia: Assisted | Risco: Moderado | Scans: Todos  │   │
│  │     Políticas de equipe + relatórios de conformidade      │   │
│  │     [ESCOLHER]                                             │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  🚀  AUTOMATOR                                            │   │
│  │     "Quero máxima automação, mínimo de intervenção"        │   │
│  │     Autonomia: Autonomous | Risco: Alto | Scans: Todos    │   │
│  │     Auto-fix total + Technology Radar + Self-Healing       │   │
│  │     [ESCOLHER]                                             │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  🏢  ENTERPRISE MANAGER                                   │   │
│  │     "Preciso de governança, compliance e controle"         │   │
│  │     Autonomia: Passive | Risco: Mínimo | Scans: Auditoria  │   │
│  │     Dashboards + Relatórios + Approval Flow multi-nível   │   │
│  │     [ESCOLHER]                                             │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  ⚙️  CUSTOM                                               │   │
│  │     "Quero configurar cada detalhe manualmente"            │   │
│  │     Acesso a TODAS as configurações granulares            │   │
│  │     [ESCOLHER]                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Árvore de Configuração Completa

```
ideia (raiz)
├── autonomy (5 níveis)
│   ├── level: passive | assisted | autonomous
│   ├── riskThreshold: low | medium | high
│   ├── autoFixCategories: string[] (ex: ["package", "legal"])
│   ├── confirmBeforeWrite: boolean (default: true)
│   ├── maxAutoFixesPerCycle: number (default: 10)
│   └── requireHumanForCategories: string[] (ex: ["security"])
│
├── scanners (10 scanners)
│   ├── healthScanner: { enabled, interval, alertThreshold }
│   ├── versionScanner: { enabled, interval, autoFix }
│   ├── testScanner: { enabled, onBuild, failOnWarning }
│   ├── lintScanner: { enabled, onBuild, failOnError }
│   ├── perfScanner: { enabled, interval, p95threshold }
│   ├── securityScanner: { enabled, interval, blockOnCritical }
│   ├── contractScanner: { enabled, onPR, blockOnBreaking }
│   ├── techScanner: { enabled, interval, minScore }
│   ├── scopeScanner: { enabled, interval, blockOnViolation }
│   └── memoryScanner: { enabled, interval, patternMinFreq }
│
├── bhp (Bidirectional Help Protocol)
│   ├── enabled: boolean
│   ├── autoHelpThreshold: number (0-100, default: 70)
│   ├── maxPlanWaitTime: number (ms, default: 5000)
│   └── askForClarification: boolean (default: true)
│
├── continuity (Decision Continuity Engine)
│   ├── enabled: boolean
│   ├── autoContinueAfter: number (min, default: 30)
│   ├── escalationAfter: number (min, default: 15)
│   ├── escalationTarget: string (ex: "tech-lead")
│   └── autoDecideOnMatch: number (%, default: 90)
│
├── safety (Safety Circuit)
│   ├── loopDetection: { enabled, maxFixesPerFile: 5, windowMs: 3600000 }
│   ├── regressionSpike: { enabled, maxDropPercent: 5 }
│   ├── breakageChain: { enabled, maxBrokenContracts: 3 }
│   ├── resourceLimit: { enabled, maxMemoryPercent: 80, maxCpuPercent: 90 }
│   └── emergencyContact: string (email/webhook)
│
├── ui (Interface)
│   ├── language: "pt-BR" | "en-US" | "es"
│   ├── theme: "light" | "dark" | "system"
│   ├── sidebarPosition: "left" | "right"
│   ├── showAutonomyPanel: boolean (default: true)
│   ├── showDecisionLog: boolean (default: true)
│   ├── notificationLevel: "all" | "important" | "critical"
│   └── compactMode: boolean (default: false)
│
├── notifications (Canais de Notificação)
│   ├── email: { enabled, address, onEvents: string[] }
│   ├── slack: { enabled, webhook, channel, onEvents: string[] }
│   ├── webhook: { enabled, url, onEvents: string[] }
│   └── desktop: { enabled, showBanners, onEvents: string[] }
│
├── telemetry (Métricas de Uso)
│   ├── enabled: boolean (default: true)
│   ├── shareAnonymized: boolean (default: true)
│   ├── collectPerformance: boolean (default: true)
│   └── collectUsagePatterns: boolean (default: false)
│
└── advanced (Configurações Avançadas)
    ├── eventBusType: "memory" | "nats"
    ├── memoryStoreType: "json" | "sqlite" | "postgres"
    ├── llmProvider: "ollama" | "openai" | "anthropic" | "auto"
    ├── llmModel: string (ex: "gpt-4o", "claude-3.5")
    ├── llmEndpoint: string (URL customizada)
    └── customScripts: string[] (paths para hooks pós-auto-fix)
```

### 2.3 Matriz de Perfis × Configurações

| Configuração | Solo Dev | Tech Lead | Automator | Enterprise |
|-------------|----------|-----------|-----------|------------|
| **level** | `assisted` | `assisted` | `autonomous` | `passive` |
| **riskThreshold** | `low` | `medium` | `high` | `low` |
| **autoFixCategories** | pkg, quality | pkg, quality, gov | ALL exceto security | legal, gov |
| **confirmBeforeWrite** | true | true | false | true |
| **autoContinueAfter** | 30min | 15min | 5min | 60min |
| **autoDecideOnMatch** | 90% | 85% | 95% | 95% |
| **scanners.health** | ✅ | ✅ | ✅ | ✅ |
| **scanners.version** | ✅ | ✅ | ✅ | ✅ |
| **scanners.test** | ✅ | ✅ | ✅ | ✅ |
| **scanners.lint** | ✅ | ✅ | ✅ | ✅ |
| **scanners.perf** | ❌ | ✅ | ✅ | ✅ |
| **scanners.security** | ✅ | ✅ | ✅ | ✅ |
| **scanners.contract** | ❌ | ✅ | ✅ | ✅ |
| **scanners.tech** | ❌ | ✅ | ✅ | ❌ |
| **scanners.scope** | ✅ | ✅ | ✅ | ✅ |
| **scanners.memory** | ❌ | ✅ | ✅ | ❌ |
| **notifications** | desktop | desktop+email | slack | email+slack+webhook |
| **telemetry** | anônimo | anônimo | completo | mínimo |
| **eventBusType** | memory | memory | nats | nats |
| **llmProvider** | ollama | ollama+openai | auto | auto |

### 2.4 Configuração por Projeto vs Global

```
~/.ideia/config.json          ← Configuração GLOBAL (todos os projetos)
  ├── autonomy (preferências pessoais)
  ├── ui (temas, idioma)
  └── telemetry

~/projeto/.ideia/config.json  ← Configuração do PROJETO (sobrescreve global)
  ├── autonomy.level (ex: "autonomous" para este projeto)
  ├── scanners (específicos do projeto)
  ├── continuity (políticas da equipe)
  ├── notifications (webhook da equipe)
  └── safety.emergencyContact (CISO da equipe)
```

**Regras de merge:**
- Config de projeto sobrescreve config global
- Config global fornece defaults seguros
- `project.security.*` NUNCA pode ser menos restritivo que `global.security.*`
- Mudanças em projeto requerem aprovação se afetarem segurança

---

## Fase 3: Interface de Configuração

### 3.1 Configuration Dashboard (Web UI)

```
┌──────────────────────────────────────────────────────────────────┐
│  ⚙️ IDEIA SETTINGS                                [SAVE] [RESET]│
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  PROFILE                                                        │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Current: Solo Dev     [CHANGE]                              │ │
│  │  Last modified: 2 days ago                                   │ │
│  │  [EXPORT] [IMPORT] [RESET TO DEFAULTS]                      │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  AUTONOMY                                                       │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Level: ●━━━━━━━━○━━━━━○━━━━━○  Assisted                    │ │
│  │          Passive    Assisted  Autonomous                     │ │
│  │                                                              │ │
│  │  Risk:    ○───○───●───○───○───○  Medium                     │ │
│  │          Low              High                               │ │
│  │                                                              │ │
│  │  Auto-fix categories:                                        │ │
│  │  [✓] Package    [✓] Legal     [✓] Quality    [ ] Security   │ │
│  │  [✓] Governance [ ] Testing   [ ] Performance               │ │
│  │                                                              │ │
│  │  Confirm before write: [✓]                                  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  SCANNERS                                                       │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  [ALL ON/OFF]  [USE PROFILE DEFAULTS]                       │ │
│  │                                                              │ │
│  │  🔴 Health Scanner  ● Enabled  ○ 5min  ○ 80% alert         │ │
│  │  🟢 Version Scanner ● Enabled  ○ daily ○ auto-fix on       │ │
│  │  ...                                                         │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  NOTIFICATIONS                                                  │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  [✓] Desktop (banners)                                      │ │
│  │  [ ] Slack — webhook: _________________________________     │ │
│  │  [ ] Email — address: _________________________________     │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ADVANCED                                                       │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  [SHOW ADVANCED SETTINGS]                                   │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 CLI para Configuração

```bash
# Ver config atual
ai-devkit config show
ai-devkit config show autonomy
ai-devkit config show scanners.health

# Definir valores
ai-devkit config set autonomy.level autonomous
ai-devkit config set scanners.health.interval 10min
ai-devkit config set notifications.slack.webhook https://hooks.slack.com/xxx

# Resetar
ai-devkit config reset                    # tudo para default
ai-devkit config reset autonomy           # só autonomia
ai-devkit config reset --project           # só config do projeto

# Perfis
ai-devkit config profile list
ai-devkit config profile apply solo-dev
ai-devkit config profile apply custom
ai-devkit config profile create meu-perfil --from solo-dev
ai-devkit config profile export meu-perfil
ai-devkit config profile import ./meu-perfil.json

# Projeto vs Global
ai-devkit config --global show           # config global
ai-devkit config --project show          # config do projeto atual

# Wizard
ai-devkit setup                          # assistente de configuração
ai-devkit setup --quick                  # pergunta só o essencial
ai-devkit setup --expert                 # todas as opções
```

### 3.3 Configuração por Contexto

A IDEIA pode ter comportamentos diferentes em contextos diferentes:

```bash
# Modo produção vs desenvolvimento
ai-devkit config context create production --profile enterprise
ai-devkit config context create development --profile solo-dev
ai-devkit config context switch production

# Detecção automática de contexto
ai-devkit config context auto-detect on
# Se detecta "main" branch + CI rodando → modo production
# Se detecta "feature/*" branch → modo development
```

**Regras de contexto:**
- Contexto `production`: auto-fix bloqueado, só passive mode, notificações críticas
- Contexto `development`: perfil normal do usuário
- Contexto `emergency`: E-Stop + modo degraded
- Contexto `learning`: autonomous mode com todos os scanners ativos

---

## Fase 4: Personalização Adaptativa

### 4.1 Aprendizado Contínuo

A IDEIA ajusta configurações automaticamente baseada no comportamento do usuário:

```
Fase 1: Setup Inicial
  → Usuário escolhe perfil (wizard)
  → Configurações safe defaults aplicadas

Fase 2: Observação (primeiras 50 interações)
  → IDEIA observa sem modificar
  → Coleta: aprova/rejeita, tempo de resposta, preferências
  → Gera perfil de usabilidade (S24)

Fase 3: Sugestão (50-200 interações)
  → IDEIA sugere ajustes: "Percebi que você sempre aprova auto-fix de LICENSE.
    Quer que eu passe a executar automaticamente?"
  → Usuário aceita ou rejeita

Fase 4: Adaptação (200+ interações)
  → IDEIA ajusta configurações automaticamente
  → Sempre reversível
  → Notifica quando ajusta
```

### 4.2 Sugestões Inteligentes

Baseadas no perfil de usabilidade:

| Comportamento Observado | Sugestão da IDEIA |
|------------------------|-------------------|
| Usuário sempre aprova auto-fix de LICENSE | "Subir autonomous para auto-fix legal?" |
| Usuário sempre rejeita auto-fix de .env | "Adicionar .env ao blocklist?" |
| Usuário responde decisões em < 10s | "Reduzir autoContinueAfter para 15min?" |
| Usuário nunca abre o painel | "Desativar notificações desktop?" |
| Usuário sempre roda `ai-devkit verify` | "Ativar testScanner.onBuild?" |
| Usuário muda de assisted para autonomous todo fim de tarde | "Agendar autonomous mode para 17h?" |

### 4.3 Perfil Mestre (Equipe/Organização)

```
┌──────────────────────────────────────────────────────────────────┐
│  🏢 TECH LEAD DASHBOARD — CONFIGURAÇÃO DA EQUIPE                │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  MEMBROS (12)                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  👤 Ana        Solo Dev    ● assisted     ⚠️ 3 pendentes    │ │
│  │  👤 Carlos     Automator   ● autonomous   ✅ sync           │ │
│  │  👤 Diana      Tech Lead   ● assisted     ✅ sync           │ │
│  │  👤 Eduardo    SRE         ● autonomous   ✅ sync           │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  POLÍTICAS OBRIGATÓRIAS (não sobrescritíveis por membros)        │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  ☑️ scanners.security: ON (todos os membros)                │ │
│  │  ☑️ riskThreshold: ≤ medium (ninguém pode subir)            │ │
│  │  ☑️ autoFixCategories: security OFF (ninguém ativa)         │ │
│  │  ☑️ notifications.slack: ON (eventos críticos)             │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  RELATÓRIO DE CONFORMIDADE                                       │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  100% dos membros com security scanner ativo                 │ │
│  │  92% com riskThreshold ≤ medium                              │ │
│  │  0% com auto-fix de security habilitado                      │ │
│  │  100% com notificações críticas habilitadas                  │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 4.4 Exportação/Importação

```bash
# Exportar config (compartilhar, versionar, documentar)
ai-devkit config export ./ideia-config.json
ai-devkit config export --anonymized ./ideia-config-public.json
ai-devkit config export --project-only ./project-config.json

# Importar
ai-devkit config import ./ideia-config.json
ai-devkit config import --validate-only ./ideia-config.json
ai-devkit config import --dry-run ./ideia-config.json

# Versionamento
ai-devkit config history       # mostrar histórico de mudanças
ai-devkit config diff v1 v2    # comparar versões
ai-devkit config rollback v1   # voltar para versão anterior
```

---

## Fase 5: Segurança e Validação

### 5.1 Validação de Configuração

Toda configuração é validada antes de ser aplicada:

```
Validator chain:
  1. Schema validation (Zod) → formato correto?
  2. Boundary check → valores dentro dos limites?
  3. Security policy → configuração não viola regras de segurança?
  4. Context check → configuração é válida para este contexto?
  5. Compatibility check → configuração é compatível com outras configs?
  6. Dry-run → aplicar em modo simulação primeiro?
  7. Rollback plan → backup da config anterior criado?
```

### 5.2 Restrições de Segurança

| Regra | Descrição | Aplicação |
|-------|-----------|-----------|
| **R1** | Project config NUNCA mais permissiva que global | Global → Project |
| **R2** | security.* categories nunca auto-fix | Bloqueado em todos os níveis |
| **R3** | cross-space operations sempre bloqueadas | Exceto com bypass explícito |
| **R4** | autonomy.level não pode subir sem confirmação | Confirmação por 2 fatores |
| **R5** | Toda mudança de config é versionada | Histórico no audit trail |
| **R6** | Config de segurança só muda com aprovação | Tech-lead + auditor |
| **R7** | Perfil "Enterprise" não pode ser alterado por membro | Só tech-lead |

---

## Fase 6: Implementação

### 6.1 Tasks Geradas

| Task | Descrição | Esforço | Prioridade |
|------|-----------|---------|------------|
| TASK-IDEIA-S25-01 | Onboarding Wizard (web UI + CLI) | 2 sem | P0 |
| TASK-IDEIA-S25-02 | Configuration Dashboard (web UI) | 3 sem | P0 |
| TASK-IDEIA-S25-03 | CLI config commands (show/set/reset/profile/context) | 2 sem | P0 |
| TASK-IDEIA-S25-04 | Profile system (5 presets + custom) | 1 sem | P0 |
| TASK-IDEIA-S25-05 | Config validation + security rules (R1-R7) | 1 sem | P0 |
| TASK-IDEIA-S25-06 | Adaptive learning engine (suggestions) | 3 sem | P1 |
| TASK-IDEIA-S25-07 | Context detection + switching | 2 sem | P1 |
| TASK-IDEIA-S25-08 | Config versioning + diff + rollback | 1 sem | P1 |
| TASK-IDEIA-S25-09 | Export/Import (compartilhamento) | 1 sem | P2 |
| TASK-IDEIA-S25-10 | Team/Org policy management | 3 sem | P1 |

### 6.2 Critérios de Sucesso

- Onboarding wizard completo em < 2 minutos para iniciantes
- 5 perfis prontos cobrindo 90% dos casos de uso
- Zero configurações inválidas aplicadas (validação 100%)
- Adaptação automática precisa após 50 interações (> 85% aceitação)
- Config versionada e reversível em qualquer ponto
- Políticas de equipe respeitadas em 100% dos membros

---

## Conexões com Estudos

| Estudo | Conexão |
|--------|---------|
| S24 — Controle e Sintonia | Safety Circuit + BHP + Continuity usam estas configs |
| S23 — Self-Optimization | Profile determina nível de auto-evolução |
| T1 — Topologia | Config integration com todos os 66 packages |
| S4 — Segurança | R1-R7 como extensão das políticas de segurança |
| S14 — Autenticação | Confirmação 2FA para mudanças críticas |

---

## Documentos Gerados

- [x] Estudo: `docs/ESTUDOS/ESTUDO-AJUSTES-USUARIO-PERFIS-CONFIGURACAO.md`
- [ ] ADR: `docs/adr/ADR-014-perfis-configuracao.md` (pendente)
- [ ] Tarefas: TASK-IDEIA-S25-01 a TASK-IDEIA-S25-10
- [ ] Gap: GAPS-PRODUCAO-IDE.md atualizado

---

## Intensificação

### Riscos Detalhados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:------------:|:-------:|-----------|
| **Adaptive learning reinforces bad habits** — Sistema aprende e otimiza configurações ruins do usuário | Média | Alto | Baseline de segurança que nunca é ultrapassada; revisão trimestral do perfil aprendido |
| **Profile mismatch** — Perfil inferido não corresponde ao usuário real | Alta | Médio | Feedback explícito ("este perfil está correto?"); recalibração forçada a cada N interações |
| **Team policy bypass** — Usuário encontra brecha nas políticas de equipe | Baixa | Crítico | Policy engine valida toda config; shadow auditing detecta bypass |
| **Config corruption** — Arquivo de configuração corrompido durante merge global/project | Baixa | Alto | Schema validation em toda escrita; backup automático das últimas 5 versões |

### Métricas de Sucesso

| Métrica | Atual | Target | Ferramenta |
|---------|:-----:|:------:|-----------|
| Profile accuracy | 0% (manual) | ≥90% | Survey trimestral vs perfil inferido |
| Config validation pass rate | N/A | ≥99.5% | Schema validation monitor |
| Team policy compliance | N/A | ≥98% | Policy engine audit |
| Time to first config (new user) | ~30 min | ≤2 min | Wizard benchmark |

### Timeline

| Fase | Semanas | Entregas |
|------|:-------:|----------|
| **Phase 1: 5 Profiles + CLI** | 1-2 | 5 perfis (Iniciante a Expert); CLI `profile set/get/list`; safe defaults; schema validation |
| **Phase 2: Dashboard + Validation** | 3-5 | Dashboard visual de configuração; merge global/project; validação em tempo real; wizard interativo |
| **Phase 3: Adaptive Learning + Team Policies** | 6-8 | Adaptive learning engine; team policy templates; shadow audit; feedback loop recalibration |

### Plano de Testes

| Tipo | Escopo | Ferramenta |
|------|--------|-----------|
| **Unit** | Schema validation para cada perfil; merge global/project; CLI parser de configuração | Vitest |
| **Integration** | Merge chain global → project → override; adaptive learning → profile update → validation | Vitest |
| **E2E** | Wizard completo (iniciante a expert); dashboard visual com edição; team policy enforcement | Playwright |

### Conexões com Estudos

| Estudo | Conexão |
|--------|---------|
| **S24 — Controle e Segurança** | Safety Circuit + BHP + Continuity usam perfis definidos aqui |
| **S23 — Self-Optimization** | Perfil determina nível de auto-evolução permitido (N0-N4) |
| **T1 — Topologia** | Config integration com todos os 66 packages via contratos |
| **S4 — Segurança** | R1-R7 como extensão das políticas de segurança dos perfis |
| **S14 — Autenticação** | Confirmação 2FA para mudanças críticas de configuração |
| **INT — Intensificação** | Este estudo é alvo de intensificação para score ≥ 4 |
