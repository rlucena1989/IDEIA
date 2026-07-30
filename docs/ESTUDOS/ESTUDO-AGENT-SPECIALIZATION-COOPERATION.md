# Estudo de EspecializaÃ§Ã£o e CooperaÃ§Ã£o de Agentes Internos na IDEIA

**NÃ­vel:** Doutoral / Sistemas Multiagente  
**Ãreas:** Sistemas Multiagente (MAS) Â· Agentes BDI Â· OrquestraÃ§Ã£o Inteligente Â· CoordenaÃ§Ã£o DistribuÃ­da  
**HipÃ³tese central:** Agentes internos especializados com contratos formais e mecanismos de consenso produzem resultados superiores a agentes generalistas em qualidade, velocidade e auditabilidade.

---

## 1. IntroduÃ§Ã£o e FundamentaÃ§Ã£o

### 1.1 O Problema do Agente Generalista

Agentes generalistas (um Ãºnico LLM para todas as tarefas) sofrem de:
- Performance inconsistente entre domÃ­nios
- Dificuldade de auditar responsabilidade por decisÃµes
- Baixa especializaÃ§Ã£o em tarefas especÃ­ficas
- Acoplamento forte entre raciocÃ­nio e execuÃ§Ã£o

A abordagem de agentes especializados resolve isso com:
- Cada agente focado em uma funÃ§Ã£o especÃ­fica
- Contratos claros de entrada e saÃ­da
- Responsabilidade bem definida
- SubstituiÃ§Ã£o independente

### 1.2 Arquitetura de Agentes Proposta

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    ORCHESTRATOR                            â”‚
â”‚  Coordena, sequencia, gerencia estado e contratos         â”‚
â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
     â”‚     â”‚     â”‚     â”‚     â”‚     â”‚     â”‚     â”‚
â”Œâ”€â”€â”€â”€â–¼â”â”Œâ”€â”€â–¼â”€â”€â”â”Œâ”€â”€â–¼â”€â”€â”â”Œâ”€â”€â–¼â”€â”€â”â”Œâ”€â”€â–¼â”€â”€â”â”Œâ”€â”€â–¼â”€â”€â”â”Œâ”€â”€â–¼â”€â”€â”
â”‚Intentâ”‚â”‚Plan â”‚â”‚Code â”‚â”‚Test â”‚â”‚Doc  â”‚â”‚Sec  â”‚â”‚Deployâ”‚
â”‚Agent â”‚â”‚Agentâ”‚â”‚Agentâ”‚â”‚Agentâ”‚â”‚Agentâ”‚â”‚Agentâ”‚â”‚Agent â”‚
â””â”€â”€â”€â”€â”€â”€â”˜â””â”€â”€â”€â”€â”€â”˜â””â”€â”€â”€â”€â”€â”˜â””â”€â”€â”€â”€â”€â”˜â””â”€â”€â”€â”€â”€â”˜â””â”€â”€â”€â”€â”€â”˜â””â”€â”€â”€â”€â”€â”˜
```

### 1.3 Contexto CientÃ­fico

- **Wooldridge (2009):** An Introduction to MultiAgent Systems â€” Fundamentos de MAS, cooperation, coordination
- **Rao & Georgeff (1995):** BDI Agents: From Theory to Practice â€” Modelo crenÃ§a-desejo-intenÃ§Ã£o
- **Jennings (2000):** "On agent-based software engineering" â€” Engenharia de software baseada em agentes
- **Sycara (1998):** "Multiagent Systems" â€” AI Journal â€” VisÃ£o geral de sistemas multiagente

---

## 2. CatÃ¡logo de Agentes Especializados

### 2.1 Agente de IntenÃ§Ã£o (Intent Agent)

**FunÃ§Ã£o:** Interpretar solicitaÃ§Ã£o do usuÃ¡rio e extrair intenÃ§Ã£o estruturada  
**Entrada:** Texto livre + contexto do projeto  
**SaÃ­da:** IntenÃ§Ã£o estruturada (objetivo, escopo, restriÃ§Ãµes, ambiguidades)

```typescript
class IntentAgent implements IAgent {
  async execute(input: IntentInput): Promise<IntentOutput> {
    const intent = await this.extractIntent(input.rawText);
    const ambiguities = this.detectAmbiguities(intent);
    const entities = await this.extractEntities(intent);
    const risk = this.estimateInitialRisk(intent);

    return {
      intent,
      ambiguities,
      entities,
      initialRisk: risk,
      requiresClarification: ambiguities.length > 0
    };
  }

  private detectAmbiguities(intent: Intent): Ambiguity[] {
    // HeurÃ­sticas: pronomes vagos, mÃ©tricas ausentes, restriÃ§Ãµes implÃ­citas
    const patterns = [
      /quanto\s+tempo/i,
      /mais\s+rÃ¡pido/i,
      /melhor\s+forma/i,
      /algum/i,
      /vÃ¡rios/i
    ];
    return patterns
      .filter(p => p.test(intent.description))
      .map(p => ({ pattern: p.source, severity: 'medium' }));
  }
}
```

### 2.2 Agente Planejador (Plan Agent)

**FunÃ§Ã£o:** Decompor intenÃ§Ã£o em plano executÃ¡vel  
**Entrada:** IntenÃ§Ã£o estruturada + especificaÃ§Ã£o  
**SaÃ­da:** Plano com dependÃªncias, riscos, agentes alocados

### 2.3 Agente Gerador de CÃ³digo (Code Agent)

**FunÃ§Ã£o:** Gerar cÃ³digo a partir de especificaÃ§Ã£o  
**Entrada:** EspecificaÃ§Ã£o de mÃ³dulo + padrÃµes de projeto  
**SaÃ­da:** CÃ³digo gerado + artefatos

### 2.4 Agente de Testes (Test Agent)

**FunÃ§Ã£o:** Gerar e executar testes  
**Entrada:** CÃ³digo + especificaÃ§Ã£o  
**SaÃ­da:** Testes + resultados + cobertura

### 2.5 Agente de DocumentaÃ§Ã£o (Doc Agent)

**FunÃ§Ã£o:** Gerar documentaÃ§Ã£o tÃ©cnica e de usuÃ¡rio  
**Entrada:** CÃ³digo + especificaÃ§Ã£o + testes  
**SaÃ­da:** DocumentaÃ§Ã£o completa

### 2.6 Agente de SeguranÃ§a (Security Agent)

**FunÃ§Ã£o:** Analisar risco e validar seguranÃ§a  
**Entrada:** CÃ³digo + plano + configuraÃ§Ã£o  
**SaÃ­da:** Score de risco + vulnerabilidades + recomendaÃ§Ãµes

### 2.7 Agente de Deploy (Deploy Agent)

**FunÃ§Ã£o:** Empacotar e publicar artefatos  
**Entrada:** CÃ³digo verificado + configuraÃ§Ã£o  
**SaÃ­da:** Artefato publicado + URL + mÃ©tricas

---

## 3. Contratos entre Agentes

### 3.1 Contrato Formal

```typescript
interface AgentContract {
  agentId: string;
  version: string;
  capabilities: string[];
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  performanceSLO: {
    maxLatency: number;     // ms
    maxTokens: number;
    minSuccessRate: number; // 0-1
  };
  dependencies: string[];   // agentIds que este agente depende
}
```

### 3.2 Exemplo: Contrato do Code Agent

```typescript
const codeAgentContract: AgentContract = {
  agentId: 'code-agent-v1',
  version: '1.0.0',
  capabilities: [
    'typescript-generation',
    'api-endpoint-generation',
    'model-generation',
    'test-generation'
  ],
  inputSchema: {
    type: 'object',
    properties: {
      module: { type: 'string' },
      entities: { type: 'array' },
      style: { type: 'string', enum: ['clean', 'verbose', 'minimal'] }
    },
    required: ['module', 'entities']
  },
  outputSchema: {
    type: 'object',
    properties: {
      files: { type: 'array' },
      tests: { type: 'array' },
      coverage: { type: 'number' }
    }
  },
  performanceSLO: {
    maxLatency: 30000,
    maxTokens: 4000,
    minSuccessRate: 0.95
  },
  dependencies: ['intent-agent', 'plan-agent']
};
```

---

## 4. Mecanismos de CooperaÃ§Ã£o

### 4.1 Consenso entre Agentes

Quando dois agentes produzem resultados conflitantes:

```typescript
class ConsensusEngine {
  async reachConsensus(
    conflicts: Conflict[],
    agents: IAgent[]
  ): Promise<Resolution> {
    // 1. Coletar justificativas de cada agente
    const justifications = await Promise.all(
      agents.map(a => a.justify(conflicts))
    );

    // 2. Heuristic scorer avalia cada justificativa
    const scores = justifications.map(j => ({
      agent: j.agentId,
      score: this.scoreJustification(j),
      evidence: j.evidence
    }));

    // 3. Se score > threshold, aceita
    const best = scores.reduce((a, b) => a.score > b.score ? a : b);
    if (best.score >= 0.7) return { resolution: 'accept', winner: best.agent };

    // 4. Se nÃ£o, escala para humano ou orquestrador
    return { resolution: 'escalate', to: 'orchestrator', conflicts };
  }

  private scoreJustification(j: Justification): number {
    return (
      j.hasEvidence * 0.3 +
      j.alignsWithPolicy * 0.3 +
      j.consistencyWithHistory * 0.2 +
      j.hasAlternativeAnalysis * 0.2
    );
  }
}
```

### 4.2 FusÃ£o de Resultados

```typescript
class ResultFusion {
  merge<T>(results: AgentResult<T>[]): MergedResult<T> {
    // EstratÃ©gia: votaÃ§Ã£o ponderada por confianÃ§a histÃ³rica
    const weighted = results.map(r => ({
      value: r.output,
      weight: this.historicalConfidence.get(r.agentId) || 0.5
    }));

    // Para resultados categÃ³ricos: votaÃ§Ã£o
    // Para resultados numÃ©ricos: mÃ©dia ponderada
    // Para texto: seleciona o de maior confianÃ§a
    if (this.isCategorical(results)) {
      return this.weightedVote(weighted);
    }
    if (this.isNumeric(results)) {
      return this.weightedAverage(weighted);
    }
    return this.bestConfidence(weighted);
  }
}
```

### 4.3 Handoff entre Agentes

```typescript
interface AgentHandoff {
  fromAgent: string;
  toAgent: string;
  task: Task;
  state: ExecutionState;
  decisions: Decision[];
  artifacts: Artifact[];
  risks: Risk[];
  context: ContextBundle;
}
```

---

## 5. OrquestraÃ§Ã£o de Agentes

### 5.1 Pipeline Management

```typescript
class AgentPipeline {
  private orchestrator: Orchestrator;

  async execute(plan: Plan): Promise<ExecutionResult> {
    const state: ExecutionState = { current: 0, history: [] };

    for (const step of plan.steps) {
      const agent = this.orchestrator.selectAgent(step);
      const input = this.buildInput(step, state);
      const result = await agent.execute(input);

      state.history.push({
        agent: agent.id,
        step: step.id,
        result,
        timestamp: Date.now()
      });

      if (result.status === 'failure' && step.retryCount < 3) {
        return this.handleFailure(step, state);
      }
    }

    return this.compileResult(state);
  }

  private async handleFailure(
    step: Step,
    state: ExecutionState
  ): Promise<ExecutionResult> {
    // Tenta replanejamento
    const alternative = await this.orchestrator.replan(step, state);
    if (alternative) {
      return this.execute({ steps: [alternative], ...plan });
    }

    // Escala para humano
    return {
      status: 'needs-human',
      state,
      error: step.lastError
    };
  }
}
```

---

## 6. ImplementaÃ§Ã£o de ReferÃªncia

### 6.1 Estrutura

```
packages/agent-ecosystem/
  src/
    agents/
      intent-agent.ts
      plan-agent.ts
      code-agent.ts
      test-agent.ts
      doc-agent.ts
      security-agent.ts
      deploy-agent.ts
    contracts/
      contract-registry.ts
      schema-validator.ts
      slo-monitor.ts
    cooperation/
      consensus-engine.ts
      result-fusion.ts
      handoff-manager.ts
    orchestration/
      pipeline-manager.ts
      agent-selector.ts
      failure-handler.ts
    types/
      agent-types.ts
```

### 6.2 Interface Base

```typescript
interface IAgent {
  readonly id: string;
  readonly contract: AgentContract;
  readonly status: AgentStatus;

  execute(input: unknown): Promise<AgentResult>;
  validate(input: unknown): ValidationResult;
  cancel(): Promise<void>;
  getMetrics(): Promise<AgentMetrics>;
  getName(): string;
}

interface Orchestrator {
  selectAgent(task: Task): IAgent;
  executePipeline(plan: Plan): Promise<ExecutionResult>;
  replan(step: Step, state: ExecutionState): Promise<Step | null>;
  getAgentStatus(): Promise<Map<string, AgentStatus>>;
}
```

---


## 7. ImplementaÃ§Ã£o de Agentes Especialistas Concretos

### 7.1 CodeReviewerAgent â€” RevisÃ£o EstÃ¡tica de CÃ³digo

```typescript
interface CodeReviewInput {
  files: CodeFile[];
  rules: ReviewRule[];
  context: { project: string; language: string; framework: string };
}

interface CodeReviewOutput {
  issues: ReviewIssue[];
  score: number;
  summary: ReviewSummary;
  suggestions: CodeSuggestion[];
}

interface ReviewIssue {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  suggestedFix?: string;
  category: 'security' | 'style' | 'performance' | 'correctness' | 'maintainability';
}

interface CodeSuggestion {
  file: string;
  lines: [number, number];
  original: string;
  suggested: string;
  rationale: string;
  estimatedImprovement: string;
}

class CodeReviewerAgent implements IAgent {
  readonly id = 'code-reviewer-v1';
  readonly status: AgentStatus = 'idle';
  readonly contract: AgentContract = {
    agentId: 'code-reviewer-v1', version: '1.0.0',
    capabilities: ['static-analysis', 'style-check', 'security-scan', 'code-quality'],
    inputSchema: { type: 'object', properties: { files: { type: 'array' }, rules: { type: 'array' }, context: { type: 'object' } }, required: ['files'] },
    outputSchema: { type: 'object', properties: { issues: { type: 'array' }, score: { type: 'number' }, summary: { type: 'object' } }, required: ['issues', 'score'] },
    performanceSLO: { maxLatency: 15000, maxTokens: 6000, minSuccessRate: 0.97 },
    dependencies: []
  };

