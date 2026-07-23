// Prompt Pipeline — IDEIA trata todo prompt do usuário antes de chegar na IA
// Pipeline completo: Classify → Enrich → Optimize → Guard → Plan → Execute
//
// Uso: ai-devkit prompt "quero um CRUD de usuários"
//       ai-devkit prompt --system "gere um sistema de billing"
//       ai-devkit prompt --plan-only "refatore o módulo de auth"

import { ContextEngine } from './index';

interface GapSummary {
  total: number;
  resolved: number;
  critical: number;
  high: number;
}

interface PackageInfo {
  name: string;
  path: string;
  version: string;
  hasTests: boolean;
  linesOfCode: number;
  description: string;
  deps: string[];
}

interface ProjectMetadata {
  packages: number;
  lastAudit: string;
  docsCount: number;
}

interface UserPrompt {
  raw: string;
  system?: string;
  files?: string[];
  language?: string;
}

export interface ProcessedPrompt {
  original: string;
  intent: IntentClassification;
  enriched: string;
  optimized: string;
  tokenCount: number;
  originalTokens: number;
  savings: number;
  guardResult: GuardResult;
  plan?: TaskPlan;
  contextInjected: string[];
  metadata: PromptMetadata;
}

interface IntentClassification {
  category: 'bugfix' | 'feature' | 'refactor' | 'question' | 'documentation' | 'devops' | 'test' | 'review' | 'unknown';
  scope: 'single_file' | 'multi_file' | 'module' | 'cross_module' | 'project';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  language?: string;
  confidence: number;
}

interface GuardResult {
  passed: boolean;
  blocked: boolean;
  sanitized: boolean;
  warnings: string[];
  violations: string[];
}

interface TaskPlan {
  steps: TaskStep[];
  estimatedTokens: number;
  parallelizable: boolean;
}

interface TaskStep {
  id: string;
  description: string;
  action: 'read' | 'write' | 'search' | 'analyze' | 'generate' | 'test' | 'review' | 'deploy';
  target?: string;
  dependsOn: string[];
  estimatedTokens: number;
}

interface PromptMetadata {
  processedAt: string;
  processingTimeMs: number;
  intentModel: 'regex' | 'llm';
  enrichmentSources: string[];
  guardVersion: string;
}

// ===================== INTENT CLASSIFIER =====================

const INTENT_PATTERNS: Array<{ pattern: RegExp; category: IntentClassification['category']; confidence: number }> = [
  { pattern: /\b(criar|crie|novo?|nova|implementar|crie|desenvolva|adicione|adicionar|gerar|gere)\b/i, category: 'feature', confidence: 0.7 },
  { pattern: /\b(corrigir|corrija|arrumar|arrume|bug|erro|error|falha|quebrado|não funciona|fail|fix|issue)\b/i, category: 'bugfix', confidence: 0.8 },
  { pattern: /\b(refatorar|refatore|melhorar|melhore|otimizar|otimize|simplificar|simplifique|clean|refactor|improve)\b/i, category: 'refactor', confidence: 0.75 },
  { pattern: /\b(como|o que é|explique|explique|entender|dúvida|pergunta|qual a diferença|how|what|why|explain|question)\b/i, category: 'question', confidence: 0.85 },
  { pattern: /\b(documentar|documente|doc|docs|readme|comentário|comentario|jsdoc|escreva sobre)\b/i, category: 'documentation', confidence: 0.8 },
  { pattern: /\b(deploy|ci|cd|gitops|docker|kubernetes|infra|terraform|pipeline|release|publicar)\b/i, category: 'devops', confidence: 0.75 },
  { pattern: /\b(testar|teste|test|spec|jest|tdd|cobertura|coverage|unitário|integração)\b/i, category: 'test', confidence: 0.8 },
  { pattern: /\b(revisar|revise|review|code review|pr|merge|aprovar|aprova)\b/i, category: 'review', confidence: 0.75 },
];

