# S81 — Error Defense in Depth: IDEIA Prevenindo que o Modelo Erre

## Score: 4.20 | Gap: Alto

---

## Fase 1: Pesquisa

### 1.1 Contexto

- **Problema:** Modelos de IA **vão errar**. SWE-bench Verified chega a 80-88% em bugs isolados, mas FeatureBench cai para ~11% em features completas. Sem defesas em camadas, cada erro pode comprometer todo o pipeline de desenvolvimento.
- **Público:** QualityGates (Pipeline, AutoFixer, DefenseFeedbackBridge), SupplyChain (ArtifactRegistry, BuildVerifier, DependencyPolicyManager), todos os gates especializados.
- **Restrições:** Defesas não podem adicionar latência perceptível ao fluxo normal, cada defesa deve ter ação configurável (block/warn), feedback deve alimentar memória do sistema.

### 1.2 Abordagens Consideradas

| Abordagem | Descrição | Status |
|-----------|-----------|--------|
| **QualityGate Pipeline** | Pipeline sequencial de gates (lint → typecheck → test → coverage → build) | Implementado |
| **Specialized Gates** | SpecGate, TDDGate, MakerVerifierGate, DistillationGate | Implementado |
| **DefenseFeedbackBridge** | Conexão entre defesas, feedback pipeline e memória | Implementado |
| **AutoFixer** | Correção automática para gates fixáveis (lint, format) | Implementado |
| **SupplyChain** | ArtifactRegistry, BuildVerifier, DependencyPolicyManager | Implementado |

### 1.3 Pesquisa Realizada

- `packages/quality-gates/src/pipeline.ts` — Pipeline com 5 gates padrão + runners
- `packages/quality-gates/src/gates/spec-gate.ts` — SpecGate (6 regras, score 0-100)
- `packages/quality-gates/src/gates/tdd-gate.ts` — TDDGate (test-first enforcement)
- `packages/quality-gates/src/gates/maker-verifier-gate.ts` — MakerVerifierGate (independência maker/verifier)
- `packages/quality-gates/src/gates/distillation-gate.ts` — DistillationGate (student/professor ratio)
- `packages/quality-gates/src/defense-feedback-bridge.ts` — DefenseFeedbackBridge
- `packages/quality-gates/src/auto-fixer.ts` — AutoFixer
- `packages/supply-chain/src/artifact-registry.ts` — ArtifactRegistry
- `packages/supply-chain/src/build-verifier.ts` — BuildVerifier
- `packages/supply-chain/src/dependency-policy.ts` — DependencyPolicyManager
- `packages/supply-chain/src/types.ts` — ArtifactProvenance, IntegrityCheck, BuildReproducibility, DependencyPolicy

---

## Fase 2: Matriz de Viabilidade

### 2.1 Pontuação

| Dimensão | Peso | Score | Ponderado | Observação |
|----------|------|-------|-----------|------------|
| **Valor** | 3× | 5.0 | 15.0 | Eleva FeatureBench de ~11% para 70-90% |
| **Diferenciação** | 2× | 4.5 | 9.0 | 8 camadas de defesa + supply chain é único |
| **Sinergia** | 2× | 4.0 | 8.0 | Gates + SupplyChain + AgentRuntime integrados |
| **Custo-Benefício** | 2× | 4.0 | 8.0 | ~45h para 8 defesas completas |
| **Maturidade** | 1× | 3.5 | 3.5 | Gates em produção, SupplyChain é novo |
| **Total** | 10× | | **43.5/50** | |

### 2.2 Análise de Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Falso positivo bloqueia trabalho legítimo | Média | Alto | Ação configurável (block/warn) por gate |
| Supply chain overhead em projetos pequenos | Alta | Baixo | DependencyPolicyManager opcional |
| Feedback loop cria noise na memória | Média | Médio | DefenseFeedbackBridge com filtro por severidade |

---

## Fase 3: Artefatos

### 3.1 A Realidade (honesta)