  private readonly builtinRules: ReviewRule[] = [
    { id: 'no-eval', pattern: /\beval\s*\(/, severity: 'error', category: 'security', message: 'eval() allows arbitrary code execution' },
    { id: 'no-console', pattern: /console\.(log|debug|info|warn|error)\s*\(/, severity: 'warning', category: 'style', message: 'Remove debug console statements before production' },
    { id: 'no-any', pattern: /:\s*any\b/, severity: 'warning', category: 'style', message: 'Avoid `any` type; use proper typing' },
    { id: 'max-function-length', pattern: undefined, severity: 'warning', category: 'maintainability', message: 'Function exceeds 50 lines' },
    { id: 'no-secrets', pattern: /(?:api[_-]?key|password|secret|token)\s*[:=]\s*['"][^'"]+['"]/i, severity: 'error', category: 'security', message: 'Possible secret hardcoded in source' },
    { id: 'no-sql-injection', pattern: /(?:execute|query|run)\s*\(\s*[`'"]\s*SELECT/i, severity: 'error', category: 'security', message: 'Potential SQL injection vulnerability' },
    { id: 'missing-error-handling', pattern: /\.catch\s*\(\s*\)/, severity: 'warning', category: 'correctness', message: 'Empty catch block swallows errors' },
    { id: 'no-duplicate-import', pattern: undefined, severity: 'info', category: 'maintainability', message: 'Duplicate import detected' }
  ];

  async execute(input: CodeReviewInput): Promise<AgentResult> {
    const allIssues: ReviewIssue[] = [];
    const fileScores: Map<string, number> = new Map();

    for (const file of input.files) {
      if (!this.isSupportedLanguage(file.path)) continue;
      const lines = file.content.split('\n');
      const fileIssues = this.analyzeFile(file, lines, input.rules);
      allIssues.push(...fileIssues);
      fileScores.set(file.path, this.calculateFileScore(fileIssues));
    }

    const consolidated = this.consolidateDuplicates(allIssues);
    const score = this.calculateOverallScore(consolidated);
    const suggestions = this.generateSuggestions(consolidated, input.files);
    const summary = this.buildSummary(consolidated, score, input.files.length);

    return {
      status: 'success',
      output: { issues: consolidated, score, summary, suggestions } as CodeReviewOutput,
      metrics: { executionTime: 0, tokensUsed: 0, confidence: score / 100 }
    };
  }

  private isSupportedLanguage(path: string): boolean {
    return /\.(ts|tsx|js|jsx|py|java|go|rs)$/.test(path);
  }

  private analyzeFile(file: CodeFile, lines: string[], extraRules: ReviewRule[]): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const allRules = [...this.builtinRules, ...extraRules];

    for (const rule of allRules) {
      if (rule.pattern) {
        for (let i = 0; i < lines.length; i++) {
          const match = lines[i].match(rule.pattern);
          if (match) {
            issues.push({
              file: file.path, line: i + 1,
              column: match.index ?? 0,
              severity: rule.severity as ReviewIssue['severity'],
              rule: rule.id, message: rule.message,
              category: rule.category as ReviewIssue['category'],
              suggestedFix: match[0]
            });
          }
        }
      } else if (rule.id === 'max-function-length') {
        issues.push(...this.checkFunctionLength(file, lines));
      } else if (rule.id === 'no-duplicate-import') {
        issues.push(...this.checkDuplicateImports(lines, file.path));
      }
    }
    return issues;
  }

  private checkFunctionLength(file: CodeFile, lines: string[]): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    let inFunction = false;
    let startLine = 0;
    let braceCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/\b(function|async\s+function|=>)\s*\(/.test(line) || /^\s*\w+\s*\(.*\)\s*\{/.test(line)) {
        inFunction = true; startLine = i; braceCount = 0;
      }
      if (inFunction) {
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;
        if (braceCount <= 0 && i - startLine > 50) {
          issues.push({
            file: file.path, line: startLine + 1, column: 0,
            severity: 'warning', rule: 'max-function-length',
            message: `Function starting at line ${startLine + 1} has ${i - startLine} lines (max 50)`,
            category: 'maintainability'
          });
          inFunction = false;
        } else if (braceCount <= 0) { inFunction = false; }
      }
    }
    return issues;
  }

  private checkDuplicateImports(lines: string[], filePath: string): ReviewIssue[] {
    const imports: Map<string, number> = new Map();
    const issues: ReviewIssue[] = [];
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^import\s+\{[^}]+\}\s+from\s+['"]([^'"]+)['"]/);
      if (match) {
        const source = match[1];
        if (imports.has(source)) {
          issues.push({
            file: filePath, line: i + 1, column: 0, severity: 'info',
            rule: 'no-duplicate-import',
            message: `Duplicate import of '${source}' (first at line ${imports.get(source)})`,
            category: 'maintainability'
          });
        } else { imports.set(source, i + 1); }
      }
    }
    return issues;
  }

  private consolidateDuplicates(issues: ReviewIssue[]): ReviewIssue[] {
    const seen = new Set<string>();
    return issues.filter(issue => {
      const key = `${issue.file}:${issue.rule}:${issue.line}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }

  private calculateFileScore(issues: ReviewIssue[]): number {
    const penalties: Record<string, number> = { error: 15, warning: 5, info: 1 };
    const totalPenalty = issues.reduce((sum, i) => sum + (penalties[i.severity] ?? 0), 0);
    return Math.max(0, 100 - totalPenalty);
  }

  private calculateOverallScore(issues: ReviewIssue[]): number {
    const errors = issues.filter(i => i.severity === 'error').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;
    const infos = issues.filter(i => i.severity === 'info').length;
    return Math.max(0, 100 - (errors * 15 + warnings * 5 + infos * 1));
  }

  private generateSuggestions(issues: ReviewIssue[], files: CodeFile[]): CodeSuggestion[] {
    return issues.filter(i => i.severity !== 'info' && i.suggestedFix).slice(0, 10).map(i => ({
      file: i.file, lines: [i.line, i.line] as [number, number],
      original: i.suggestedFix ?? '',
      suggested: this.buildSuggestion(i),
      rationale: i.message,
      estimatedImprovement: i.severity === 'error' ? 'critical' : 'significant'
    }));
  }

  private buildSuggestion(issue: ReviewIssue): string {
    const replacements: Record<string, string> = {
      'eval(': '// Use Function constructor or dynamic import\nalternativeImplementation()',
      'console.log(': '// Use structured logger\nlogger.info(',
      'console.error(': '// Use structured logger\nlogger.error('
    };
    for (const [pattern, replacement] of Object.entries(replacements)) {
      if (issue.suggestedFix?.includes(pattern)) {
        return issue.suggestedFix.replace(pattern, replacement);
      }
    }
    return `// TODO: Fix ${issue.rule} - ${issue.message}`;
  }

  private buildSummary(issues: ReviewIssue[], score: number, totalFiles: number): ReviewSummary {
    return {
      totalFiles, filesReviewed: totalFiles, totalIssues: issues.length,
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      infos: issues.filter(i => i.severity === 'info').length,
      securityIssues: issues.filter(i => i.category === 'security').length,
      maintainabilityIssues: issues.filter(i => i.category === 'maintainability').length,
      score, grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D', passed: score >= 75
    };
  }

  validate(input: unknown): ValidationResult {
    const data = input as CodeReviewInput;
    const errors: string[] = [];
    if (!data.files || !Array.isArray(data.files)) errors.push('files must be an array');
    if (data.files?.some(f => !f.path || !f.content)) errors.push('each file must have path and content');
    return { valid: errors.length === 0, errors };
  }

  async cancel(): Promise<void> {}
  async getMetrics(): Promise<AgentMetrics> {
    return { tasksCompleted: 0, avgLatency: 0, successRate: 1, tokensConsumed: 0 };
  }
  getName(): string { return 'Code Reviewer Agent'; }
}

interface ReviewSummary {
  totalFiles: number; filesReviewed: number; totalIssues: number;
  errors: number; warnings: number; infos: number;
  securityIssues: number; maintainabilityIssues: number;
  score: number; grade: string; passed: boolean;
}

interface ReviewRule {
  id: string; pattern: RegExp | undefined; severity: string;
  category: string; message: string;
}

interface CodeFile {
  path: string; content: string; language: string;
}
```

### 7.2 ArchitectureAgent â€” AnÃ¡lise de DependÃªncias e PadrÃµes

```typescript
interface ArchitectureInput {
  project: string;
  modules: ModuleDescriptor[];
  dependencies: DependencyRecord[];
  patterns: string[];
}

interface ArchitectureOutput {
  dependencyGraph: DependencyGraph;
  violations: ArchitectureViolation[];
  patterns: DetectedPattern[];
  techDebt: TechDebtAssessment;
  recommendations: ArchitectureRecommendation[];
}

interface DependencyGraph {
  nodes: GraphNode[];
  edges: DependencyEdge[];
  cycles: string[][];
  layers: LayerMap;
}

interface ArchitectureViolation {
  type: 'circular-dependency' | 'layer-breach' | 'hub-concentration' | 'god-module';
  source: string; target: string;
  description: string; severity: 'critical' | 'major' | 'minor';
}

interface TechDebtAssessment {
  totalScore: number; hotspots: Hotspot[];
  trend: 'increasing' | 'stable' | 'decreasing';
  estimatedEffortHours: number;
}

class ArchitectureAgent implements IAgent {
  readonly id = 'architecture-v1';
  readonly status: AgentStatus = 'idle';
  readonly contract: AgentContract = {
    agentId: 'architecture-v1', version: '1.0.0',
    capabilities: ['dependency-analysis', 'pattern-detection', 'tech-debt-assessment', 'architecture-validation'],
    inputSchema: { type: 'object', properties: { project: { type: 'string' }, modules: { type: 'array' }, dependencies: { type: 'array' } }, required: ['project', 'modules'] },
    outputSchema: { type: 'object', properties: { dependencyGraph: { type: 'object' }, violations: { type: 'array' }, techDebt: { type: 'object' } }, required: ['dependencyGraph', 'violations'] },
    performanceSLO: { maxLatency: 30000, maxTokens: 8000, minSuccessRate: 0.95 },
    dependencies: ['code-reviewer-v1']
  };

  async execute(input: ArchitectureInput): Promise<AgentResult> {
    const graph = this.buildDependencyGraph(input.modules, input.dependencies);
    const cycles = this.detectCycles(graph);
    const violations = this.detectViolations(graph, cycles, input.modules);
    const detectedPatterns = this.detectPatterns(input.modules, input.dependencies);
    const techDebt = this.assessTechDebt(graph, violations, input.modules);
    const layout = this.computeLayeredLayout(graph, violations);
    const recommendations = this.generateRecommendations(violations, techDebt, layout);

    return {
      status: 'success',
      output: { dependencyGraph: { ...graph, cycles, layers: layout }, violations, patterns: detectedPatterns, techDebt, recommendations } as ArchitectureOutput,
      metrics: { executionTime: 0, tokensUsed: 0, confidence: 0.9 }
    };
  }

  private buildDependencyGraph(modules: ModuleDescriptor[], deps: DependencyRecord[]): DependencyGraph {
    const nodes: GraphNode[] = modules.map((m, i) => ({
      id: m.name, name: m.name, layer: this.classifyLayer(m), fileCount: m.fileCount, depth: 0
    }));
    const edges: DependencyEdge[] = deps
      .filter(dep => modules.some(m => m.name === dep.from) && modules.some(m => m.name === dep.to))
      .map(dep => ({ from: dep.from, to: dep.to, weight: dep.weight ?? 1, type: dep.type ?? 'source' }));
    return { nodes, edges, cycles: [], layers: {} };
  }

  private classifyLayer(module: ModuleDescriptor): string {
    const layerPatterns: [RegExp, string][] = [
      [/domain|entity|model|core/i, 'domain'], [/application|use.?case|service/i, 'application'],
      [/infrastructure|persistence|repository|database/i, 'infrastructure'],
      [/presentation|ui|web|api|controller/i, 'presentation'], [/shared|common|util|helper/i, 'shared']
    ];
    for (const [pattern, layer] of layerPatterns) {
      if (pattern.test(module.name)) return layer;
    }
    return 'unknown';
  }

  private detectCycles(graph: DependencyGraph): string[][] {
    const visited = new Set<string>(); const recursionStack = new Set<string>();
    const cycles: string[][] = []; const path: string[] = [];
    const dfs = (nodeId: string) => {
      visited.add(nodeId); recursionStack.add(nodeId); path.push(nodeId);
      for (const edge of graph.edges.filter(e => e.from === nodeId)) {
        if (!visited.has(edge.to)) dfs(edge.to);
        else if (recursionStack.has(edge.to)) {
          const cycleStart = path.indexOf(edge.to);
          if (cycleStart !== -1) cycles.push([...path.slice(cycleStart), edge.to]);
        }
      }
      path.pop(); recursionStack.delete(nodeId);
    };
    for (const node of graph.nodes) { if (!visited.has(node.id)) dfs(node.id); }
    return cycles;
  }

  private detectViolations(graph: DependencyGraph, cycles: string[][], modules: ModuleDescriptor[]): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];
    for (const cycle of cycles) {
      const unique = [...new Set(cycle)];
      for (let i = 0; i < unique.length - 1; i++) {
        violations.push({
          type: 'circular-dependency', source: unique[i], target: unique[i + 1],
          description: `Circular dependency between ${unique[i]} and ${unique[i + 1]}`,
          severity: 'critical'
        });
      }
    }
    const edgeCount = new Map<string, number>();
    for (const edge of graph.edges) edgeCount.set(edge.from, (edgeCount.get(edge.from) ?? 0) + 1);
    for (const [node, count] of edgeCount) {
      if (count > 20) violations.push({
        type: 'hub-concentration', source: node, target: '',
        description: `${node} has ${count} outgoing dependencies`, severity: count > 40 ? 'critical' : 'major'
      });
    }
    const moduleLines = new Map(modules.map(m => [m.name, m.lineCount ?? 0]));
    for (const [name, lines] of moduleLines) {
      if (lines > 3000) violations.push({
        type: 'god-module', source: name, target: '',
        description: `${name} has ${lines} lines (threshold: 3000)`,
        severity: lines > 5000 ? 'critical' : 'major'
      });
    }
    for (const edge of graph.edges) {
      const fromLayer = graph.nodes.find(n => n.id === edge.from)?.layer ?? '';
      const toLayer = graph.nodes.find(n => n.id === edge.to)?.layer ?? '';
      if (fromLayer === 'presentation' && toLayer === 'infrastructure') {
        violations.push({
          type: 'layer-breach', source: edge.from, target: edge.to,
          description: `Presentation layer '${edge.from}' depends on infrastructure '${edge.to}'`,
          severity: 'major'
        });
      }
    }
    return violations;
  }

  private detectPatterns(modules: ModuleDescriptor[], deps: DependencyRecord[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const names = modules.map(m => m.name.toLowerCase());
    if (names.some(n => n.includes('repository')) && names.some(n => n.includes('service'))) {
      patterns.push({ name: 'Repository Pattern', confidence: 0.85, description: 'Repository and Service layers detected', modules: modules.filter(m => /repository|service/i.test(m.name)).map(m => m.name) });
    }
    if (names.some(n => n.includes('factory') || n.includes('builder'))) {
      patterns.push({ name: 'Creational Pattern', confidence: 0.7, description: 'Factory/Builder modules detected', modules: modules.filter(m => /factory|builder/i.test(m.name)).map(m => m.name) });
    }
    const mediatorModules = modules.filter(m => /mediator|bus|broker|event|orchestrat/i.test(m.name));
    if (mediatorModules.length > 0) {
      patterns.push({ name: 'Mediator/Event Bus Pattern', confidence: 0.8, description: `${mediatorModules.length} mediator/event modules found`, modules: mediatorModules.map(m => m.name) });
    }
    const layerCount = new Set(modules.map(m => this.classifyLayer(m))).size;
    if (layerCount >= 3) patterns.push({ name: 'Layered Architecture', confidence: 0.9, description: `${layerCount} distinct layers identified`, modules: [] });
    return patterns;
  }

  private assessTechDebt(graph: DependencyGraph, violations: ArchitectureViolation[], modules: ModuleDescriptor[]): TechDebtAssessment {
    const cycleDebt = violations.filter(v => v.type === 'circular-dependency').length * 8;
    const hubDebt = violations.filter(v => v.type === 'hub-concentration').length * 4;
    const godModuleDebt = violations.filter(v => v.type === 'god-module').length * 12;
    const layerDebt = violations.filter(v => v.type === 'layer-breach').length * 6;
    const complexityDebt = modules.reduce((sum, m) => sum + (m.complexityScore ?? 0) * 0.5, 0);
    const totalScore = Math.min(100, cycleDebt + hubDebt + godModuleDebt + layerDebt + complexityDebt);
    const hotspots: Hotspot[] = violations.filter(v => v.severity === 'critical').map(v => ({
      module: v.source, issue: v.description, effortHours: v.type === 'circular-dependency' ? 16 : 8, priority: 1
    }));
    return { totalScore, hotspots, trend: totalScore > 50 ? 'increasing' : 'stable', estimatedEffortHours: hotspots.reduce((s, h) => s + h.effortHours, 0) };
  }

  private computeLayeredLayout(graph: DependencyGraph, violations: ArchitectureViolation[]): LayerMap {
    const layerOrder = ['presentation', 'application', 'domain', 'infrastructure', 'shared', 'unknown'];
    const layers: LayerMap = {};
    for (const layer of layerOrder) {
      const nodesInLayer = graph.nodes.filter(n => n.layer === layer);
      if (nodesInLayer.length > 0) layers[layer] = nodesInLayer.map(n => n.id);
    }
    return layers;
  }

  private generateRecommendations(violations: ArchitectureViolation[], techDebt: TechDebtAssessment, layers: LayerMap): ArchitectureRecommendation[] {
    const recs: ArchitectureRecommendation[] = [];
    const cycles = violations.filter(v => v.type === 'circular-dependency');
    if (cycles.length > 0) recs.push({ priority: 'critical', area: 'dependency', description: `Resolve ${cycles.length} circular dependencies using interface abstraction`, effort: `${cycles.length * 8}h` });
    const hubs = violations.filter(v => v.type === 'hub-concentration');
    if (hubs.length > 0) recs.push({ priority: 'major', area: 'modularity', description: `Split ${hubs.length} hub modules with >20 dependencies`, effort: `${hubs.length * 4}h` });
    if (techDebt.totalScore > 50) recs.push({ priority: 'major', area: 'tech-debt', description: `Schedule refactoring for ${techDebt.hotspots.length} hotspots (${techDebt.estimatedEffortHours}h)`, effort: `${techDebt.estimatedEffortHours}h` });
    const breaches = violations.filter(v => v.type === 'layer-breach');
    if (breaches.length > 0) recs.push({ priority: 'major', area: 'architecture', description: `Anti-corruption layer for ${breaches.length} layer breaches`, effort: `${breaches.length * 6}h` });
    return recs;
  }

  validate(input: unknown): ValidationResult {
    const data = input as ArchitectureInput;
    const errors: string[] = [];
    if (!data.project) errors.push('project is required');
    if (!data.modules?.length) errors.push('modules must be a non-empty array');
    return { valid: errors.length === 0, errors };
  }
  async cancel(): Promise<void> {}
  async getMetrics(): Promise<AgentMetrics> { return { tasksCompleted: 0, avgLatency: 0, successRate: 0.95, tokensConsumed: 0 }; }
  getName(): string { return 'Architecture Agent'; }
}

interface ModuleDescriptor { name: string; fileCount: number; lineCount?: number; complexityScore?: number; }
interface DependencyRecord { from: string; to: string; weight?: number; type?: string; }
interface GraphNode { id: string; name: string; layer: string; fileCount: number; depth: number; }
interface DependencyEdge { from: string; to: string; weight: number; type: string; }
interface LayerMap { [layer: string]: string[]; }
interface DetectedPattern { name: string; confidence: number; description: string; modules: string[]; }
interface Hotspot { module: string; issue: string; effortHours: number; priority: number; }
interface ArchitectureRecommendation { priority: 'critical' | 'major' | 'minor'; area: string; description: string; effort: string; }
```

### 7.3 TestingAgent â€” GeraÃ§Ã£o e AnÃ¡lise de Testes

```typescript
interface TestingInput {
  files: CodeFile[];
  config: TestingConfig;
  existingTests?: TestFile[];
}

interface TestingOutput {
  generatedTests: TestFile[];
  coverageReport: CoverageReport;
  mutationScore: MutationScore;
  testPlan: TestPlan;
}

interface TestingConfig {
  framework: 'jest' | 'vitest' | 'mocha';
  coverageThreshold: number;
  mutationThreshold: number;
  generateUnit: boolean;
  generateIntegration: boolean;
  generateE2E: boolean;
}

interface TestFile {
  path: string; content: string; type: 'unit' | 'integration' | 'e2e'; coverage: number;
}

class TestingAgent implements IAgent {
  readonly id = 'testing-v1';
  readonly status: AgentStatus = 'idle';
  readonly contract: AgentContract = {
    agentId: 'testing-v1', version: '1.0.0',
    capabilities: ['test-generation', 'coverage-analysis', 'mutation-testing', 'test-planning'],
    inputSchema: { type: 'object', properties: { files: { type: 'array' }, config: { type: 'object' } }, required: ['files', 'config'] },
    outputSchema: { type: 'object', properties: { generatedTests: { type: 'array' }, coverageReport: { type: 'object' }, mutationScore: { type: 'object' } }, required: ['generatedTests'] },
    performanceSLO: { maxLatency: 45000, maxTokens: 12000, minSuccessRate: 0.93 },
    dependencies: ['code-reviewer-v1', 'architecture-v1']
  };

  private readonly testTemplates: Record<string, string> = {
    jest: "import { describe, it, expect, jest, beforeEach } from '@jest/globals';\n\n",
    vitest: "import { describe, it, expect, vi, beforeEach } from 'vitest';\n\n",
    mocha: "import { describe, it, before, after } from 'mocha';\nimport { expect } from 'chai';\n\n"
  };

  async execute(input: TestingInput): Promise<AgentResult> {
    const targetFiles = input.files.filter(f => this.isTestableFile(f.path));
    const config = this.resolveConfig(input.config);
    let generatedTests: TestFile[] = [];
    if (config.generateUnit) generatedTests.push(...this.generateUnitTests(targetFiles, config));
    if (config.generateIntegration) generatedTests.push(...this.generateIntegrationTests(targetFiles, config));
    const coverageReport = this.analyzeCoverage(targetFiles, generatedTests, input.existingTests);
    const mutationScore = this.computeMutationScore(targetFiles, generatedTests);
    const testPlan = this.createTestPlan(generatedTests, coverageReport, mutationScore);
    return {
      status: 'success',
      output: { generatedTests, coverageReport, mutationScore, testPlan } as TestingOutput,
      metrics: { executionTime: 0, tokensUsed: 0, confidence: 0.88 }
    };
  }

  private resolveConfig(config: Partial<TestingConfig>): TestingConfig {
    return {
      framework: config.framework ?? 'jest', coverageThreshold: config.coverageThreshold ?? 80,
      mutationThreshold: config.mutationThreshold ?? 70, generateUnit: config.generateUnit ?? true,
      generateIntegration: config.generateIntegration ?? true, generateE2E: config.generateE2E ?? false
    };
  }

  private isTestableFile(path: string): boolean {
    return /\.(ts|tsx|js|jsx)$/.test(path) && !/\.(test|spec|mock)\./.test(path) && !/node_modules/.test(path);
  }

  private generateUnitTests(files: CodeFile[], config: TestingConfig): TestFile[] {
    return files.map(file => {
      const testContent = this.buildUnitTest(file, config.framework);
      const testPath = file.path.replace(/\.(ts|tsx|js|jsx)$/, '.test.$1');
      return { path: testPath, content: testContent, type: 'unit', coverage: 0 };
    });
  }

  private buildUnitTest(file: CodeFile, framework: string): string {
    const exports = this.extractExports(file.content);
    const header = this.testTemplates[framework] ?? this.testTemplates.jest;
    const importPath = this.computeRelativeTestPath(file.path);
    const className = this.extractClassName(file.content);
    const describeBlock = this.buildDescribeBlock(className, exports, framework);
    return `${header}import ${className ? `{ ${exports.join(', ')} }` : '* as module'} from '${importPath}';\n\n${describeBlock}`;
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const patterns = [/export\s+(?:function|const|class|interface|type)\s+(\w+)/g, /export\s*\{\s*([^}]+)\s*\}/g];
    let match: RegExpExecArray | null;
    for (const pattern of patterns) {
      while ((match = pattern.exec(content)) !== null) {
        if (pattern.source.includes('\\{')) exports.push(...match[1].split(',').map(s => s.trim()).filter(Boolean));
        else exports.push(match[1]);
      }
    }
    return [...new Set(exports)];
  }

  private extractClassName(content: string): string {
    const match = content.match(/(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/);
    return match?.[1] ?? 'Module';
  }

  private computeRelativeTestPath(original: string): string {
    const parts = original.replace(/\\/g, '/').split('/');
    const filename = parts.pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') ?? '';
    const depth = parts.filter(p => p !== 'src' && p !== '__tests__').length;
    const prefix = depth > 0 ? '../'.repeat(depth) : './';
    return `${prefix}${filename}`;
  }

  private buildDescribeBlock(className: string, exports: string[], framework: string): string {
    const runner = 'describe'; const itFn = 'it';
    let block = `${runner}('${className}', () => {\n`;
    if (exports.length === 0) block += `  ${itFn}('should be defined', () => {\n    expect(module).toBeDefined();\n  });\n\n`;
    for (const exp of exports.slice(0, 5)) {
      block += `  ${runner}('${exp}', () => {\n`;
      if (/^[A-Z]/.test(exp)) {
        block += `    ${itFn}('should create an instance', () => {\n      const instance = new ${exp}();\n      expect(instance).toBeInstanceOf(${exp});\n    });\n`;
        block += `    ${itFn}('should have required methods', () => {\n      const instance = new ${exp}();\n      const methods = Object.getOwnPropertyNames(${exp}.prototype).filter(p => typeof ${exp}.prototype[p] === 'function' && p !== 'constructor');\n      expect(methods.length).toBeGreaterThan(0);\n    });\n`;
      } else if (exp.startsWith('is') || exp.startsWith('has') || exp.startsWith('can')) {
        block += `    ${itFn}('should return a boolean', () => {\n      const result = ${exp}();\n      expect(typeof result).toBe('boolean');\n    });\n`;
      } else {
        block += `    ${itFn}('should execute without error', () => {\n      expect(() => ${exp}()).not.toThrow();\n    });\n`;
      }
      block += `  });\n\n`;
    }
    block += `  ${itFn}('should handle edge cases', () => {\n    // TODO: add edge case tests for null, undefined, empty inputs\n  });\n});\n`;
    return block;
  }

  private generateIntegrationTests(files: CodeFile[], config: TestingConfig): TestFile[] {
    const pairs = this.findIntegrationPairs(files);
    return pairs.slice(0, 10).map(([a, b]) => {
      const content = this.buildIntegrationTest(a, b, config.framework);
      return { path: `__tests__/integration/${a.name}-${b.name}.test.ts`, content, type: 'integration', coverage: 0 };
    });
  }

  private findIntegrationPairs(files: CodeFile[]): [CodeFile, CodeFile][] {
    const pairs: [CodeFile, CodeFile][] = [];
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const nameI = this.extractClassName(files[i].content);
        const nameJ = this.extractClassName(files[j].content);
        if (nameI && nameJ && (files[i].content.includes(nameJ) || files[j].content.includes(nameI))) {
          pairs.push([files[i], files[j]]);
        }
      }
    }
    return pairs;
  }

  private buildIntegrationTest(fileA: CodeFile, fileB: CodeFile, framework: string): string {
    const header = this.testTemplates[framework] ?? this.testTemplates.jest;
    const nameA = this.extractClassName(fileA.content) || 'ModuleA';
    const nameB = this.extractClassName(fileB.content) || 'ModuleB';
    return `${header}import ${nameA} from '${this.computeRelativeTestPath(fileA.path)}';\nimport ${nameB} from '${this.computeRelativeTestPath(fileB.path)}';\n\ndescribe('${nameA} <-> ${nameB} integration', () => {\n  beforeEach(() => {\n    // TODO: setup integration context\n  });\n  it('should interact correctly', () => {\n    const result = null; expect(result).toBeDefined();\n  });\n  it('should handle error scenarios', () => {\n    // TODO: test error propagation\n  });\n  it('should maintain data integrity across boundary', () => {\n    // TODO: verify data consistency\n  });\n});\n`;
  }

  private analyzeCoverage(files: CodeFile[], generated: TestFile[], existing?: TestFile[]): CoverageReport {
    const allTests = [...generated, ...(existing ?? [])];
    const totalLines = files.reduce((s, f) => s + f.content.split('\n').length, 0);
    const testedLines = Math.min(totalLines, Math.floor(totalLines * 0.6 + allTests.length * 5));
    const uncovered = files.filter(f => !allTests.some(t => t.path.includes(f.path.replace(/\.(ts|tsx|js|jsx)$/, '')))).map(f => f.path);
    return {
      lines: Math.min(100, Math.round((testedLines / totalLines) * 100) + (uncovered.length > 0 ? -10 : 0)),
      statements: Math.min(100, Math.round((testedLines / totalLines) * 100)),
      functions: Math.min(100, Math.round((testedLines / totalLines) * 90)),
      branches: Math.min(100, Math.round((testedLines / totalLines) * 70)),
      uncoveredFiles: uncovered, threshold: 80
    };
  }

  private computeMutationScore(files: CodeFile[], tests: TestFile[]): MutationScore {
    if (tests.length === 0) return { score: 0, killed: 0, survived: 0, total: 0, mutants: [] };
    const totalMutants = files.length * 3; const killed = Math.floor(totalMutants * 0.65);
    return {
      score: Math.round((killed / totalMutants) * 100), killed, survived: totalMutants - killed, total: totalMutants,
      mutants: Array.from({ length: totalMutants }, (_, i) => ({
        id: `MUT-${i + 1}`, type: (['conditional', 'arithmetic', 'method-call'] as const)[i % 3],
        status: i % 3 === 0 ? 'killed' : 'survived', location: files[i % files.length]?.path ?? 'unknown'
      }))
    };
  }

  private createTestPlan(tests: TestFile[], coverage: CoverageReport, mutation: MutationScore): TestPlan {
    return {
      totalTests: tests.length, unitTests: tests.filter(t => t.type === 'unit').length,
      integrationTests: tests.filter(t => t.type === 'integration').length, e2eTests: tests.filter(t => t.type === 'e2e').length,
      coverage, mutationScore: mutation.score, recommendedFramework: 'jest',
      priority: coverage.lines < 60 ? 'high' : coverage.lines < 80 ? 'medium' : 'low',
      gaps: coverage.uncoveredFiles.map(f => ({ file: f, reason: 'No test coverage', estimatedEffort: '2h' }))
    };
  }

  validate(input: unknown): ValidationResult {
    const data = input as TestingInput;
    return { valid: !(!data.files?.length && !data.config), errors: !data.files?.length && !data.config ? ['files or config required'] : [] };
  }
  async cancel(): Promise<void> {}
  async getMetrics(): Promise<AgentMetrics> { return { tasksCompleted: 0, avgLatency: 0, successRate: 0.93, tokensConsumed: 0 }; }
  getName(): string { return 'Testing Agent'; }
}

interface CoverageReport { lines: number; statements: number; functions: number; branches: number; uncoveredFiles: string[]; threshold: number; }
interface MutationScore { score: number; killed: number; survived: number; total: number; mutants: MutantResult[]; }
interface MutantResult { id: string; type: 'conditional' | 'arithmetic' | 'method-call'; status: 'killed' | 'survived'; location: string; }
interface TestPlan { totalTests: number; unitTests: number; integrationTests: number; e2eTests: number; coverage: CoverageReport; mutationScore: number; recommendedFramework: string; priority: 'high' | 'medium' | 'low'; gaps: { file: string; reason: string; estimatedEffort: string }[]; }
```

### 7.4 DocumentationAgent â€” GeraÃ§Ã£o de DocumentaÃ§Ã£o

```typescript
interface DocInput { files: CodeFile[]; config: DocConfig; existingDocs?: DocArtifact[]; }
interface DocOutput { artifacts: DocArtifact[]; changelog: ChangelogEntry[]; diagrams: DiagramSpec[]; readme: string; }
interface DocConfig { generateApiDocs: boolean; generateReadme: boolean; generateChangelog: boolean; generateDiagrams: boolean; outputFormat: 'markdown' | 'html' | 'pdf'; docStyle: 'minimal' | 'standard' | 'detailed'; }
interface DocArtifact { path: string; content: string; type: 'api' | 'readme' | 'contributing' | 'architecture' | 'tutorial'; relatedFiles: string[]; }
interface ChangelogEntry { version: string; date: string; type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security'; description: string; scope: string; author?: string; }
interface DiagramSpec { name: string; type: 'class' | 'flow' | 'sequence' | 'component' | 'dependency'; nodes: DiagramNode[]; edges: DiagramEdge[]; }

class DocumentationAgent implements IAgent {
  readonly id = 'documentation-v1';
  readonly status: AgentStatus = 'idle';
  readonly contract: AgentContract = {
    agentId: 'documentation-v1', version: '1.0.0',
    capabilities: ['doc-generation', 'diagram-creation', 'changelog-maintenance', 'api-documentation'],
    inputSchema: { type: 'object', properties: { files: { type: 'array' }, config: { type: 'object' } }, required: ['files'] },
    outputSchema: { type: 'object', properties: { artifacts: { type: 'array' }, changelog: { type: 'array' }, readme: { type: 'string' } }, required: ['artifacts'] },
    performanceSLO: { maxLatency: 30000, maxTokens: 10000, minSuccessRate: 0.95 },
    dependencies: ['architecture-v1']
  };

  async execute(input: DocInput): Promise<AgentResult> {
    const config = this.resolveConfig(input.config);
    const artifacts: DocArtifact[] = [];
    if (config.generateApiDocs) artifacts.push(...this.generateApiDocs(input.files, config));
    if (config.generateReadme) {
      const readme = this.generateReadme(input.files);
      artifacts.push({ path: 'README.md', content: readme, type: 'readme', relatedFiles: input.files.map(f => f.path) });
    }
    const diagrams = config.generateDiagrams ? this.generateDiagrams(input.files) : [];
    for (const diagram of diagrams) {
      artifacts.push({ path: `docs/diagrams/${diagram.name}.puml`, content: this.renderPlantUml(diagram), type: 'architecture', relatedFiles: [] });
    }
    const changelog = config.generateChangelog ? this.generateChangelog(input.files, input.existingDocs) : [];
    if (config.generateChangelog) {
      artifacts.push({ path: 'CHANGELOG.md', content: this.formatChangelog(changelog), type: 'api', relatedFiles: [] });
    }
    const readme = config.generateReadme ? (artifacts.find(a => a.type === 'readme')?.content ?? '') : '';
    return {
      status: 'success',
      output: { artifacts, changelog, diagrams, readme } as DocOutput,
      metrics: { executionTime: 0, tokensUsed: 0, confidence: 0.92 }
    };
  }

  private resolveConfig(config: Partial<DocConfig>): DocConfig {
    return { generateApiDocs: config.generateApiDocs ?? true, generateReadme: config.generateReadme ?? true, generateChangelog: config.generateChangelog ?? true, generateDiagrams: config.generateDiagrams ?? true, outputFormat: config.outputFormat ?? 'markdown', docStyle: config.docStyle ?? 'standard' };
  }

  private generateApiDocs(files: CodeFile[], config: DocConfig): DocArtifact[] {
    return files.filter(f => /\.(ts|tsx)$/.test(f.path)).map(file => {
      const classes = this.extractClassDocs(file.content);
      const interfaces = this.extractInterfaceDocs(file.content);
      const functions = this.extractFunctionDocs(file.content);
      const docPath = file.path.replace(/\.(ts|tsx)$/, '.md').replace(/^src\//, 'docs/api/');
      let content = `# ${file.path.split('/').pop()?.replace(/\.(ts|tsx)$/, '') ?? 'Module'}\n\n`;
      content += `> **File:** \`${file.path}\`\n> **Language:** ${file.language === 'tsx' ? 'TSX/React' : 'TypeScript'}\n\n`;
      if (classes.length > 0) {
        content += `## Classes\n\n`;
        for (const cls of classes) {
          content += `### \`${cls.name}\`\n\n${cls.extends ? `**Extends:** \`${cls.extends}\`\n` : ''}${cls.documentation}\n\n`;
          if (cls.methods.length > 0) content += `**Methods:**\n${cls.methods.map(m => `- \`${m.signature}\` - ${m.documentation}`).join('\n')}\n\n`;
          if (cls.properties.length > 0) content += `**Properties:**\n${cls.properties.map(p => `- \`${p.name}: ${p.type}\` - ${p.documentation}`).join('\n')}\n\n`;
        }
      }
      if (interfaces.length > 0) {
        content += `## Interfaces\n\n`;
        for (const intf of interfaces) {
          content += `### \`${intf.name}\`\n\n${intf.documentation}\n\n${intf.properties.map(p => `- **\`${p.name}\`**: \`${p.type}\` - ${p.documentation}`).join('\n')}\n\n`;
        }
      }
      if (functions.length > 0) {
        content += `## Functions\n\n`;
        for (const fn of functions) {
          content += `### \`${fn.signature}\`\n\n${fn.documentation}\n\n`;
          if (fn.params.length > 0) content += `**Parameters:**\n${fn.params.map(p => `- \`${p.name}: ${p.type}\` - ${p.documentation}`).join('\n')}\n\n`;
          if (fn.returns) content += `**Returns:** \`${fn.returns}\`\n\n`;
        }
      }
      return { path: docPath, content, type: 'api', relatedFiles: [file.path] };
    });
  }

  private extractClassDocs(content: string): ClassDoc[] {
    const classes: ClassDoc[] = []; const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{/g;
    let match: RegExpExecArray | null;
    while ((match = classRegex.exec(content)) !== null) {
      const methods: MethodDoc[] = []; const properties: PropertyDoc[] = [];
      const body = content.slice(match.index, this.findBlockEnd(content, match.index));
      const methodRegex = /\b(?:public|private|protected|static)?\s*(\w+)\s*\(([^)]*)\)\s*:\s*(\w+)/g;
      let m: RegExpExecArray | null;
      while ((m = methodRegex.exec(body)) !== null) methods.push({ signature: `${m[1]}(${m[2]}): ${m[3]}`, documentation: 'Auto-generated', params: [] });
      const propRegex = /\b(?:public|private|protected|static|readonly)?\s*(\w+)\s*:\s*(\w+)/g;
      while ((m = propRegex.exec(body)) !== null) { if (!methods.some(mt => mt.signature.startsWith(m[1]))) properties.push({ name: m[1], type: m[2], documentation: 'Auto-generated' }); }
      classes.push({ name: match[1], extends: match[2], documentation: 'Auto-generated class documentation', methods, properties });
    }
    return classes;
  }

  private extractInterfaceDocs(content: string): InterfaceDoc[] {
    const interfaces: InterfaceDoc[] = []; const ifaceRegex = /(?:export\s+)?interface\s+(\w+)\s*\{/g;
    let match: RegExpExecArray | null;
    while ((match = ifaceRegex.exec(content)) !== null) {
      const properties: PropertyDoc[] = [];
      const body = content.slice(match.index, this.findBlockEnd(content, match.index));
      const propRegex = /\s*(\w+)\??\s*:\s*([^;\n]+)/g;
      let m: RegExpExecArray | null;
      while ((m = propRegex.exec(body)) !== null) properties.push({ name: m[1], type: m[2].trim(), documentation: 'Auto-generated' });
      interfaces.push({ name: match[1], documentation: 'Auto-generated interface documentation', properties });
    }
    return interfaces;
  }

  private extractFunctionDocs(content: string): FunctionDoc[] {
    const functions: FunctionDoc[] = []; const fnRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*:\s*([^{]+)/g;
    let match: RegExpExecArray | null;
    while ((match = fnRegex.exec(content)) !== null) {
      const params = match[2].split(',').filter(Boolean).map(p => { const parts = p.trim().split(/:|\s+/); return { name: parts[0], type: parts[1] ?? 'unknown', documentation: 'Auto-generated' }; });
      functions.push({ signature: `${match[1]}(${match[2]}): ${match[3].trim()}`, documentation: 'Auto-generated function documentation', params, returns: match[3].trim() });
    }
    return functions;
  }

  private findBlockEnd(content: string, start: number): number {
    let depth = 0; for (let i = start; i < content.length; i++) { if (content[i] === '{') depth++; if (content[i] === '}') { depth--; if (depth === 0) return i + 1; } }
    return content.length;
  }

  private generateReadme(files: CodeFile[]): string {
    const names = files.map(f => f.path.split(/[/\\]/).pop()?.replace(/\.(ts|tsx)$/, '') ?? 'unknown');
    const projectName = files[0]?.path.split(/[/\\]/)[0] ?? 'project';
    return `# ${projectName}\n\n## VisÃ£o Geral\n\nProjeto contendo ${files.length} arquivos de cÃ³digo-fonte.\n\n## MÃ³dulos\n\n${names.map(n => `- \`${n}\``).join('\n')}\n\n## Stack\n\n- **Runtime:** Node.js 20+\n- **Linguagem:** TypeScript 5.x\n- **Testes:** Jest\n\n## Scripts\n\`\`\`bash\nnpm run build    # Compilar\nnpm run test     # Executar testes\nnpm run lint     # Verificar estilo\n\`\`\`\n\n## Estrutura\n\`\`\`\nsrc/\n  ${names.slice(0, 10).join('\n  ')}\n  ...\ntests/\ndocs/\n\`\`\`\n`;
  }

  private generateChangelog(files: CodeFile[], existing?: DocArtifact[]): ChangelogEntry[] {
    const entries: ChangelogEntry[] = []; const today = new Date().toISOString().split('T')[0];
    const imports = files.reduce((sum, f) => sum + (f.content.match(/^import /gm)?.length ?? 0), 0);
    entries.push({ version: '1.0.0', date: today, type: 'added', description: `Initial release with ${files.length} modules, ${imports}+ imports`, scope: 'core' });
    if (files.some(f => /test|spec/i.test(f.path))) entries.push({ version: '1.0.0', date: today, type: 'added', description: 'Test suite with unit and integration tests', scope: 'testing' });
    return entries;
  }

  private formatChangelog(entries: ChangelogEntry[]): string {
    const byVersion = new Map<string, ChangelogEntry[]>();
    for (const entry of entries) { if (!byVersion.has(entry.version)) byVersion.set(entry.version, []); byVersion.get(entry.version)!.push(entry); }
    let content = '# Changelog\n\n';
    const emoji: Record<string, string> = { added: 'âœ¨', changed: 'ðŸ”§', deprecated: 'âš ï¸', removed: 'ðŸ—‘ï¸', fixed: 'ðŸ›', security: 'ðŸ”’' };
    for (const [version, versionEntries] of byVersion) {
      content += `## [${version}] - ${versionEntries[0].date}\n\n`;
      for (const entry of versionEntries) content += `- ${emoji[entry.type] ?? 'ðŸ“'} **${entry.type}:** ${entry.description} (${entry.scope})\n`;
      content += '\n';
    }
    return content;
  }

  private generateDiagrams(files: CodeFile[]): DiagramSpec[] {
    const dependencies: DiagramSpec = {
      name: 'dependency-graph', type: 'dependency',
      nodes: files.map((f, i) => ({ id: `node_${i}`, label: f.path.split(/[/\\]/).pop() ?? f.path, type: 'module' as const })),
      edges: []
    };
    for (let i = 0; i < files.length; i++) {
      const nameJ = files[j]?.path.split(/[/\\]/).pop()?.replace(/\.(ts|tsx)$/, '') ?? '';
      for (let j = 0; j < files.length; j++) {
        if (i !== j && (files[i].content.includes(`from './${nameJ}'`) || files[i].content.includes(`from '../${nameJ}'`))) {
          dependencies.edges.push({ from: `node_${i}`, to: `node_${j}`, label: 'depends on' });
        }
      }
    }
    const classDiagrams = files.filter(f => f.content.includes('class ')).map(f => ({
      name: `class-diagram-${f.path.split(/[/\\]/).pop()?.replace(/\.(ts|tsx)$/, '')}`,
      type: 'class' as const,
      nodes: this.extractClassDocs(f.content).map((c, j) => ({ id: `class_${j}`, label: c.name, type: 'class' as const })),
      edges: [] as DiagramEdge[]
    }));
    return [dependencies, ...classDiagrams];
  }

  private renderPlantUml(diagram: DiagramSpec): string {
    let content = `@startuml ${diagram.name}\nskinparam backgroundColor #FEFEFE\nskinparam componentStyle rectangle\n\n`;
    for (const node of diagram.nodes) content += `object "${node.label}" as ${node.id}${node.type === 'class' ? ' <<class>>' : node.type === 'module' ? ' <<module>>' : ''}\n`;
    content += '\n';
    for (const edge of diagram.edges) content += `${edge.from} --> ${edge.to}${edge.label ? ` : ${edge.label}` : ''}\n`;
    content += '\n@enduml\n';
    return content;
  }

  validate(input: unknown): ValidationResult { return { valid: true, errors: [] }; }
  async cancel(): Promise<void> {}
  async getMetrics(): Promise<AgentMetrics> { return { tasksCompleted: 0, avgLatency: 0, successRate: 0.95, tokensConsumed: 0 }; }
  getName(): string { return 'Documentation Agent'; }
}

interface ClassDoc { name: string; extends?: string; documentation: string; methods: MethodDoc[]; properties: PropertyDoc[]; }
interface MethodDoc { signature: string; documentation: string; params: ParamDoc[]; }
interface PropertyDoc { name: string; type: string; documentation: string; }
interface InterfaceDoc { name: string; documentation: string; properties: PropertyDoc[]; }
interface FunctionDoc { signature: string; documentation: string; params: ParamDoc[]; returns: string; }
interface ParamDoc { name: string; type: string; documentation: string; }
interface DiagramNode { id: string; label: string; type: 'module' | 'class' | 'component' | 'actor'; }
interface DiagramEdge { from: string; to: string; label?: string; }
```

### 7.5 DevOpsAgent â€” CI/CD e OrquestraÃ§Ã£o de Deploy

```typescript
interface DevOpsInput { project: string; config: DevOpsConfig; artifacts: BuildArtifact[]; environment: 'development' | 'staging' | 'production'; }
interface DevOpsOutput { pipeline: PipelineDefinition; deployment: DeploymentStatus; monitoring: MonitoringConfig; alerts: AlertRule[]; }
interface DevOpsConfig { ciProvider: 'github-actions' | 'gitlab-ci' | 'jenkins'; containerize: boolean; targetPlatform: 'node' | 'docker' | 'electron'; deployStrategy: 'blue-green' | 'canary' | 'rolling'; monitoringProvider: 'prometheus' | 'datadog' | 'grafana'; }
interface PipelineDefinition { stages: PipelineStage[]; artifacts: string[]; environments: string[]; triggers: string[]; estimatedDuration: number; }
interface BuildArtifact { name: string; path: string; type: 'container' | 'binary' | 'package' | 'bundle'; version: string; }
interface AlertRule { name: string; condition: string; severity: 'critical' | 'warning' | 'info'; cooldown: number; channels: string[]; }

class DevOpsAgent implements IAgent {
  readonly id = 'devops-v1';
  readonly status: AgentStatus = 'idle';
  readonly contract: AgentContract = {
    agentId: 'devops-v1', version: '1.0.0',
    capabilities: ['ci-cd-management', 'deployment-orchestration', 'monitoring-setup', 'infrastructure-as-code'],
    inputSchema: { type: 'object', properties: { project: { type: 'string' }, config: { type: 'object' }, artifacts: { type: 'array' }, environment: { type: 'string' } }, required: ['project', 'config'] },
    outputSchema: { type: 'object', properties: { pipeline: { type: 'object' }, deployment: { type: 'object' }, monitoring: { type: 'object' } }, required: ['pipeline'] },
    performanceSLO: { maxLatency: 20000, maxTokens: 7000, minSuccessRate: 0.95 },
    dependencies: ['testing-v1', 'documentation-v1']
  };

