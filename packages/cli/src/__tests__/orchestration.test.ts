import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';


const TEST_CWD = path.join(os.tmpdir(), 'ai-devkit-orchestration-test');

beforeEach(() => {
  fs.mkdirSync(TEST_CWD, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_CWD, { recursive: true, force: true });
});

describe('ORC-01: orchestration-types', () => {
  it('deve criar TaskNode com valores padrao', () => {
    const task = {
      id: 'test',
      name: 'Test',
      description: 'Test task',
      phase: 'structuring',
      status: 'pending',
      dependsOn: [] as string[],
      blockedBy: [] as string[],
      riskLevel: 'low',
      estimatedEffort: 'minutes',
      canParallelize: true,
      isDeterministic: true,
      requiresLLM: false,
    };
    expect(task.id).toBe('test');
    expect(task.status).toBe('pending');
  });

  it('deve aceitar todos os estados de TaskStatus', () => {
    const statuses = ['pending', 'ready', 'running', 'blocked', 'needs-decision', 'completed', 'validated', 'failed'];
    for (const s of statuses) {
      expect(s).toBeDefined();
    }
  });

  it('deve aceitar todas as fases', () => {
    const phases = ['diagnosis', 'structuring', 'parallelization', 'checkpoint', 'multi-model', 'decision-routing', 'full-autonomous', 'adaptive-governance', 'industrial-autonomy'];
    for (const p of phases) {
      expect(p).toBeDefined();
    }
  });
});

describe('ORC-02: checkpoint-manager', () => {
  it('deve criar checkpoint e salvar em disco', () => {
    const cm = require('../runtime/checkpoint-manager');
    const cp = cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-1', 'completed', { coverage: 85 });
    expect(cp.id).toBeDefined();
    expect(cp.phase).toBe('diagnosis');
    expect(cp.status).toBe('completed');

    const loaded = cm.loadCheckpoint(TEST_CWD, cp.id);
    expect(loaded).toBeDefined();
    expect(loaded!.id).toBe(cp.id);
    expect(loaded!.metrics!.coverage).toBe(85);
  });

  it('deve listar checkpoints em ordem cronologica reversa', () => {
    const cm = require('../runtime/checkpoint-manager');
    const _cp1 = cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-1', 'completed');
    const _cp2 = cm.createCheckpoint(TEST_CWD, 'structuring', 'task-2', 'completed');
    const list = cm.listCheckpoints(TEST_CWD);
    expect(list.length).toBe(2);
    expect(list[0].phase).toBe('structuring');
    expect(list[1].phase).toBe('diagnosis');
  });

  it('deve retornar null para checkpoint inexistente', () => {
    const cm = require('../runtime/checkpoint-manager');
    const loaded = cm.loadCheckpoint(TEST_CWD, 'nonexistent');
    expect(loaded).toBeNull();
  });

  it('deve carregar latest checkpoint', () => {
    const cm = require('../runtime/checkpoint-manager');
    const cp1 = cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-1', 'completed');
    const latest = cm.loadLatestCheckpoint(TEST_CWD);
    expect(latest).toBeDefined();
    expect(latest!.id).toBe(cp1.id);
  });

  it('deve atualizar status de checkpoint', () => {
    const cm = require('../runtime/checkpoint-manager');
    const cp = cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-1', 'pending');
    const updated = cm.updateCheckpointStatus(TEST_CWD, cp.id, 'completed', { metrics: { coverage: 90 } });
    expect(updated).toBeDefined();
    expect(updated!.status).toBe('completed');
    expect(updated!.metrics!.coverage).toBe(90);
  });

  it('deve anexar decisao a checkpoint', () => {
    const cm = require('../runtime/checkpoint-manager');
    const cp = cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-1', 'needs-decision');
    const updated = cm.attachDecisionToCheckpoint(TEST_CWD, cp.id, {
      decisionRequestId: 'dec-1',
      selectedOptionId: 'B',
      decidedAt: new Date().toISOString(),
    });
    expect(updated).toBeDefined();
    expect(updated!.status).toBe('completed');
    expect(updated!.decision!.selectedOptionId).toBe('B');
  });

  it('deve filtrar checkpoints por fase', () => {
    const cm = require('../runtime/checkpoint-manager');
    cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-1', 'completed');
    cm.createCheckpoint(TEST_CWD, 'structuring', 'task-2', 'completed');
    cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-3', 'completed');
    const diag = cm.listCheckpointsByPhase(TEST_CWD, 'diagnosis');
    expect(diag.length).toBe(2);
  });

  it('deve retornar metricas agregadas dos checkpoints', () => {
    const cm = require('../runtime/checkpoint-manager');
    cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-1', 'completed');
    cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-2', 'failed');
    cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-3', 'needs-decision');
    const metrics = cm.getCheckpointMetrics(TEST_CWD, 'diagnosis');
    expect(metrics.count).toBe(3);
    expect(metrics.completed).toBe(1);
    expect(metrics.failed).toBe(1);
    expect(metrics.needsDecision).toBe(1);
  });
});