| Benchmark | Melhor resultado | O que significa |
|-----------|-----------------|-----------------|
| SWE-bench Verified | 80-88% | Modelo resolve 4 de 5 bugs isolados |
| SWE-bench Pro | <25% | Tarefas reais multi-arquivo: 1 de 4 |
| FeatureBench | ~11% | Features completas: 1 de 10 |

**IDEIA precisa empurrar de ~11% para 70-90% em domínios delimitados** — não com um modelo melhor, mas com um **sistema de defesa** que envolve o modelo.

### 3.2 As 8 Defesas — Implementação Detalhada

#### Defesa 1: Spec verificável (SpecGate)

Em `packages/quality-gates/src/gates/spec-gate.ts`:

```typescript
class SpecGate {
  validate(spec: SpecValidationInput, action: FailureAction): GateRunnerResult {
    const issues: string[] = []
    const warnings: string[] = []

    if (spec.requirementsCount === 0) issues.push('Spec must have at least 1 requirement')
    if (spec.acceptanceCriteriaCount === 0) issues.push('Acceptance criteria must be defined')
    if (!spec.hasDesign) warnings.push('Design document is missing')
    if (!spec.requirementsHaveCriteria) warnings.push('Not all requirements have acceptance criteria')
    if (!spec.tasksHaveDependencies) warnings.push('Tasks have no dependencies')
    if (spec.tasksCount === 0) issues.push('At least 1 task must be defined')

    const passed = issues.length === 0
    const score = Math.max(0, 100 - issues.length * 30 - warnings.length * 10)
    return { name: `spec-validate:${spec.specId}`, passed, action, durationMs, output, errorCount }
  }
}
```

| Regra | Tipo | Penalidade |
|-------|------|-----------|
| requirementsCount === 0 | Issue (block) | -30 pts |
| acceptanceCriteriaCount === 0 | Issue (block) | -30 pts |
| tasksCount === 0 | Issue (block) | -30 pts |
| !hasDesign | Warning | -10 pts |
| !requirementsHaveCriteria | Warning | -10 pts |
| !tasksHaveDependencies | Warning | -10 pts |

#### Defesa 2: TDD-first (TDDGate)

Em `packages/quality-gates/src/gates/tdd-gate.ts`:

```typescript
class TDDGate {
  async validate(projectRoot: string, input: TDDInput, action: FailureAction): Promise<GateRunnerResult> {
    const issues: string[] = []
    const warnings: string[] = []

    if (input.testFiles.length === 0) issues.push('No test files found — tests must be written before implementation')
    if (input.sourceFiles.length > 0 && input.testFiles.length === 0)
      issues.push('Source files exist but no test files — TDD requires test-first')
    if (input.specTestCaseCount > 0 && input.testFiles.length < Math.ceil(input.specTestCaseCount * 0.5))
      warnings.push('Spec has test cases but few test files found')

    // Verifica naming convention: test file deve conter nome do source
    let namedCorrectly = 0
    for (const tf of input.testFiles) {
      for (const sf of input.sourceFiles) {
        if (path.basename(tf).includes(path.basename(sf, path.extname(sf)))) { namedCorrectly++; break }
      }
    }
    if (namedCorrectly < input.testFiles.length)
      warnings.push('Some test files not matching source file naming convention')

    return { name: 'tdd', passed: issues.length === 0, action, ... }
  }
}
```

#### Defesa 3: Maker/Verifier (MakerVerifierGate)

Em `packages/quality-gates/src/gates/maker-verifier-gate.ts`:

```typescript
class MakerVerifierGate {
  async evaluate(
    spec: string,
    makerArtifact: MakerInput,
    verifierResult: string,
    options: { requiredLoops: number; independentVerifier: boolean },
    action: FailureAction,
  ): Promise<GateRunnerResult> {
    const issues: string[] = []
    if (!options.independentVerifier) issues.push('Verifier must be independent from maker')
    if (!verifierResult || verifierResult.trim().length === 0) issues.push('Verifier produced no output')
    if (verifierResult.toLowerCase().includes('fail') || verifierResult.toLowerCase().includes('error'))
      issues.push(`Verifier rejected the artifact: ${verifierResult.slice(0, 200)}`)
    return { name: 'maker-verifier', passed: issues.length === 0, action, ... }
  }
}
```

