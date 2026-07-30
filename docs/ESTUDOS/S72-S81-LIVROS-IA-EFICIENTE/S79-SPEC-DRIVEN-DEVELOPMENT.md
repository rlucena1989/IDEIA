# S79 — Spec-Driven Development: IDEIA Dando Direção Clara ao Modelo

## Score: 4.45 | Gap: Crítico

---

## Fase 1: Pesquisa

### 1.1 Contexto

- **Problema:** A causa nº1 de PRs rejeitados é descrições vagas. Modelos de IA produzem código inconsistente sem especificação verificável prévia. Ciclos de "tenta-erro" consomem 3x mais tokens e tempo.
- **Público:** Agentes de IA (analyst → architect → programmer → reviewer → tester), usuários finais do IDEIA CLI, desenvolvedores de skills.
- **Restrições:** Compatibilidade com AGENTS.md existente, integração com AgentRuntime via hooks em tempo real, zero sobrecarga para specs triviais.

### 1.2 Abordagens Consideradas

| Tecnologia | Tipo | Descrição | Maturidade |
|-----------|------|-----------|------------|
| SpecGenerator | Engine | Geração programática de Spec com requirements + design + tasks + test cases | Produção |
| SteeringFileManager | Gerenciador | 3 modos de steering (always/fileMatch/manual) com glob matching | Produção |
| HookEngine | Event Bus | 5 eventos de ciclo de vida com 4 ações configuráveis | Produção |

### 1.3 Pesquisa Realizada

- Implementação de referência: `packages/spec-engine/src/` (4 módulos, ~450 linhas)
- Integração com AgentRuntime via `SpecDrivenPipeline` em `packages/agent-runtime/src/spec-pipeline.ts`
- Validação via `SpecGate` em `packages/quality-gates/src/gates/spec-gate.ts`

---

## Fase 2: Matriz de Viabilidade

### 2.1 Pontuação

| Dimensão | Peso | Score | Ponderado | Observação |
|----------|------|-------|-----------|------------|
| **Valor** | 3× | 5.0 | 15.0 | Elimina ciclos de retrabalho por descrição vaga |
| **Diferenciação** | 2× | 4.5 | 9.0 | Nenhum concorrente tem SDD como infraestrutura de primeira classe |
| **Sinergia** | 2× | 4.5 | 9.0 | Já existe spec-engine + agent-runtime — integração direta |
| **Custo-Benefício** | 2× | 4.0 | 8.0 | ~40h de integração para eliminar 60%+ de retrabalho |
| **Maturidade** | 1× | 4.0 | 4.0 | SpecGenerator e HookEngine já em produção |
| **Total** | 10× | | **45.0/50** | |

### 2.2 Análise de Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Spec muito genérica para ser útil | Média | Alto | SteeringFileManager + AGENTS.md como contexto obrigatório |
| Hooks degradam performance | Baixa | Médio | HookEngine com timeout configurável por hook |
| Usuário ignora spec | Alta | Baixo | SpecGate bloqueia implementação sem spec válida |

---

## Fase 3: Artefatos

### 3.1 O que o Modelo de IA Precisa

O modelo de IA não sabe o que você quer se você não disser claramente. SDD resolve isso: uma especificação verificável antes do código é como dar um **mapa** para o modelo antes da viagem.

#### O Ciclo de Erro sem SDD

```
Usuário: "Adiciona login aqui"
  Modelo: implementa algo
  Usuário: "Não, eu queria OAuth"
  Modelo: refaz
  Usuário: "Também precisava de refresh token"
  Modelo: refaz de novo
  → 3x mais tokens, 3x mais tempo, frustração
```

#### O Ciclo Correto com SDD

```
Usuário: "Adiciona login aqui"
  Spec Engine: gera spec com requirements + design + tasks + testes
  Usuário: revisa spec (30 segundos)
  Modelo: implementa spec → 1 iteração, teste passa, PR aceito
  → 1x tokens, 1x tempo, felicidade
```

### 3.2 O ecossistema Spec-Driven no IDEIA

O pacote `@ideia/spec-engine` (criado na sessão 2026-07-26) contém 4 módulos centrais:

```
packages/spec-engine/src/
├── spec-generator.ts        → SpecGenerator (gera Spec completa)
├── steering-file-manager.ts → SteeringFileManager (3 modos de steering)
├── hook-engine.ts           → HookEngine (5 eventos, 4 ações)
└── types.ts                 → Spec, Requirement, DesignDoc, Task, TestCase, SteeringFile, Hook
```

#### SpecGenerator — O coração da geração de specs

Em `packages/spec-engine/src/spec-generator.ts`, o `SpecGenerator` é uma classe pura que recebe um `GenerationInput` e produz um `Spec` completo:

