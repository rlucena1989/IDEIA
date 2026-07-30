# S80 — Platform Architecture Pipeline: IDEIA Orquestrando o Trabalho do Modelo

## Score: 4.00 | Gap: Alto

---

## Fase 1: Pesquisa

### 1.1 Contexto

- **Problema:** Um modelo de IA sozinho não entrega software — ele precisa de um **sistema** ao redor que o guie. Sem um pipeline formalizado, agentes operam sem coordenação, produzem handoffs inconsistentes e não há rastreabilidade entre fases.
- **Público:** AgentOrchestrator, MakerVerifierLoop, HandoffFileManager, SpecDrivenPipeline, todos os 7+ papéis de agente.
- **Restrições:** Compatibilidade com A2A e MCP existentes, integração com NATS JetStream para eventos, handoffs em JSON rastreáveis.

### 1.2 Abordagens Consideradas

| Abordagem | Descrição | Status |
|-----------|-----------|--------|
| **SCOUT/GUARD/ORCH/BUILD/CHECK** | 5 papéis com modelos e temperaturas distintas | Implementado parcialmente |
| **7 papéis LangGraph** | analyst → architect → programmer → reviewer → tester → devops → supervisor | Implementado |
| **HandoffFileManager** | Handoff JSON por fase com chain追溯 | Implementado |
| **SpecDrivenPipeline** | 4 fases (plan → execute → verify → integrate) | Implementado |

### 1.3 Pesquisa Realizada

- `packages/agent-runtime/src/agent-orchestrator.ts` — AgentOrchestrator com A2A+MCP+7 agentes
- `packages/agent-runtime/src/maker-verifier.ts` — MakerVerifierLoop com config separada maker/verifier
- `packages/agent-runtime/src/handoff-file.ts` — HandoffFileManager com 5 fases (scout/guard/orch/build/check)
- `packages/agent-runtime/src/spec-pipeline.ts` — SpecDrivenPipeline integrando todos os componentes

---

## Fase 2: Matriz de Viabilidade

### 2.1 Pontuação

| Dimensão | Peso | Score | Ponderado | Observação |
|----------|------|-------|-----------|------------|
| **Valor** | 3× | 4.5 | 13.5 | Pipeline formal elimina deriva de agente |
| **Diferenciação** | 2× | 4.0 | 8.0 | Pipeline multi-modelo com handoff rastreável |
| **Sinergia** | 2× | 4.5 | 9.0 | A2A+MCP+LangGraph já integrados |
| **Custo-Benefício** | 2× | 3.5 | 7.0 | ~50h para pipeline completo |
| **Maturidade** | 1× | 3.5 | 3.5 | HandoffFileManager e MakerVerifierLoop são novos |
| **Total** | 10× | | **41.5/50** | |

### 2.2 Análise de Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Latência entre fases do pipeline | Alta | Médio | HandoffFileManager assíncrono + NATS JetStream |
| Modelo SCOUT muito barato perde contexto | Média | Alto | GUARD como validador independente |
| Handoff JSON cresce exponencialmente | Média | Baixo | Limite de tamanho + checkpoint engine para poda |

---

## Fase 3: Artefatos

### 3.1 O Loop que o Modelo Precisa

```
1. PERCEBER → O modelo entende o contexto (código, issues, histórico)
2. PLANEJAR → O modelo decompõe em passos
3. AGIR → O modelo executa (edita, testa, commit)
4. REFLETIR → O modelo avalia resultado
5. PERSISTIR → O modelo salva aprendizado
```

IDEIA já implementa partes disso via `agent-runtime` + `workflow-engine` + `checkpoint-engine`, mas falta a **formalização do ciclo completo** e a **comunicação otimizada** entre as etapas.

### 3.2 AgentOrchestrator — O maestro do pipeline

Em `packages/agent-runtime/src/agent-orchestrator.ts`, o `AgentOrchestrator` coordena:

#### 7 agentes registrados via A2A