const SCOPE_PATTERNS: Array<{ pattern: RegExp; scope: IntentClassification['scope']; confidence: number }> = [
  { pattern: /\b(arquivo?|file|função|funcao|método|metodo|classe)\b/i, scope: 'single_file', confidence: 0.8 },
  { pattern: /\b(módulo|modulo|pacote|service|controller|componente|pasta|diretorio)\b/i, scope: 'module', confidence: 0.7 },
  { pattern: /\b(sistema|projeto|app|aplicação|completo|todo|inteiro|full stack)\b/i, scope: 'project', confidence: 0.85 },
  { pattern: /\b(integração|integracao|entre módulos|entre modulos|cross|end-to-end|e2e)\b/i, scope: 'cross_module', confidence: 0.7 },
];

const URGENCY_PATTERNS: Array<{ pattern: RegExp; urgency: IntentClassification['urgency']; confidence: number }> = [
  { pattern: /\b(urgente|crítico|critico|bloqueado|produção|produçao|imediato|ASAP|emergência|emergencia)\b/i, urgency: 'critical', confidence: 0.9 },
  { pattern: /\b(importante|prioridade|alto|logo|hoje|asap|depressa|rapido)\b/i, urgency: 'high', confidence: 0.7 },
  { pattern: /\b(quando der|sem pressa|sprint|backlog|algum dia|eventualmente)\b/i, urgency: 'low', confidence: 0.7 },
];

export class IntentClassifier {
  classify(prompt: string): IntentClassification {
    let category: IntentClassification['category'] = 'unknown';
    let scope: IntentClassification['scope'] = 'single_file';
    let urgency: IntentClassification['urgency'] = 'medium';
    let confidence = 0.5;

    for (const p of INTENT_PATTERNS) {
      if (p.pattern.test(prompt) && p.confidence > confidence) {
        category = p.category;
        confidence = p.confidence;
      }
    }

    for (const p of SCOPE_PATTERNS) {
      if (p.pattern.test(prompt) && p.confidence > 0.5) {
        scope = p.scope;
      }
    }

    for (const p of URGENCY_PATTERNS) {
      if (p.pattern.test(prompt) && p.confidence > 0.5) {
        urgency = p.urgency;
      }
    }

    return { category, scope, urgency, confidence, language: this.detectLanguage(prompt) };
  }

  private detectLanguage(prompt: string): string | undefined {
    const langMap: Record<string, RegExp> = {
      ts: /\b(typescript|\.ts|tsx|angular|nestjs|typeorm)\b/i,
      js: /\b(javascript|\.js|node|react|express)\b/i,
      python: /\b(python|django|flask|fastapi|pandas|numpy)\b/i,
      java: /\b(java|spring|jvm|kotlin|maven)\b/i,
      go: /\b(go|golang|gin|fiber)\b/i,
      rust: /\b(rust|cargo|tokio|actix)\b/i,
      csharp: /\b(c#|csharp|dotnet|asp\.net|\.net)\b/i,
      php: /\b(php|laravel|symfony)\b/i,
    };
    for (const [lang, pattern] of Object.entries(langMap)) {
      if (pattern.test(prompt)) return lang;
    }
    return undefined;
  }
}

// ===================== CONTEXT INJECTOR =====================

export class ContextInjector {
  constructor(private engine: ContextEngine) {}