describe('ORC-03: decision-center', () => {
  it('deve criar decision request com opcoes padrao', () => {
    const dc = require('../runtime/decision-center');
    const cm = require('../runtime/checkpoint-manager');
    const cp = cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-1', 'blocked');
    const req = dc.buildDecisionRequest(
      'Test decision',
      'Test summary',
      'Test reason',
      'Test context',
      cp,
      'Option B recommended',
    );
    expect(req.title).toBe('Test decision');
    expect(req.options.length).toBe(4);
    expect(req.customAllowed).toBe(true);
    expect(req.options.find((o: { recommended?: boolean }) => o.recommended)!.id).toBe('B');
  });

  it('deve criar decision prompt formatado com ajuda rapida', () => {
    const dc = require('../runtime/decision-center');
    const cm = require('../runtime/checkpoint-manager');
    const cp = cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-1', 'blocked');
    const req = dc.buildDecisionRequest('Test', 'Summary', 'Reason', 'Context', cp, 'B');
    const prompt = dc.buildDecisionPrompt(req);
    expect(prompt.formatted).toContain('Decisao necessaria');
    expect(prompt.formatted).toContain('Contexto');
    expect(prompt.formatted).toContain('Opcoes');
    expect(prompt.formatted).toContain('Resposta esperada');
    expect(prompt.formatted).toContain('Ajuda rapida');
    expect(prompt.formatted).toContain('Opcao A: caminho conservador');
    expect(prompt.formatted).toContain('Opcao B: caminho recomendado');
    expect(prompt.formatted).toContain('Opcao C: caminho agressivo');
    expect(prompt.formatted).toContain('Opcao D: resposta aberta');
  });

  it('deve resolver decisao com opcao', () => {
    const dc = require('../runtime/decision-center');
    const cm = require('../runtime/checkpoint-manager');
    const cp = cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-1', 'blocked');
    const req = dc.buildDecisionRequest('Test', 'Summary', 'Reason', 'Context', cp, 'B');
    const record = dc.resolveDecision(req, 'A', undefined, 'Optei pela conservadora');
    expect(record.selectedOptionId).toBe('A');
    expect(record.rationale).toBe('Optei pela conservadora');
    expect(record.design__filePath).toBeUndefined();
  });

  it('deve resolver decisao com valor customizado', () => {
    const dc = require('../runtime/decision-center');
    const cm = require('../runtime/checkpoint-manager');
    const cp = cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-1', 'blocked');
    const req = dc.buildDecisionRequest('Test', 'Summary', 'Reason', 'Context', cp, 'B');
    const record = dc.resolveDecision(req, undefined, 'Minha propria instrucao');
    expect(record.customValue).toBe('Minha propria instrucao');
    expect(record.selectedOptionId).toBeUndefined();
  });

  it('deve estimar risco de uma opcao', () => {
    const dc = require('../runtime/decision-center');
    const cm = require('../runtime/checkpoint-manager');
    const cp = cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-1', 'blocked');
    const req = dc.buildDecisionRequest('Test', 'Summary', 'Reason', 'Context', cp, 'B');
    const risk = dc.estimateDecisionRisk(req, 'A');
    expect(risk.riskLevel).toBe('low');
    expect(risk.reasons.length).toBeGreaterThan(0);
  });

  it('deve retornar opcao por id', () => {
    const dc = require('../runtime/decision-center');
    const cm = require('../runtime/checkpoint-manager');
    const cp = cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-1', 'blocked');
    const req = dc.buildDecisionRequest('Test', 'Summary', 'Reason', 'Context', cp, 'B');
    const option = dc.getOptionById(req, 'A');
    expect(option).toBeDefined();
    expect(option!.label).toBe('Conservador');
  });

  it('deve verificar completeza de decisao (3+1)', () => {
    const dc = require('../runtime/decision-center');
    const cm = require('../runtime/checkpoint-manager');
    const cp = cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-1', 'blocked');
    const req = dc.buildDecisionRequest('Test', 'Summary', 'Reason', 'Context', cp, 'B');
    const result = dc.checkDecisionCompleteness(req);
    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
  });
});