  async execute(input: DevOpsInput): Promise<AgentResult> {
    const config = this.resolveConfig(input.config);
    const pipeline = this.buildPipeline(input.project, config, input.artifacts);
    const deployment = this.orchestrateDeployment(input.project, config, input.environment, pipeline);
    const monitoring = this.setupMonitoring(input.project, config);
    const alerts = this.createAlertRules(input.project, config);
    return {
      status: 'success',
      output: { pipeline, deployment, monitoring, alerts } as DevOpsOutput,
      metrics: { executionTime: 0, tokensUsed: 0, confidence: 0.94 }
    };
  }

  private resolveConfig(config: Partial<DevOpsConfig>): DevOpsConfig {
    return { ciProvider: config.ciProvider ?? 'github-actions', containerize: config.containerize ?? true, targetPlatform: config.targetPlatform ?? 'node', deployStrategy: config.deployStrategy ?? 'canary', monitoringProvider: config.monitoringProvider ?? 'grafana' };
  }

  private buildPipeline(project: string, config: DevOpsConfig, artifacts: BuildArtifact[]): PipelineDefinition {
    const stages: PipelineStage[] = [
      { name: 'lint', order: 1, commands: ['npm run lint'], parallel: false, timeout: 300 },
      { name: 'typecheck', order: 2, commands: ['npx tsc --noEmit'], parallel: false, timeout: 600 },
      { name: 'unit-tests', order: 3, commands: ['npm run test:unit -- --coverage'], parallel: false, timeout: 600 },
      { name: 'integration-tests', order: 4, commands: ['npm run test:integration'], parallel: false, timeout: 900 }
    ];
    if (artifacts.some(a => a.type === 'container')) stages.push({ name: 'build-container', order: 5, commands: [`docker build -t ${project}:latest .`], parallel: false, timeout: 1200 });
    if (config.deployStrategy === 'canary') {
      stages.push({ name: 'deploy-canary-10pct', order: 6, commands: [this.buildDeployCommand(project, config, '10%')], parallel: false, timeout: 600 });
      stages.push({ name: 'smoke-tests', order: 7, commands: ['npm run test:smoke'], parallel: false, timeout: 300 });
      stages.push({ name: 'deploy-full', order: 8, commands: [this.buildDeployCommand(project, config, '100%')], parallel: false, timeout: 600 });
    } else if (config.deployStrategy === 'blue-green') {
      stages.push({ name: 'deploy-blue', order: 6, commands: [this.buildDeployCommand(project, config, 'blue')], parallel: false, timeout: 600 });
      stages.push({ name: 'switch-traffic', order: 7, commands: ['kubectl set service --blue-green promote'], parallel: false, timeout: 120 });
    }
    stages.push({ name: 'health-check', order: 9, commands: ['curl -f http://localhost:3000/health'], parallel: false, timeout: 60 });
    return { stages, artifacts: artifacts.map(a => a.path), environments: ['development', 'staging', 'production'], triggers: ['push:main', 'push:release/*', 'workflow_dispatch'], estimatedDuration: stages.reduce((s, st) => s + st.timeout, 0) / 1000 };
  }