#### Defesa 4: DistillationGate (qualidade de modelo destilado)

Em `packages/quality-gates/src/gates/distillation-gate.ts`:

```typescript
class DistillationGate {
  evaluate(input: DistillationGateInput, action: FailureAction): GateRunnerResult {
    const issues: string[] = []
    if (input.professorScore <= 0) issues.push('Professor model has invalid score')
    if (input.studentScore <= 0) issues.push('Student model has invalid score')

    const ratio = input.professorScore > 0 ? input.studentScore / input.professorScore : 0
    if (ratio < input.threshold) issues.push(`Student score below ${input.threshold * 100}% of professor`)

    if (input.studentPerplexity !== undefined && input.professorPerplexity !== undefined) {
      if (input.studentPerplexity > input.professorPerplexity * 1.5)
        issues.push('Student perplexity >50% higher — quality degradation')
    }
    return { name: `distillation:${input.domain}`, passed: issues.length === 0, action, ... }
  }
}
```

#### Defesa 5-8: Pipeline, AutoFixer, DefenseFeedbackBridge, SupplyChain

### 3.3 QualityGate Pipeline — Execução sequencial

Em `packages/quality-gates/src/pipeline.ts`, o `Pipeline` executa gates em ordem:

```typescript
class Pipeline {
  private gates: GateConfig[] = []
  private results: GateRunnerResult[] = []

  addGate(config: GateConfig): void { this.gates.push(config) }

  async run(projectRoot?: string): Promise<PipelineStatus> {
    for (const gate of this.gates) {
      const runner = this.createRunner(gate.name)
      let result: GateRunnerResult
      if (runner instanceof CoverageGate)
        result = await runner.run(root, gate.script, gate.action, gate.threshold)
      else
        result = await (runner as LintGate | TypecheckGate | TestGate | BuildGate).run(root, gate.script, gate.action)

      this.results.push(result)
      if (!result.passed && gate.action === 'block') break  // fail-fast
    }
    return {
      running: false, completed: true,
      passed: blockedBy.length === 0,
      totalGates, passedGates, failedGates,
      blockedBy, warnings, results: this.results,
      durationMs: Date.now() - this.startTime,
    }
  }
}
```

Gates padrão registrados:

| Gate | Runner | Ação default |
|------|--------|-------------|
| `lint` | LintGate | `block` |
| `typecheck` | TypecheckGate | `block` |
| `test` | TestGate | `block` |
| `coverage` | CoverageGate (com threshold) | `warn` |
| `build` | BuildGate | `block` |

### 3.4 AutoFixer — Correção automática de gates

Em `packages/quality-gates/src/auto-fixer.ts`:

```typescript
const FIXABLE_GATES = new Set(['lint', 'format'])

class AutoFixer {
  async fix(results: GateRunnerResult[], projectRoot?: string): Promise<FixResult[]> {
    for (const result of results) {
      if (result.passed || !FIXABLE_GATES.has(result.name)) continue
      const applied = await this.applyFix(result.name, root)
      fixes.push({ gate: result.name, fixes: applied, success: applied.length > 0, ... })
    }
  }

  private async applyFix(gateName: string, cwd: string): Promise<string[]> {
    const fixes: string[] = []
    if (gateName === 'lint') {
      try { execSync('npx eslint --fix .', { cwd, timeout: 120000 }); fixes.push('eslint --fix .') } catch { }
    }
    if (gateName === 'format') {
      try { execSync('npx prettier --write .', { cwd, timeout: 120000 }); fixes.push('prettier --write .') } catch { }
    }
    return fixes
  }
}
```