```typescript
this.registerAgent('analyst', 'Analyst', 'Analyzes requirements and clarifies user needs', ['analysis'])
this.registerAgent('architect', 'Architect', 'Designs system architecture and makes technology decisions', ['architecture'])
this.registerAgent('programmer', 'Programmer', 'Implements features following architecture', ['implementation'])
this.registerAgent('reviewer', 'Reviewer', 'Reviews code for correctness, security, and quality', ['review'])
this.registerAgent('tester', 'Tester', 'Creates comprehensive tests for implemented code', ['testing'])
this.registerAgent('devops', 'DevOps', 'Configures CI/CD, infrastructure, and deployment', ['devops'])
this.registerAgent('supervisor', 'Supervisor', 'Coordinates agents, resolves conflicts, decides next steps', ['supervision'])
```

Cada agente tem um `AgentCard` registrado no protocolo A2A:

```typescript
const card: AgentCard = {
  agentId: `agent-${role}`, name, description, version: '1.0.0',
  capabilities, status: 'idle',
  skills: [
    { id: `${role}.process`, name: `process_${role}`, ... },
    { id: `${role}.status`, name: `get_${role}_status`, ... },
  ],
}
```

#### Grafo LangGraph com 8 nós

```typescript
private buildMainGraph(): LangGraphAgent {
  const agent = createLangGraphAgent({ maxIterations: 10, nodeTimeout: 30000, maxRetries: 3 })
  agent.addNode('analyst', createAnalystNode())
  agent.addNode('architect', createArchitectNode())
  agent.addNode('programmer', createProgrammerNode())
  agent.addNode('reviewer', createReviewerNode())
  agent.addNode('tester', createTesterNode())
  agent.addNode('parallel_reviewer_tester', createReviewerTesterParallelNode())
  agent.addNode('devops', createDevOpsNode())
  agent.addNode('supervisor', createSupervisorNode())
  agent.setEntryPoint('analyst')
  return agent
}
```

#### Integração A2A + MCP

```typescript
constructor(runtime: AgentRuntime, basePath?: string) {
  this.a2a = createA2AProtocol()
  this.mcp = createMCPRegistry()
  this.mainGraph = this.buildMainGraph()
  const fsTools = createFileSystemTools(basePath ?? process.cwd())
  this.mcp.register({ name: 'filesystem', version: '1.0.0', tools: fsTools, resources: [], prompts: [] })
  this.setupA2AHandlers()
}
```

A2A handlers com atualização de status:

```typescript
this.a2a.setHandler(info.card.agentId, async (msg: A2AMessage) => {
  this.a2a.updateAgentStatus(info.card.agentId, 'busy')
  try {
    // processa mensagem...
  } finally {
    this.a2a.updateAgentStatus(info.card.agentId, 'idle')
  }
})
```

#### Pipeline de execução

```typescript
async runPipeline(input: string): Promise<{ state: LangGraphStateAnnotation; steps: ExecutableStep[] }> {
  const handoff = new HandoffFileManager(this.runtime['workspace'] || '.')
  // Salva handoff de plano → analyst
  // Invoca grafo LangGraph
  // Envia para A2A analyst.process
  // Salva handoff de execução → build
  return { state, steps: [interpret, execute, log] }
}
```

### 3.3 Padrão SCOUT/GUARD/ORCHESTRATOR/BUILD/CHECK

IDEIA já tem 7 papéis de agente. O padrão SCOUT/GUARD/ORCH/BUILD/CHECK otimiza com:

| Papel | Modelo Ideal | Temperatura | Função | Já Existe no IDEIA? |
|-------|-------------|-------------|--------|-------------------|
| **SCOUT** | Barato (Haiku) | Alta | Exploração, índices, busca | 🟡 Analyst (parcial) |
| **GUARD** | Barato (Haiku) | Baixa | Stress-test de propostas | ❌ Novo |
| **ORCHESTRATOR** | Forte (Opus) | Média | Síntese de plano | 🟡 Supervisor (parcial) |
| **BUILD** | Médio (Sonnet) | Baixa | Implementação | 🟡 Programmer (parcial) |
| **CHECK** | Barato (Haiku) | Baixa | Validação contra spec | 🟡 Reviewer + Tester (parcial) |