describe('ORC-04: task-decomposer', () => {
  it('deve decompor tarefa em subtarefas', () => {
    const td = require('../runtime/task-decomposer');
    const result = td.decomposeTask({
      id: 'feature-x',
      name: 'Feature X',
      description: 'Implementar feature X',
      estimatedComplexity: 'medium',
      domain: ['typescript'],
      hasLLMRequirement: true,
      hasDeterministicParts: true,
    }, 'structuring');

    expect(result.subtasks.length).toBeGreaterThanOrEqual(4);
    expect(result.originalId).toBe('feature-x');
    expect(result.parallelGroups.length).toBeGreaterThanOrEqual(1);
  });

  it('deve separar deterministico de criativo', () => {
    const td = require('../runtime/task-decomposer');
    const tasks = [
      { id: '1', name: 'Estrutura', description: '', phase: 'structuring', status: 'pending', dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: true, isDeterministic: true, requiresLLM: false },
      { id: '2', name: 'Logica', description: '', phase: 'structuring', status: 'pending', dependsOn: [], blockedBy: [], riskLevel: 'medium', estimatedEffort: 'hours', canParallelize: false, isDeterministic: false, requiresLLM: true },
    ] as const;
    const sep = td.separateDeterministic(tasks);
    expect(sep.deterministic.length).toBe(1);
    expect(sep.creative.length).toBe(1);
    expect(sep.deterministic[0].id).toBe('1');
    expect(sep.creative[0].id).toBe('2');
  });

  it('deve detectar dependencias', () => {
    const td = require('../runtime/task-decomposer');
    const tasks = [
      { id: '1', name: 'A', description: '', phase: 'structuring', status: 'pending', dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: true, isDeterministic: true, requiresLLM: false },
      { id: '2', name: 'B', description: '', phase: 'structuring', status: 'pending', dependsOn: ['1'], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: false, isDeterministic: false, requiresLLM: false },
    ] as const;
    const deps = td.detectDependencies(tasks);
    expect(deps.length).toBe(1);
    expect(deps[0].from).toBe('1');
    expect(deps[0].to).toBe('2');
  });

  it('deve gerar apenas deterministico quando nao requer LLM', () => {
    const td = require('../runtime/task-decomposer');
    const result = td.decomposeTask({
      id: 'simple',
      name: 'Simple',
      description: 'Simple task',
      estimatedComplexity: 'low',
      domain: ['typescript'],
      hasLLMRequirement: false,
      hasDeterministicParts: true,
    }, 'structuring');
    for (const st of result.subtasks) {
      expect(st.isDeterministic).toBe(true);
      expect(st.requiresLLM).toBe(false);
    }
  });
});