```typescript
export interface GenerationInput {
  title: string
  intention: string
  context: {
    projectType: string
    language: string
    existingArchitecture?: string
    constraints?: string[]
  }
  steeringFiles?: string[]
}
```

O método `generate(input: GenerationInput): Spec` produz:

| Propriedade | Tipo | Fonte | Exemplo |
|------------|------|-------|---------|
| `id` | `string` | Auto-gerado | `spec-1711468800000-a1b2c3` |
| `title` | `string` | Input | `"Login OAuth"` |
| `version` | `number` | Sempre 1 | `1` |
| `status` | `SpecStatus` | `'draft'` | — |
| `requirements` | `Requirement[]` | `generateRequirements()` | REQ-001 funcional + constraints |
| `design` | `DesignDoc` | `generateDesign()` | overview, architecture, components, dataFlow |
| `tasks` | `Task[]` | `generateTasks()` | 3 tasks default (structure, implement, test) |
| `acceptanceCriteria` | `TestCase[]` | `generateTestCases()` | TC-001 unit test |
| `changelog` | `SpecChange[]` | Auto | Version 1, data, autor |

O `Spec` completo tem este shape (de `packages/spec-engine/src/types.ts`):

```typescript
export interface Spec {
  id: string
  title: string
  version: number
  status: SpecStatus  // 'draft' | 'review' | 'approved' | 'implementing' | 'done'
  requirements: Requirement[]
  design: DesignDoc
  tasks: Task[]
  acceptanceCriteria: TestCase[]
  createdAt: string
  updatedAt: string
  approvedBy?: string
  changelog: SpecChange[]
}
```

Cada `Requirement` carrega:

```typescript
export interface Requirement {
  id: string                           // REQ-001, REQ-002...
  description: string
  category: 'functional' | 'non-functional' | 'architectural' | 'security'
  priority: 'critical' | 'high' | 'medium' | 'low'
  acceptanceCriteria: string[]
}
```

Cada `DesignDoc` inclui:

```typescript
export interface DesignDoc {
  overview: string
  architecture: string
  components: ComponentSpec[]   // nome, responsabilidade, interfaces, dependências
  dataFlow: string[]            // steps do fluxo de dados
  decisions: ADRReference[]    // ADRs vinculados
}
```

Cada `Task` define:

```typescript
export interface Task {
  id: string
  title: string
  description: string
  dependencies: string[]
  estimatedEffort: 'small' | 'medium' | 'large'
  acceptanceCriteria: string[]
  status: 'pending' | 'in-progress' | 'done'
  assignedTo?: string
}
```

Cada `TestCase` segue given/when/then:

```typescript
export interface TestCase {
  id: string
  description: string
  type: 'unit' | 'integration' | 'e2e'
  given: string
  when: string
  then: string
  expectedResult: string
}
```

#### SteeringFileManager — 3 modos de steering

Em `packages/spec-engine/src/steering-file-manager.ts`:

| Modo | Comportamento | Uso |
|------|--------------|-----|
| `always` | Incluído em todo contexto | AGENTS.md, `.ai/rules/UNIVERSAL.md` |
| `fileMatch` | Incluído quando arquivo corresponde a glob | `*.ts` → regras TypeScript |
| `manual` | Incluído apenas quando explicitamente referenciado | Documentos grandes sob demanda |

```typescript
getForFileContext(filePath: string): SteeringFile[] {
  for (const file of this.files) {
    if (file.mode === 'always') {
      result.push(file)
    } else if (file.mode === 'fileMatch' && file.fileMatch) {
      for (const pattern of file.fileMatch) {
        if (this.matchGlob(pattern, filePath)) { result.push(file); break }
      }
    }
  }
}
```

O método `loadFromProject(projectRoot)` carrega automaticamente:
1. `AGENTS.md` como `mode: 'always'`
2. Todo `.md`/`.yaml` em `.ai/` como `mode: 'always'` (limite de 4000 chars)

O `matchGlob` converte padrões como `src/**/*.ts` em regex:

```typescript
private matchGlob(pattern: string, filePath: string): boolean {
  const regexStr = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '___DOUBLESTAR___')
    .replace(/\*/g, '[^/\\\\]*')
    .replace(/___DOUBLESTAR___/g, '.*')
  return new RegExp(`^${regexStr}$`).test(filePath)
}
```

#### HookEngine — 5 eventos, 4 ações

Em `packages/spec-engine/src/hook-engine.ts`:

| Evento (`HookEvent`) | Disparo | Uso típico |
|---------------------|---------|------------|
| `preToolUse` | Antes de qualquer tool call | Validar spec antes de editar |
| `fileSaved` | Após salvar arquivo | Lint, typecheck, scan |
| `taskComplete` | Task finalizada | Verificar acceptance criteria |
| `specChange` | Spec modificada | Notificar revisores |
| `sessionEnd` | Fim da sessão | Salvar aprendizado |