### 3.4 HandoffFileManager — Rastreabilidade entre fases

Em `packages/agent-runtime/src/handoff-file.ts`, o `HandoffFileManager` gerencia a cadeia de handoffs entre agentes:

```typescript
export interface HandoffPayload {
  taskId: string
  from: string               // agente origem
  to: string                 // agente destino
  phase: 'scout' | 'guard' | 'orchestrator' | 'build' | 'check'
  input: {
    spec: string
    context: Record<string, unknown>
    constraints: string[]
  }
  output?: {
    result: unknown
    artifacts: string[]
    confidence: number
    issues: string[]
  }
  metadata: {
    createdAt: string
    completedAt?: string
    durationMs?: number
    modelUsed?: string
    tokenCost?: number
  }
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
}
```

#### 5 fases do pipeline

| Fase | Agente | Handoff `phase` | Descrição |
|------|--------|----------------|-----------|
| **SCOUT** | Analyst/explorer | `'scout'` | Explora código, índices, busca similaridades |
| **GUARD** | Security/validator | `'guard'` | Stress-test de propostas, detecta riscos |
| **ORCHESTRATOR** | Supervisor | `'orchestrator'` | Síntese de plano, coordena agentes |
| **BUILD** | Programmer | `'build'` | Implementação em worktree isolada |
| **CHECK** | Reviewer + Tester | `'check'` | Validação contra spec, testes |

#### Persistência em JSON

```typescript
async save(payload: HandoffPayload): Promise<string> {
  const fileno = `${payload.phase}-${payload.taskId}-${Date.now()}.handoff.json`
  const fs = await import('fs/promises')
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8')
  return fileno
}
```

#### Recuperação da cadeia completa

```typescript
async getChain(taskId: string): Promise<HandoffChain> {
  const fs = await import('fs/promises')
  const files = await fs.readdir(this.basePath)
  const handoffs: HandoffPayload[] = []
  for (const file of files) {
    if (file.endsWith('.handoff.json') && file.includes(taskId)) {
      handoffs.push(JSON.parse(await fs.readFile(`${this.basePath}/${file}`, 'utf-8')))
    }
  }
  handoffs.sort((a, b) => (a.metadata.createdAt < b.metadata.createdAt ? -1 : 1))
  // Retorna HandoffChain com rootTaskId, handoffs[], finalVerdict
}
```

A `HandoffChain` resultante:

```typescript
export interface HandoffChain {
  rootTaskId: string
  handoffs: HandoffPayload[]
  finalVerdict?: {
    passed: boolean
    summary: string
    artifacts: string[]
  }
}
```

### 3.5 MakerVerifierLoop — Iteração maker/verifier

Em `packages/agent-runtime/src/maker-verifier.ts`:

```typescript
export interface MakerVerifierConfig {
  maker: MakerConfig           // model, temperature, maxRetries
  verifier: VerifierConfig     // model, temperature, independentSession
  maxLoops: number             // limite de iterações (default: 3)
  worktreeBasePath: string
}
```

Comportamento do loop:

```typescript
class MakerVerifierLoop {
  async execute(taskId: string, spec: string, context: Record<string, unknown>): Promise<MakerVerifierResult> {
    for (let loop = 0; loop < this.config.maxLoops; loop++) {
      // 1. BUILD: salva handoff de build
      const buildHandoff: HandoffPayload = {
        taskId, from: 'orchestrator', to: 'build', phase: 'build',
        input: { spec, context, constraints: [] },
        metadata: { createdAt: new Date().toISOString(), modelUsed: this.config.maker.model },
        status: 'in-progress',
      }
      await this.handoffManager.save(buildHandoff)

      // 2. CHECK: salva handoff de verificação
      const checkHandoff: HandoffPayload = {
        taskId, from: 'build', to: 'check', phase: 'check',
        input: { spec, context: { ...context, builtArtifact }, constraints: [] },
        metadata: { createdAt: new Date().toISOString(), modelUsed: this.config.verifier.model },
        status: 'in-progress',
      }
      await this.handoffManager.save(checkHandoff)

      if (passed) return { passed: true, loops: loop + 1, handoffChain: handoffIds, ... }
    }
    return { passed: false, loops: maxLoops, ... }
  }
}
```