  inject(prompt: string, intent: IntentClassification): { enriched: string; sources: string[] } {
    const sources: string[] = [];
    let enriched = prompt;

    const ctx = this.engine.getContext({ metadata: true, packages: true, gaps: true });

    const gapSummary = ctx.gaps as GapSummary | undefined;
    if (intent.category === 'bugfix' && gapSummary) {
      if (gapSummary.critical > 0) {
        enriched = `[CRITICAL GAPS: ${gapSummary.critical} open — resolve them first if related]\n${enriched}`;
      }
      enriched = `[GAPS: ${gapSummary.resolved}/${gapSummary.total} resolved]\n${enriched}`;
      sources.push('gaps');
    }

    const pkgs = ctx.packages as PackageInfo[] | undefined;
    if (intent.category === 'feature' && pkgs) {
      const relevant = pkgs.filter(p => intent.language && p.name.includes(intent.language));
      if (relevant.length > 0) {
        enriched = `[RELEVANT PACKAGES: ${relevant.map(p => p.name).join(', ')}]\n${enriched}`;
        sources.push('packages');
      }
    }

    const metadata = ctx.metadata as ProjectMetadata | undefined;
    if (intent.scope === 'project') {
      enriched = `[PROJECT: IDEIA — ${String((ctx as { project?: string }).project || 'IDEIA')}]\n[PACKAGES: ${metadata?.packages || '?'} total]\n${enriched}`;
      sources.push('metadata');
    }

    return { enriched, sources };
  }
}

// ===================== PROMPT OPTIMIZER =====================

export class PromptOptimizer {
  optimize(prompt: string): { optimized: string; originalTokens: number; optimizedTokens: number } {
    const originalTokens = this.estimateTokens(prompt);
    let optimized = prompt;

    // Remove greetings
    optimized = optimized.replace(/^(olá|oi|hello|hi|bom dia|boa tarde|boa noite|hey|e aí)[\s,!.]*/i, '').trim();

    // Remove polite endings
    optimized = optimized.replace(/\s*(por favor|obrigado|thanks|please|valeu|abraços|att)[\s.!]*$/i, '').trim();

    // Remove redundant markers
    optimized = optimized.replace(/^(eu preciso de|eu quero|preciso que você|gostaria de|pode|poderia)\s+/i, '').trim();

    // Normalize whitespace
    optimized = optimized.replace(/\s+/g, ' ').trim();

    const optimizedTokens = this.estimateTokens(optimized);
    return { optimized, originalTokens, optimizedTokens };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

// ===================== GUARDRAILS =====================

const BLOCKED_PATTERNS = [
  /ignore (all|previous|above|below).*(instructions|prompt|commands)/i,
  /you are (now|from now on)/i,
  /act as/i,
  /system\s*(instruction|prompt|message)/i,
  /forget (all|everything|previous)/i,
  /DAN|jailbreak|bypass/i,
];

const DANGEROUS_PATTERNS = [
  /delete (all|everything|entire|database|production)/i,
  /rm\s+-rf\s+\//i,
  /DROP\s+(TABLE|DATABASE)/i,
  /format\s+(disk|drive|hd|ssd)/i,
  /ALTER\s+TABLE.*DROP/i,
];

export class PromptGuard {
  check(prompt: string): GuardResult {
    const warnings: string[] = [];
    const violations: string[] = [];
    let blocked = false;
    let sanitized = false;

    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(prompt)) {
        violations.push(`Prompt injection detected: ${pattern}`);
        blocked = true;
      }
    }

    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(prompt)) {
        warnings.push(`Potentially dangerous operation: ${pattern}`);
        sanitized = true;
      }
    }

    if (prompt.length < 3) {
      warnings.push('Prompt too short — may lack context');
    }

    if (prompt.length > 10000) {
      warnings.push('Prompt very long — consider breaking into sub-tasks');
    }

    return {
      passed: !blocked && !sanitized,
      blocked,
      sanitized,
      warnings,
      violations,
    };
  }
}

// ===================== TASK PLANNER =====================