| Ação (`HookAction`) | Handler | Comportamento |
|--------------------|---------|--------------|
| `askAgent` | Prompt via LLM | Pergunta ao modelo |
| `runCommand` | Execução shell | `npx eslint --fix` |
| `validateSpec` | SpecGate | Valida spec contra regras |
| `runTests` | Test runner | `npx jest` |

Registro de handler:

```typescript
hookEngine.on('runTests', async (hook, context) => {
  const start = Date.now()
  try {
    execSync('npx jest', { cwd: context.projectPath, timeout: hook.then.timeoutMs })
    return { passed: true, message: 'Tests passed', durationMs: Date.now() - start }
  } catch (err) {
    return { passed: false, message: err.message, durationMs: Date.now() - start }
  }
})
```

Disparo seletivo com filtros:

```typescript
async fire(event: HookEvent, context: HookContext): Promise<HookResult[]> {
  const matching = this.hooks.filter(h => h.enabled && h.when.event === event)
  for (const hook of matching) {
    if (hook.when.toolTypes && context.toolType && !hook.when.toolTypes.includes(context.toolType)) continue
    if (hook.when.filePatterns && context.filePath) {
      const matches = hook.when.filePatterns.some(p => context.filePath!.endsWith(p.replace('*', '')))
      if (!matches) continue
    }
    // executa handler...
  }
}
```

Cada `Hook` é assim (de `types.ts`):

```typescript
export interface Hook {
  name: string
  description: string
  when: {
    event: HookEvent
    toolTypes?: string[]
    filePatterns?: string[]
  }
  then: {
    action: HookAction
    prompt?: string
    command?: string
    timeoutMs?: number
  }
  enabled: boolean
}
```

### 3.3 O que IDEIA Já Tem e o que Precisa

| Componente | IDEIA Hoje | O que Falta |
|-----------|-----------|-------------|
| `@ideia/spec-engine` (NOVO) | SpecGenerator + SteeringFileManager + HookEngine | Conectar hooks ao agent-runtime real |
| `@ideia/spec-generator` (existente) | GherkinParser + TestStubGenerator | Estender para spec completa (requirements + design + tasks) |
| `AGENTS.md` | Contexto persistente | Estruturar como SteeringFile (always + fileMatch + manual) |
| `@ideia/agent-runtime` | Execução de tarefas | Integrar ciclo SDD: spec → planner → executor → verifier |
| `@ideia/quality-gates` | Gates pós-implementação | Adicionar `SpecGate` antes de implementar |

### 3.4 Ajustes Específicos no IDEIA

| Onde | O que Ajustar | Para Quê |
|------|--------------|----------|
| `@ideia/spec-engine/src/hook-engine.ts` | Engine criada | Conectar hooks ao `AgentRuntime` — `preToolUse` dispara validação de spec |
| `@ideia/spec-engine/src/steering-file-manager.ts` | Manager criado | Integrar com AGENTS.md — ler como SteeringFile mode=always |
| `@ideia/agent-runtime/src/agent-orchestrator.ts` | Orchestrator | Adicionar `SpecDrivenPipeline` — executa spec → tasks → valida |
| `@ideia/quality-gates/src/gates.ts` | Quality gates | Adicionar `SpecGate` — valida spec antes de deixar implementar |
| `@ideia/planning-engine/src/decomposer.ts` | Decomposição | Usar spec como input (em vez de prompt livre) |
| `@ideia/cli` | CLI | `ideia spec generate`, `ideia spec validate`, `ideia hook list` |

### 3.5 O Fluxo SDD no IDEIA (Estado Alvo)

```
1. Usuário descreve intenção
2. SpecEngine gera spec (requirements + design + tasks + tests)
3. Usuário revisa (ou aprova automaticamente se padrão)
4. Spec vira contrato: agentes paralelos convergem na spec
5. Hooks disparam em cada evento (preToolUse, fileSaved, taskComplete)
6. Maker/Verifier loop valida contra spec
7. Spec nunca envelhece: hooks sincronizam com código
8. Próxima tarefa herda spec anterior como contexto
```

### 3.6 O ciclo SDD via SpecDrivenPipeline

Em `packages/agent-runtime/src/spec-pipeline.ts`, o `SpecDrivenPipeline` orquestra 4 fases:

```typescript
class SpecDrivenPipeline {
  async execute(input: SpecPipelineInput): Promise<SpecPipelineResult> {
    // Phase 1: Planning — salva handoff do plano
    // Phase 2: Execute each task — orquestrador roda cada task
    // Phase 3: Verify with MakerVerifier — loop maker/verifier
    // Phase 4: Integration check — selo final
  }
}
```

Entrada:

```typescript
interface SpecPipelineInput {
  specId: string
  title: string
  tasks: SpecTask[]      // id, title, description, dependencies, acceptanceCriteria
  acceptanceCriteria: string[]
  steeringFiles: string[]
}
```

Saída:

```typescript
interface SpecPipelineResult {
  specId: string
  phases: Array<{ name: string; status: string; durationMs: number; output?: unknown }>
  passed: boolean
  totalDurationMs: number
  handoffChain: string[]
}
```

O pipeline usa:
- `HandoffFileManager` para persistir cada fase como JSON
- `MakerVerifierLoop` com config `{ maker: sonnet@0.3, verifier: haiku@0.1, maxLoops: 3 }`
- `AgentOrchestrator.runPipeline()` para execução concreta

O `MakerVerifierLoop` (em `packages/agent-runtime/src/maker-verifier.ts`) executa até `maxLoops` iterações:

```typescript
class MakerVerifierLoop {
  async execute(taskId: string, spec: string, context: Record<string, unknown>): Promise<MakerVerifierResult> {
    for (let loop = 0; loop < config.maxLoops; loop++) {
      const buildHandoff = { taskId, from: 'orchestrator', to: 'build', phase: 'build',
        input: { spec, context, constraints: [] }, ... }
      await handoffManager.save(buildHandoff)

      const checkHandoff = { taskId, from: 'build', to: 'check', phase: 'check',
        input: { spec, context: { ...context, builtArtifact }, constraints: [] }, ... }
      await handoffManager.save(checkHandoff)

      if (passed) return { passed: true, loops: loop + 1, handoffChain: handoffIds, ... }
    }
    return { passed: false, loops: maxLoops, ... }
  }
}
```

### 3.7 Validação via SpecGate

Em `packages/quality-gates/src/gates/spec-gate.ts`, o `SpecGate` valida:

| Regra | Tipo | Penalidade |
|-------|------|-----------|
| `requirementsCount === 0` | Issue (block) | -30 pts |
| `acceptanceCriteriaCount === 0` | Issue (block) | -30 pts |
| `tasksCount === 0` | Issue (block) | -30 pts |
| `!hasDesign` | Warning | -10 pts |
| `!requirementsHaveCriteria` | Warning | -10 pts |
| `!tasksHaveDependencies` | Warning | -10 pts |

Score = `Math.max(0, 100 - issues * 30 - warnings * 10)`

```typescript
class SpecGate {
  validate(spec: SpecValidationInput, action: FailureAction): GateRunnerResult {
    // issues.length === 0 → passed
    // action = 'block' | 'warn'
  }
}
```

---

## Fase 4: Ciclo de Vida

### 4.1 Roadmap

- **Fase de adoção:** Fase 6-7 do plano geral
- **Dependências:** `@ideia/spec-engine` (compilando), `@ideia/agent-runtime` (existente), `@ideia/quality-gates` (existente)
- **Esforço estimado:** ~40h para integração completa

### 4.2 Tasks para Implementação

1. **T1:** Conectar `HookEngine` ao `AgentRuntime` — hooks disparam em eventos reais (preToolUse, fileSaved, taskComplete, sessionEnd)
2. **T2:** Integrar `SteeringFileManager` com `AGENTS.md` — ler como steering mode=always, `.ai/` como always
3. **T3:** Criar `SpecGate` em quality-gates — "spec válida?" antes de implementar com score ≥ 70
4. **T4:** `SpecDrivenPipeline` em agent-runtime — executa spec + tasks + verificação completa
5. **T5:** CLI: `ideia spec generate`, `ideia spec validate`, `ideia hook list`
6. **T6:** Testes: ciclo SDD completo com mock + validação + hooks — cobertura > 80%

### 4.3 Conexões com Estudos Existentes

| Estudo | Conexão | Impacto |
|--------|---------|---------|
| S80 (Pipeline) | SDD é a fase 1 do pipeline de 7 fases | Alto |
| S81 (Defesa) | SpecGate é a Defesa 1 — spec verificável | Alto |
| S72 (Quantization) | SteeringFileManager gerencia contextos de modelo | Médio |
| S78 (Token Economy) | SDD reduz tokens em 3x vs ciclo sem spec | Alto |

### 4.4 Decisão Final

- **Aprovado:** Sim
- **Justificativa:** SDD é a base para todo o pipeline de agente. SpecGenerator + SteeringFileManager + HookEngine formam uma tríade que elimina o principal gargalo de qualidade: especificação vaga. Score 4.45/5.0 confirma prioridade crítica.
- **Data:** 2026-07-26
- **Responsável:** IDEIA Architecture Board

---

> **Template v1.0 aplicado — S79 Spec-Driven Development**
> **Score Final: 4.45/5.0 | Gap: Crítico**