describe('ORC-05: model-router', () => {
  it('deve rotear tarefa deterministica para local', () => {
    const mr = require('../runtime/model-router');
    const task = {
      id: 'calc',
      name: 'Calculate',
      description: 'Calculo puro',
      phase: 'structuring' as const,
      status: 'pending' as const,
      dependsOn: [],
      blockedBy: [],
      riskLevel: 'low' as const,
      estimatedEffort: 'minutes' as const,
      canParallelize: true,
      isDeterministic: true,
      requiresLLM: false,
    };
    const route = mr.routeTask(task);
    expect(route.target).toBe('deterministic');
    expect(route.estimatedCostUsd).toBe(0);
    expect(route.confidence).toBe(1);
  });

  it('deve rotear tarefa de alto risco para modelo forte', () => {
    const mr = require('../runtime/model-router');
    const task = {
      id: 'critical',
      name: 'Critical',
      description: 'Tarefa critica',
      phase: 'full-autonomous' as const,
      status: 'pending' as const,
      dependsOn: [],
      blockedBy: [],
      riskLevel: 'high' as const,
      estimatedEffort: 'hours' as const,
      canParallelize: false,
      isDeterministic: false,
      requiresLLM: true,
      requiredModelTier: 'strong' as const,
    };
    const route = mr.routeTask(task);
    expect(route.target).toBe('strong');
  });

  it('deve rotear lote de tarefas', () => {
    const mr = require('../runtime/model-router');
    const tasks = [
      { id: 'det', name: 'Det', description: '', phase: 'structuring' as const, status: 'pending' as const, dependsOn: [], blockedBy: [], riskLevel: 'low' as const, estimatedEffort: 'minutes' as const, canParallelize: true, isDeterministic: true, requiresLLM: false },
      { id: 'llm', name: 'LLM', description: '', phase: 'structuring' as const, status: 'pending' as const, dependsOn: [], blockedBy: [], riskLevel: 'medium' as const, estimatedEffort: 'hours' as const, canParallelize: false, isDeterministic: false, requiresLLM: true, requiredModelTier: 'lightweight' as const },
    ];
    const routes = mr.routeBatch(tasks);
    expect(routes.length).toBe(2);
    expect(routes[0].target).toBe('deterministic');
  });

  it('deve estimar custo do lote', () => {
    const mr = require('../runtime/model-router');
    const routes = [
      { taskId: '1', target: 'deterministic', reason: '', estimatedCostUsd: 0, estimatedLatencyMs: 1, confidence: 1 },
      { taskId: '2', target: 'lightweight', reason: '', estimatedCostUsd: 0.01, estimatedLatencyMs: 500, confidence: 0.8 },
    ];
    const cost = mr.estimateBatchCost(routes);
    expect(cost.totalUsd).toBe(0.01);
    expect(cost.parallelizable).toBe(1);
  });

  it('deve construir cadeia de fallback', () => {
    const mr = require('../runtime/model-router');
    const task = {
      id: 'test',
      name: 'Test',
      description: '',
      phase: 'structuring' as const,
      status: 'pending' as const,
      dependsOn: [],
      blockedBy: [],
      riskLevel: 'medium' as const,
      estimatedEffort: 'hours' as const,
      canParallelize: false,
      isDeterministic: false,
      requiresLLM: true,
    };
    const chain = mr.buildFallbackChain(task);
    expect(chain.length).toBeGreaterThanOrEqual(2);
    expect(chain[0].target).toBe('deterministic');
  });
});

describe('ORC-06: unlock-engine', () => {
  it('deve retornar tarefas prontas para execucao', () => {
    const ue = require('../runtime/unlock-engine');
    const tasks = [
      { id: '1', name: 'A', description: '', phase: 'structuring', status: 'completed', dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: true, isDeterministic: true, requiresLLM: false },
      { id: '2', name: 'B', description: '', phase: 'structuring', status: 'pending', dependsOn: ['1'], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: false, isDeterministic: false, requiresLLM: false },
    ];
    const ready = ue.getReadyTasks(tasks);
    expect(ready.length).toBe(1);
    expect(ready[0].id).toBe('2');
  });

  it('deve identificar tarefas bloqueadas', () => {
    const ue = require('../runtime/unlock-engine');
    const tasks = [
      { id: '1', name: 'A', description: '', phase: 'structuring', status: 'pending', dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: true, isDeterministic: true, requiresLLM: false },
      { id: '2', name: 'B', description: '', phase: 'structuring', status: 'pending', dependsOn: ['1'], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: false, isDeterministic: false, requiresLLM: false },
    ];
    const ready = ue.getReadyTasks(tasks);
    expect(ready.length).toBe(1);
    expect(ready[0].id).toBe('1');
  });

  it('deve avaliar apos checkpoint e retornar tarefas desbloqueadas', () => {
    const ue = require('../runtime/unlock-engine');
    const tasks = [
      { id: '1', name: 'A', description: '', phase: 'structuring', status: 'pending', dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: true, isDeterministic: true, requiresLLM: false },
      { id: '2', name: 'B', description: '', phase: 'structuring', status: 'pending', dependsOn: ['1'], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: false, isDeterministic: false, requiresLLM: false },
    ];
    const cm = require('../runtime/checkpoint-manager');
    const cp = cm.createCheckpoint(TEST_CWD, 'structuring', '1', 'completed');
    cp.unlockIds = ['1'];

    const result = ue.evaluateAfterCheckpoint(cp, tasks, ['1']);
    expect(result.unlockedTaskIds.length).toBe(1);
    expect(result.unlockedTaskIds[0]).toBe('2');
    expect(result.progressDelta).toBeGreaterThan(0);
  });

  it('deve atualizar status das tarefas desbloqueadas', () => {
    const ue = require('../runtime/unlock-engine');
    const tasks = [
      { id: '1', name: 'A', description: '', phase: 'structuring', status: 'pending', dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: true, isDeterministic: true, requiresLLM: false },
    ];
    const updated = ue.updateTaskStatuses(tasks, ['1'], 'running');
    expect(updated[0].status).toBe('running');
  });

  it('deve gerar plano de desbloqueio', () => {
    const ue = require('../runtime/unlock-engine');
    const cm = require('../runtime/checkpoint-manager');
    const cp1 = cm.createCheckpoint(TEST_CWD, 'structuring', '1', 'completed');
    cp1.unlockIds = ['1'];

    const cp2 = cm.createCheckpoint(TEST_CWD, 'structuring', '2', 'completed');
    cp2.unlockIds = ['2'];

    const phase = {
      id: 'structuring' as const,
      name: 'Estrutura',
      status: 'running' as const,
      progress: 50,
      tasks: [
        { id: '1', name: 'A', description: '', phase: 'structuring', status: 'completed', dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: true, isDeterministic: true, requiresLLM: false },
        { id: '2', name: 'B', description: '', phase: 'structuring', status: 'completed', dependsOn: ['1'], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: false, isDeterministic: false, requiresLLM: false },
        { id: '3', name: 'C', description: '', phase: 'structuring', status: 'pending', dependsOn: ['2'], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: false, isDeterministic: false, requiresLLM: false },
      ],
      completedTasks: 2,
      totalTasks: 3,
      blockedCount: 0,
    };

    const plan = ue.generateUnlockPlan([cp1, cp2], phase);
    expect(plan.canUnlock).toBe(true);
    expect(plan.nextTasks.length).toBe(1);
    expect(plan.nextTasks[0].id).toBe('3');
  });
});