export class TaskPlanner {
  plan(prompt: string, intent: IntentClassification): TaskPlan {
    const steps: TaskStep[] = [];
    let id = 1;

    switch (intent.category) {
      case 'bugfix':
        steps.push({ id: `s${id++}`, description: 'Search for relevant code', action: 'search', target: '.', dependsOn: [], estimatedTokens: 50 });
        steps.push({ id: `s${id++}`, description: 'Read and analyze the bug', action: 'analyze', dependsOn: ['s1'], estimatedTokens: 200 });
        steps.push({ id: `s${id++}`, description: 'Implement fix', action: 'write', dependsOn: ['s2'], estimatedTokens: 500 });
        steps.push({ id: `s${id++}`, description: 'Run tests to verify', action: 'test', dependsOn: ['s3'], estimatedTokens: 100 });
        break;
      case 'feature':
        steps.push({ id: `s${id++}`, description: 'Analyze requirements', action: 'analyze', dependsOn: [], estimatedTokens: 200 });
        steps.push({ id: `s${id++}`, description: 'Read existing architecture', action: 'read', dependsOn: ['s1'], estimatedTokens: 300 });
        steps.push({ id: `s${id++}`, description: 'Generate implementation', action: 'generate', dependsOn: ['s2'], estimatedTokens: 1000 });
        steps.push({ id: `s${id++}`, description: 'Review generated code', action: 'review', dependsOn: ['s3'], estimatedTokens: 200 });
        steps.push({ id: `s${id++}`, description: 'Run verification', action: 'test', dependsOn: ['s4'], estimatedTokens: 100 });
        break;
      case 'refactor':
        steps.push({ id: `s${id++}`, description: 'Read current implementation', action: 'read', dependsOn: [], estimatedTokens: 300 });
        steps.push({ id: `s${id++}`, description: 'Analyze improvement opportunities', action: 'analyze', dependsOn: ['s1'], estimatedTokens: 200 });
        steps.push({ id: `s${id++}`, description: 'Apply refactoring', action: 'write', dependsOn: ['s2'], estimatedTokens: 600 });
        steps.push({ id: `s${id++}`, description: 'Verify no regressions', action: 'test', dependsOn: ['s3'], estimatedTokens: 100 });
        break;
      default:
        steps.push({ id: `s${id++}`, description: 'Analyze request', action: 'analyze', dependsOn: [], estimatedTokens: 100 });
        steps.push({ id: `s${id++}`, description: 'Execute task', action: 'generate', dependsOn: ['s1'], estimatedTokens: 500 });
    }

    const totalTokens = steps.reduce((sum, s) => sum + s.estimatedTokens, 0);
    return { steps, estimatedTokens: totalTokens, parallelizable: intent.scope === 'cross_module' };
  }
}

// ===================== MAIN PIPELINE =====================

export class PromptPipeline {
  private classifier = new IntentClassifier();
  private injector: ContextInjector;
  private optimizer = new PromptOptimizer();
  private guard = new PromptGuard();
  private planner = new TaskPlanner();

  constructor(engine: ContextEngine) {
    this.injector = new ContextInjector(engine);
  }

  process(userPrompt: UserPrompt): ProcessedPrompt {
    const start = Date.now();
    const prompt = userPrompt.system ? `${userPrompt.system}\n\n${userPrompt.raw}` : userPrompt.raw;

    // Step 1: Guard — verifica segurança antes de tudo
    const guardResult = this.guard.check(prompt);
    if (guardResult.blocked) {
      return {
        original: prompt,
        intent: { category: 'unknown', scope: 'single_file', urgency: 'low', confidence: 0 },
        enriched: prompt,
        optimized: prompt,
        tokenCount: 0,
        originalTokens: 0,
        savings: 0,
        guardResult,
        contextInjected: [],
        metadata: { processedAt: new Date().toISOString(), processingTimeMs: Date.now() - start, intentModel: 'regex', enrichmentSources: [], guardVersion: '1.0' },
      };
    }

    // Step 2: Classify — entende a intenção
    const intent = this.classifier.classify(prompt);

    // Step 3: Enrich — injeta contexto relevante
    const { enriched, sources } = this.injector.inject(prompt, intent);

    // Step 4: Optimize — reduz tokens mantendo sentido
    const { optimized, originalTokens, optimizedTokens } = this.optimizer.optimize(enriched);

    // Step 5: Plan — quebra em passos executáveis
    const plan = this.planner.plan(prompt, intent);

    return {
      original: prompt,
      intent,
      enriched,
      optimized,
      tokenCount: optimizedTokens,
      originalTokens,
      savings: Math.round((1 - optimizedTokens / Math.max(originalTokens, 1)) * 100),
      guardResult,
      plan,
      contextInjected: sources,
      metadata: {
        processedAt: new Date().toISOString(),
        processingTimeMs: Date.now() - start,
        intentModel: 'regex',
        enrichmentSources: sources,
        guardVersion: '1.0',
      },
    };
  }