Características:
- **Maker** usa modelo médio com temperatura baixa (ex: Sonnet@0.3)
- **Verifier** usa modelo barato com temperatura muito baixa (ex: Haiku@0.1)
- **IndependentSession** força sessão separada para evitar auto-validação
- Handoffs persistem como arquivos JSON rastreáveis

### 3.6 SpecDrivenPipeline — Pipeline completo

Em `packages/agent-runtime/src/spec-pipeline.ts`, o `SpecDrivenPipeline` integra todos os componentes:

```typescript
class SpecDrivenPipeline {
  constructor(orchestrator: AgentOrchestrator, basePath: string) {
    this.handoff = new HandoffFileManager(basePath)
    this.makerVerifier = new MakerVerifierLoop({
      maker: { model: 'sonnet', temperature: 0.3, maxRetries: 3 },
      verifier: { model: 'haiku', temperature: 0.1, independentSession: true },
      maxLoops: 3,
      worktreeBasePath: basePath,
    })
  }
}
```

#### 4 fases de execução

| Fase | Componente | Saída | Handoff |
|------|-----------|-------|---------|
| 1. **Planning** | HandoffFileManager | Handoff de planejamento | `orchestrator-{taskId}-{ts}.handoff.json` |
| 2. **Execute tasks** | AgentOrchestrator | Tasks executadas | `build-{taskId}-{ts}.handoff.json` |
| 3. **Verify** | MakerVerifierLoop | Resultado maker/verifier | Cadeia de handoffs build+check |
| 4. **Integration** | HandoffFileManager | Selo final | `check-{specId}-{ts}.handoff.json` |

```typescript
async execute(input: SpecPipelineInput): Promise<SpecPipelineResult> {
  // Phase 1: Plan — salva handoff do plano
  const planPayload: HandoffPayload = {
    taskId: input.specId, from: 'orchestrator', to: 'analyst',
    phase: 'orchestrator',
    input: { spec: input.title, context: { tasks: input.tasks }, constraints: [] },
    ...
  }
  await this.handoff.save(planPayload)

  // Phase 2: Execute each task
  for (const task of input.tasks) {
    const execPayload = { taskId: task.id, from: 'orchestrator', to: 'build',
      phase: 'build', input: { spec: task.title, context: { ... }, constraints: [] }, ... }
    await this.handoff.save(execPayload)
    await this.orchestrator.runPipeline(task.description)
    execPayload.status = 'completed'
    await this.handoff.save(execPayload)
  }

  // Phase 3: Verify with MakerVerifier
  const mvResult = await this.makerVerifier.execute(input.specId, JSON.stringify(input.acceptanceCriteria), ...)

  // Phase 4: Integration check
  const integPayload = { ... phase: 'check', status: mvResult.passed ? 'completed' : 'failed', ... }
  await this.handoff.save(integPayload)
}
```

### 3.7 Configuração ideal por papel

A baixa temperatura no BUILD e CHECK é crucial — modelos com temperatura > 0.5 tendem a "inventar" APIs e implementações criativas mas incorretas. O SCOUT com temperatura ALTA é intencional: queremos exploração divergente.

### 3.8 Ajustes Específicos no IDEIA

