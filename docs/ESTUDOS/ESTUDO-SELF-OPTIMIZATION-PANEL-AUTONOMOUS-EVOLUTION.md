# Estudo S23 — Self-Optimization Panel & Autonomous Evolution Engine

> **Tipo:** `study`
> **Status:** `draft`
> **Data:** 2026-07-18
> **Propósito:** Definir a arquitetura de um painel de auto-otimização que permite à IDEIA monitorar, analisar e evoluir seu próprio desempenho, eficiência, tecnologias e funcionalidades — com níveis configuráveis de autonomia.
>
> ⚠️ **PRINCÍPIO FUNDAMENTAL DE ISOLAMENTO:**
> A IDEIA opera em DOIS ESPAÇOS COMPLETAMENTE ISOLADOS:
> 1. **IDEIA Self-Space** — métricas, melhorias e evolução da PRÓPRIA IDEIA (código fonte, docs, infraestrutura da IDEIA)
> 2. **Project Space** — métricas, otimização e evolução dos PROJETOS do usuário
>
> **NUNCA, EM HIPÓTESE ALGUMA, OS DOIS ESPAÇOS DEVEM SE MISTURAR.**
> - IDEIA não pode auto-modificar o projeto do usuário como parte de sua auto-evolução
> - Projeto do usuário não pode influenciar as decisões de arquitetura interna da IDEIA
> - Métricas são armazenadas em bancos separados
> - Scanners têm escopo rigidamente definido
> - Painéis são instâncias separadas com contextos distintos
> - Toda operação cross-space é BLOQUEADA por padrão, exigindo bypass explícito e registrado em audit trail

---

## Fase 1: Pesquisa

### 1.1 Contexto

- **Problema:** A IDEIA atualmente depende de humanos para identificar oportunidades de melhoria, pesquisar novas tecnologias, planejar implementações e evoluir sua própria arquitetura. Não há um painel unificado que mostre métricas de saúde interna, desempenho, eficiência, e que permita à IDEIA agir proativamente sobre si mesma — estudando, decidindo e implementando melhorias com autonomia configurável.
- **Público:** 
  - **Usuário final (dev):** Quer um painel visual para acompanhar a saúde da IDEIA, ver o que ela está aprendendo/melhorando, e conversar com ela sobre novas funcionalidades
  - **Arquiteto:** Quer que a IDEIA se mantenha atualizada com tecnologias de ponta sem intervenção manual
  - **Gestor:** Quer métricas de eficiência e relatórios de evolução
- **Restrições:** 
  - Deve ser incremental (não quebrar o que já funciona)
  - Deve respeitar os níveis de autonomia já definidos (passive/assisted/autonomous)
  - Deve persistir métricas para análise histórica
  - Deve ser extensível (novos scanners, analisadores, corretores)
  - ⛔ **ISOLAMENTO ABSOLUTO:** IDEIA Self-Space e Project Space são completamente isolados
  - ⛔ **SEM VASOS COMUNICANTES:** Nenhuma métrica do projeto alimenta decisões da IDEIA
  - ⛔ **SEM CONTAMINAÇÃO:** Nenhum scanner da IDEIA varre diretórios do projeto

### 1.2 Abordagens Consideradas

| Abordagem | Descrição | Maturidade | Complexidade |
|-----------|-----------|------------|-------------|
| **Self-Optimization Panel (Web UI)** | Painel React no web-ui com métricas em tempo real, chat de solicitações, toggle de autonomia | Média | Alta |
| **Autonomous Evolution Engine (Core)** | Engine Node.js que executa ciclos de scan/análise/planejamento/implementação/verificação | Média | Média |
| **Technology Radar** | Sistema que pesquisa novas tecnologias (via API GitHub, npm, papers) e recomenda adoção | Baixa | Alta |
| **IDEIA Chat (Self)** | Extensão do chat existente para conversas sobre a própria IDEIA (features, recursos) | Alta | Média |
| **Auto-ADR** | Geração automática de ADRs para decisões arquiteturais tomadas autonomamente | Baixa | Média |

### 1.3 Referências

- Google SRE (Site Reliability Engineering) — auto-healing e SLIs/SLOs
- Autonomous AI Agents (LangGraph, AutoGPT) — ciclos autônomos
- Dependabot / Renovate — atualização automática de dependências
- Gartner Technology Radar — rastreamento de tecnologias emergentes
- Rust Compiler Self-Hosting — compilador que compila a si mesmo (inspiração conceitual)
- OSS Insight / GitHub Trends — dados de adoção de tecnologias

---

## Fase 2: Matriz de Viabilidade

### 2.1 Pontuação

| Dimensão | Peso | Score (0-5) | Ponderado | Observação |
|----------|------|-------------|-----------|------------|
| **Valor** | 3× | 5 | 15 | Resolve o problema central de auto-evolução da plataforma |
| **Diferenciação** | 2× | 5 | 10 | IDEIA se torna um sistema que evolui a si mesmo — diferencial competitivo enorme |
| **Sinergia** | 2× | 4 | 8 | Aproveita RealitySync, InitiativeEngine, web-ui, chat existentes |
| **Custo-Benefício** | 2× | 4 | 8 | Feature de alto impacto com reuso de ~70% da infra já construída |
| **Maturidade** | 1× | 3 | 3 | Conceito inovador, mas componentes individuais já são maduros |
| **Total** | 10× | | **44/50 = 4.4** | **Score ≥ 3.5 → Implementação obrigatória** |