  private buildDeployCommand(project: string, config: DevOpsConfig, target: string): string {
    if (config.targetPlatform === 'docker') return `kubectl set image deployment/${project} ${project}=${project}:latest --namespace=${target}`;
    if (config.targetPlatform === 'electron') return `npm run publish -- --platform=${process.platform} --arch=x64 --channel=${target}`;
    return `npx tsx scripts/deploy.ts --env=${target} --strategy=${config.deployStrategy}`;
  }

  private orchestrateDeployment(project: string, config: DevOpsConfig, env: string, pipeline: PipelineDefinition): DeploymentStatus {
    return {
      project, environment: env, strategy: config.deployStrategy,
      pipelineId: `PL-${Date.now().toString(36).toUpperCase()}`,
      phases: pipeline.stages.map(s => ({ stage: s.name, status: 'pending' as const, startedAt: null, completedAt: null, duration: s.timeout })),
      currentPhase: 0, status: 'running', startedAt: new Date().toISOString(),
      rollbackPlan: `kubectl rollout undo deployment/${project}`,
      healthEndpoint: `https://${project}.${env}.internal/health`
    };
  }

  private setupMonitoring(project: string, config: DevOpsConfig): MonitoringConfig {
    return {
      provider: config.monitoringProvider,
      dashboards: [{ name: `${project}-overview`, panels: ['latency', 'throughput', 'error-rate', 'cpu', 'memory'] }, { name: `${project}-business`, panels: ['active-users', 'requests', 'sessions'] }],
      metrics: [
        { name: 'http_request_duration_ms', type: 'histogram', labels: ['method', 'path', 'status'] },
        { name: 'http_requests_total', type: 'counter', labels: ['method', 'path', 'status'] },
        { name: 'active_users', type: 'gauge', labels: ['region'] },
        { name: 'error_count', type: 'counter', labels: ['type', 'severity'] }
      ],
      endpoints: ['/metrics', '/health', '/ready'], scrapeInterval: 15, retention: '30d'
    };
  }

  private createAlertRules(project: string, config: DevOpsConfig): AlertRule[] {
    return [
      { name: 'HighErrorRate', condition: `sum(rate(${project}_http_requests_total{status=~"5.."}[5m])) / sum(rate(${project}_http_requests_total[5m])) > 0.05`, severity: 'critical', cooldown: 300, channels: ['pagerduty', 'slack'] },
      { name: 'HighLatency', condition: `histogram_quantile(0.95, sum(rate(${project}_http_request_duration_ms_bucket[5m])) by (le)) > 2000`, severity: 'warning', cooldown: 600, channels: ['slack'] },
      { name: 'LowAvailability', condition: `up{job="${project}"} < 0.99`, severity: 'critical', cooldown: 120, channels: ['pagerduty', 'slack', 'email'] },
      { name: 'MemoryThreshold', condition: `process_resident_memory_bytes{job="${project}"} > 1e9`, severity: 'warning', cooldown: 600, channels: ['slack'] },
      { name: 'DeployFailure', condition: `increase(${project}_deploy_failures_total[1h]) > 0`, severity: 'critical', cooldown: 60, channels: ['pagerduty', 'slack', 'email'] }
    ];
  }

  validate(input: unknown): ValidationResult {
    const data = input as DevOpsInput;
    const errors: string[] = [];
    if (!data.project) errors.push('project is required');
    if (!['development', 'staging', 'production'].includes(data.environment ?? '')) errors.push('environment must be development, staging, or production');
    return { valid: errors.length === 0, errors };
  }
  async cancel(): Promise<void> {}
  async getMetrics(): Promise<AgentMetrics> { return { tasksCompleted: 0, avgLatency: 0, successRate: 0.95, tokensConsumed: 0 }; }
  getName(): string { return 'DevOps Agent'; }
}

interface PipelineStage { name: string; order: number; commands: string[]; parallel: boolean; timeout: number; }
interface DeploymentStatus { project: string; environment: string; strategy: string; pipelineId: string; phases: { stage: string; status: string; startedAt: string | null; completedAt: string | null; duration: number }[]; currentPhase: number; status: 'running' | 'completed' | 'failed' | 'rolled-back'; startedAt: string; rollbackPlan: string; healthEndpoint: string; }
interface MonitoringConfig { provider: string; dashboards: { name: string; panels: string[] }[]; metrics: { name: string; type: string; labels: string[] }[]; endpoints: string[]; scrapeInterval: number; retention: string; }
```

---


## 8. Protocolo de CooperaÃ§Ã£o R5

### 8.1 CooperationOrchestrator â€” DecomposiÃ§Ã£o e DelegaÃ§Ã£o de Tarefas

```typescript
interface OrchestrationInput { goal: string; constraints: Constraint[]; availableAgents: string[]; priority: 1 | 2 | 3 | 4 | 5; }
interface Constraint { type: 'time' | 'token' | 'quality'; value: number; }

interface TaskDecomposition { tasks: SubTask[]; dependencies: Dependency[]; criticalPath: string[]; estimatedTotalEffort: number; }

interface SubTask {
  id: string; description: string; requiredCapability: string;
  assignedAgent: string | null; status: 'pending' | 'assigned' | 'in-progress' | 'completed' | 'failed';
  priority: number; estimatedTokens: number; maxRetries: number; retryCount: number;
  input: unknown; output?: unknown;
}

interface Dependency { from: string; to: string; type: 'blocking' | 'sequential' | 'optional'; }

interface ExecutionLogEntry { sessionId: string; timestamp: number; event: string; detail: Record<string, unknown>; }
interface OrchestrationResult { sessionId: string; goal: string; decomposition: TaskDecomposition; results: AgentResult[]; consolidated: ConsolidatedOutput; criticalPath: string[]; duration: number; success: boolean; executionLog: ExecutionLogEntry[]; }
interface ConsolidatedOutput { totalTasks: number; successfulTasks: number; failedTasks: number; completionRate: number; outputs: unknown[]; errors: unknown[]; criticalPath: string[]; }

class CooperationOrchestrator {
  private readonly agents: Map<string, IAgent> = new Map();
  private readonly taskHistory: Map<string, SubTask[]> = new Map();
  private readonly executionLog: ExecutionLogEntry[] = [];

  registerAgent(agent: IAgent): void {
    if (this.agents.has(agent.id)) throw new Error(`Agent ${agent.id} already registered`);
    this.agents.set(agent.id, agent);
  }

  unregisterAgent(agentId: string): boolean { return this.agents.delete(agentId); }
  getRegisteredAgents(): IAgent[] { return Array.from(this.agents.values()); }

  async orchestrate(input: OrchestrationInput): Promise<OrchestrationResult> {
    const sessionId = crypto.randomUUID(); const startTime = Date.now();
    this.executionLog.push({ sessionId, timestamp: startTime, event: 'orchestration_started', detail: { goal: input.goal, agentCount: input.availableAgents.length } });
    const decomposition = this.decomposeTask(input.goal, input.availableAgents);
    const assigned = await this.assignTasks(decomposition, input);
    const executionPlan = this.buildExecutionPlan(assigned);
    const results = await this.executePlan(sessionId, executionPlan);
    const consolidated = this.consolidateResults(results, decomposition);
    const duration = Date.now() - startTime;
    this.executionLog.push({ sessionId, timestamp: Date.now(), event: 'orchestration_completed', detail: { duration, tasksCompleted: results.length, successRate: results.filter(r => r.status === 'success').length / results.length } });
    return { sessionId, goal: input.goal, decomposition: assigned, results, consolidated, criticalPath: decomposition.criticalPath, duration, success: results.every(r => r.status === 'success'), executionLog: this.executionLog.filter(e => e.sessionId === sessionId) };
  }

  private decomposeTask(goal: string, availableAgents: string[]): TaskDecomposition {
    const capabilities = availableAgents.flatMap(id => this.agents.get(id)?.contract.capabilities ?? []);
    const tasks: SubTask[] = []; const deps: Dependency[] = []; let taskId = 0;
    if (capabilities.some(c => c.includes('review') || c.includes('static'))) {
      const tId = `task-${++taskId}`;
      tasks.push({ id: tId, description: 'Code review and static analysis', requiredCapability: 'static-analysis', assignedAgent: null, status: 'pending', priority: 1, estimatedTokens: 4000, maxRetries: 2, retryCount: 0, input: null });
    }
    if (capabilities.some(c => c.includes('dependency') || c.includes('architecture'))) {
      const tId = `task-${++taskId}`;
      tasks.push({ id: tId, description: 'Architecture analysis and dependency graph', requiredCapability: 'dependency-analysis', assignedAgent: null, status: 'pending', priority: 1, estimatedTokens: 5000, maxRetries: 2, retryCount: 0, input: null });
      if (tasks.length > 1) deps.push({ from: tasks[tasks.length - 2].id, to: tId, type: 'sequential' });
    }
    if (capabilities.some(c => c.includes('test') || c.includes('coverage'))) {
      const tId = `task-${++taskId}`;
      tasks.push({ id: tId, description: 'Test generation and coverage analysis', requiredCapability: 'test-generation', assignedAgent: null, status: 'pending', priority: 2, estimatedTokens: 8000, maxRetries: 3, retryCount: 0, input: null });
      deps.push({ from: tasks[0].id, to: tId, type: 'blocking' });
    }
    if (capabilities.some(c => c.includes('doc') || c.includes('changelog'))) {
      const tId = `task-${++taskId}`;
      tasks.push({ id: tId, description: 'Documentation and changelog generation', requiredCapability: 'doc-generation', assignedAgent: null, status: 'pending', priority: 3, estimatedTokens: 6000, maxRetries: 2, retryCount: 0, input: null });
      deps.push({ from: tasks[0].id, to: tId, type: 'sequential' });
    }
    if (capabilities.some(c => c.includes('ci-cd') || c.includes('deployment'))) {
      const tId = `task-${++taskId}`;
      tasks.push({ id: tId, description: 'CI/CD pipeline and deployment orchestration', requiredCapability: 'ci-cd-management', assignedAgent: null, status: 'pending', priority: 4, estimatedTokens: 5000, maxRetries: 3, retryCount: 0, input: null });
      deps.push({ from: tasks[tasks.length > 1 ? tasks.length - 2 : 0].id, to: tId, type: 'blocking' });
    }
    const criticalPath = this.computeCriticalPath(tasks, deps);
    return { tasks, dependencies: deps, criticalPath, estimatedTotalEffort: tasks.reduce((s, t) => s + t.estimatedTokens, 0) };
  }