### 3.5 DefenseFeedbackBridge — Conectando defesa ao aprendizado

Em `packages/quality-gates/src/defense-feedback-bridge.ts`:

```typescript
class DefenseFeedbackBridge {
  private events: DefenseEvent[] = []
  private feedbackPipeline?: FeedbackPipeline
  private memoryStore?: MemoryStore

  async recordDefenseEvent(event: DefenseEvent): Promise<void> {
    this.events.push(event)
    if (event.eventType === 'blocked' && this.feedbackPipeline) {
      this.feedbackPipeline.submit({
        type: 'issue', source: 'system', targetType: 'defense-gate',
        targetId: event.defenseId,
        content: `[Defense ${event.defenseName}] Blocked: ${event.details}`,
        severity: 'error', tags: ['defense-gate', event.defenseName, event.phase],
      })
    }
    if (this.memoryStore) {
      this.memoryStore.append({
        memoryId: `defense-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        category: 'failure', source: `defense:${event.defenseName}`,
        summary: event.details, tags: ['defense', event.defenseName, event.eventType],
        createdAt: new Date().toISOString(),
        severity: event.eventType === 'blocked' ? 'high' : 'low',
        decision: { recommendationId: event.defenseId, status: event.eventType },
        context: { phase: event.phase, taskId: event.taskId, layer: event.layer },
      })
    }
  }
}
```

Eventos de defesa:

```typescript
export interface DefenseEvent {
  defenseId: string
  defenseName: string
  layer: number         // 1-8
  eventType: 'blocked' | 'warning' | 'passed'
  phase: string
  taskId: string
  details: string
  timestamp: string
}
```

Relatório consolidado:

```typescript
getDefenseReport(): {
  total: number
  blocked: number
  warnings: number
  passed: number
  byDefense: Record<string, { total: number; blocked: number }>
}
```

### 3.6 SupplyChain — Integridade de artefatos, builds e dependências

#### ArtifactRegistry

Em `packages/supply-chain/src/artifact-registry.ts`:

```typescript
class ArtifactRegistry {
  private artifacts: Map<string, ArtifactProvenance> = new Map()

  register(name: string, version: string, content: string, producedBy: string, buildEnv: string, deps?: string[]): ArtifactProvenance {
    const hash = createHash('sha256').update(content).digest('hex')
    const id = randomUUID()
    const artifact: ArtifactProvenance = {
      id, name, version, hash, hashAlgorithm: 'sha256',
      createdAt: new Date().toISOString(), producedBy, buildEnvironment: buildEnv,
      dependencies: deps ?? [],
    }
    this.artifacts.set(id, artifact)
    return { ...artifact }
  }

  addAttestation(artifactId: string, attestation: Attestation): ArtifactProvenance | undefined { ... }
  verifyIntegrity(artifactId: string, actualContent: string): IntegrityCheck { ... }
  findByHash(hash: string): ArtifactProvenance[] { ... }
}
```

Tipos de proveniência (de `packages/supply-chain/src/types.ts`):

```typescript
export interface ArtifactProvenance {
  id: string
  name: string
  version: string
  hash: string                  // SHA-256 do conteúdo
  hashAlgorithm: string
  createdAt: string
  producedBy: string            // pipeline/agente que produziu
  buildEnvironment: string      // fingerprint do ambiente
  dependencies: string[]
  attestation?: Attestation     // assinatura SLSA-like
}