### 2.2 Análise de Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Loop infinito de auto-modificação | Baixa | Crítico | Circuit breaker no ciclo de evolução; max alterações por ciclo |
| Regressão por auto-alteração | Média | Alto | Backup automático antes de cada alteração; rollback via git |
| ⛔ **Violação de isolamento: auto-fix modifica projeto** | **Baixa** | **CRÍTICO** | **5 camadas de segurança; path validator; audit trail; policy enforcement; testes de isolamento** |
| ⛔ **Violação de isolamento: scanner do projeto vaza para self-space** | **Baixa** | **ALTO** | **Processos separados; barramento prefixado; scope obrigatório em toda operação** |
| Dependência externa quebra | Média | Médio | Technology Radar usa múltiplas fontes; fallback para análise local |
| Usuário perde controle | Baixa | Alto | Níveis claros de autonomia; botão de "stop" sempre visível |
| Viés nas recomendações | Média | Médio | Múltiplas fontes de dados; validação cruzada |

---

## Fase 3: Arquitetura

### 3.1 Visão Geral

```
┌───────────────────────────────────────────────────────────────────────────┐
│                   IDEIA UI — Dual Sidebar Layout                          │
│                                                                           │
│  ┌─────────────────────┐  ┌──────────────────────────────────────────────┐│
│  │ PRIMARY SIDEBAR     │  │ SECONDARY SIDEBAR                            ││
│  │ (Self-Space)        │  │ (Project-Space)                              ││
│  │                     │  │                                              ││
│  │ ┌─────────────────┐ │  │ ┌──────────────────────────────────────────┐ ││
│  │ │ IDEIA Self-     │ │  │ │ Project Optimization Panel              │ ││
│  │ │ Optimization    │ │  │ │ (mockup em desenvolvimento paralelo)    │ ││
│  │ │ Panel           │ │  │ │                                          │ ││
│  │ │                 │ │  │ │ - Health metrics (projeto)               │ ││
│  │ │ - Health Score  │ │  │ │ - Dependency freshness                  │ ││
│  │ │ - Tech Radar    │ │  │ │ - Code quality                          │ ││
│  │ │ - Self-Chat     │ │  │ │ - Test coverage                         │ ││
│  │ │ - Autonomy cfg  │ │  │ │ - Optimize suggestions                  │ ││
│  │ │ - Auto-ADRs     │ │  │ │ - Autonomy cfg (projeto)                │ ││
│  │ └─────────────────┘ │  │ └──────────────────────────────────────────┘ ││
│  └─────────────────────┘  └──────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────────────────┘
          │                 │                 │                       │
          ▼                 ▼                 ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                AUTONOMOUS EVOLUTION ENGINE (Core)                    │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────┐ │
│  │ Scanner  │→│ Analyzer │→│ Planner  │→│ Executor │→│Verify │ │
│  │ Pool     │  │ Engine   │  │ Engine   │  │ Engine   │  │Engine │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └───────┘ │
│       │              │                        │                     │
│       ▼              ▼                        ▼                     │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐            │
│  │Health    │  │Auto-ADR  │  │Technology Radar        │            │
│  │Scanner   │  │Generator │  │(GitHub/npm/papers API) │            │
│  └──────────┘  └──────────┘  └────────────────────────┘            │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │  Metrics Store (SQLite + DuckDB)                                 ││
│  │  - Histórico de desempenho                                       ││
│  │  - Decisões passadas                                             ││
│  │  - Tendências de evolução                                        ││
│  └──────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Componentes

#### A. Self-Optimization Panel (Frontend)

**Dashboard de Métricas:**
- Health Score da IDEIA em tempo real (0-100)
- Número de gaps abertos vs resolvidos
- Cobertura de testes
- Tempo de resposta do LLM (se aplicável)
- Número de auto-correções aplicadas
- Gráfico de evolução temporal
- Tecnologias recomendadas (Technology Radar)

**Autonomy Controls:**
- Slider/Toggle: Passive → Assisted → Autonomous
- Seletor de categorias permitidas para auto-alteração
- Botão "Stop All" de emergência
- Histórico de ações autônomas

**IDEIA Self-Chat:**
- Chat especial onde o usuário conversa SOBRE a IDEIA
- "Adicione suporte a Kotlin Multiplatform"
- "Pesquise sobre a tecnologia X e me dê um relatório"
- "Implemente a feature Y que discutimos"
- "O que você acha de adicionarmos GraphQL?"
- IDEIA pesquisa, estuda, planeja e implementa

#### B. Autonomous Evolution Engine (Core)

**Scanner Pool** (extensível):
- `HealthScanner` — métricas de saúde do projeto (testes, cobertura, gaps)
- `PerfScanner` — tempo de build, tempo de resposta, uso de memória
- `TechScanner` — novas versões de dependências, tecnologias emergentes
- `QualityScanner` — code smells, duplicação, complexidade
- `SecurityScanner` — vulnerabilidades conhecidas, CVEs

**Analyzer Engine:**
- Correlaciona dados dos scanners
- Identifica tendências (melhorando, piorando, estável)
- Gera recomendações priorizadas
- Score de confiança para cada recomendação

**Planner Engine:**
- Gera planos de execução (múltiplos passos)
- Estima esforço e risco
- Submete para aprovação (configurável)

**Executor Engine:**
- Usa `FileSystemStepExecutor` para alterações no código
- Usa `AutonomousEditor` para edições seguras
- Cria backup antes de cada alteração
- Rollback automático se verificação falhar

**Technology Radar:**
- Scanner periódico de:
  - GitHub Trends (linguagens, frameworks em alta)
  - npm registry (novos packages relevantes)
  - arXiv / papers (pesquisa acadêmica)
  - Versões de dependências atuais
- Matriz de avaliação (5 dimensões do template)
- Geração automática de estudo + ADR
- Implementação assistida ou autônoma

#### C. Ciclo de Auto-Evolução

```
1. SCAN → Scanner Pool coleta métricas de saúde, desempenho, tecnologia
2. ANALYZE → Analyzer Engine identifica oportunidades e tendências
3. DECIDE → Autonomy Policy decide: auto-executar? sugerir? só reportar?
4. PLAN → Planner Engine gera plano de implementação
5. APPROVE → Se assisted: solicita aprovação humana
6. EXECUTE → Executor Engine aplica mudanças com backup
7. VERIFY → Re-scans confirmam que nada quebrou
8. ADR → Auto-ADR documenta a decisão arquitetural
9. REPORT → Painel atualizado com resultados
```

### 3.3 Níveis de Autonomia Expandidos

| Nível | Scan | Analisa | Sugere | Planeja | Executa | Verifica | ADR |
|-------|------|---------|--------|---------|---------|----------|-----|
| `passive` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `assisted` | ✅ | ✅ | ✅ | ✅ | ❌ (humano) | ❌ | ❌ |
| `autonomous` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### 3.4 Métricas de Auto-Desempenho

| Métrica | Fonte | Frequência | Alerta |
|---------|-------|-----------|--------|
| Health Score | Scanner Pool | A cada ciclo | < 70 |
| Gap Resolution Rate | GAPS doc | Diário | < 50% |
| Test Coverage | Jest | Por build | < 30% |
| Build Time | tsc/CLI | Por build | > 5min |
| Auto-fix Success Rate | InitiativeEngine | Por ciclo | < 80% |
| Tech Debt Ratio | QualityScanner | Semanal | > 30% |
| Dependency Freshness | TechScanner | Diário | > 1 ano desatualizado |
| LLM Response Time | Chat | Por requisição | > 10s |

### 3.5 Isolamento Self-Space vs Project Space

> **⚠️ PRINCÍPIO ARQUITETURAL SUPREMO:**
> A IDEIA opera em dois espaços completamente independentes.
> **NUNCA** os dois devem se cruzar. Esta seção define as barreiras.

#### 3.5.1 Definição dos Espaços

| Aspecto | IDEIA Self-Space | Project Space |
|---------|-----------------|---------------|
| **O que é** | Código fonte, docs, infra da própria IDEIA | Código fonte, docs, infra do projeto do usuário |
| **Diretório** | `$IDEIA_ROOT/` (onde a IDEIA está instalada) | `$PROJECT_ROOT/` (onde o usuário desenvolve) |
| **Painel** | `ai-devkit self` | `ai-devkit project optimize` |
| **Scanner** | HealthScanner (IDEIA), GapScanner, TechRadar | CodeScanner, DepScanner, TestScanner |
| **Executor** | AutonomousEditor (modo self) | AutonomousEditor (modo projeto) |
| **Metrics Store** | `$IDEIA_ROOT/.ai/metrics/` | `$PROJECT_ROOT/.ai/metrics/` |
| **Auto-ADR** | `$IDEIA_ROOT/docs/adr/` | `$PROJECT_ROOT/docs/adr/` |
| **Autonomia** | Controlada por `reality-sync config` | Controlada por `project config` |

#### 3.5.2 Barreiras de Isolamento (Múltiplas Camadas)

```
┌──────────────────────────────────────────────────────────────────────┐
│                      IDEIA PLATFORM                                   │
│                                                                       │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐      │
│  │   IDEIA SELF-SPACE       │  │   PROJECT SPACE              │      │
│  │                          │  │                              │      │
│  │  /usr/lib/ideia/         │  │  /home/user/my-project/      │      │
│  │                          │  │                              │      │
│  │  ┌────────────────────┐  │  │  ┌────────────────────────┐  │      │
│  │  │ Self Optimization  │  │  │  │ Project Optimization   │  │      │
│  │  │ Panel              │  │  │  │ Panel                  │  │      │
│  │  └────────────────────┘  │  │  └────────────────────────┘  │      │
│  │                          │  │                              │      │
│  │  ┌────────────────────┐  │  │  ┌────────────────────────┐  │      │
│  │  │ Technology Radar   │  │  │  │ Dependency Scanner     │  │      │
│  │  │ (IDEIA tech stack) │  │  │  │ (project deps)         │  │      │
│  │  └────────────────────┘  │  │  └────────────────────────┘  │      │
│  │                          │  │                              │      │
│  │  ╔══════════════════════╗│  │  ╔══════════════════════════╗│      │
│  │  ║   AUDIT TRAIL        ║│  │  ║   AUDIT TRAIL            ║│      │
│  │  ║   (auto-modificações)║│  │  ║   (modificações projeto) ║│      │
│  │  ╚══════════════════════╝│  │  ╚══════════════════════════╝│      │
│  └──────────────────────────┘  └──────────────────────────────┘      │
│           ▲                            ▲                             │
│           │        BARREIRA            │                             │
│           ║══════════════════════════════════════════════════║       │
│           ║   CAMADA 1: Scope (paths absolutos diferentes)   ║       │
│           ║   CAMADA 2: Config (dois arquivos de config)    ║       │
│           ║   CAMADA 3: Runtime (dois processos separados)  ║       │
│           ║   CAMADA 4: Audit (cross-space detectado e log) ║       │
│           ║   CAMADA 5: Policy (regra NUNCA cruzar espaços) ║       │
│           ╚══════════════════════════════════════════════════╝       │
└──────────────────────────────────────────────────────────────────────┘
```

#### 3.5.3 Camadas de Segurança do Isolamento

**Camada 1 — Escopo de Arquivos (Scope Layer)**
- Toda operação de scanner/executor recebe um `scope` obrigatório: `'self' | 'project'`
- Scanners self-space SÓ podem ler/alterar paths dentro de `$IDEIA_ROOT/`
- Scanners project-space SÓ podem ler/alterar paths dentro de `$PROJECT_ROOT/`
- Qualquer path fora do escopo é BLOQUEADO antes de qualquer operação de I/O
- Implementação: `PathValidator.resolve(scope, path)` → lança erro se cross-scope

```typescript
function resolvePath(scope: 'self' | 'project', target: string): string {
  const allowed = scope === 'self' ? IDEIA_ROOT : PROJECT_ROOT;
  const resolved = path.resolve(allowed, target);
  if (!resolved.startsWith(allowed)) {
    throw new ScopeViolationError(
      `Cross-space access blocked: ${target} is outside ${scope} scope`,
      { scope, target, resolved, allowed }
    );
  }
  return resolved;
}
```

**Camada 2 — Configuração (Config Layer)**
- IDEIA Self-Space: `.ai/reality-sync.json` dentro de `$IDEIA_ROOT/`
- Project Space: `.ai/project-optimizer.json` dentro de `$PROJECT_ROOT/`
- Arquivos de config NUNCA são lidos do espaço oposto
- Níveis de autonomia são independentes:
  - Self-Space pode estar em `autonomous` enquanto Project está em `assisted`
  - Ou vice-versa — não há acoplamento

**Camada 3 — Runtime (Process Layer)**
- Scanners self-space rodam em processo isolado (ou worker thread dedicada)
- Project scanners rodam em processo separado
- Compartilham apenas o barramento de eventos (NATS/EventBus) com tipos de evento prefixados:
  - `self.scan.complete` vs `project.scan.complete`
  - `self.fix.applied` vs `project.fix.applied`
- Nenhum evento self-space é consumido por listeners project-space e vice-versa

**Camada 4 — Auditoria (Audit Layer)**
- Toda tentativa de operação cross-scope é:
  1. BLOQUEADA (a operação não executa)
  2. LOGADA no audit trail com severidade CRITICAL
  3. NOTIFICADA no painel como violação de isolamento
  4. REGISTRADA no `violation-registry` como `SCOPE_VIOLATION`
- Se uma operação cross-scope for explicitamente autorizada (bypass), ela deve:
  1. Ser aprovada por humano obrigatoriamente
  2. Ter justificativa registrada
  3. Ser executada em modo read-only primeiro (dry-run)
  4. Ser registrada com causa explícita

**Camada 5 — Política (Policy Layer)**
- Regra `isolation.cross-space-access`: `block` (padrão)
- Regra `isolation.self-scope-paths`: lista de diretórios permitidos para self-space
- Regra `isolation.project-scope-paths`: lista de diretórios permitidos para project-space
- Regra `isolation.bypass-required`: `true` (requer aprovação humana para bypass)
- Policy armazenada em `.ai/policies/isolation.yaml`

```yaml
# .ai/policies/isolation.yaml
isolation:
  cross_space_access: block
  self_scope_paths:
    - "/usr/lib/ideia/**"
  project_scope_paths:
    - "/home/**/project/**"
  bypass:
    required: true
    approval_level: tech-lead
    dry_run_first: true
    audit_required: true