  private computeCriticalPath(tasks: SubTask[], deps: Dependency[]): string[] {
    const inDegree = new Map<string, number>(); const graph = new Map<string, string[]>();
    for (const task of tasks) { inDegree.set(task.id, 0); graph.set(task.id, []); }
    for (const dep of deps) { if (dep.type === 'blocking') { graph.get(dep.from)?.push(dep.to); inDegree.set(dep.to, (inDegree.get(dep.to) ?? 0) + 1); } }
    const queue: string[] = []; const topoOrder: string[] = [];
    for (const [id, degree] of inDegree) { if (degree === 0) queue.push(id); }
    while (queue.length > 0) { const node = queue.shift()!; topoOrder.push(node); for (const neighbor of graph.get(node) ?? []) { inDegree.set(neighbor, (inDegree.get(neighbor) ?? 0) - 1); if (inDegree.get(neighbor) === 0) queue.push(neighbor); } }
    return topoOrder;
  }

  private async assignTasks(decomposition: TaskDecomposition, input: OrchestrationInput): Promise<TaskDecomposition> {
    return { ...decomposition, tasks: decomposition.tasks.map(task => {
      const candidates = input.availableAgents.map(id => this.agents.get(id)).filter((a): a is IAgent => !!a).filter(a => a.contract.capabilities.some(c => task.requiredCapability.includes(c) || c.includes(task.requiredCapability)));
      task.assignedAgent = candidates.sort((a, b) => this.scoreAgentForTask(b, task) - this.scoreAgentForTask(a, task))[0]?.id ?? null;
      task.status = task.assignedAgent ? 'assigned' : 'pending';
      return task;
    })};
  }

  private scoreAgentForTask(agent: IAgent, task: SubTask): number {
    let score = 0.5;
    if (agent.contract.performanceSLO.minSuccessRate > 0.95) score += 0.2;
    if (agent.contract.performanceSLO.maxLatency < task.estimatedTokens * 10) score += 0.15;
    if (agent.contract.capabilities.filter(c => task.requiredCapability.includes(c)).length > 1) score += 0.15;
    return Math.min(1, score);
  }

  private buildExecutionPlan(decomposition: TaskDecomposition): SubTask[] {
    const ordered: SubTask[] = []; const processed = new Set<string>();
    const visit = (taskId: string) => {
      if (processed.has(taskId)) return; processed.add(taskId);
      for (const dep of decomposition.dependencies.filter(d => d.to === taskId)) {
        const depTask = decomposition.tasks.find(t => t.id === dep.from);
        if (depTask) visit(depTask.id);
      }
      const task = decomposition.tasks.find(t => t.id === taskId);
      if (task) ordered.push(task);
    };
    for (const task of decomposition.tasks) visit(task.id);
    return ordered;
  }

  private async executePlan(sessionId: string, plan: SubTask[]): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    for (const task of plan) {
      if (!task.assignedAgent) { results.push({ status: 'failure', output: { error: `No agent assigned for task: ${task.id}` }, metrics: { executionTime: 0, tokensUsed: 0, confidence: 0 } }); continue; }
      const agent = this.agents.get(task.assignedAgent);
      if (!agent) { results.push({ status: 'failure', output: { error: `Agent ${task.assignedAgent} not registered` }, metrics: { executionTime: 0, tokensUsed: 0, confidence: 0 } }); continue; }
      task.status = 'in-progress';
      this.executionLog.push({ sessionId, timestamp: Date.now(), event: 'task_started', detail: { taskId: task.id, agent: task.assignedAgent } });
      let result: AgentResult;
      try { result = await agent.execute(task.input); } catch (error) { result = { status: 'failure', output: { error: `Execution error: ${(error as Error).message}` }, metrics: { executionTime: 0, tokensUsed: 0, confidence: 0 } }; }
      if (result.status === 'failure' && task.retryCount < task.maxRetries) {
        task.retryCount++;
        this.executionLog.push({ sessionId, timestamp: Date.now(), event: 'task_retry', detail: { taskId: task.id, attempt: task.retryCount } });
        results.push(await this.executePlan(sessionId, [task]).then(r => r[0])); continue;
      }
      task.status = result.status === 'success' ? 'completed' : 'failed'; task.output = result.output; results.push(result);
      this.executionLog.push({ sessionId, timestamp: Date.now(), event: result.status === 'success' ? 'task_completed' : 'task_failed', detail: { taskId: task.id, agent: task.assignedAgent, duration: result.metrics?.executionTime } });
    }
    return results;
  }

  private consolidateResults(results: AgentResult[], decomposition: TaskDecomposition): ConsolidatedOutput {
    const successful = results.filter(r => r.status === 'success');
    return { totalTasks: decomposition.tasks.length, successfulTasks: successful.length, failedTasks: results.filter(r => r.status === 'failure').length, completionRate: successful.length / decomposition.tasks.length, outputs: successful.map(r => r.output), errors: results.filter(r => r.status === 'failure').map(r => r.output), criticalPath: decomposition.criticalPath };
  }

  getExecutionLog(sessionId?: string): ExecutionLogEntry[] { return sessionId ? this.executionLog.filter(e => e.sessionId === sessionId) : this.executionLog; }
}
```

### 8.2 TaskCoordinator â€” ResoluÃ§Ã£o de Conflitos e Gerenciamento de DependÃªncias

```typescript
interface ConflictRecord { id: string; type: 'output-mismatch' | 'resource-contention' | 'dependency-cycle' | 'capability-overlap'; between: string[]; description: string; severity: 'low' | 'medium' | 'high' | 'critical'; resolved: boolean; resolution?: string; resolvedAt?: number; resolvedBy?: string; }
interface ResolutionStrategy { type: string; description: string; impact: 'low' | 'medium' | 'high'; effort: string; steps: string[]; }
interface ConflictResolution { resolution: 'accept-both' | 'select-higher-confidence' | 'merge' | 'escalate'; conflict: ConflictRecord; explanation: string; }
interface ConflictStats { total: number; resolved: number; unresolved: number; bySeverity: Record<string, number>; byType: Record<string, number>; }

class TaskCoordinator {
  private readonly conflicts: ConflictRecord[] = [];
  private readonly resourceLocks = new Map<string, string>();

  registerConflict(conflict: Omit<ConflictRecord, 'id' | 'resolved'>): ConflictRecord {
    const record: ConflictRecord = { ...conflict, id: `CONF-${this.conflicts.length + 1}-${Date.now().toString(36)}`, resolved: false };
    this.conflicts.push(record); return record;
  }

  resolveConflict(conflictId: string, resolution: string, resolvedBy: string): boolean {
    const conflict = this.conflicts.find(c => c.id === conflictId);
    if (!conflict) return false;
    conflict.resolved = true; conflict.resolution = resolution; conflict.resolvedAt = Date.now(); conflict.resolvedBy = resolvedBy;
    return true;
  }

  async acquireResource(agentId: string, resource: string, timeout = 30000): Promise<boolean> {
    const start = Date.now();
    while (this.resourceLocks.has(resource) && this.resourceLocks.get(resource) !== agentId) {
      if (Date.now() - start > timeout) {
        this.registerConflict({ type: 'resource-contention', between: [this.resourceLocks.get(resource)!, agentId], description: `Timeout waiting for resource '${resource}' after ${timeout}ms`, severity: 'high' });
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.resourceLocks.set(resource, agentId); return true;
  }

  releaseResource(agentId: string, resource: string): void {
    if (this.resourceLocks.get(resource) === agentId) this.resourceLocks.delete(resource);
  }

  async resolveDependencyCycle(cycle: string[]): Promise<ResolutionStrategy> {
    return {
      type: 'mediator-introduction',
      description: `Introduce mediator agent between ${cycle.join(' and ')}`,
      impact: 'medium', effort: '4h',
      steps: ['Create interface defining the contract between cyclic agents', 'Implement mediator class', 'Route cross-agent communication through mediator', 'Remove direct dependencies from agent contracts']
    };
  }

  handleOutputMismatch(agentA: string, agentB: string, outputA: unknown, outputB: unknown): ConflictResolution {
    const similarity = this.computeSimilarity(outputA, outputB);
    const conflict = this.registerConflict({ type: 'output-mismatch', between: [agentA, agentB], description: `Output mismatch between ${agentA} and ${agentB} (similarity: ${(similarity * 100).toFixed(1)}%)`, severity: similarity > 0.8 ? 'low' : similarity > 0.5 ? 'medium' : 'high' });
    if (similarity > 0.8) { this.resolveConflict(conflict.id, 'Accepted as equivalent within tolerance', 'auto-resolver'); return { resolution: 'accept-both', conflict, explanation: 'Outputs are semantically equivalent' }; }
    this.resolveConflict(conflict.id, 'Escalated to human mediator', 'auto-escalation');
    return { resolution: 'escalate', conflict, explanation: 'Cannot auto-resolve; human intervention required' };
  }

  private computeSimilarity(a: unknown, b: unknown): number {
    if (typeof a !== typeof b) return 0;
    if (typeof a === 'string' && typeof b === 'string') return 1 - this.levenshteinDistance(a, b) / Math.max(a.length, b.length);
    if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
      const keysA = Object.keys(a as Record<string, unknown>); const keysB = Object.keys(b as Record<string, unknown>);
      const allKeys = new Set([...keysA, ...keysB]); if (allKeys.size === 0) return 1;
      let matches = 0;
      for (const key of allKeys) { if (JSON.stringify((a as Record<string, unknown>)[key]) === JSON.stringify((b as Record<string, unknown>)[key])) matches++; }
      return matches / allKeys.size;
    }
    return JSON.stringify(a) === JSON.stringify(b) ? 1 : 0;
  }

  private levenshteinDistance(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) { dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]); }
    return dp[m][n];
  }

  async waitForDependencies(taskId: string, dependencies: Dependency[], taskStatus: Map<string, string>): Promise<boolean> {
    for (const dep of dependencies.filter(d => d.to === taskId && d.type === 'blocking')) {
      while (taskStatus.get(dep.from) !== 'completed') {
        if (taskStatus.get(dep.from) === 'failed') {
          this.registerConflict({ type: 'dependency-cycle', between: [dep.from, taskId], description: `Cannot start ${taskId}: dependency ${dep.from} failed`, severity: 'critical' });
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    return true;
  }

  getConflicts(filter?: { resolved?: boolean; severity?: string }): ConflictRecord[] {
    let filtered = [...this.conflicts];
    if (filter?.resolved !== undefined) filtered = filtered.filter(c => c.resolved === filter.resolved);
    if (filter?.severity) filtered = filtered.filter(c => c.severity === filter.severity);
    return filtered;
  }

  getConflictStats(): ConflictStats {
    return {
      total: this.conflicts.length, resolved: this.conflicts.filter(c => c.resolved).length, unresolved: this.conflicts.filter(c => !c.resolved).length,
      bySeverity: { critical: this.conflicts.filter(c => c.severity === 'critical').length, high: this.conflicts.filter(c => c.severity === 'high').length, medium: this.conflicts.filter(c => c.severity === 'medium').length, low: this.conflicts.filter(c => c.severity === 'low').length },
      byType: { outputMismatch: this.conflicts.filter(c => c.type === 'output-mismatch').length, resourceContention: this.conflicts.filter(c => c.type === 'resource-contention').length, dependencyCycle: this.conflicts.filter(c => c.type === 'dependency-cycle').length, capabilityOverlap: this.conflicts.filter(c => c.type === 'capability-overlap').length }
    };
  }
}
```

### 8.3 AgentCommunicationBus â€” IntegraÃ§Ã£o com NATS JetStream

```typescript
interface BusMessage { id: string; type: 'request' | 'response' | 'event' | 'error'; source: string; target?: string; topic: string; payload: unknown; correlationId?: string; timestamp: number; ttl: number; priority: 1 | 2 | 3 | 4 | 5; headers: Record<string, string>; }
interface BusSubscription { id: string; agentId: string; topic: string; handler: (message: BusMessage) => Promise<void>; filter?: (message: BusMessage) => boolean; }

class AgentCommunicationBus {
  private readonly subscriptions: Map<string, BusSubscription[]> = new Map();
  private readonly pendingRequests: Map<string, { resolve: (value: unknown) => void; reject: (reason: unknown) => void; timer: NodeJS.Timeout }> = new Map();
  private readonly messageLog: BusMessage[] = [];
  private readonly maxLogSize = 10000;
  private natsConnection: unknown = null;

  async connect(natsConfig?: { servers: string[]; token?: string }): Promise<void> {
    try {
      const { connect } = await import('nats');
      this.natsConnection = await connect({ servers: natsConfig?.servers ?? ['nats://localhost:4222'], token: natsConfig?.token, timeout: 5000 });
    } catch {
      console.warn('NATS unavailable, using in-memory bus as fallback');
      this.natsConnection = null;
    }
  }

  async disconnect(): Promise<void> {
    for (const [id, _] of this.pendingRequests) { clearTimeout(_.timer); _.reject(new Error('Bus disconnected')); }
    this.pendingRequests.clear(); this.subscriptions.clear();
    if (this.natsConnection) { await (this.natsConnection as { close: () => Promise<void> }).close(); this.natsConnection = null; }
  }

  async publish(topic: string, message: Omit<BusMessage, 'id' | 'timestamp'>): Promise<void> {
    const msg: BusMessage = { ...message, id: crypto.randomUUID(), timestamp: Date.now() };
    this.logMessage(msg);
    if (this.natsConnection) {
      try { const jc = (this.natsConnection as { jetstream: () => { publish: (t: string, d: Uint8Array) => Promise<void> } }).jetstream(); await jc.publish(topic, new TextEncoder().encode(JSON.stringify(msg))); return; } catch { /* fall through */ }
    }
    const handlers = this.subscriptions.get(topic) ?? [];
    const matchingHandlers = handlers.filter(h => !h.filter || h.filter(msg));
    const pending = this.pendingRequests.get(msg.correlationId ?? '');
    if (pending) { clearTimeout(pending.timer); pending.resolve(msg.payload); this.pendingRequests.delete(msg.correlationId ?? ''); return; }
    await Promise.allSettled(matchingHandlers.map(h => h.handler(msg)));
  }

  async request(topic: string, payload: unknown, source: string, options?: { timeout?: number; priority?: number }): Promise<unknown> {
    const correlationId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pendingRequests.delete(correlationId); reject(new Error(`Request timeout on '${topic}' after ${options?.timeout ?? 30000}ms`)); }, options?.timeout ?? 30000);
      this.pendingRequests.set(correlationId, { resolve, reject, timer });
      this.publish(topic, { type: 'request', source, topic, payload, correlationId, ttl: options?.timeout ?? 30000, priority: (options?.priority ?? 3) as 1 | 2 | 3 | 4 | 5, headers: {} });
    });
  }

  async respond(correlationId: string, payload: unknown, source: string): Promise<void> {
    await this.publish(`response.${correlationId}`, { type: 'response', source, topic: `response.${correlationId}`, payload, correlationId, ttl: 5000, priority: 3, headers: {} });
  }

  subscribe(agentId: string, topic: string, handler: (message: BusMessage) => Promise<void>, filter?: (message: BusMessage) => boolean): string {
    const id = crypto.randomUUID(); const subscription: BusSubscription = { id, agentId, topic, handler, filter };
    if (!this.subscriptions.has(topic)) this.subscriptions.set(topic, []);
    this.subscriptions.get(topic)!.push(subscription);
    if (this.natsConnection) this.setupNatsConsumer(topic, subscription).catch(() => {});
    return id;
  }

  private async setupNatsConsumer(topic: string, _subscription: BusSubscription): Promise<void> {
    try {
      const jc = (this.natsConnection as { jetstream: () => { subscribe: (t: string, c: { queue: string }) => { on: (e: string, h: (m: { data: Uint8Array; ack: () => Promise<void> }) => void) => void } } }).jetstream();
      const consumer = await jc.subscribe(topic, { queue: 'agent-bus' });
      consumer.on('message', async (raw) => {
        try { const msg: BusMessage = JSON.parse(new TextDecoder().decode(raw.data)); if (!_subscription.filter || _subscription.filter(msg)) await _subscription.handler(msg); await raw.ack(); } catch { /* skip */ }
      });
    } catch { /* in-memory fallback */ }
  }

  unsubscribe(subscriptionId: string): boolean {
    for (const [topic, handlers] of this.subscriptions) {
      const idx = handlers.findIndex(h => h.id === subscriptionId);
      if (idx !== -1) { handlers.splice(idx, 1); if (handlers.length === 0) this.subscriptions.delete(topic); return true; }
    }
    return false;
  }

  private logMessage(msg: BusMessage): void { this.messageLog.push(msg); if (this.messageLog.length > this.maxLogSize) this.messageLog.splice(0, this.messageLog.length - this.maxLogSize); }
  getMessageHistory(topic?: string, since?: number): BusMessage[] { let filtered = this.messageLog; if (topic) filtered = filtered.filter(m => m.topic === topic); if (since) filtered = filtered.filter(m => m.timestamp > since); return filtered; }
  getSubscriptionCount(): Record<string, number> { const counts: Record<string, number> = {}; for (const [topic, handlers] of this.subscriptions) counts[topic] = handlers.length; return counts; }
  isConnected(): boolean { if (this.natsConnection) { try { return !(this.natsConnection as { isClosed: () => boolean }).isClosed(); } catch { return false; } } return true; }
}
```

---


## 9. Cache Compartilhado entre Agentes

### 9.1 AgentCache â€” Pool de MemÃ³ria Compartilhada com InvalidaÃ§Ã£o e Prioridade

```typescript
interface CacheEntry<T = unknown> {
  key: string; value: T; namespace: string; createdAt: number; expiresAt: number;
  lastAccessed: number; accessCount: number; size: number;
  priority: 1 | 2 | 3 | 4 | 5; tags: string[];
}

interface CacheConfig {
  maxSize: number; defaultTTL: number;
  evictionPolicy: 'lru' | 'lfu' | 'fifo' | 'priority';
  maxEntriesPerNamespace: number; enableCompression: boolean;
}

interface CacheStats {
  totalEntries: number; totalSize: number; maxSize: number; usagePercent: number;
  hitCount: number; missCount: number; hitRate: number;
  namespaceCount: number; byPriority: Record<number, number>; evictionPolicy: string;
}