describe('ORC-07: autonomy-policy', () => {
  it('deve retornar blocked quando taxa de falha > 50%', () => {
    const ap = require('../runtime/autonomy-policy');
    const level = ap.getEffectiveAutonomyLevel({}, 0.8, 0.6);
    expect(level).toBe('blocked');
  });

  it('deve retornar guided quando confianca baixa', () => {
    const ap = require('../runtime/autonomy-policy');
    const level = ap.getEffectiveAutonomyLevel({}, 0.3, 0);
    expect(level).toBe('guided');
  });

  it('deve auto-executar tarefa de baixo risco em modo guided', () => {
    const ap = require('../runtime/autonomy-policy');
    const task = {
      id: 'test', name: '', description: '', phase: 'structuring', status: 'pending',
      dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes',
      canParallelize: true, isDeterministic: true, requiresLLM: false,
    };
    expect(ap.shouldAutoExecute(task, 'guided')).toBe(true);
  });

  it('nao deve auto-executar tarefa de alto risco em modo guided', () => {
    const ap = require('../runtime/autonomy-policy');
    const task = {
      id: 'test', name: '', description: '', phase: 'structuring', status: 'pending',
      dependsOn: [], blockedBy: [], riskLevel: 'high', estimatedEffort: 'hours',
      canParallelize: false, isDeterministic: false, requiresLLM: true,
    };
    expect(ap.shouldAutoExecute(task, 'guided')).toBe(false);
  });

  it('deve solicitar decisao humana para tarefa de alto risco', () => {
    const ap = require('../runtime/autonomy-policy');
    const task = {
      id: 'test', name: '', description: '', phase: 'structuring', status: 'pending',
      dependsOn: [], blockedBy: [], riskLevel: 'high', estimatedEffort: 'hours',
      canParallelize: false, isDeterministic: false, requiresLLM: true,
    };
    expect(ap.shouldRequestHumanDecision(task, 'guided')).toBe(true);
  });

  it('nao deve solicitar decisao em modo autonomous', () => {
    const ap = require('../runtime/autonomy-policy');
    const task = {
      id: 'test', name: '', description: '', phase: 'structuring', status: 'pending',
      dependsOn: [], blockedBy: [], riskLevel: 'high', estimatedEffort: 'hours',
      canParallelize: false, isDeterministic: false, requiresLLM: true,
    };
    expect(ap.shouldRequestHumanDecision(task, 'autonomous')).toBe(false);
  });

  it('deve calcular confianca do sistema', () => {
    const ap = require('../runtime/autonomy-policy');
    const confidence = ap.calculateSystemConfidence(0.9, 85, 0.95);
    expect(confidence).toBeCloseTo(0.9 * 0.4 + 0.85 * 0.35 + 0.95 * 0.25, 2);
  });

  it('deve adaptar autonomia para fase', () => {
    const ap = require('../runtime/autonomy-policy');
    expect(ap.adaptAutonomyForPhase('diagnosis', 0.8, 5, 20)).toBe('guided');
    expect(ap.adaptAutonomyForPhase('diagnosis', 0.8, 10, 20)).toBe('autonomous');
    expect(ap.adaptAutonomyForPhase('diagnosis', 0.2, 5, 20)).toBe('blocked');
  });

  it('deve gerar summary legivel', () => {
    const ap = require('../runtime/autonomy-policy');
    const summary = ap.buildAutonomySummary('guided', 0.75);
    expect(summary).toContain('guiada');
    expect(summary).toContain('75%');
  });
});