export interface IntegrityCheck {
  artifactId: string
  expectedHash: string
  actualHash: string
  match: boolean
  error?: string
}
```

Verificação de integridade:

```typescript
verifyIntegrity(artifactId: string, actualContent: string): IntegrityCheck {
  const artifact = this.artifacts.get(artifactId)
  if (!artifact) return { artifactId, expectedHash: '', actualHash: '', match: false, error: 'Artifact not found' }
  const actualHash = createHash('sha256').update(actualContent).digest('hex')
  return { artifactId, expectedHash: artifact.hash, actualHash, match: actualHash === artifact.hash }
}
```

#### BuildVerifier

Em `packages/supply-chain/src/build-verifier.ts`:

```typescript
class BuildVerifier {
  verify(inputs: Record<string, string>, buildConfig: Record<string, string>, expectedOutputHash: string): BuildReproducibility {
    const serialized = this.serialize(inputs) + this.serialize(buildConfig)
    const actualHash = createHash('sha256').update(serialized).digest('hex')
    const differences: string[] = []
    if (actualHash !== expectedOutputHash) differences.push('output hash mismatch')
    const lockedDeps = Object.entries(buildConfig).filter(([k]) => k.includes('version') || k.includes('lock'))
    if (lockedDeps.length === 0) differences.push('no locked dependencies found')
    return { reproducible: differences.length === 0, differences, buildConfig }
  }
}
```

#### DependencyPolicyManager

Em `packages/supply-chain/src/dependency-policy.ts`:

```typescript
class DependencyPolicyManager {
  private policies: Map<string, DependencyPolicy> = new Map()

  setPolicy(name: string, policy: DependencyPolicy): void { this.policies.set(name, policy) }