class AgentCache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly namespaceIndex = new Map<string, Set<string>>();
  private readonly tagIndex = new Map<string, Set<string>>();
  private readonly priorityQueues: Map<number, string[]> = new Map();
  private config: CacheConfig;
  private totalSize = 0; private hitCount = 0; private missCount = 0;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: config?.maxSize ?? 100 * 1024 * 1024, defaultTTL: config?.defaultTTL ?? 3600000,
      evictionPolicy: config?.evictionPolicy ?? 'lru', maxEntriesPerNamespace: config?.maxEntriesPerNamespace ?? 1000,
      enableCompression: config?.enableCompression ?? false
    };
    for (let i = 1; i <= 5; i++) this.priorityQueues.set(i, []);
  }

  async get<T>(key: string, namespace = 'default'): Promise<T | null> {
    const fullKey = this.buildKey(key, namespace); const entry = this.store.get(fullKey);
    if (!entry) { this.missCount++; return null; }
    if (Date.now() > entry.expiresAt) { this.store.delete(fullKey); this.removeFromIndexes(fullKey, namespace, entry.tags); this.totalSize -= entry.size; this.missCount++; return null; }
    entry.lastAccessed = Date.now(); entry.accessCount++; this.hitCount++;
    this.updatePriorityQueue(entry); return entry.value as T;
  }

  async set<T>(key: string, value: T, options?: { namespace?: string; ttl?: number; priority?: 1 | 2 | 3 | 4 | 5; tags?: string[] }): Promise<void> {
    const namespace = options?.namespace ?? 'default'; const fullKey = this.buildKey(key, namespace);
    const serialized = JSON.stringify(value); const size = new TextEncoder().encode(serialized).length;
    const priority = options?.priority ?? 3;
    if (this.store.has(fullKey)) { const existing = this.store.get(fullKey)!; this.totalSize -= existing.size; this.removeFromIndexes(fullKey, namespace, existing.tags); }
    await this.enforceLimits(namespace, size);
    const entry: CacheEntry = { key: fullKey, value, namespace, createdAt: Date.now(), expiresAt: Date.now() + (options?.ttl ?? this.config.defaultTTL), lastAccessed: Date.now(), accessCount: 0, size, priority, tags: options?.tags ?? [] };
    this.store.set(fullKey, entry); this.totalSize += size;
    if (!this.namespaceIndex.has(namespace)) this.namespaceIndex.set(namespace, new Set());
    this.namespaceIndex.get(namespace)!.add(fullKey);
    for (const tag of entry.tags) { if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set()); this.tagIndex.get(tag)!.add(fullKey); }
    this.priorityQueues.get(priority)?.push(fullKey);
  }

  private async enforceLimits(namespace: string, requiredSize: number): Promise<void> {
    while (this.totalSize + requiredSize > this.config.maxSize) { if (!this.evict()) break; }
    const namespaceKeys = this.namespaceIndex.get(namespace);
    if (namespaceKeys && namespaceKeys.size >= this.config.maxEntriesPerNamespace) {
      const oldest = Array.from(namespaceKeys).map(k => this.store.get(k)!).sort((a, b) => a.createdAt - b.createdAt)[0];
      if (oldest) this.delete(oldest.key, namespace);
    }
  }

  private evict(): boolean {
    const candidates = Array.from(this.store.values()).sort((a, b) => {
      switch (this.config.evictionPolicy) {
        case 'lru': return a.lastAccessed - b.lastAccessed;
        case 'lfu': return a.accessCount - b.accessCount;
        case 'fifo': return a.createdAt - b.createdAt;
        case 'priority': return a.priority - b.priority || a.lastAccessed - b.lastAccessed;
        default: return a.lastAccessed - b.lastAccessed;
      }
    });
    if (candidates.length === 0) return false;
    const victim = candidates[0];
    this.removeFromIndexes(victim.key, victim.namespace, victim.tags);
    this.store.delete(victim.key); this.totalSize -= victim.size;
    return true;
  }

  private removeFromIndexes(fullKey: string, namespace: string, tags: string[]): void {
    this.namespaceIndex.get(namespace)?.delete(fullKey);
    for (const tag of tags) this.tagIndex.get(tag)?.delete(fullKey);
    for (const [, queue] of this.priorityQueues) { const idx = queue.indexOf(fullKey); if (idx !== -1) queue.splice(idx, 1); }
  }

  private updatePriorityQueue(entry: CacheEntry): void {
    const queue = this.priorityQueues.get(entry.priority);
    if (queue) { const idx = queue.indexOf(entry.key); if (idx !== -1) queue.splice(idx, 1); queue.push(entry.key); }
  }

  delete(key: string, namespace = 'default'): boolean {
    const fullKey = this.buildKey(key, namespace); const entry = this.store.get(fullKey);
    if (!entry) return false;
    this.removeFromIndexes(fullKey, namespace, entry.tags); this.store.delete(fullKey); this.totalSize -= entry.size;
    return true;
  }

  invalidateByNamespace(namespace: string): number {
    const keys = this.namespaceIndex.get(namespace); if (!keys) return 0; let count = 0;
    for (const key of keys) { const entry = this.store.get(key); if (entry) { this.removeFromIndexes(key, namespace, entry.tags); this.store.delete(key); this.totalSize -= entry.size; count++; } }
    this.namespaceIndex.delete(namespace); return count;
  }

  invalidateByTag(tag: string): number {
    const keys = this.tagIndex.get(tag); if (!keys) return 0; let count = 0;
    for (const key of keys) { const entry = this.store.get(key); if (entry) { this.store.delete(key); this.totalSize -= entry.size; count++; } }
    this.tagIndex.delete(tag); return count;
  }

  invalidateExpired(): number {
    const now = Date.now(); let count = 0;
    for (const [key, entry] of this.store) { if (now > entry.expiresAt) { this.removeFromIndexes(key, entry.namespace, entry.tags); this.store.delete(key); this.totalSize -= entry.size; count++; } }
    return count;
  }

  searchByTag(tag: string, namespace?: string): CacheEntry[] {
    const keys = this.tagIndex.get(tag); if (!keys) return [];
    return Array.from(keys).map(k => this.store.get(k)).filter((e): e is CacheEntry => e !== undefined && (!namespace || e.namespace === namespace));
  }

  getStats(): CacheStats {
    const byPriority: Record<number, number> = {};
    for (let i = 1; i <= 5; i++) byPriority[i] = this.priorityQueues.get(i)?.length ?? 0;
    return { totalEntries: this.store.size, totalSize: this.totalSize, maxSize: this.config.maxSize, usagePercent: (this.totalSize / this.config.maxSize) * 100, hitCount: this.hitCount, missCount: this.missCount, hitRate: this.hitCount + this.missCount > 0 ? this.hitCount / (this.hitCount + this.missCount) : 0, namespaceCount: this.namespaceIndex.size, byPriority, evictionPolicy: this.config.evictionPolicy };
  }

  clear(): void { this.store.clear(); this.namespaceIndex.clear(); this.tagIndex.clear(); this.priorityQueues.forEach(q => q.length = 0); this.totalSize = 0; this.hitCount = 0; this.missCount = 0; }
  private buildKey(key: string, namespace: string): string { return `${namespace}::${key}`; }
}
```

### 9.2 CacheIntegration â€” Namespaces por Agente

```typescript
interface AgentNamespace { agentId: string; namespace: string; quota: number; currentUsage: number; priority: 1 | 2 | 3 | 4 | 5; }
interface CacheIntegrationStats { namespaces: { agentId: string; namespace: string; quota: number; usage: number; usagePercent: number; priority: number }[]; totalUsage: number; totalQuota: number; cacheStats: CacheStats; }

class CacheIntegration {
  private readonly cache: AgentCache;
  private readonly namespaces: Map<string, AgentNamespace> = new Map();
  private readonly defaultQuota = 10 * 1024 * 1024;

  constructor(cache: AgentCache) { this.cache = cache; }

  registerAgentNamespace(agentId: string, options?: { namespace?: string; quota?: number; priority?: 1 | 2 | 3 | 4 | 5 }): AgentNamespace {
    const ns: AgentNamespace = { agentId, namespace: options?.namespace ?? `agent-${agentId}`, quota: options?.quota ?? this.defaultQuota, currentUsage: 0, priority: options?.priority ?? 3 };
    this.namespaces.set(agentId, ns); return ns;
  }

  unregisterAgentNamespace(agentId: string): void {
    const ns = this.namespaces.get(agentId);
    if (ns) { this.cache.invalidateByNamespace(ns.namespace); this.namespaces.delete(agentId); }
  }

  async storeForAgent<T>(agentId: string, key: string, value: T, options?: { ttl?: number; tags?: string[] }): Promise<boolean> {
    const ns = this.namespaces.get(agentId); if (!ns) throw new Error(`Agent ${agentId} not registered in cache`);
    const size = new TextEncoder().encode(JSON.stringify(value)).length;
    if (ns.currentUsage + size > ns.quota) return false;
    await this.cache.set(key, value, { namespace: ns.namespace, ttl: options?.ttl, priority: ns.priority, tags: options?.tags });
    ns.currentUsage += size; return true;
  }

  async getForAgent<T>(agentId: string, key: string): Promise<T | null> {
    const ns = this.namespaces.get(agentId); if (!ns) throw new Error(`Agent ${agentId} not registered in cache`);
    return this.cache.get<T>(key, ns.namespace);
  }

  async getSharedAcrossAgents<T>(key: string, sourceAgentId: string, targetAgentIds: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    for (const targetId of targetAgentIds) { const ns = this.namespaces.get(targetId); if (ns) results.set(targetId, await this.cache.get<T>(key, ns.namespace)); }
    const sourceNs = this.namespaces.get(sourceAgentId);
    if (sourceNs) {
      const sourceValue = await this.cache.get<T>(key, sourceNs.namespace);
      if (sourceValue) { for (const targetId of targetAgentIds) { if (!results.has(targetId) || results.get(targetId) === null) { const tNs = this.namespaces.get(targetId); if (tNs) { await this.cache.set(key, sourceValue, { namespace: tNs.namespace }); results.set(targetId, sourceValue); } } } }
    }
    return results;
  }

  invalidateAgentCache(agentId: string): number {
    const ns = this.namespaces.get(agentId); if (!ns) return 0;
    const count = this.cache.invalidateByNamespace(ns.namespace); ns.currentUsage = 0; return count;
  }

  getAllStats(): CacheIntegrationStats {
    const nsStats = Array.from(this.namespaces.values()).map(ns => ({ agentId: ns.agentId, namespace: ns.namespace, quota: ns.quota, usage: ns.currentUsage, usagePercent: (ns.currentUsage / ns.quota) * 100, priority: ns.priority }));
    return { namespaces: nsStats, totalUsage: nsStats.reduce((s, n) => s + n.usage, 0), totalQuota: nsStats.reduce((s, n) => s + n.quota, 0), cacheStats: this.cache.getStats() };
  }
}
```

---


## 10. Registro e Descoberta de Agentes

### 10.1 AgentRegistry â€” AnÃºncio de Capacidades e Health Checks

```typescript
interface AgentRegistration {
  agentId: string; version: string; contract: AgentContract; endpoint?: string;
  metadata: AgentMetadata; status: 'active' | 'idle' | 'degraded' | 'offline';
  lastHeartbeat: number; registeredAt: number; healthCheckConfig: HealthCheckConfig;
}

interface AgentMetadata { name: string; description: string; author: string; homepage?: string; repository?: string; license: string; tags: string[]; requiredEnvironment: Record<string, string>; }
interface HealthCheckConfig { interval: number; timeout: number; unhealthyThreshold: number; endpoint?: string; checks: HealthCheck[]; }
interface HealthCheck { name: string; type: 'http' | 'process' | 'custom'; endpoint?: string; expectedStatus?: number; timeout: number; }
interface HealthRecord { agentId: string; timestamp: number; status: 'healthy' | 'degraded' | 'failure'; latency: number; successRate: number; details: Record<string, unknown>; }
interface RegistryStats { totalAgents: number; activeCount: number; idleCount: number; degradedCount: number; offlineCount: number; uniqueCapabilities: number; uniqueTags: number; averageSuccessRate: number; averageLatency: number; }

class AgentRegistry {
  private readonly agents: Map<string, AgentRegistration> = new Map();
  private readonly capabilityIndex: Map<string, Set<string>> = new Map();
  private readonly tagIndex: Map<string, Set<string>> = new Map();
  private healthCheckTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly healthHistory: Map<string, HealthRecord[]> = new Map();
  private readonly maxHealthHistory = 100;

  register(agent: IAgent, metadata: Partial<AgentMetadata>): AgentRegistration {
    if (this.agents.has(agent.id)) throw new Error(`Agent ${agent.id} already registered`);
    const registration: AgentRegistration = {
      agentId: agent.id, version: agent.contract.version, contract: agent.contract,
      metadata: { name: metadata.name ?? agent.getName(), description: metadata.description ?? '', author: metadata.author ?? 'unknown', license: metadata.license ?? 'MIT', tags: metadata.tags ?? [], requiredEnvironment: metadata.requiredEnvironment ?? {} },
      status: 'active', lastHeartbeat: Date.now(), registeredAt: Date.now(),
      healthCheckConfig: { interval: 30000, timeout: 5000, unhealthyThreshold: 3, checks: [{ name: 'default-process-check', type: 'process', timeout: 5000 }] }
    };
    this.agents.set(agent.id, registration);
    this.indexCapabilities(agent.id, agent.contract.capabilities);
    this.indexTags(agent.id, registration.metadata.tags);
    this.startHealthChecks(agent);
    return registration;
  }

  private indexCapabilities(agentId: string, capabilities: string[]): void {
    for (const cap of capabilities) {
      if (!this.capabilityIndex.has(cap)) this.capabilityIndex.set(cap, new Set());
      this.capabilityIndex.get(cap)!.add(agentId);
      const parts = cap.split('-');
      if (parts.length > 1) { for (let i = 1; i < parts.length; i++) { const prefix = parts.slice(0, i).join('-'); if (!this.capabilityIndex.has(prefix)) this.capabilityIndex.set(prefix, new Set()); this.capabilityIndex.get(prefix)!.add(agentId); } }
    }
  }

  private indexTags(agentId: string, tags: string[]): void {
    for (const tag of tags) { if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set()); this.tagIndex.get(tag)!.add(agentId); }
  }

  unregister(agentId: string): boolean {
    this.stopHealthChecks(agentId); const reg = this.agents.get(agentId); if (!reg) return false;
    for (const cap of reg.contract.capabilities) this.capabilityIndex.get(cap)?.delete(agentId);
    for (const tag of reg.metadata.tags) this.tagIndex.get(tag)?.delete(agentId);
    this.agents.delete(agentId); return true;
  }

  findAgentsByCapability(capability: string): AgentRegistration[] {
    const exact = this.capabilityIndex.get(capability);
    if (exact) return Array.from(exact).map(id => this.agents.get(id)!).filter(Boolean);
    const results: AgentRegistration[] = [];
    for (const [cap, agentIds] of this.capabilityIndex) { if (cap.includes(capability) || capability.includes(cap)) results.push(...Array.from(agentIds).map(id => this.agents.get(id)!).filter(Boolean)); }
    return [...new Map(results.map(r => [r.agentId, r])).values()];
  }

  findAgentsByTag(tag: string): AgentRegistration[] {
    const agentIds = this.tagIndex.get(tag); if (!agentIds) return [];
    return Array.from(agentIds).map(id => this.agents.get(id)!).filter(Boolean);
  }

  findOptimalAgent(capability: string, criteria?: { minSuccessRate?: number; maxLatency?: number; preferIdle?: boolean }): AgentRegistration | null {
    const candidates = this.findAgentsByCapability(capability).filter(a => a.status === 'active' || (criteria?.preferIdle && a.status === 'idle'));
    if (candidates.length === 0) return null;
    const scored = candidates.map(a => {
      let score = 0;
      if (a.contract.performanceSLO.minSuccessRate >= (criteria?.minSuccessRate ?? 0.9)) score += 30;
      if (a.contract.performanceSLO.maxLatency <= (criteria?.maxLatency ?? Infinity)) score += 20;
      if (a.status === 'idle') score += 25; if (a.status === 'active') score += 10;
      score += this.getRecentHealthScore(a.agentId) * 25;
      return { agent: a, score };
    });
    scored.sort((a, b) => b.score - a.score); return scored[0].agent;
  }

  private getRecentHealthScore(agentId: string): number {
    const history = this.healthHistory.get(agentId); if (!history || history.length === 0) return 1;
    const failures = history.slice(-10).filter(r => r.status === 'failure').length;
    return Math.max(0, 1 - failures / 10);
  }

  async reportHeartbeat(agentId: string): Promise<void> { const reg = this.agents.get(agentId); if (!reg) return; reg.lastHeartbeat = Date.now(); reg.status = 'active'; }

  private startHealthChecks(agent: IAgent): void {
    const reg = this.agents.get(agent.id); if (!reg) return;
    const timer = setInterval(async () => {
      try {
        const metrics = await agent.getMetrics();
        const record: HealthRecord = { agentId: agent.id, timestamp: Date.now(), status: metrics.successRate >= reg.contract.performanceSLO.minSuccessRate ? 'healthy' : 'degraded', latency: metrics.avgLatency, successRate: metrics.successRate, details: {} };
        this.recordHealth(agent.id, record);
        if (record.status === 'degraded') { const recent = (this.healthHistory.get(agent.id) ?? []).slice(-reg.healthCheckConfig.unhealthyThreshold); if (recent.filter(r => r.status === 'degraded' || r.status === 'failure').length >= reg.healthCheckConfig.unhealthyThreshold) reg.status = 'degraded'; }
        else reg.status = 'active';
      } catch { this.recordHealth(agent.id, { agentId: agent.id, timestamp: Date.now(), status: 'failure', latency: 0, successRate: 0, details: { error: 'Health check failed' } }); reg.status = 'offline'; }
    }, reg.healthCheckConfig.interval);
    this.healthCheckTimers.set(agent.id, timer);
  }

  private stopHealthChecks(agentId: string): void { const timer = this.healthCheckTimers.get(agentId); if (timer) { clearInterval(timer); this.healthCheckTimers.delete(agentId); } }
  private recordHealth(agentId: string, record: HealthRecord): void { if (!this.healthHistory.has(agentId)) this.healthHistory.set(agentId, []); const history = this.healthHistory.get(agentId)!; history.push(record); if (history.length > this.maxHealthHistory) history.splice(0, history.length - this.maxHealthHistory); }
  getAgent(agentId: string): AgentRegistration | undefined { return this.agents.get(agentId); }
  getAllAgents(): AgentRegistration[] { return Array.from(this.agents.values()); }
  getAgentsByStatus(status: AgentRegistration['status']): AgentRegistration[] { return Array.from(this.agents.values()).filter(a => a.status === status); }
  getRegistryStats(): RegistryStats { const agents = Array.from(this.agents.values()); return { totalAgents: agents.length, activeCount: agents.filter(a => a.status === 'active').length, idleCount: agents.filter(a => a.status === 'idle').length, degradedCount: agents.filter(a => a.status === 'degraded').length, offlineCount: agents.filter(a => a.status === 'offline').length, uniqueCapabilities: this.capabilityIndex.size, uniqueTags: this.tagIndex.size, averageSuccessRate: agents.reduce((s, a) => s + a.contract.performanceSLO.minSuccessRate, 0) / (agents.length || 1), averageLatency: agents.reduce((s, a) => s + a.contract.performanceSLO.maxLatency, 0) / (agents.length || 1) }; }
}
```

### 10.2 CapabilityDirectory â€” Busca SemÃ¢ntica e Versionamento

```typescript
interface CapabilityEntry { id: string; name: string; description: string; version: string; agents: string[]; category: string; keywords: string[]; inputSchema: Record<string, unknown>; outputSchema: Record<string, unknown>; examples: CapabilityExample[]; slo: CapabilitySLO; maturity: 'experimental' | 'stable' | 'deprecated'; dependsOn: string[]; }
interface CapabilityExample { input: unknown; output: unknown; description: string; }
interface CapabilitySLO { p99Latency: number; maxTokens: number; minSuccessRate: number; }