  processAndFormat(userPrompt: UserPrompt, format: 'json' | 'markdown' | 'compact' = 'compact'): string {
    const result = this.process(userPrompt);

    if (format === 'json') return JSON.stringify(result, null, 2);
    if (format === 'markdown') {
      return [
        `## Prompt Analysis`,
        ``,
        `**Intent:** ${result.intent.category} (${result.intent.confidence * 100}%)`,
        `**Scope:** ${result.intent.scope}`,
        `**Urgency:** ${result.intent.urgency}`,
        `**Tokens saved:** ${result.savings}% (${result.originalTokens} → ${result.tokenCount})`,
        ``,
        `### Optimized Prompt`,
        `\`\`\``,
        result.optimized,
        `\`\`\``,
        ``,
        `### Plan`,
        result.plan ? result.plan.steps.map(s => `- [${s.action}] ${s.description}`).join('\n') : 'No plan generated',
        ``,
        result.guardResult.warnings.length > 0 ? `### Warnings\n${result.guardResult.warnings.join('\n')}` : '',
      ].filter(Boolean).join('\n');
    }

    // Compact format — for AI consumption (low token)
    return `${result.intent.category}|${result.intent.scope}|urg=${result.intent.urgency}\n${result.optimized}`;
  }
}

// ===================== PLAN EXECUTOR =====================

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface ExecutionStep {
  id: string;
  description: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: unknown;
}

export class PlanExecutor {
  private steps: ExecutionStep[] = [];
  private cancelled = false;
  private startedAt: string | null = null;

  constructor(plan: TaskPlan) {
    this.steps = plan.steps.map(s => ({
      id: s.id,
      description: s.description,
      status: 'pending' as StepStatus,
    }));
  }

  async execute(stepHandler: (step: TaskStep) => Promise<unknown>): Promise<ExecutionStep[]> {
    if (this.startedAt) throw new Error('Execution already started');
    this.startedAt = new Date().toISOString();
    this.cancelled = false;

    const stepMap = new Map(this.steps.map(s => [s.id, s]));
    const planSteps = this.steps;

    for (const step of planSteps) {
      if (this.cancelled) {
        step.status = 'skipped';
        continue;
      }

      const planStep = planSteps.find(s => s.id === step.id) as TaskStep;

      // Check dependencies
      const deps = planStep.dependsOn || [];
      const allDepsCompleted = deps.every(d => {
        const depStep = stepMap.get(d);
        return depStep && depStep.status === 'completed';
      });

      if (!allDepsCompleted) {
        step.status = 'skipped';
        step.error = 'Dependencies not met';
        continue;
      }

      step.status = 'running';
      step.startedAt = new Date().toISOString();

      try {
        const result = await stepHandler(planStep);
        step.status = 'completed';
        step.completedAt = new Date().toISOString();
        step.result = result;
      } catch (_e) {
        step.status = 'failed';
        step.completedAt = new Date().toISOString();
        step.error = e instanceof Error ? e.message : String(e);
      }
    }

    return this.steps;
  }

  getExecutionStatus(): {
    total: number;
    completed: number;
    failed: number;
    running: number;
    pending: number;
    skipped: number;
    progress: number;
    startedAt: string | null;
  } {
    const total = this.steps.length;
    const completed = this.steps.filter(s => s.status === 'completed').length;
    const failed = this.steps.filter(s => s.status === 'failed').length;
    const running = this.steps.filter(s => s.status === 'running').length;
    const pending = this.steps.filter(s => s.status === 'pending').length;
    const skipped = this.steps.filter(s => s.status === 'skipped').length;
    const progress = total > 0 ? Math.round(((completed + failed + skipped) / total) * 100) : 0;

    return { total, completed, failed, running, pending, skipped, progress, startedAt: this.startedAt };
  }

  cancelExecution(): void {
    this.cancelled = true;
  }

  getSteps(): ExecutionStep[] {
    return [...this.steps];
  }

  isRunning(): boolean {
    return this.steps.some(s => s.status === 'running');
  }

  isComplete(): boolean {
    return this.steps.every(s => s.status === 'completed' || s.status === 'failed' || s.status === 'skipped');
  }
}