| Componente | Estado Atual | Ajuste |
|-----------|-------------|--------|
| `@ideia/agent-runtime` | 7 papéis fixos | Adicionar SCOUT/GUARD/CHECK como papéis especializados com modelo+temperatura configuráveis |
| `@ideia/agent-runtime/src/handoff-file.ts` | HandoffFileManager criado | Integrar handoff no ciclo → cada fase produz handoff JSON |
| `@ideia/agent-runtime/src/maker-verifier.ts` | MakerVerifierLoop criado | Integrar no pipeline do orchestrator |
| `@ideia/checkpoint-engine` | Checkpoints por execução | Checkpoints por **fase** do pipeline (spec→plan→exec→check→persist) |
| `@ideia/workflow-engine` | Workflow linear | Adicionar branching/backtracking como primitivas |
| `@ideia/cli` | `orchestrate` command | `ideia pipeline run --spec <id>` — executa pipeline completo |

### 3.9 Pipeline de 7 Fases (Estado Alvo)

```
ideia pipeline run --spec S-123

Fase 1 — Spec:   Carrega spec, steering, hooks
Fase 2 — Plan:   SCOUT explora, GUARD stress-testa, ORCHESTRATOR sintetiza
Fase 3 — Exec:   BUILD em worktree isolada
Fase 4 — Check:  CHECK verifica contra spec + hooks disparam
Fase 5 — Integ:  Testes de integração + regressão
Fase 6 — Entrega: Commit + PR com diff da spec
Fase 7 — Persist: Lições → skills → ADRs
```

### 3.10 Exemplo de handoff completo

Para uma task `login-oauth`, o pipeline gera:

```
.handoffs/
├── orchestrator-login-oauth-1711468800001.handoff.json  # Fase 1: Plano
├── build-login-oauth-1711468800500.handoff.json          # Fase 2: Build
├── check-login-oauth-1711468801000.handoff.json          # Fase 3: Check (loop 1)
├── build-login-oauth-1711468801500.handoff.json          # Fase 2: Build (loop 2)
├── check-login-oauth-1711468802000.handoff.json          # Fase 3: Check (loop 2)
└── check-login-oauth-1711468802500.handoff.json          # Fase 4: Integration
```

Cada handoff contém `input`, `output`, `metadata` e `status` para rastreabilidade completa.

---

## Fase 4: Ciclo de Vida

### 4.1 Roadmap

- **Fase de adoção:** Fase 7-8 do plano geral
- **Dependências:** `@ideia/agent-runtime` com AgentOrchestrator, HandoffFileManager, MakerVerifierLoop
- **Esforço estimado:** ~50h para pipeline completo

### 4.2 Tasks para Implementação

1. **T1:** Criar papéis SCOUT/GUARD/CHECK no `agent-runtime` com configuração de modelo+temperature
2. **T2:** Integrar handoff files no ciclo — cada fase persiste em JSON no `checkpoint-engine`
3. **T3:** Conectar `MakerVerifierLoop` ao pipeline do orchestrator como etapa default
4. **T4:** Adicionar branching/backtracking no `workflow-engine` como primitivas de primeira classe
5. **T5:** CLI: `ideia pipeline run --spec <id>` — executa pipeline completo com checkpoint por fase
6. **T6:** Dashboard: visualizar pipeline em execução com fase atual e handoffs

### 4.3 Conexões com Estudos Existentes

| Estudo | Conexão | Impacto |
|--------|---------|---------|
| S79 (SDD) | SDD fornece spec que alimenta Fase 1 do pipeline | Alto |
| S81 (Defesa) | CHECK + GUARD são camadas de defesa no pipeline | Alto |
| S76 (MoE) | Roteamento entre modelos (Haiku/Sonnet/Opus) por fase | Médio |
| S75 (Inference) | Otimização de latência por fase com modelo adequado | Alto |

### 4.4 Decisão Final

- **Aprovado:** Sim
- **Justificativa:** A arquitetura de pipeline formalizada (SCOUT/GUARD/ORCH/BUILD/CHECK) com HandoffFileManager e MakerVerifierLoop é a diferença entre agentes soltos e um sistema orquestrado. Score 4.0/5.0 reflete o alto valor com maturidade ainda em desenvolvimento.
- **Data:** 2026-07-26
- **Responsável:** IDEIA Architecture Board

---

> **Template v1.0 aplicado — S80 Platform Architecture Pipeline**
> **Score Final: 4.00/5.0 | Gap: Alto**