```

#### 3.5.4 Painéis Separados — Definição de Layout

> **DISPOSIÇÃO FÍSICA NA UI:**
> - **Primary Sidebar** (primeira/grelha esquerda): **IDEIA Self-Panel**
> - **Secondary Sidebar** (segunda/grelha direita): **Project Panel**
> - **Zona Central do Editor**: compartilhada entre os dois contextos
> - Os dois sidebars podem coexistir ou ser abertos independentemente

```
┌──────────┬──────────────────────────────┬──────────────┐
│ PRIMARY  │                              │  SECONDARY   │
│ SIDEBAR  │     EDITOR / CENTRAL AREA    │  SIDEBAR     │
│          │                              │              │
│ IDEIA    │                              │  PROJECT     │
│ SELF-    │                              │  PANEL       │
│ PANEL    │                              │              │
│          │                              │  - Health    │
│ - Health │                              │  - Deps      │
│ - Tech   │                              │  - Quality   │
│   Radar  │                              │  - Tests     │
│ - Self-  │                              │  - Optimize  │
│   Chat   │                              │              │
│ - Config │                              │  (mockup em  │
│ - ADRs   │                              │   paralelo)  │
│          │                              │              │
└──────────┴──────────────────────────────┴──────────────┘
```

**IDEIA Self-Panel** — Primary Sidebar (comandos: `ai-devkit self`)
- Métricas de saúde da própria IDEIA
- Technology Radar (tecnologias para EVOLUIR a IDEIA)
- Auto-ADRs da IDEIA
- Self-Chat (conversas SOBRE a IDEIA — pedir features, tecnologias)
- Config de autonomia da IDEIA
- Histórico de auto-evolução
- Acesso: desenvolvedores/contribuidores da IDEIA
- Mockup: a ser definido

**Project Panel** — Secondary Sidebar (comandos: `ai-devkit project optimize`)
- Métricas de saúde do projeto do usuário
- Dependency Scanner (dependências do projeto)
- Code Quality Scanner (projeto do usuário)
- Sugestões de melhoria para o projeto
- Config de autonomia do projeto
- Histórico de otimizações aplicadas
- Acesso: qualquer usuário do projeto
- Mockup: já está sendo desenvolvido em paralelo

#### 3.5.5 Verificações de Integridade

1. **Teste de isolamento automatizado**: Suite de testes que verifica que nenhum path do project-space é acessível por scanners self-space
2. **Dry-run obrigatório**: Toda operação de auto-fix em self-space executa dry-run primeiro
3. **Limite de path traversal**: Testes de path traversal (`../../`) em todos os resolvedores de path
4. **Audit periódico**: Scanner específico que verifica se houve violação de isolamento no período
5. **Self-check**: A própria IDEIA verifica periodicamente se seu isolamento está íntegro

### 3.6 Tasks Geradas

| Task | Descrição | Esforço | Prioridade |
|------|-----------|---------|------------|
| TASK-IDEIA-S23-01 | Criar Self-Optimization Panel (React) com dashboard de métricas | 2-3 semanas | P0 |
| TASK-IDEIA-S23-02 | Implementar Autonomous Evolution Engine (scanner pool + analyzer) | 3-4 semanas | P0 |
| TASK-IDEIA-S23-03 | Implementar Technology Radar (GitHub/npm scanner + matrix) | 2-3 semanas | P1 |
| TASK-IDEIA-S23-04 | Implementar IDEIA Self-Chat (chat sobre a própria IDEIA) | 1-2 semanas | P1 |
| TASK-IDEIA-S23-05 | Implementar Auto-ADR Generator | 1 semana | P2 |
| TASK-IDEIA-S23-06 | Integrar Metrics Store (SQLite/DuckDB) para histórico | 1-2 semanas | P2 |
| TASK-IDEIA-S23-07 | Expandir níveis de autonomia no painel | 1 semana | P1 |
| TASK-IDEIA-S23-08 | Implementar circuito de auto-rollback em falhas | 1 semana | P0 |
| **TASK-IDEIA-S23-09** | **Criar PathValidator + Scope Layer (isolamento self/project)** | **1 semana** | **P0 ⛔** |
| **TASK-IDEIA-S23-10** | **Criar Project Optimization Panel (React)** | **2 semanas** | **P1** |
| **TASK-IDEIA-S23-11** | **Implementar isolation.yaml policy + enforcement** | **1 semana** | **P0 ⛔** |
| **TASK-IDEIA-S23-12** | **Implementar Cross-Scope Audit + Violation Registry** | **1 semana** | **P0 ⛔** |
| **TASK-IDEIA-S23-13** | **Criar suite de testes de isolamento (path traversal, dry-run)** | **1 semana** | **P0 ⛔** |
| **TASK-IDEIA-S23-14** | **Implementar Project Dependency Scanner + Tech Radar** | **2 semanas** | **P1** |

> **Tasks com ⛔ são OBRIGATÓRIAS antes de qualquer operação autônoma.**
> Sem isolamento validado, a IDEIA NUNCA pode executar auto-fix em nenhum modo.

---

## Fase 4: Ciclo de Vida

### 4.1 Roadmap

| Fase | Entrega | Prazo |
|------|---------|-------|
| **MVP** | Self-Chat + Dashboard básico + Autonomous Engine core | 4-6 semanas |
| **V1** | Technology Radar + Auto-ADR + Metrics Store | +4 semanas |
| **V2** | Recomendação autônoma + implementação automática | +4 semanas |
| **V3** | Ciclo completo de auto-evolução sem supervisão | +4 semanas |

### 4.2 Critérios de Sucesso

- IDEIA consegue detectar e corrigir gaps sem intervenção humana (autonomous)
- Technology Radar recomenda tecnologias com score ≥ 3.5
- Self-Chat permite pedir features que são estudadas e implementadas
- Taxa de sucesso de auto-correções ≥ 80%
- Zero regressões causadas por auto-alterações

### 4.3 Conexões com Estudos Existentes

| Estudo | Conexão | Intensificação |
|--------|---------|----------------|
| S1 — Barramento | EventBus transporta eventos `self.*` | + Self-Panel consome `self.scan.complete` em tempo real |
| S2 — Memória | MemoryStore guarda histórico de auto-evolução | + PatternDetector aprende padrões de auto-fix |
| S3 — Intenção→Plano | PromptPipeline processa pedidos do Self-Chat | + Self-Chat usa o mesmo pipeline com contexto especial |
| S4 — Segurança | PolicyEngine protege operações autônomas | + isolation.yaml policy + cross-scope audit |
| S5 — Multiagente | Agentes podem sugerir auto-melhorias | + Auto-ADR como output dos agentes |
| S6 — Entrega | Quality gates validam auto-alterações | + VerificationLayer reusa gate pipeline |
| S7 — Aprendizado | Feedback loop alimenta auto-evolução | + Cada auto-fix gera learning record |
| S8 — Emergentes | Technology Radar detecta novas tecnologias | + Auto-estudo de viabilidade integrado |
| S9 — Matriz | Technology Radar usa matriz de avaliação | + Score ≥ 3.5 gera task automaticamente |
| S10 — Contratos | Auto-ADR segue formato de contratos | + C19-C23 contratos de auto-evolução |
| S11 — Theia | Self-Panel como widget Theia | + Primary Sidebar = IDEIA Self-Panel |
| S12 — Testes | Testes de isolamento validam self-space | + Auto-teste de cada auto-alteração |
| S13 — Performance | Métricas de desempenho alimentam painel | + PerfScanner compara antes/depois de cada fix |
| S14 — Autenticação | Bypass cross-scope requer auth | + Approval flow para operações críticas |
| S16 — Deploy | DeliveryOrchestrator publica auto-ADRs | + Auto-release de novas versões da IDEIA |
| S17 — Observabilidade | OTel spans para cada ciclo autônomo | + Rastreamento completo de auto-evolução |
| S18 — AI Safety | AlignmentScore para decisões autônomas | + Safety check antes de cada auto-fix |
| S19 — Prompts | PromptPipeline otimiza prompts do Self-Chat | + Templates específicos para auto-evolução |
| S22 — Colaboração | Self-Panel colaborativo multi-dev | + Decisões de evolução compartilhadas |
| T1 — Topologia | Mapa de integração de todos os 66 packages | + Self-Panel como hub central de métricas |
| RealitySync | Ciclo de sync alimenta o Evolution Engine | + Sync automático após cada auto-fix |
| InitiativeEngine | Executor Engine reusa infra de auto-fix | + Ciclo scan→fix→verify contínuo |

## 5. Intensificação: Malha de Integração Total S23 × Todos os Packages

Cada componente do S23 se conecta a packages específicos. Abaixo, o mapa completo de como cada módulo do Self-Optimization Panel e do Autonomous Evolution Engine se integra a cada package existente, criando uma malha de intercomunicação que maximiza precisão e velocidade.

### 5.1 Scanner Pool → Packages

| Scanner | Packages Consultados | Dados Obtidos | Frequência | Latência |
|---------|--------------------|---------------|------------|----------|
| **HealthScanner** | Todos os 66 + AuditTrail + EventBus | Health score, gap count, event bus health | A cada ciclo | <500ms |
| **VersionScanner** | 66 package.json | Versões, dependências desatualizadas | Diário | <1s |
| **TestScanner** | 66 __tests__ dirs | Cobertura, test count, falhas | Por build | <2s |
| **LintScanner** | CLI (ESLint) | Code smells, erros de lint | Por build | <5s |
| **PerfScanner** | ObservabilityEngine + ExecutionLayer | Latência P50/P95/P99, throughput | Contínuo | <100ms |
| **SecurityScanner** | SecurityMiddleware + PromptSecurity | Vulnerabilidades, CVEs, injection attempts | Diário | <3s |
| **ContractScanner** | SchemaRegistry + ContractCDC | Breaking changes, compatibilidade | Por PR | <2s |
| **TechScanner** | GitHub API + npm registry + arXiv | Novas versões, tecnologias emergentes | Semanal | <10s |
| **ScopeScanner** | PathValidator + FileBridge | Violações de isolamento self/project | Contínuo | <50ms |
| **MemoryScanner** | MemoryStore + AuditTrail | Padrões de uso, decisões recorrentes | Horário | <500ms |

### 5.2 Self-Panel → Event Bus (16 eventos otimizados)

O Self-Panel consome e produz eventos que atravessam TODOS os 66 packages:

```
self.panel.opened        → AuditTrail, Observability
self.panel.closed        → AuditTrail, Observability  
self.scan.started        → EventBus, AuditTrail, WorkflowEngine
self.scan.complete       → EventBus → Self-Panel UI, MemoryStore
self.fix.proposed        → PolicyEngine, EventBus
self.fix.applied         → EventBus, AuditTrail, MemoryStore, RealitySync
self.fix.failed          → EventBus → Alert, CorrectionOracle
self.fix.rolledback      → EventBus, AuditTrail, AutonomousEditor
self.tech.discovered     → MemoryStore, TechnologyRadar UI
self.tech.recommended    → PolicyEngine, Self-Panel UI
self.adr.generated       → ArchitectureADR, MemoryStore, Auto-ADR UI
self.chat.message        → PromptPipeline → LLMProvider → Self-Chat UI
self.config.changed      → RealitySync, PolicyEngine, EventBus
self.cycle.completed     → EventBus, MemoryStore, FeedbackPipeline, AUTONOMOUS-EVOLUTION-ENGINE
```

### 5.3 Technology Radar → Packages (Análise de Viabilidade Automática)

Quando o Technology Radar descobre uma tecnologia, o fluxo é:

```
TechRadar.scan()
  → GitHub API (stars, releases, language)
  → npm registry (downloads, maintainers, dependecias)
  → arXiv API (papers recentes)
  → Matriz Tecnológica (score 5 dimensões)
    → if score ≥ 3.5:
      → Gera estudo draft em docs/ESTUDOS/
      → Verifica compatibilidade com contratos C1-C18
      → Estima esforço de integração por package
      → Gera TASK-IDEIA-xxx
      → Se autonomous: agenda implementação
      → Se assisted: notifica Self-Panel