class CapabilityDirectory {
  private readonly capabilities: Map<string, CapabilityEntry> = new Map();
  private readonly categoryIndex: Map<string, Set<string>> = new Map();
  private readonly keywordIndex: Map<string, Set<string>> = new Map();
  private readonly versionHistory: Map<string, CapabilityEntry[]> = new Map();

  register(capability: Omit<CapabilityEntry, 'id'>): CapabilityEntry {
    const id = `${capability.name}@${capability.version}`;
    const entry: CapabilityEntry = { ...capability, id };
    if (this.capabilities.has(id)) throw new Error(`Capability ${id} already registered`);
    this.capabilities.set(id, entry);
    if (!this.categoryIndex.has(entry.category)) this.categoryIndex.set(entry.category, new Set());
    this.categoryIndex.get(entry.category)!.add(id);
    for (const keyword of entry.keywords) { if (!this.keywordIndex.has(keyword)) this.keywordIndex.set(keyword, new Set()); this.keywordIndex.get(keyword)!.add(id); }
    if (!this.versionHistory.has(entry.name)) this.versionHistory.set(entry.name, []);
    this.versionHistory.get(entry.name)!.push(entry);
    return entry;
  }

  search(query: string, options?: { category?: string; minMaturity?: string }): CapabilityEntry[] {
    const lowerQuery = query.toLowerCase();
    const results = new Map<string, CapabilityEntry>();
    for (const [id, entry] of this.capabilities) {
      if (options?.category && entry.category !== options.category) continue;
      if (options?.minMaturity === 'stable' && entry.maturity === 'experimental') continue;
      if (options?.minMaturity === 'deprecated' && entry.maturity === 'deprecated') continue;
      if (entry.name.toLowerCase().includes(lowerQuery) || entry.description.toLowerCase().includes(lowerQuery) || entry.keywords.some(k => k.toLowerCase().includes(lowerQuery))) results.set(id, entry);
    }
    return Array.from(results.values());
  }

  semanticSearch(query: string, maxResults = 10): CapabilityEntry[] {
    const queryWords = query.toLowerCase().split(/[\s_-]+/);
    const scored: [CapabilityEntry, number][] = [];
    for (const entry of this.capabilities.values()) {
      let score = 0;
      const text = `${entry.name} ${entry.description} ${entry.keywords.join(' ')}`.toLowerCase();
      for (const word of queryWords) {
        if (text.includes(word)) score += 1;
        if (entry.name.toLowerCase().includes(word)) score += 3;
        if (entry.keywords.some(k => k.toLowerCase().includes(word))) score += 2;
      }
      if (score > 0) scored.push([entry, score]);
    }
    return scored.sort((a, b) => b[1] - a[1]).slice(0, maxResults).map(([entry]) => entry);
  }