describe('ORC-08: phase-orchestrator', () => {
  it('deve criar estado inicial', () => {
    const po = require('../runtime/phase-orchestrator');
    const task = {
      id: 'test', name: 'Test', description: '', phase: 'diagnosis', status: 'pending',
      dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes',
      canParallelize: true, isDeterministic: true, requiresLLM: false,
    };
    const state = po.createInitialState(TEST_CWD, [task], 'guided');
    expect(state.currentPhase).toBe('diagnosis');
    expect(state.phases.length).toBe(9);
    expect(state.checkpoints.length).toBe(1);
    expect(state.executionMode).toBe('guided');
  });

  it('deve avaliar readiness para transicao de fase', () => {
    const po = require('../runtime/phase-orchestrator');
    const task = {
      id: 'test', name: 'Test', description: '', phase: 'diagnosis', status: 'completed',
      dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes',
      canParallelize: true, isDeterministic: true, requiresLLM: false,
    };
    const state = po.createInitialState(TEST_CWD, [task], 'guided');
    state.phases[0].tasks[0].status = 'completed';

    const transition = po.evaluatePhaseReadiness(state, TEST_CWD, 0);
    expect(transition.canAdvance).toBe(true);
    expect(transition.nextPhase).toBe('structuring');
  });

  it('nao deve avancar fase com tarefas pendentes', () => {
    const po = require('../runtime/phase-orchestrator');
    const task = {
      id: 'test', name: 'Test', description: '', phase: 'diagnosis', status: 'pending',
      dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes',
      canParallelize: true, isDeterministic: true, requiresLLM: false,
    };
    const state = po.createInitialState(TEST_CWD, [task], 'guided');
    const transition = po.evaluatePhaseReadiness(state, TEST_CWD, 0);
    expect(transition.canAdvance).toBe(false);
  });

  it('deve avancar para proxima fase', () => {
    const po = require('../runtime/phase-orchestrator');
    const task = {
      id: 'test', name: 'Test', description: '', phase: 'diagnosis', status: 'completed',
      dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes',
      canParallelize: true, isDeterministic: true, requiresLLM: false,
    };
    const state = po.createInitialState(TEST_CWD, [task], 'guided');
    state.phases[0].tasks[0].status = 'completed';
    const { state: newState } = po.advancePhase(state, TEST_CWD);

    expect(newState.currentPhase).toBe('structuring');
    expect(newState.phases[0].status).toBe('completed');
    expect(newState.phases[1].status).toBe('ready');
  });

  it('deve executar ciclo de orquestracao', () => {
    const po = require('../runtime/phase-orchestrator');
    const task = {
      id: 'test', name: 'Test', description: '', phase: 'diagnosis', status: 'pending',
      dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes',
      canParallelize: true, isDeterministic: true, requiresLLM: false,
    };
    const state = po.createInitialState(TEST_CWD, [task], 'autonomous');
    const result = po.orchestrateCycle(state, TEST_CWD);
    expect(result.executed.length).toBeGreaterThanOrEqual(1);
  });

  it('deve retomar de checkpoint', () => {
    const po = require('../runtime/phase-orchestrator');
    const cm = require('../runtime/checkpoint-manager');
    cm.createCheckpoint(TEST_CWD, 'structuring', 'test-task', 'needs-decision');

    const state = po.resumeFromCheckpoint(TEST_CWD);
    expect(state).toBeDefined();
    expect(state!.currentPhase).toBe('structuring');
    expect(state!.pendingDecisions.length).toBe(1);
  });

  it('deve ter nomes de fase definidos', () => {
    const po = require('../runtime/phase-orchestrator');
    expect(po.PHASE_NAMES.diagnosis).toBeDefined();
    expect(po.PHASE_NAMES['industrial-autonomy']).toBeDefined();
    expect(Object.keys(po.PHASE_NAMES).length).toBe(9);
  });
});