```

### 5.4 Self-Chat → Pipeline Completo

O Self-Chat (usuário conversa SOBRE a IDEIA) usa o pipeline inteiro:

```
User: "Adicione suporte a Kotlin Multiplatform"
  → PromptPipeline (classifica como 'feature')
  → ContextEngine (injeta contexto: 13 adapters existentes, Kotlin é Java-based)
  → TechnologyRadar (pesquisa: Kotlin Multiplatform, KMP, Compose Multiplatform)
  → Estudo automático (segue template, gera matriz de viabilidade)
  → Se score ≥ 3.5:
    → Gera blueprint de implementação
    → Cria task no WorkflowEngine
    → Se autonomous: executa implementação
    → Se assisted: apresenta no Self-Panel para aprovação
  → Resposta no Self-Chat com análise completa
```

### 5.5 Cadeia de Execução Otimizada (Máxima Velocidade)

Para qualquer operação, o caminho mais curto é calculado dinamicamente:

```
Operação: auto-fix (ex: criar LICENSE faltando)
  → ① InitiativeEngine.scanAll() [50ms]
  → ② canAutoFix() [5ms — policy check in-memory]
  → ③ executePlan() [10ms — file:create]
  → ④ scanAll() [50ms — verificação]
  → ⑤ syncManifest() + syncGaps() + syncRegistry() [100ms — paralelizado]
  → ⑥ emit('initiative:cycle') [2ms — event bus]
  → TOTAL: ~217ms