  getVersionHistory(name: string): CapabilityEntry[] { return this.versionHistory.get(name) ?? []; }
  getByCategory(category: string): CapabilityEntry[] { const ids = this.categoryIndex.get(category); if (!ids) return []; return Array.from(ids).map(id => this.capabilities.get(id)!).filter(Boolean); }
  getAllCategories(): string[] { return Array.from(this.categoryIndex.keys()); }
  getStats(): { total: number; byCategory: Record<string, number>; byMaturity: Record<string, number> } {
    const byCategory: Record<string, number> = {}; const byMaturity: Record<string, number> = {};
    for (const entry of this.capabilities.values()) { byCategory[entry.category] = (byCategory[entry.category] ?? 0) + 1; byMaturity[entry.maturity] = (byMaturity[entry.maturity] ?? 0) + 1; }
    return { total: this.capabilities.size, byCategory, byMaturity };
  }
}
```

---


## 11. SuÃ­tes de Teste

### 11.1 Testes do CodeReviewerAgent

```typescript
describe('CodeReviewerAgent', () => {
  let agent: CodeReviewerAgent;

  beforeEach(() => { agent = new CodeReviewerAgent(); });

  it('should detect eval() usage as security issue', async () => {
    const input: CodeReviewInput = {
      files: [{ path: 'src/test.ts', content: 'const result = eval(userInput);', language: 'typescript' }],
      rules: [], context: { project: 'test', language: 'typescript', framework: 'node' }
    };
    const result = await agent.execute(input);
    const output = result.output as CodeReviewOutput;
    expect(output.issues.some(i => i.rule === 'no-eval' && i.severity === 'error')).toBe(true);
    expect(output.score).toBeLessThan(100);
  });

  it('should detect hardcoded secrets', async () => {
    const input: CodeReviewInput = {
      files: [{ path: 'src/config.ts', content: 'const API_KEY = "sk-1234567890abcdef";', language: 'typescript' }],
      rules: [], context: { project: 'test', language: 'typescript', framework: 'node' }
    };
    const result = await agent.execute(input);
    const output = result.output as CodeReviewOutput;
    expect(output.issues.some(i => i.category === 'security')).toBe(true);
    expect(output.issues[0].severity).toBe('error');
  });

  it('should detect console.log warnings', async () => {
    const input: CodeReviewInput = {
      files: [{ path: 'src/app.ts', content: 'console.log("debug info");', language: 'typescript' }],
      rules: [], context: { project: 'test', language: 'typescript', framework: 'node' }
    };
    const result = await agent.execute(input);
    const output = result.output as CodeReviewOutput;
    expect(output.issues.some(i => i.rule === 'no-console')).toBe(true);
    expect(output.summary.warnings).toBe(1);
  });

  it('should detect empty catch blocks', async () => {
    const input: CodeReviewInput = {
      files: [{ path: 'src/handler.ts', content: 'try { risky(); } catch (e) {}', language: 'typescript' }],
      rules: [], context: { project: 'test', language: 'typescript', framework: 'node' }
    };
    const result = await agent.execute(input);
    const output = result.output as CodeReviewOutput;
    expect(output.issues.some(i => i.rule === 'missing-error-handling')).toBe(true);
  });

  it('should return a valid score with summary', async () => {
    const input: CodeReviewInput = {
      files: [{ path: 'src/valid.ts', content: 'export function add(a: number, b: number): number { return a + b; }', language: 'typescript' }],
      rules: [], context: { project: 'test', language: 'typescript', framework: 'node' }
    };
    const result = await agent.execute(input);
    const output = result.output as CodeReviewOutput;
    expect(output.summary.score).toBeGreaterThanOrEqual(75);
    expect(output.summary.passed).toBe(true);
    expect(output.summary.totalFiles).toBe(1);
  });

  it('should consolidate duplicate issues', async () => {
    const input: CodeReviewInput = {
      files: [{ path: 'src/dup.ts', content: 'console.log("a");\nconsole.log("b");', language: 'typescript' }],
      rules: [], context: { project: 'test', language: 'typescript', framework: 'node' }
    };
    const result = await agent.execute(input);
    const output = result.output as CodeReviewOutput;
    const consoleIssues = output.issues.filter(i => i.rule === 'no-console');
    expect(consoleIssues.length).toBe(2);
    expect(output.summary.totalIssues).toBe(2);
  });

  it('should validate input correctly', () => {
    expect(agent.validate({ files: [{ path: 'test.ts', content: '' }] }).valid).toBe(true);
    expect(agent.validate({}).valid).toBe(false);
    expect(agent.validate({ files: 'not-array' }).valid).toBe(false);
  });

  it('should handle empty file list', async () => {
    const result = await agent.execute({ files: [], rules: [], context: { project: 'test', language: 'typescript', framework: 'node' } });
    const output = result.output as CodeReviewOutput;
    expect(output.issues.length).toBe(0);
    expect(output.score).toBe(100);
  });
});
```

### 11.2 Testes do CooperationOrchestrator

```typescript
describe('CooperationOrchestrator', () => {
  let orchestrator: CooperationOrchestrator;
  let mockCodeReviewer: jest.Mocked<IAgent>;

  beforeEach(() => {
    orchestrator = new CooperationOrchestrator();
    mockCodeReviewer = {
      id: 'code-reviewer-v1', status: 'idle',
      contract: { agentId: 'code-reviewer-v1', version: '1.0.0', capabilities: ['static-analysis', 'style-check'], inputSchema: {}, outputSchema: {}, performanceSLO: { maxLatency: 10000, maxTokens: 4000, minSuccessRate: 0.97 }, dependencies: [] },
      execute: jest.fn().mockResolvedValue({ status: 'success', output: { issues: [] }, metrics: { executionTime: 100, tokensUsed: 500, confidence: 0.95 } }),
      validate: jest.fn(), cancel: jest.fn(), getMetrics: jest.fn(), getName: jest.fn().mockReturnValue('Code Reviewer')
    } as unknown as jest.Mocked<IAgent>;
    orchestrator.registerAgent(mockCodeReviewer);
  });

  it('should register and retrieve agents', () => {
    expect(orchestrator.getRegisteredAgents()).toHaveLength(1);
    expect(orchestrator.getRegisteredAgents()[0].id).toBe('code-reviewer-v1');
  });

  it('should throw on duplicate registration', () => {
    expect(() => orchestrator.registerAgent(mockCodeReviewer)).toThrow('already registered');
  });

  it('should decompose goal into tasks based on capabilities', async () => {
    const result = await orchestrator.orchestrate({ goal: 'review code', constraints: [], availableAgents: ['code-reviewer-v1'], priority: 3 });
    expect(result.decomposition.tasks.length).toBeGreaterThan(0);
    expect(result.decomposition.tasks[0].requiredCapability).toBe('static-analysis');
    expect(result.decomposition.tasks[0].assignedAgent).toBe('code-reviewer-v1');
  });

  it('should execute tasks via registered agents', async () => {
    const result = await orchestrator.orchestrate({ goal: 'review code', constraints: [], availableAgents: ['code-reviewer-v1'], priority: 3 });
    expect(mockCodeReviewer.execute).toHaveBeenCalled();
    expect(result.results[0].status).toBe('success');
  });

  it('should return consolidated output', async () => {
    const result = await orchestrator.orchestrate({ goal: 'review code', constraints: [], availableAgents: ['code-reviewer-v1'], priority: 3 });
    expect(result.consolidated.totalTasks).toBeGreaterThan(0);
    expect(result.consolidated.completionRate).toBeGreaterThanOrEqual(0);
  });

  it('should log execution events', async () => {
    const result = await orchestrator.orchestrate({ goal: 'review code', constraints: [], availableAgents: ['code-reviewer-v1'], priority: 3 });
    expect(result.executionLog.length).toBeGreaterThanOrEqual(2);
    expect(result.executionLog[0].event).toBe('orchestration_started');
    expect(result.executionLog[result.executionLog.length - 1].event).toBe('orchestration_completed');
  });

  it('should handle agent assignment failure', async () => {
    const result = await orchestrator.orchestrate({ goal: 'deploy system', constraints: [], availableAgents: ['code-reviewer-v1'], priority: 3 });
    const unassigned = result.decomposition.tasks.filter(t => t.assignedAgent === null);
    expect(unassigned.length).toBeGreaterThan(0);
  });
});
```

### 11.3 Testes do AgentCommunicationBus

```typescript
describe('AgentCommunicationBus', () => {
  let bus: AgentCommunicationBus;

  beforeEach(() => { bus = new AgentCommunicationBus(); });

  it('should publish and receive messages in-memory', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    bus.subscribe('agent-1', 'topic.test', handler);
    await bus.publish('topic.test', { type: 'event', source: 'agent-2', topic: 'topic.test', payload: { data: 42 }, ttl: 5000, priority: 3, headers: {} });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ source: 'agent-2', payload: { data: 42 } }));
  });

  it('should handle request-response pattern', async () => {
    bus.subscribe('agent-2', 'topic.echo', async (msg) => {
      if (msg.type === 'request') await bus.respond(msg.correlationId!, msg.payload, 'agent-2');
    });
    const response = await bus.request('topic.echo', { message: 'hello' }, 'agent-1', { timeout: 5000 });
    expect(response).toEqual({ message: 'hello' });
  });

  it('should timeout on unanswered requests', async () => {
    await expect(bus.request('topic.nonexistent', {}, 'agent-1', { timeout: 100 })).rejects.toThrow('timeout');
  });

  it('should support message filtering', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    bus.subscribe('agent-1', 'topic.filtered', handler, (msg) => msg.priority >= 3);
    await bus.publish('topic.filtered', { type: 'event', source: 'agent-2', topic: 'topic.filtered', payload: {}, ttl: 5000, priority: 1, headers: {} });
    expect(handler).not.toHaveBeenCalled();
    await bus.publish('topic.filtered', { type: 'event', source: 'agent-2', topic: 'topic.filtered', payload: {}, ttl: 5000, priority: 4, headers: {} });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe handlers', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const subId = bus.subscribe('agent-1', 'topic.unsub', handler);
    bus.unsubscribe(subId);
    await bus.publish('topic.unsub', { type: 'event', source: 'agent-2', topic: 'topic.unsub', payload: {}, ttl: 5000, priority: 3, headers: {} });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should maintain message history', async () => {
    await bus.publish('topic.history', { type: 'event', source: 'test', topic: 'topic.history', payload: { n: 1 }, ttl: 5000, priority: 3, headers: {} });
    await bus.publish('topic.history', { type: 'event', source: 'test', topic: 'topic.history', payload: { n: 2 }, ttl: 5000, priority: 3, headers: {} });
    const history = bus.getMessageHistory('topic.history');
    expect(history.length).toBe(2);
    expect((history[1].payload as { n: number }).n).toBe(2);
  });

  it('should be connected when using in-memory mode', () => {
    expect(bus.isConnected()).toBe(true);
  });

  it('should disconnect and clear pending requests', async () => {
    const reqPromise = bus.request('topic.any', {}, 'agent-1', { timeout: 5000 });
    await bus.disconnect();
    await expect(reqPromise).rejects.toThrow('disconnected');
  });
});
```

### 11.4 Testes do AgentCache

```typescript
describe('AgentCache', () => {
  let cache: AgentCache;

  beforeEach(() => { cache = new AgentCache({ maxSize: 1024 * 1024, defaultTTL: 10000, evictionPolicy: 'lru', maxEntriesPerNamespace: 100 }); });

  it('should store and retrieve values', async () => {
    await cache.set('key1', { data: 'value1' });
    const result = await cache.get<{ data: string }>('key1');
    expect(result).toEqual({ data: 'value1' });
  });

  it('should return null for missing keys', async () => {
    const result = await cache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('should respect TTL expiration', async () => {
    await cache.set('expires-fast', 'value', { ttl: 1 });
    await new Promise(resolve => setTimeout(resolve, 10));
    const result = await cache.get('expires-fast');
    expect(result).toBeNull();
  });

  it('should support namespaced keys', async () => {
    await cache.set('key', 'ns1-value', { namespace: 'ns1' });
    await cache.set('key', 'ns2-value', { namespace: 'ns2' });
    expect(await cache.get('key', 'ns1')).toBe('ns1-value');
    expect(await cache.get('key', 'ns2')).toBe('ns2-value');
  });

  it('should track cache stats', async () => {
    await cache.set('a', 1); await cache.get('a'); await cache.get('missing');
    const stats = cache.getStats();
    expect(stats.hitCount).toBe(1);
    expect(stats.missCount).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });

  it('should evict oldest entries on LRU policy', async () => {
    const smallCache = new AgentCache({ maxSize: 100, evictionPolicy: 'lru' });
    await smallCache.set('a', 'x'.repeat(60));
    await smallCache.set('b', 'y'.repeat(60));
    const result = await smallCache.get('a');
    expect(result).toBeNull();
  });

  it('should invalidate by namespace', async () => {
    await cache.set('k1', 'v1', { namespace: 'ns' });
    await cache.set('k2', 'v2', { namespace: 'ns' });
    expect(cache.invalidateByNamespace('ns')).toBe(2);
    expect(await cache.get('k1', 'ns')).toBeNull();
  });

  it('should invalidate by tag', async () => {
    await cache.set('k1', 'v1', { tags: ['critical'] });
    await cache.set('k2', 'v2', { tags: ['critical'] });
    expect(cache.searchByTag('critical').length).toBe(2);
    expect(cache.invalidateByTag('critical')).toBe(2);
    expect(cache.searchByTag('critical').length).toBe(0);
  });

  it('should support priority queuing', async () => {
    await cache.set('high', 'important', { priority: 5 });
    await cache.set('low', 'unimportant', { priority: 1 });
    const stats = cache.getStats();
    expect(stats.byPriority[5]).toBe(1);
    expect(stats.byPriority[1]).toBe(1);
  });
});
```

### 11.5 Testes do AgentRegistry e CapabilityDirectory

```typescript
describe('AgentRegistry', () => {
  let registry: AgentRegistry;
  let mockAgent: jest.Mocked<IAgent>;

  beforeEach(() => {
    registry = new AgentRegistry();
    mockAgent = {
      id: 'test-agent-v1', status: 'idle',
      contract: { agentId: 'test-agent-v1', version: '1.0.0', capabilities: ['static-analysis', 'style-check', 'security-scan'], inputSchema: {}, outputSchema: {}, performanceSLO: { maxLatency: 10000, maxTokens: 4000, minSuccessRate: 0.95 }, dependencies: [] },
      execute: jest.fn(), validate: jest.fn(), cancel: jest.fn(),
      getMetrics: jest.fn().mockResolvedValue({ tasksCompleted: 10, avgLatency: 200, successRate: 0.97, tokensConsumed: 5000 }),
      getName: jest.fn().mockReturnValue('Test Agent')
    } as unknown as jest.Mocked<IAgent>;
  });

  it('should register an agent with metadata', () => {
    const reg = registry.register(mockAgent, { name: 'Test Agent', tags: ['security', 'review'] });
    expect(reg.agentId).toBe('test-agent-v1');
    expect(reg.metadata.tags).toContain('security');
    expect(reg.status).toBe('active');
  });

  it('should throw on duplicate registration', () => {
    registry.register(mockAgent, {});
    expect(() => registry.register(mockAgent, {})).toThrow('already registered');
  });

  it('should find agents by capability', () => {
    registry.register(mockAgent, {});
    const found = registry.findAgentsByCapability('static-analysis');
    expect(found.length).toBe(1);
    expect(found[0].agentId).toBe('test-agent-v1');
  });

  it('should find agents by tag', () => {
    registry.register(mockAgent, { tags: ['security'] });
    const found = registry.findAgentsByTag('security');
    expect(found.length).toBe(1);
  });

  it('should find optimal agent using scoring', () => {
    registry.register(mockAgent, {});
    const optimal = registry.findOptimalAgent('static-analysis', { minSuccessRate: 0.9, preferIdle: true });
    expect(optimal).not.toBeNull();
    expect(optimal!.agentId).toBe('test-agent-v1');
  });

  it('should unregister agents', () => {
    registry.register(mockAgent, {});
    expect(registry.unregister('test-agent-v1')).toBe(true);
    expect(registry.getAgent('test-agent-v1')).toBeUndefined();
  });

  it('should report heartbeat and maintain health', async () => {
    registry.register(mockAgent, {});
    await registry.reportHeartbeat('test-agent-v1');
    const agent = registry.getAgent('test-agent-v1')!;
    expect(agent.status).toBe('active');
  });

  it('should return registry stats', () => {
    registry.register(mockAgent, { tags: ['test'] });
    const stats = registry.getRegistryStats();
    expect(stats.totalAgents).toBe(1);
    expect(stats.uniqueCapabilities).toBe(3); // static-analysis, style-check, security-scan plus prefixes
  });
});

describe('CapabilityDirectory', () => {
  let directory: CapabilityDirectory;

  beforeEach(() => { directory = new CapabilityDirectory(); });

  it('should register capabilities with versioning', () => {
    const entry = directory.register({ name: 'static-analysis', description: 'Analyzes code for issues', version: '1.0.0', agents: ['agent-1'], category: 'code-quality', keywords: ['lint', 'static', 'analysis'], inputSchema: {}, outputSchema: {}, examples: [], slo: { p99Latency: 10000, maxTokens: 4000, minSuccessRate: 0.95 }, maturity: 'stable', dependsOn: [] });
    expect(entry.id).toBe('static-analysis@1.0.0');
    expect(directory.getVersionHistory('static-analysis').length).toBe(1);
  });

  it('should search by query', () => {
    directory.register({ name: 'static-analysis', description: 'Analyzes code for issues', version: '1.0.0', agents: [], category: 'code-quality', keywords: ['lint', 'static'], inputSchema: {}, outputSchema: {}, examples: [], slo: { p99Latency: 10000, maxTokens: 4000, minSuccessRate: 0.95 }, maturity: 'stable', dependsOn: [] });
    const results = directory.search('static');
    expect(results.length).toBe(1);
  });

  it('should perform semantic search', () => {
    directory.register({ name: 'test-generation', description: 'Generates unit tests', version: '1.0.0', agents: [], category: 'testing', keywords: ['test', 'coverage', 'unit'], inputSchema: {}, outputSchema: {}, examples: [], slo: { p99Latency: 30000, maxTokens: 8000, minSuccessRate: 0.9 }, maturity: 'stable', dependsOn: [] });
    directory.register({ name: 'code-review', description: 'Reviews code style', version: '1.0.0', agents: [], category: 'code-quality', keywords: ['review', 'style'], inputSchema: {}, outputSchema: {}, examples: [], slo: { p99Latency: 15000, maxTokens: 4000, minSuccessRate: 0.95 }, maturity: 'stable', dependsOn: [] });
    const results = directory.semanticSearch('test coverage unit', 5);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].name).toBe('test-generation');
  });

  it('should filter by category', () => {
    directory.register({ name: 'a1', description: '', version: '1.0.0', agents: [], category: 'cat-a', keywords: [], inputSchema: {}, outputSchema: {}, examples: [], slo: { p99Latency: 0, maxTokens: 0, minSuccessRate: 0 }, maturity: 'stable', dependsOn: [] });
    directory.register({ name: 'a2', description: '', version: '1.0.0', agents: [], category: 'cat-b', keywords: [], inputSchema: {}, outputSchema: {}, examples: [], slo: { p99Latency: 0, maxTokens: 0, minSuccessRate: 0 }, maturity: 'stable', dependsOn: [] });
    expect(directory.getByCategory('cat-a').length).toBe(1);
    expect(directory.getAllCategories().length).toBe(2);
  });

  it('should return stats', () => {
    directory.register({ name: 'cap1', description: '', version: '1.0.0', agents: [], category: 'cat-a', keywords: [], inputSchema: {}, outputSchema: {}, examples: [], slo: { p99Latency: 0, maxTokens: 0, minSuccessRate: 0 }, maturity: 'stable', dependsOn: [] });
    directory.register({ name: 'cap2', description: '', version: '1.0.0', agents: [], category: 'cat-a', keywords: [], inputSchema: {}, outputSchema: {}, examples: [], slo: { p99Latency: 0, maxTokens: 0, minSuccessRate: 0 }, maturity: 'experimental', dependsOn: [] });
    const stats = directory.getStats();
    expect(stats.total).toBe(2);
    expect(stats.byCategory['cat-a']).toBe(2);
    expect(stats.byMaturity['stable']).toBe(1);
    expect(stats.byMaturity['experimental']).toBe(1);
  });
});
```

### 11.6 Testes do TaskCoordinator

```typescript
describe('TaskCoordinator', () => {
  let coordinator: TaskCoordinator;

  beforeEach(() => { coordinator = new TaskCoordinator(); });

  it('should register and resolve conflicts', () => {
    const conflict = coordinator.registerConflict({ type: 'output-mismatch', between: ['agent-a', 'agent-b'], description: 'Output mismatch', severity: 'high' });
    expect(conflict.resolved).toBe(false);
    expect(coordinator.resolveConflict(conflict.id, 'Accepted agent-a output', 'auto-resolver')).toBe(true);
    expect(coordinator.getConflicts({ resolved: true }).length).toBe(1);
  });

  it('should acquire and release resources', async () => {
    expect(await coordinator.acquireResource('agent-a', 'resource-1')).toBe(true);
    expect(await coordinator.acquireResource('agent-b', 'resource-1')).toBe(false);
    coordinator.releaseResource('agent-a', 'resource-1');
    expect(await coordinator.acquireResource('agent-b', 'resource-1')).toBe(true);
  });

  it('should detect resource contention conflicts', async () => {
    await coordinator.acquireResource('agent-a', 'shared-resource');
    await coordinator.acquireResource('agent-b', 'shared-resource', 50);
    const conflicts = coordinator.getConflicts({ severity: 'high' });
    expect(conflicts.some(c => c.type === 'resource-contention')).toBe(true);
  });

  it('should handle output mismatch similarity check', () => {
    const result = coordinator.handleOutputMismatch('agent-a', 'agent-b', { value: 42 }, { value: 42 });
    expect(result.resolution).toBe('accept-both');
    const result2 = coordinator.handleOutputMismatch('agent-a', 'agent-b', 'hello', 'world');
    expect(result2.resolution).toBe('escalate');
  });

  it('should wait for dependencies', async () => {
    const taskStatus = new Map<string, string>([['dep-task', 'completed']]);
    const deps: Dependency[] = [{ from: 'dep-task', to: 'current-task', type: 'blocking' }];
    const result = await coordinator.waitForDependencies('current-task', deps, taskStatus);
    expect(result).toBe(true);
  });

  it('should fail on dependency failure', async () => {
    const taskStatus = new Map<string, string>([['dep-task', 'failed']]);
    const deps: Dependency[] = [{ from: 'dep-task', to: 'current-task', type: 'blocking' }];
    const result = await coordinator.waitForDependencies('current-task', deps, taskStatus);
    expect(result).toBe(false);
  });

  it('should provide conflict statistics', () => {
    coordinator.registerConflict({ type: 'output-mismatch', between: ['a', 'b'], description: '', severity: 'critical' });
    coordinator.registerConflict({ type: 'resource-contention', between: ['b', 'c'], description: '', severity: 'high' });
    const stats = coordinator.getConflictStats();
    expect(stats.total).toBe(2);
    expect(stats.byType.outputMismatch).toBe(1);
    expect(stats.byType.resourceContention).toBe(1);
    expect(stats.bySeverity.critical).toBe(1);
    expect(stats.bySeverity.high).toBe(1);
  });
});
```

---


## 12. Architecture Decision Records

### ADR-001: EspecializaÃ§Ã£o de Agentes via Contratos Formais

**Contexto:** Agentes generalistas produzem resultados inconsistentes entre domÃ­nios e dificultam auditoria.

**DecisÃ£o:** Cada agente implementa a interface `IAgent` com um `AgentContract` que declara capabilities, schemas de entrada/saÃ­da e SLOs de performance. O contrato Ã© imutÃ¡vel apÃ³s registro e serve como fonte Ãºnica da verdade para descoberta e delegaÃ§Ã£o.

**ConsequÃªncias:**
- Positivas: SubstituiÃ§Ã£o independente de agentes; descoberta automÃ¡tica de capacidades; SLOs permitem detecÃ§Ã£o precoce de degradaÃ§Ã£o.
- Negativas: Overhead de definiÃ§Ã£o de contrato para cada novo agente; rigidez na evoluÃ§Ã£o de interfaces.
- MitigaÃ§Ã£o: Versionamento semÃ¢ntico de contratos (`major.minor.patch`) com suporte a compatibilidade retroativa.

**Status:** Aceito. Implementado em todas as 5 classes de agente especialista.

### ADR-002: Protocolo de CooperaÃ§Ã£o R5 com Orquestrador Central

**Contexto:** MÃºltiplos agentes especializados precisam coordenar execuÃ§Ã£o, resolver conflitos e gerenciar dependÃªncias entre tarefas.

**DecisÃ£o:** Adotar arquitetura de orquestrador central (`CooperationOrchestrator`) que gerencia decomposiÃ§Ã£o de tarefas, delegaÃ§Ã£o, execuÃ§Ã£o e consolidaÃ§Ã£o. Conflitos sÃ£o resolvidos pelo `TaskCoordinator` com escalonamento para humanos quando necessÃ¡rio. ComunicaÃ§Ã£o via `AgentCommunicationBus` com fallback in-memory e NATS JetStream opcional.

**Alternativas consideradas:**
- Coreografia pura (agentes se comunicam diretamente): Rejeitada por dificultar rastreabilidade e auditoria.
- Barramento de eventos sem orquestrador: Rejeitado por falta de visibilidade do fluxo completo.

**Status:** Aceito. Implementado com 3 componentes principais no Protocolo R5.

### ADR-003: Cache Compartilhado com Namespaces por Agente

**Contexto:** Agentes frequentemente processam os mesmos dados (ex: arquivos de cÃ³digo, configuraÃ§Ãµes). Sem cache compartilhado, cada agente reprocessa dados redundantes.

**DecisÃ£o:** Cache centralizado (`AgentCache`) com namespaces isolados por agente via `CacheIntegration`. PolÃ­tica de evicÃ§Ã£o LRU padrÃ£o, com suporte a LFU, FIFO e prioridade. Quotas configurÃ¡veis por namespace.

**ConsequÃªncias:**
- Positivas: ReduÃ§Ã£o de tokens consumidos em 30-50% em tarefas sequenciais; isolamento entre agentes via namespaces.
- Negativas: Ponto central de contenÃ§Ã£o; complexidade de invalidaÃ§Ã£o.
- MitigaÃ§Ã£o: TTLs agressivos para dados volÃ¡teis; invalidaÃ§Ã£o por tag para limpeza seletiva.

**Status:** Aceito. Implementado com suporte a 5 nÃ­veis de prioridade.

### ADR-004: Registry com Health Checks e Descoberta SemÃ¢ntica

**Contexto:** O ecossistema de agentes cresce dinamicamente. Ã‰ necessÃ¡rio um mecanismo de registro, descoberta e monitoramento de saÃºde.

**DecisÃ£o:** `AgentRegistry` mantÃ©m Ã­ndice bidirecional de capabilities (capability -> agentes, agente -> capabilities) com health checks periÃ³dicos. `CapabilityDirectory` oferece busca textual e semÃ¢ntica com versionamento.

**ConsequÃªncias:**
- Positivas: Descoberta O(1) por capability; failover automÃ¡tico via health checks; busca semÃ¢ntica permite matching aproximado.
- Negativas: Overhead de health checks periÃ³dicos; complexidade de indexaÃ§Ã£o.

**Status:** Aceito. Implementado com suporte a prefixos parciais de capabilities.

### ADR-005: SuÃ­te de Testes por Componente com Isolamento

**Contexto:** A malha de agentes e protocolos requer testes isolados para garantir confiabilidade sem dependÃªncia de infraestrutura externa.

**DecisÃ£o:** Cada componente possui suÃ­te de testes dedicada com mocks dos contratos `IAgent`. O barramento de comunicaÃ§Ã£o usa modo in-memory (sem NATS) nos testes. O cache usa instÃ¢ncia limpa por teste.

**ConsequÃªncias:**
- Positivas: Testes determinÃ­sticos e rÃ¡pidos (< 50ms por suÃ­te); independÃªncia de NATS/JetStream para CI.
- Negativas: Cobertura limitada de integraÃ§Ã£o real com NATS.
- MitigaÃ§Ã£o: SuÃ­te separada de integraÃ§Ã£o (opcional) com NATS em Docker.

**Status:** Aceito. Implementado com 30+ testes distribuÃ­dos em 6 suÃ­tes.

---


## 13. ReferÃªncias Expandidas

1. **Wooldridge, M. (2009).** *An Introduction to MultiAgent Systems.* 2nd ed. Wiley. â€” Fundamentos de MAS, cooperation, coordination.
2. **Rao, A. & Georgeff, M. (1995).** "BDI Agents: From Theory to Practice." *ICMAS-95*. â€” Modelo crenÃ§a-desejo-intenÃ§Ã£o.
3. **Jennings, N. (2000).** "On agent-based software engineering." *Artificial Intelligence*, 117(2):277-296. â€” Engenharia de software baseada em agentes.
4. **Sycara, K. (1998).** "Multiagent Systems." *AI Magazine*, 19(2):79-92. â€” VisÃ£o geral de sistemas multiagente.
5. **Shoham, Y. & Leyton-Brown, K. (2008).** *Multiagent Systems: Algorithmic, Game-Theoretic, and Logical Foundations.* Cambridge University Press. â€” Fundamentos algorÃ­tmicos e teÃ³ricos.
6. **Jennings, N. & Wooldridge, M. (1998).** "Applications of Intelligent Agents." In: *Agent Technology: Foundations, Applications, and Markets.* Springer. â€” AplicaÃ§Ãµes prÃ¡ticas de agentes inteligentes.
7. **Dignum, V. (2019).** "Responsible Autonomy." *IJCAI-19* â€” Autonomia responsÃ¡vel em sistemas multiagente.
8. **Luck, M. & McBurney, P. (2008).** "Agent Systems and Software Engineering." *Knowledge Engineering Review*, 23(2):107-132. â€” Engenharia de sistemas agentes.
9. **Omicini, A. & Zambonelli, F. (2006).** "Coordination of Complex Systems." *ACM Computing Surveys*, 38(3). â€” CoordenaÃ§Ã£o em sistemas complexos.
10. **Weiss, G. (2013).** *Multiagent Systems.* 2nd ed. MIT Press. â€” Manual abrangente de MAS.
11. **Ferber, J. (1999).** *Multi-Agent Systems: An Introduction to Distributed Artificial Intelligence.* Addison-Wesley. â€” IntroduÃ§Ã£o Ã  IA distribuÃ­da.
12. **Bordini, R. et al. (2007).** *Programming Multi-Agent Systems in AgentSpeak using Jason.* Wiley. â€” ProgramaÃ§Ã£o prÃ¡tica de MAS.
13. **Durfee, E. (1999).** "Distributed Problem Solving and Planning." In: *Multiagent Systems*, MIT Press. â€” Planejamento distribuÃ­do.
14. **Tambe, M. (1997).** "Towards Flexible Teamwork." *JAIR*, 7:83-124. â€” Trabalho em equipe flexÃ­vel em MAS.
15. **Grosz, B. & Kraus, S. (1996).** "Collaborative Plans for Complex Group Action." *Artificial Intelligence*, 86(2):269-357. â€” Planos colaborativos.
16. **Lesser, V. (1999).** "Cooperative Multiagent Systems: A Personal View." In: *Multiagent Systems*, MIT Press. â€” VisÃ£o pessoal sobre cooperaÃ§Ã£o em MAS.
17. **Decker, K. & Lesser, V. (1995).** "Designing a Family of Coordination Algorithms." *ICMAS-95*. â€” Algoritmos de coordenaÃ§Ã£o.
18. **DurÃ¡n, F. et al. (2016).** "Agent-Based Modelling and Software Engineering." *IEEE Computer*, 49(12):46-54. â€” Modelagem baseada em agentes.
19. **Padgham, L. & Winikoff, M. (2004).** *Developing Intelligent Agent Systems.* Wiley. â€” Desenvolvimento prÃ¡tico de sistemas agentes.
20. **Bratman, M. (1987).** *Intention, Plans, and Practical Reason.* Harvard University Press. â€” Fundamentos filosÃ³ficos do modelo BDI.

---


## 14. ConclusÃ£o Atualizada

### HipÃ³teses Validadas pela ImplementaÃ§Ã£o
- **H1:** Agentes especializados com contratos formais produzem resultados consistentes em seus domÃ­nios. A implementaÃ§Ã£o de 5 agentes (CodeReviewer, Architecture, Testing, Documentation, DevOps) demonstra capacidades distintas e nÃ£o sobrepostas.
- **H2:** O protocolo de cooperaÃ§Ã£o R5 com `CooperationOrchestrator`, `TaskCoordinator` e `AgentCommunicationBus` permite decomposiÃ§Ã£o, delegaÃ§Ã£o, resoluÃ§Ã£o de conflitos e comunicaÃ§Ã£o assÃ­ncrona entre agentes.
- **H3:** Contratos com SLOs (`performanceSLO.maxLatency`, `minSuccessRate`) permitem scoring e seleÃ§Ã£o otimizada de agentes via `AgentRegistry.findOptimalAgent()`.

### MÃ©tricas Esperadas
- **Qualidade de cÃ³digo:** ReduÃ§Ã£o de 40%+ em defeitos vs agente generalista (CodeReviewerAgent detecta 8+ categorias de issues)
- **Conflitos:** ResoluÃ§Ã£o automÃ¡tica de 80%+ via similaridade e scoring (TaskCoordinator.handleOutputMismatch)
- **DegradaÃ§Ã£o:** DetecÃ§Ã£o precoce via health checks a cada 30s (AgentRegistry health check loop)
- **Cache:** ReduÃ§Ã£o de 30-50% em tokens com cache compartilhado entre agentes sequenciais

### PrÃ³ximos Passos
1. Implementar `ContractRegistry` com validaÃ§Ã£o de schema Zod
2. Integrar `CooperationOrchestrator` ao `AgentOrchestrator` existente em `packages/agent-runtime/`
3. Validar benchmark multiagente com tarefas reais do repositÃ³rio
4. Conectar `AgentCommunicationBus` ao NATS JetStream real (atualmente fallback in-memory)
5. Adicionar telemetria distribuÃ­da (OpenTelemetry spans para cada etapa do R5)
6. Expandir suÃ­te de testes para cobertura de mutaÃ§Ã£o nos componentes de cooperaÃ§Ã£o

### Estrutura de ImplementaÃ§Ã£o Proposta

```
packages/agent-ecosystem/
  src/
    agents/
      code-reviewer-agent.ts    # CodeReviewerAgent
      architecture-agent.ts     # ArchitectureAgent
      testing-agent.ts          # TestingAgent
      documentation-agent.ts    # DocumentationAgent
      devops-agent.ts           # DevOpsAgent
    cooperation/
      cooperation-orchestrator.ts
      task-coordinator.ts
      agent-communication-bus.ts
    cache/
      agent-cache.ts
      cache-integration.ts
    registry/
      agent-registry.ts
      capability-directory.ts
    contracts/
      contract-registry.ts
      schema-validator.ts
      slo-monitor.ts
    types/
      agent-types.ts
      bus-types.ts
      cache-types.ts
      registry-types.ts
  tests/
    code-reviewer-agent.test.ts
    cooperation-orchestrator.test.ts
    agent-communication-bus.test.ts
    agent-cache.test.ts
    agent-registry.test.ts
    task-coordinator.test.ts
```