  check(name: string, version: string, ageDays: number): { allowed: boolean; reasons: string[] } {
    const policy = this.policies.get(name)
    if (!policy) return { allowed: true, reasons: ['no policy defined'] }
    const reasons: string[] = []
    if (policy.blocked) { reasons.push('dependency is blocked'); return { allowed: false, reasons } }
    if (policy.allowedVersions.length > 0 && !policy.allowedVersions.includes(version))
      reasons.push(`version ${version} not in allowed list`)
    if (policy.maxAgeDays > 0 && ageDays > policy.maxAgeDays)
      reasons.push(`dependency age ${ageDays}d exceeds max ${policy.maxAgeDays}d`)
    if (policy.requireAudit) reasons.push('requires audit')
    return { allowed: reasons.length === 0, reasons }
  }
}
```

### 3.7 As 8 Defesas e o Status no IDEIA

| # | Defesa | Implementação | Layer | Ação |
|---|--------|--------------|-------|------|
| 1 | **Spec verificável** | SpecGate (spec-gate.ts) | 1 | block |
| 2 | **TDD-first** | TDDGate (tdd-gate.ts) | 2 | block |
| 3 | **Maker/Verifier** | MakerVerifierGate (maker-verifier-gate.ts) | 3 | block |
| 4 | **Hooks em tempo real** | HookEngine (spec-engine) | 4 | warn |
| 5 | **Agentic Judge** | DefenseFeedbackBridge.processJudgeResult() | 5 | block |
| 6 | **Sandbox + worktree** | MakerVerifierLoop.worktreeBasePath | 6 | — |
| 7 | **Human gates** | action === 'block' + approval-flow | 7 | block |
| 8 | **Avaliação contínua** | Pipeline.run() + DefenseFeedbackBridge | 8 | warn |

### 3.8 Defesa em Profundidade no Pipeline IDEIA

```
┌─ Input ─────────────────────────────────────────────┐
│  Usuário descreve intent                             │
├─ Defesa 1 ──────────────────────────────────────────┤
│  SpecGate: spec tem requirements + design + tasks?   │
├─ Defesa 2 ──────────────────────────────────────────┤
│  TDDGate: testes existem antes da implementação?     │
├─ Defesa 3 ──────────────────────────────────────────┤
│  MakerVerifierGate: verifier independente?           │
├─ Defesa 4 ──────────────────────────────────────────┤
│  HookEngine.fire('fileSaved') → lint, test, scan     │
├─ Defesa 5 ──────────────────────────────────────────┤
│  AgenticJudge: estática + dinâmica combinadas        │
├─ Defesa 6 ──────────────────────────────────────────┤
│  BuildVerifier + ArtifactRegistry: integridade       │
├─ Defesa 7 ──────────────────────────────────────────┤
│  Human gate para operações destrutivas               │
├─ Defesa 8 ──────────────────────────────────────────┤
│  DefenseFeedbackBridge → feedback pipeline → memória │
└─────────────────────────────────────────────────────┘
```

### 3.9 Ajustes Específicos no IDEIA

| Onde | Ajuste | Impacto |
|------|--------|---------|
| `@ideia/quality-gates/src/gates.ts` | Adicionar `SpecGate` + `TDDGate` + `MakerVerifierGate` | 3 novas camadas de defesa |
| `@ideia/verification-layer/src/` | Adicionar `AgenticJudge` — análise estática + dinâmica combinadas | Réplica do SWE-Judge |
| `@ideia/terminal-sandbox/src/` | Adicionar `git worktree` por sub-agente | Isolamento + rollback barato |
| `@ideia/agent-runtime/src/human-loop.ts` | Integrar com pipeline (não só approval avulso) | Gates humanos em pontos críticos |
| `@ideia/feedback-pipeline/src/` | Conectar resultados de gates como feedback | Modelo aprende com erros |

---

## Fase 4: Ciclo de Vida

### 4.1 Roadmap

- **Fase de adoção:** Fase 8-9 do plano geral
- **Dependências:** `@ideia/quality-gates` + `@ideia/supply-chain` + `@ideia/agent-runtime`
- **Esforço estimado:** ~45h para 8 defesas completas

### 4.2 Tasks para Implementação

1. **T1:** Adicionar gates: `SpecGate`, `TDDGate`, `MakerVerifierGate` em `quality-gates` — já implementados como classes, integrar no Pipeline
2. **T2:** Implementar `AgenticJudge` — combina análise estática (lint+typecheck) com dinâmica (testes) via DefenseFeedbackBridge
3. **T3:** Integrar git worktree em `terminal-sandbox` — cada sub-agente em worktree isolada
4. **T4:** Conectar human gates ao pipeline SDD — não só approval avulso
5. **T5:** Feedback loop: erros detectados → `feedback-pipeline` → `adaptive-learning` → memória
6. **T6:** Dashboard de defesas: quantas vezes cada defesa salvou o pipeline de um erro

### 4.3 Métricas de Efetividade

| Defesa | Taxa de bloqueio esperada | Custo de falha evitado |
|--------|--------------------------|----------------------|
| SpecGate | 30% (specs inválidas) | Retrabalho de 3 ciclos |
| TDDGate | 20% (código sem testes) | Bug em produção |
| MakerVerifierGate | 15% (verificação falha) | Código incorreto em PR |
| AgenticJudge | 25% (issues cross-phase) | Dívida estrutural |
| BuildVerifier | 5% (build não reprodutível) | Surpresa em deploy |

### 4.4 Conexões com Estudos Existentes

| Estudo | Conexão | Impacto |
|--------|---------|---------|
| S79 (SDD) | SpecGate é a Defesa 1 — spec verificável | Alto |
| S80 (Pipeline) | Todas as 8 defesas rodam como gates do pipeline | Alto |
| S74 (Distillation) | DistillationGate valida qualidade de modelo destilado | Médio |
| S78 (Token Economy) | Defesas precoces (SpecGate) economizam tokens vs retrabalho | Alto |

### 4.5 Decisão Final

- **Aprovado:** Sim
- **Justificativa:** O sistema de defesa em 8 camadas é a diferença entre um assistente de código e uma plataforma de desenvolvimento confiável. Com QualityGate Pipeline, DefenseFeedbackBridge, AutoFixer e SupplyChain integrados, IDEIA pode elevar FeatureBench de ~11% para 70-90% em domínios delimitados. Score 4.2/5.0.
- **Data:** 2026-07-26
- **Responsável:** IDEIA Architecture Board

---

> **Template v1.0 aplicado — S81 Error Defense in Depth**
> **Score Final: 4.20/5.0 | Gap: Alto**