```

```
Operação: self-chat pesquisa tecnologia
  → ① PromptPipeline.guard() [2ms]
  → ② classify() [1ms]
  → ③ enrich() [5ms — contexto local]
  → ④ LLMProvider.chat() [2s — ollama local]
  → ⑤ TechnologyRadar.scan() [10s — APIs externas]
  → ⑥ Matriz de viabilidade [50ms]
  → ⑦ Se score ≥ 3.5 → gera task [20ms]
  → TOTAL: ~12s (dependente de LLM + APIs externas)
```

```
Operação: cycle completo (scan→fix→verify→report→learn)
  → ① 15 scanners paralelizados [500ms]
  → ② Analyzer correlaciona dados [50ms]
  → ③ Planner gera plano [10ms]
  → ④ Executor aplica N ações [N × 10ms]
  → ⑤ Verification re-scan [500ms]
  → ⑥ MemoryStore guarda aprendizado [20ms]
  → ⑦ Auto-ADR gerado [100ms]
  → ⑧ Painel atualizado [50ms]
  → TOTAL: ~1.3s + N×10ms (N = número de correções)
```

### 5.6 Integração com os 13 Adapters (Polyglot Self-Optimization)

Cada adapter de linguagem pode ser otimizado pelos mesmos scanners:

| Adapter | Scanner específico | Auto-fix possível | Integração com Self-Panel |
|---------|-------------------|-------------------|--------------------------|
| Go | `go vet`, `golangci-lint` | Corrigir go.mod | Métricas de qualidade Go |
| Python/FastAPI | `flake8`, `pytest` | Corrigir requirements.txt | Métricas de qualidade Python |
| NestJS | `ESLint`, `Jest` | Corrigir tsconfig | Métricas de qualidade TS |
| Java | `checkstyle`, `mvn test` | Corrigir pom.xml | Métricas de qualidade Java |
| Rust | `clippy`, `cargo test` | Corrigir Cargo.toml | (futuro) |
| Kotlin | `ktlint`, `gradle test` | Corrigir build.gradle.kts | Métricas de qualidade Kotlin |
| Swift | `swiftlint` | Corrigir Package.swift | Métricas de qualidade Swift |
| PHP | `phpcs` | Corrigir composer.json | Métricas de qualidade PHP |
| Ruby | `rubocop` | Corrigir Gemfile | Métricas de qualidade Ruby |
| Scala | `scalafmt` | Corrigir build.sbt | Métricas de qualidade Scala |
| Dart | `dart analyze` | Corrigir pubspec.yaml | Métricas de qualidade Dart |
| Elixir | `credo` | Corrigir mix.exs | Métricas de qualidade Elixir |
| Haskell | `hlint` | Corrigir stack.yaml | Métricas de qualidade Haskell |
| Zig | `zig fmt` | Corrigir build.zig | Métricas de qualidade Zig |

### 5.7 Métricas de Eficiência da Malha

| Métrica | Fórmula | Alvo | Monitorado por |
|---------|---------|------|----------------|
| **Tempo médio de ciclo** | Σ(scan+fix+verify) / N | < 2s | PerfScanner |
| **Taxa de acerto de auto-fix** | fix_success / fix_total | > 90% | InitiativeEngine |
| **Latência de eventos** | P99 do EventBus | < 50ms | ObservabilityEngine |
| **Cobertura de integração** | conexões_ativas / conexões_possíveis | > 80% | ContractScanner |
| **Tempo de resposta do Self-Chat** | P95 do chat | < 5s | ObservabilityEngine |
| **Precisão do Technology Radar** | recomendacoes_uteis / total | > 70% | FeedbackPipeline |
| **Economia de recursos** | horas_humano / horas_auto | > 3:1 | EconomicControl |
| **Velocidade de deploy** | PR → produção | < 1h | DeliveryOrchestrator |

### 5.8 Riscos Pós-Implementação

- **Auto-dependência cíclica:** IDEIA modifica seu próprio código de auto-modificação → requer testes específicos para o meta-circuito
- **Viés de confirmação:** IDEIA pode favorecer tecnologias que ela já conhece → diversificação forçada no Technology Radar
- **Carga computacional:** Scanners e análises frequentes podem consumir recursos → agendamento inteligente (horários de baixa atividade)
- **Segurança:** Auto-alteração de código é inerentemente arriscada → sandbox para alterações, validação em múltiplas camadas

---

## Documentos Gerados

- [x] Estudo técnico: `docs/ESTUDOS/ESTUDO-SELF-OPTIMIZATION-PANEL-AUTONOMOUS-EVOLUTION.md`
- [x] Intensificação: Malha de Integração Total S23 × 66 Packages (seção 5)
- [x] Mapa de conexão com 22 estudos (seção 4.3)
- [x] 8 métricas de eficiência da malha (seção 5.7)
- [ ] ADR: `docs/adr/ADR-011-self-optimization-panel.md` (pendente)
- [ ] Tarefas: TASK-IDEIA-S23-01 a TASK-IDEIA-S23-14
- [ ] Gap: GAPS-PRODUCAO-IDE.md atualizado com S23

---

## Intensificação

### Riscos Detalhados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:------------:|:-------:|-----------|
| **Self-modification loop** — IDEIA modifica seu próprio código de auto-modificação, criando um ciclo infinito | Média | Crítico | Meta-circuito com limite de iterações (max 3); detecção de ciclo por hash do grafo de modificações |
| **Cross-space contamination** — Scanners ou fixers do Self-Space vazam para o Project Space | Baixa | Crítico | Namespace isolation em runtime; barreira de processo separada para cada espaço; audit trail obrigatório |
| **Technology Radar false positives** — Tecnologias irrelevantes são recomendadas, gerando ruído | Alta | Médio | Validação multi-fonte (GitHub + npm + arXiv); score ponderado por qualidade; revisão humana para score > 7 |
| **Resource exhaustion** — Scanners rodam em paralelo e consomem toda a CPU/memória | Média | Alto | Agendamento inteligente com prioridade; pool de workers limitado; throttle por métrica de uso |

### Métricas de Sucesso

| Métrica | Atual | Target | Ferramenta |
|---------|:-----:|:------:|-----------|
| Scan time (full cycle) | ~45 min | ≤15 min | Benchmarks no ScannerPool |
| Fix success rate | 0% (manual) | ≥85% | Validação pós-fix (compile + test) |
| Tech Radar precision | N/A | ≥90% | Precision@10 manual review |
| Self-modification safety | N/A | Zero loops | Meta-circuit tests |

### Timeline

| Fase | Semanas | Entregas |
|------|:-------:|----------|
| **Phase 1: Scanner Pool** | 1-4 | 4 scanners (GitHub, npm, arXiv, local); agendamento; isolamento de espaços; métricas base |
| **Phase 2: Self-Panel** | 5-8 | Painel visual; alertas de oportunidade; Auto-ADR generation; Technology Radar UI |
| **Phase 3: Auto-evolution** | 9-12 | Auto-fix engines; sandbox de alterações; meta-circuito de segurança; initiative engine |

### Plano de Testes

| Tipo | Escopo | Ferramenta |
|------|--------|-----------|
| **Unit** | Scanner individual (mock de fonte externa); parser de resultado; calculadora de score | Vitest + nock |
| **Integration** | Scan → Fix → Verify pipeline; isolamento Self-Space vs Project Space; meta-circuito loop detection | Vitest + testcontainers |
| **E2E** | Self-Panel UI completo; Technology Radar recommendation → ADR creation; ciclo completo de auto-evolution | Playwright |

### Conexões com Estudos

| Estudo | Conexão |
|--------|---------|
| **S24 — Controle e Segurança** | SafetyCircuit protege ciclos do auto-fix; E-Stop pode interromper evolução |
| **S25 — Perfis de Usuário** | Perfil N3/N4 habilita auto-evolution; N0/N1 bloqueia alterações automáticas |
| **T1 — Topologia** | ScannerPool se conecta a 66 packages via contratos C1-C18 |
| **S8 — Emerging Tech** | Technology Radar consome dados dos scanners do S8 |
| **INT — Intensificação** | Este estudo é alvo de intensificação para score ≥ 4 |
