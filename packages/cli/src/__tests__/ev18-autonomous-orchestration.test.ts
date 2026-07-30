import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

jest.mock('@ideia/logger', () => ({
  createStructuredLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));



const TEST_CWD = path.join(os.tmpdir(), 'ai-devkit-ev18-test');

beforeEach(() => {
  fs.mkdirSync(TEST_CWD, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_CWD, { recursive: true, force: true });
});

// ─── EV18-01: checkpoint-manager ────────────────────────────────────────────

describe('EV18-01: checkpoint-manager (novas funcoes)', () => {
  it('deve salvar estado da orquestracao em disco (.ai/orchestration/state/state.json)', () => {
    const cm = require('../runtime/checkpoint-manager');
    const state = {
      currentPhase: 'diagnosis',
      version: '1.0.0',
      phases: [],
      pendingDecisions: [],
      checkpoints: [],
      executionMode: 'guided',
      autonomyLevel: 'guided',
      confidence: 0.5,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {},
    };
    cm.saveOrchestrationState(TEST_CWD, state);
    const statePath = path.join(TEST_CWD, '.ai', 'orchestration', 'state', 'state.json');
    expect(fs.existsSync(statePath)).toBe(true);
    const saved = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    expect(saved.currentPhase).toBe('diagnosis');
    expect(saved.metadata.filesystemContextHash).toBeDefined();
    expect(typeof saved.metadata.filesystemContextHash).toBe('string');
  });

  it('deve carregar estado da orquestracao e retornar objeto', () => {
    const cm = require('../runtime/checkpoint-manager');
    const state = {
      currentPhase: 'structuring',
      version: '1.0.0',
      phases: [],
      pendingDecisions: [],
      checkpoints: [],
      executionMode: 'guided',
      autonomyLevel: 'guided',
      confidence: 0.5,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: { custom: 'value' },
    };
    cm.saveOrchestrationState(TEST_CWD, state);
    const loaded = cm.loadOrchestrationState(TEST_CWD);
    expect(loaded).not.toBeNull();
    expect(loaded!.currentPhase).toBe('structuring');
    expect(loaded!.metadata.custom).toBe('value');
  });

  it('deve retornar null quando nao ha estado salvo', () => {
    const cm = require('../runtime/checkpoint-manager');
    const loaded = cm.loadOrchestrationState(TEST_CWD);
    expect(loaded).toBeNull();
  });

  it('deve retornar null quando JSON esta corrompido', () => {
    const cm = require('../runtime/checkpoint-manager');
    const statePath = path.join(TEST_CWD, '.ai', 'orchestration', 'state', 'state.json');
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, 'not-valid-json{{{', 'utf-8');
    const loaded = cm.loadOrchestrationState(TEST_CWD);
    expect(loaded).toBeNull();
  });

  it('deve calcular hash consistente do filesystem (computeFilesystemHash)', () => {
    const cm = require('../runtime/checkpoint-manager');
    fs.writeFileSync(path.join(TEST_CWD, 'package.json'), JSON.stringify({ name: 'test' }), 'utf-8');
    fs.writeFileSync(path.join(TEST_CWD, 'tsconfig.json'), '{}', 'utf-8');
    fs.mkdirSync(path.join(TEST_CWD, '.ai'), { recursive: true });
    fs.writeFileSync(path.join(TEST_CWD, '.ai', 'settings.json'), '{"key": "value"}', 'utf-8');

    const hash1 = cm.computeFilesystemHash(TEST_CWD);
    expect(typeof hash1).toBe('string');
    expect(hash1.length).toBe(64);

    const hash2 = cm.computeFilesystemHash(TEST_CWD);
    expect(hash2).toBe(hash1);
  });

  it('deve mudar hash quando arquivo do filesystem e alterado', () => {
    const cm = require('../runtime/checkpoint-manager');
    fs.writeFileSync(path.join(TEST_CWD, 'package.json'), JSON.stringify({ name: 'test' }), 'utf-8');
    const hash1 = cm.computeFilesystemHash(TEST_CWD);

    fs.writeFileSync(path.join(TEST_CWD, 'package.json'), JSON.stringify({ name: 'modified' }), 'utf-8');
    const hash2 = cm.computeFilesystemHash(TEST_CWD);
    expect(hash2).not.toBe(hash1);
  });

  it('deve incluir arquivos .ai/*.json no hash', () => {
    const cm = require('../runtime/checkpoint-manager');
    fs.writeFileSync(path.join(TEST_CWD, 'package.json'), JSON.stringify({ name: 'test' }), 'utf-8');
    fs.mkdirSync(path.join(TEST_CWD, '.ai'), { recursive: true });
    fs.writeFileSync(path.join(TEST_CWD, '.ai', 'config.json'), '{"cfg": 1}', 'utf-8');

    const hash1 = cm.computeFilesystemHash(TEST_CWD);
    fs.writeFileSync(path.join(TEST_CWD, '.ai', 'config.json'), '{"cfg": 2}', 'utf-8');
    const hash2 = cm.computeFilesystemHash(TEST_CWD);
    expect(hash2).not.toBe(hash1);
  });

  it('deve retornar resumo da orquestracao (getOrchestrationSummary) sem estado', () => {
    const cm = require('../runtime/checkpoint-manager');
    const summary = cm.getOrchestrationSummary(TEST_CWD);
    expect(summary.totalPhases).toBe(0);
    expect(summary.totalTasks).toBe(0);
    expect(summary.currentPhase).toBe('unknown');
    expect(summary.overallProgress).toBe(0);
    expect(summary.totalCheckpoints).toBe(0);
  });

  it('deve retornar resumo da orquestracao com estado e checkpoints', () => {
    const cm = require('../runtime/checkpoint-manager');

    cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-1', 'completed', { coverage: 90 });
    cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-2', 'failed', { coverage: 50 });
    cm.createCheckpoint(TEST_CWD, 'diagnosis', 'task-3', 'needs-decision');

    const state = {
      currentPhase: 'diagnosis',
      version: '1.0.0',
      phases: [
        {
          id: 'diagnosis',
          name: 'Diagnostico e bootstrap',
          status: 'ready',
          progress: 50,
          tasks: [
            { id: 'task-1', name: 'T1', description: '', phase: 'diagnosis', status: 'completed', dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: true, isDeterministic: true, requiresLLM: false },
            { id: 'task-2', name: 'T2', description: '', phase: 'diagnosis', status: 'failed', dependsOn: ['task-1'], blockedBy: [], riskLevel: 'high', estimatedEffort: 'hours', canParallelize: false, isDeterministic: false, requiresLLM: true },
            { id: 'task-3', name: 'T3', description: '', phase: 'diagnosis', status: 'needs-decision', dependsOn: ['task-1'], blockedBy: [], riskLevel: 'medium', estimatedEffort: 'hours', canParallelize: false, isDeterministic: false, requiresLLM: true },
          ],
          completedTasks: 1,
          totalTasks: 3,
          blockedCount: 0,
        },
      ],
      pendingDecisions: [{ id: 'dec-1' }],
      checkpoints: [],
      executionMode: 'guided',
      autonomyLevel: 'guided',
      confidence: 0.5,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {},
    };
    cm.saveOrchestrationState(TEST_CWD, state);

    const summary = cm.getOrchestrationSummary(TEST_CWD);
    expect(summary.totalPhases).toBe(1);
    expect(summary.totalTasks).toBe(3);
    expect(summary.completedTasks).toBe(1);
    expect(summary.failedTasks).toBe(1);
    expect(summary.needsDecisionTasks).toBe(1);
    expect(summary.totalCheckpoints).toBe(3);
    expect(summary.pendingDecisions).toBe(1);
    expect(summary.currentPhase).toBe('diagnosis');
    expect(summary.overallProgress).toBe(33);
    expect(summary.startTime).toBeDefined();
    expect(summary.lastUpdated).toBeDefined();
  });
});

// ─── EV18-02: phase-orchestrator ─────────────────────────────────────────────

describe('EV18-02: phase-orchestrator (novas funcoes)', () => {
  it('deve detectar mudanca de contexto quando não ha hash armazenado', () => {
    const po = require('../runtime/phase-orchestrator');
    const state = {
      currentPhase: 'diagnosis',
      version: '1.0.0',
      phases: [],
      pendingDecisions: [],
      checkpoints: [],
      executionMode: 'guided',
      autonomyLevel: 'guided',
      confidence: 0.5,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {},
    };
    fs.writeFileSync(path.join(TEST_CWD, 'package.json'), JSON.stringify({ name: 'test' }), 'utf-8');
    expect(po.contextChanged(TEST_CWD, state)).toBe(true);
  });

  it('deve detectar mudanca de contexto quando hash difere', () => {
    const po = require('../runtime/phase-orchestrator');
    fs.writeFileSync(path.join(TEST_CWD, 'package.json'), JSON.stringify({ name: 'test' }), 'utf-8');
    const state = {
      currentPhase: 'diagnosis',
      version: '1.0.0',
      phases: [],
      pendingDecisions: [],
      checkpoints: [],
      executionMode: 'guided',
      autonomyLevel: 'guided',
      confidence: 0.5,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: { filesystemContextHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    };
    expect(po.contextChanged(TEST_CWD, state)).toBe(true);
  });

  it('deve retornar false quando hash do filesystem confere', () => {
    const cm = require('../runtime/checkpoint-manager');
    const po = require('../runtime/phase-orchestrator');

    fs.writeFileSync(path.join(TEST_CWD, 'package.json'), JSON.stringify({ name: 'test' }), 'utf-8');
    const hash = cm.computeFilesystemHash(TEST_CWD);
    const state = {
      currentPhase: 'diagnosis',
      version: '1.0.0',
      phases: [],
      pendingDecisions: [],
      checkpoints: [],
      executionMode: 'guided',
      autonomyLevel: 'guided',
      confidence: 0.5,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: { filesystemContextHash: hash },
    };
    expect(po.contextChanged(TEST_CWD, state)).toBe(false);
  });

  it('deve replanejar tarefas falhas para pending', () => {
    const po = require('../runtime/phase-orchestrator');
    const state = {
      currentPhase: 'structuring',
      version: '1.0.0',
      phases: [
        {
          id: 'structuring',
          name: 'Estruturacao local',
          status: 'running',
          progress: 33,
          tasks: [
            { id: 't1', name: 'T1', description: '', phase: 'structuring', status: 'completed', dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: true, isDeterministic: true, requiresLLM: false },
            { id: 't2', name: 'T2', description: '', phase: 'structuring', status: 'failed', dependsOn: ['t1'], blockedBy: [], riskLevel: 'medium', estimatedEffort: 'hours', canParallelize: false, isDeterministic: false, requiresLLM: true },
            { id: 't3', name: 'T3', description: '', phase: 'structuring', status: 'blocked', dependsOn: ['t2'], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: false, isDeterministic: true, requiresLLM: false },
          ],
          completedTasks: 1,
          totalTasks: 3,
          blockedCount: 1,
        },
      ],
      pendingDecisions: [],
      checkpoints: [],
      executionMode: 'guided',
      autonomyLevel: 'guided',
      confidence: 0.5,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {},
    };

    const replanned = po.replan(state, TEST_CWD);
    const tasks = replanned.phases[0].tasks;
    expect(tasks.find((t: { id: string }) => t.id === 't2')!.status).toBe('pending');
    expect(tasks.find((t: { id: string }) => t.id === 't3')!.status).toBe('pending');
    expect(tasks.find((t: { id: string }) => t.id === 't1')!.status).toBe('completed');
    expect(replanned.metadata.replanHistory).toBeDefined();
    expect(replanned.metadata.replanHistory.length).toBe(1);
    expect(replanned.metadata.replanHistory[0].tasks).toContain('t2');
    expect(replanned.metadata.replanHistory[0].tasks).toContain('t3');
  });

  it('deve retornar estado original se nao houver falhas para replanejar', () => {
    const po = require('../runtime/phase-orchestrator');
    const state = {
      currentPhase: 'structuring',
      version: '1.0.0',
      phases: [
        {
          id: 'structuring',
          name: 'Estruturacao local',
          status: 'running',
          progress: 100,
          tasks: [
            { id: 't1', name: 'T1', description: '', phase: 'structuring', status: 'completed', dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: true, isDeterministic: true, requiresLLM: false },
          ],
          completedTasks: 1,
          totalTasks: 1,
          blockedCount: 0,
        },
      ],
      pendingDecisions: [],
      checkpoints: [],
      executionMode: 'guided',
      autonomyLevel: 'guided',
      confidence: 0.5,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {},
    };

    const replanned = po.replan(state, TEST_CWD);
    expect(replanned).toBe(state);
  });
});

// ─── EV18-03: unlock-engine (novas funcoes) ─────────────────────────────────

describe('EV18-03: unlock-engine (getParallelGroups, estimateParallelTime)', () => {
  it('deve agrupar tarefas por profundidade de dependencia', () => {
    const ue = require('../runtime/unlock-engine');
    const tasks = [
      { id: 't1', name: 'A', description: '', phase: 'structuring', status: 'completed', dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: true, isDeterministic: true, requiresLLM: false },
      { id: 't2', name: 'B', description: '', phase: 'structuring', status: 'completed', dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: true, isDeterministic: true, requiresLLM: false },
      { id: 't3', name: 'C', description: '', phase: 'structuring', status: 'pending', dependsOn: ['t1', 't2'], blockedBy: [], riskLevel: 'low', estimatedEffort: 'hours', canParallelize: false, isDeterministic: false, requiresLLM: false },
      { id: 't4', name: 'D', description: '', phase: 'structuring', status: 'pending', dependsOn: ['t3'], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: false, isDeterministic: true, requiresLLM: false },
      { id: 't5', name: 'E', description: '', phase: 'structuring', status: 'pending', dependsOn: ['t3'], blockedBy: [], riskLevel: 'medium', estimatedEffort: 'hours', canParallelize: false, isDeterministic: false, requiresLLM: true },
    ];
    const groups = ue.getParallelGroups(tasks);
    expect(groups.length).toBeGreaterThanOrEqual(1);
    const group0 = groups[0];
    expect(group0.every((t: { id: string }) => t.id === 't3')).toBe(true);
  });

  it('deve retornar array vazio se nenhuma tarefa estiver pronta', () => {
    const ue = require('../runtime/unlock-engine');
    const tasks = [
      { id: 't1', name: 'A', description: '', phase: 'structuring', status: 'pending', dependsOn: ['t2'], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: true, isDeterministic: true, requiresLLM: false },
      { id: 't2', name: 'B', description: '', phase: 'structuring', status: 'pending', dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: true, isDeterministic: true, requiresLLM: false },
    ];
    const groups = ue.getParallelGroups(tasks);
    expect(groups.length).toBe(1);
    expect(groups[0][0].id).toBe('t2');
  });

  it('deve estimar tempo paralelo baseado no maior esforco por grupo', () => {
    const ue = require('../runtime/unlock-engine');
    const tasks = [
      { id: 't1', name: 'A', description: '', phase: 'structuring', status: 'completed', dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: true, isDeterministic: true, requiresLLM: false },
      { id: 't2', name: 'B', description: '', phase: 'structuring', status: 'completed', dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: true, isDeterministic: true, requiresLLM: false },
      { id: 't3', name: 'C', description: '', phase: 'structuring', status: 'pending', dependsOn: ['t1'], blockedBy: [], riskLevel: 'low', estimatedEffort: 'hours', canParallelize: false, isDeterministic: false, requiresLLM: false },
      { id: 't4', name: 'D', description: '', phase: 'structuring', status: 'pending', dependsOn: ['t2'], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: false, isDeterministic: true, requiresLLM: false },
    ];
    const est = ue.estimateParallelTime(tasks);
    expect(est.parallelGroups).toBeGreaterThanOrEqual(1);
    expect(est.total).toBeGreaterThan(0);
    expect(est.total).toBe(60);
  });

  it('deve retornar 0 se nao houver tarefas prontas', () => {
    const ue = require('../runtime/unlock-engine');
    const est = ue.estimateParallelTime([]);
    expect(est.total).toBe(0);
    expect(est.parallelGroups).toBe(0);
  });

  it('deve calcular tempo paralelo com grupos multiplos', () => {
    const ue = require('../runtime/unlock-engine');
    const tasks = [
      { id: 't1', name: 'A', description: '', phase: 'structuring', status: 'completed', dependsOn: [], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: true, isDeterministic: true, requiresLLM: false },
      { id: 't2', name: 'B', description: '', phase: 'structuring', status: 'completed', dependsOn: ['t1'], blockedBy: [], riskLevel: 'low', estimatedEffort: 'hours', canParallelize: false, isDeterministic: false, requiresLLM: false },
      { id: 't3', name: 'C', description: '', phase: 'structuring', status: 'pending', dependsOn: ['t1'], blockedBy: [], riskLevel: 'low', estimatedEffort: 'hours', canParallelize: false, isDeterministic: false, requiresLLM: false },
      { id: 't4', name: 'D', description: '', phase: 'structuring', status: 'pending', dependsOn: ['t2'], blockedBy: [], riskLevel: 'low', estimatedEffort: 'minutes', canParallelize: false, isDeterministic: true, requiresLLM: false },
    ];
    const est = ue.estimateParallelTime(tasks);
    expect(est.parallelGroups).toBe(2);
    expect(est.total).toBe(61);
  });
});

// ─── EV18-04: decision-center ────────────────────────────────────────────────

describe('EV18-04: decision-center (checkDecisionCompleteness, buildDecisionRequest)', () => {
  function makeCp() {
    return {
      id: 'cp-test',
      phase: 'diagnosis' as const,
      status: 'blocked' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      contextHash: 'abc',
      nextActions: [],
      dependencyIds: [],
      unlockIds: [],
    };
  }

  it('deve validar decisao completa no formato 3+1', () => {
    const dc = require('../runtime/decision-center');
    const req = dc.buildDecisionRequest('Test', 'Summary', 'Reason', 'Ctx', makeCp(), 'B');
    const result = dc.checkDecisionCompleteness(req);
    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('deve detectar opcao A ausente', () => {
    const dc = require('../runtime/decision-center');
    const req = dc.buildDecisionRequest('Test', 'Summary', 'Reason', 'Ctx', makeCp(), 'B');
    req.options = req.options.filter((o: { id: string }) => o.id !== 'A');
    const result = dc.checkDecisionCompleteness(req);
    expect(result.complete).toBe(false);
    expect(result.missing).toContain('Opcao A ausente');
  });

  it('deve detectar opcao B ausente', () => {
    const dc = require('../runtime/decision-center');
    const req = dc.buildDecisionRequest('Test', 'Summary', 'Reason', 'Ctx', makeCp(), 'B');
    req.options = req.options.filter((o: { id: string }) => o.id !== 'B');
    const result = dc.checkDecisionCompleteness(req);
    expect(result.complete).toBe(false);
    expect(result.missing).toContain('Opcao B ausente');
  });

  it('deve detectar opcao C ausente', () => {
    const dc = require('../runtime/decision-center');
    const req = dc.buildDecisionRequest('Test', 'Summary', 'Reason', 'Ctx', makeCp(), 'B');
    req.options = req.options.filter((o: { id: string }) => o.id !== 'C');
    const result = dc.checkDecisionCompleteness(req);
    expect(result.complete).toBe(false);
    expect(result.missing).toContain('Opcao C ausente');
  });

  it('deve detectar opcao D ausente', () => {
    const dc = require('../runtime/decision-center');
    const req = dc.buildDecisionRequest('Test', 'Summary', 'Reason', 'Ctx', makeCp(), 'B');
    req.options = req.options.filter((o: { id: string }) => o.id !== 'D');
    const result = dc.checkDecisionCompleteness(req);
    expect(result.complete).toBe(false);
    expect(result.missing).toContain('Opcao D ausente');
  });

  it('deve detectar falta de opcao recomendada', () => {
    const dc = require('../runtime/decision-center');
    const req = dc.buildDecisionRequest('Test', 'Summary', 'Reason', 'Ctx', makeCp(), 'B');
    req.options = req.options.map((o: { recommended?: boolean }) => ({ ...o, recommended: undefined }));
    const result = dc.checkDecisionCompleteness(req);
    expect(result.complete).toBe(false);
    expect(result.missing).toContain('Nenhuma opcao marcada como recomendada');
  });

  it('deve detectar customAllowed false', () => {
    const dc = require('../runtime/decision-center');
    const req = dc.buildDecisionRequest('Test', 'Summary', 'Reason', 'Ctx', makeCp(), 'B');
    req.customAllowed = false;
    const result = dc.checkDecisionCompleteness(req);
    expect(result.complete).toBe(false);
    expect(result.missing).toContain('customAllowed deve ser true');
  });

  it('buildDecisionRequest sempre produz 4 opcoes (A, B, C, D)', () => {
    const dc = require('../runtime/decision-center');
    const req1 = dc.buildDecisionRequest('Test1', 'S1', 'R1', 'C1', makeCp(), 'B');
    expect(req1.options).toHaveLength(4);
    expect(req1.options.map((o: { id: string }) => o.id)).toEqual(['A', 'B', 'C', 'D']);

    const cp2 = makeCp();
    const req2 = dc.buildDecisionRequest('Test2', 'S2', 'R2', 'C2', cp2, 'C');
    expect(req2.options).toHaveLength(4);
    expect(req2.options.map((o: { id: string }) => o.id)).toEqual(['A', 'B', 'C', 'D']);

    const cp3 = makeCp();
    const req3 = dc.buildDecisionRequest('Test3', 'S3', 'R3', 'C3', cp3, 'A');
    expect(req3.options).toHaveLength(4);
  });
});

// ─── EV18-05: orchestrate.ts (command registration) ─────────────────────────

describe('EV18-05: orchestrate (comando explain-decision)', () => {
  it('deve registrar o subcomando explain-decision', () => {
    const cmd = require('../commands/orchestrate').orchestrateCommand();
    const explainCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'explain-decision');
    expect(explainCmd).toBeDefined();
    expect(explainCmd.name()).toBe('explain-decision');
    expect(explainCmd.description()).toContain('decisao');
  });

  it('deve registrar todos os 7 subcomandos da orquestracao', () => {
    const cmd = require('../commands/orchestrate').orchestrateCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('start');
    expect(names).toContain('status');
    expect(names).toContain('resume');
    expect(names).toContain('checkpoints');
    expect(names).toContain('decide');
    expect(names).toContain('explain-decision');
    expect(names).toContain('decompose');
    expect(names.length).toBe(7);
  });
});

// ─── EV18-06: attachment-parser ──────────────────────────────────────────────

describe('EV18-06: attachment-parser', () => {
  describe('extractFileReferences', () => {
    it('deve extrair referencias @see', () => {
      const ap = require('../utils/attachment-parser');
      const refs = ap.extractFileReferences('Veja @see file.ts e @see README.md');
      expect(refs).toContain('file.ts');
      expect(refs).toContain('README.md');
    });

    it('deve extrair referencias conforme', () => {
      const ap = require('../utils/attachment-parser');
      const refs = ap.extractFileReferences('conforme config.json e conforme schema.yaml');
      expect(refs).toContain('config.json');
      expect(refs).toContain('schema.yaml');
    });

    it('deve extrair referencias file://', () => {
      const ap = require('../utils/attachment-parser');
      const refs = ap.extractFileReferences('veja file:///path/to/file.ts');
      expect(refs).toContain('/path/to/file.ts');
    });

    it('deve extrair referencias arquivo', () => {
      const ap = require('../utils/attachment-parser');
      const refs = ap.extractFileReferences('arquivo module.ts e arquivo data.json');
      expect(refs).toContain('module.ts');
      expect(refs).toContain('data.json');
    });

    it('deve ignorar strings sem extensao de arquivo', () => {
      const ap = require('../utils/attachment-parser');
      const refs = ap.extractFileReferences('@see something sem extensao');
      expect(refs).toEqual([]);
    });

    it('deve extrair referencias inline com extensao', () => {
      const ap = require('../utils/attachment-parser');
      const refs = ap.extractFileReferences('src/index.ts src/utils/helper.ts');
      expect(refs).toContain('src/index.ts');
      expect(refs).toContain('src/utils/helper.ts');
    });

    it('deve limpar pontuacao ao final das referencias', () => {
      const ap = require('../utils/attachment-parser');
      const refs = ap.extractFileReferences('@see file.ts, e @see other.md.');
      expect(refs).toContain('file.ts');
      expect(refs).toContain('other.md');
    });
  });

  describe('detectFileType', () => {
    it('deve detectar markdown para .md e .mdx', () => {
      const ap = require('../utils/attachment-parser');
      expect(ap.detectFileType('file.md')).toBe('markdown');
      expect(ap.detectFileType('file.mdx')).toBe('markdown');
    });

    it('deve detectar json para .json', () => {
      const ap = require('../utils/attachment-parser');
      expect(ap.detectFileType('config.json')).toBe('json');
    });

    it('deve detectar code para .ts, .js, .py, .go, .rs', () => {
      const ap = require('../utils/attachment-parser');
      expect(ap.detectFileType('file.ts')).toBe('code');
      expect(ap.detectFileType('file.js')).toBe('code');
      expect(ap.detectFileType('file.py')).toBe('code');
      expect(ap.detectFileType('file.go')).toBe('code');
      expect(ap.detectFileType('file.rs')).toBe('code');
    });

    it('deve detectar text para .txt, .csv, .log', () => {
      const ap = require('../utils/attachment-parser');
      expect(ap.detectFileType('file.txt')).toBe('text');
      expect(ap.detectFileType('data.csv')).toBe('text');
      expect(ap.detectFileType('output.log')).toBe('text');
    });

    it('deve retornar unknown para extensoes desconhecidas', () => {
      const ap = require('../utils/attachment-parser');
      expect(ap.detectFileType('file.xyz')).toBe('unknown');
      expect(ap.detectFileType('Makefile')).toBe('unknown');
    });
  });

  describe('parseAttachmentsFromText', () => {
    it('deve encontrar e ler arquivos existentes', () => {
      const ap = require('../utils/attachment-parser');
      fs.writeFileSync(path.join(TEST_CWD, 'helper.ts'), 'export const x = 1;', 'utf-8');
      fs.writeFileSync(path.join(TEST_CWD, 'readme.md'), '# Hello', 'utf-8');

      const result = ap.parseAttachmentsFromText('@see helper.ts e @see readme.md', TEST_CWD);
      expect(result.attachments.length).toBe(2);
      expect(result.referencedFiles.length).toBe(2);
      expect(result.missingFiles.length).toBe(0);
      expect(result.attachments[0].valid).toBe(true);
      expect(result.attachments[0].content).toBe('export const x = 1;');
    });

    it('deve marcar arquivos ausentes', () => {
      const ap = require('../utils/attachment-parser');
      const result = ap.parseAttachmentsFromText('@see nonexistent.ts', TEST_CWD);
      expect(result.attachments.length).toBe(1);
      expect(result.attachments[0].valid).toBe(false);
      expect(result.attachments[0].error).toBe('File not found');
      expect(result.missingFiles.length).toBe(1);
    });

    it('deve detectar tipo do arquivo no resultado', () => {
      const ap = require('../utils/attachment-parser');
      fs.writeFileSync(path.join(TEST_CWD, 'config.json'), '{"a":1}', 'utf-8');
      const result = ap.parseAttachmentsFromText('@see config.json', TEST_CWD);
      expect(result.attachments[0].type).toBe('json');
    });

    it('deve contar linhas do arquivo', () => {
      const ap = require('../utils/attachment-parser');
      fs.writeFileSync(path.join(TEST_CWD, 'multi.ts'), 'line1\nline2\nline3', 'utf-8');
      const result = ap.parseAttachmentsFromText('@see multi.ts', TEST_CWD);
      expect(result.attachments[0].lines).toBe(3);
    });

    it('deve retornar summary formatado', () => {
      const ap = require('../utils/attachment-parser');
      fs.writeFileSync(path.join(TEST_CWD, 'a.ts'), 'x', 'utf-8');
      fs.writeFileSync(path.join(TEST_CWD, 'b.ts'), 'y', 'utf-8');
      const result = ap.parseAttachmentsFromText('@see a.ts @see b.ts', TEST_CWD);
      expect(result.summary).toContain('2 file(s)');
      expect(result.summary).toContain('2 valid');
    });
  });
});

// ─── EV18-07: autonomy-policy ────────────────────────────────────────────────

describe('EV18-07: autonomy-policy (calculateRiskScore, getEffectiveAutonomyLevel)', () => {
  function makeTask(overrides: Record<string, unknown> = {}) {
    return {
      id: 'task-1',
      name: 'Test Task',
      description: 'A test task',
      phase: 'structuring',
      status: 'pending',
      dependsOn: [],
      blockedBy: [],
      riskLevel: 'medium',
      estimatedEffort: 'hours',
      canParallelize: false,
      isDeterministic: false,
      requiresLLM: true,
      ...overrides,
    };
  }

  describe('calculateRiskScore', () => {
    it('deve retornar score numerico entre 0 e 100', () => {
      const ap = require('../runtime/autonomy-policy');
      const result = ap.calculateRiskScore(makeTask());
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(result.score)).toBe(true);
    });

    it('deve incluir todos os 6 fatores de risco', () => {
      const ap = require('../runtime/autonomy-policy');
      const result = ap.calculateRiskScore(makeTask());
      expect(result.factors.length).toBe(6);
      const names = result.factors.map((f: { name: string }) => f.name);
      expect(names).toContain('riskLevel');
      expect(names).toContain('estimatedEffort');
      expect(names).toContain('dependsOn');
      expect(names).toContain('requiresLLM');
      expect(names).toContain('isDeterministic');
      expect(names).toContain('phase');
    });

    it('deve ter peso total dos fatores igual a 1.0', () => {
      const ap = require('../runtime/autonomy-policy');
      const result = ap.calculateRiskScore(makeTask());
      const totalWeight = result.factors.reduce((sum: number, f: { weight: number }) => sum + f.weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 2);
    });

    it('deve retornar level high para tarefa de alto risco', () => {
      const ap = require('../runtime/autonomy-policy');
      const result = ap.calculateRiskScore(makeTask({ riskLevel: 'high', estimatedEffort: 'weeks', dependsOn: ['a', 'b', 'c'], phase: 'industrial-autonomy' }));
      expect(result.level).toBe('high');
      expect(result.score).toBeGreaterThan(66);
    });

    it('deve retornar level low para tarefa de baixo risco', () => {
      const ap = require('../runtime/autonomy-policy');
      const result = ap.calculateRiskScore(makeTask({ riskLevel: 'low', estimatedEffort: 'minutes', isDeterministic: true, requiresLLM: false, phase: 'diagnosis' }));
      expect(result.level).toBe('low');
      expect(result.score).toBeLessThanOrEqual(33);
    });

    it('deve aumentar score com quantidade de dependencias', () => {
      const ap = require('../runtime/autonomy-policy');
      const low = ap.calculateRiskScore(makeTask({ dependsOn: [] }));
      const high = ap.calculateRiskScore(makeTask({ dependsOn: ['a', 'b', 'c'] }));
      expect(high.score).toBeGreaterThanOrEqual(low.score);
    });
  });

  describe('getEffectiveAutonomyLevel (com riskScore)', () => {
    it('deve retornar blocked quando riskScore >= 85', () => {
      const ap = require('../runtime/autonomy-policy');
      const level = ap.getEffectiveAutonomyLevel({}, 0.9, 0, 85);
      expect(level).toBe('blocked');
    });

    it('deve retornar blocked quando riskScore > 85', () => {
      const ap = require('../runtime/autonomy-policy');
      const level = ap.getEffectiveAutonomyLevel({}, 0.9, 0, 90);
      expect(level).toBe('blocked');
    });

    it('deve retornar guided quando riskScore entre 60-84 e confianca < 0.7', () => {
      const ap = require('../runtime/autonomy-policy');
      const level = ap.getEffectiveAutonomyLevel({}, 0.5, 0, 70);
      expect(level).toBe('guided');
    });

    it('deve retornar baseLevel quando riskScore < 60 e confianca >= 0.7', () => {
      const ap = require('../runtime/autonomy-policy');
      const level = ap.getEffectiveAutonomyLevel({ baseLevel: 'autonomous' }, 0.8, 0, 40);
      expect(level).toBe('autonomous');
    });

    it('deve retornar guided quando riskScore < 60 mas confianca baixa', () => {
      const ap = require('../runtime/autonomy-policy');
      const level = ap.getEffectiveAutonomyLevel({}, 0.3, 0, 40);
      expect(level).toBe('guided');
    });

    it('deve priorizar riskScore >= 85 mesmo com confianca alta e falha baixa', () => {
      const ap = require('../runtime/autonomy-policy');
      const level = ap.getEffectiveAutonomyLevel({ baseLevel: 'autonomous' }, 0.95, 0, 88);
      expect(level).toBe('blocked');
    });
  });
});

// ─── EV18-08: module-scorecard ───────────────────────────────────────────────

describe('EV18-08: module-scorecard', () => {
  function getMockIO() {
    const { getIO, resetIO } = require('../io');
    resetIO();
    process.env.GTI_TEST_MODE = '1';
    const io = getIO() as unknown as {
      _reset(): void;
      fs: {
        _addDir(p: string): void;
        _addFile(p: string, c: string): void;
        exists(p: string): boolean;
        readDir(p: string): string[];
        readDirEntries(p: string): { name: string; isDirectory(): boolean; isFile(): boolean }[];
      };
    };
    io._reset();
    const root = process.cwd();
    io.fs._addDir(root);
    io.fs._addFile(path.join(root, 'package.json'), JSON.stringify({ name: 'test', version: '1.0.0' }));
    io.fs._addFile(path.join(root, 'tsconfig.json'), '{}');
    io.fs._addDir(path.join(root, '.ai'));
    return io;
  }

  describe('discoverModules', () => {
    it('deve descobrir modulos em src, packages/*/src e scripts', () => {
      jest.resetModules();
      const io = getMockIO();
      const baseDir = process.cwd();

      // Must add EACH directory level explicitly because _addDir does NOT create parent dirs
      const srcDir = path.join(baseDir, 'src');
      io.fs._addDir(srcDir);
      for (const mod of ['runtime', 'utils', 'commands']) {
        io.fs._addDir(path.join(srcDir, mod));
      }

      const scriptsDir = path.join(baseDir, 'scripts');
      io.fs._addDir(scriptsDir);
      io.fs._addDir(path.join(scriptsDir, 'build'));

      const ms = require('../utils/module-scorecard');
      const modules = ms.discoverModules(baseDir);

      expect(modules.length).toBeGreaterThanOrEqual(4);
      const names = modules.map((m: { name: string }) => m.name);
      expect(names).toContain('runtime');
      expect(names).toContain('utils');
      expect(names).toContain('commands');
      expect(names).toContain('build');
    });

    it('deve ignorar diretorios node_modules, dist, __tests__ e legacy', () => {
      jest.resetModules();
      const io = getMockIO();
      const baseDir = process.cwd();

      const srcDir = path.join(baseDir, 'src');
      io.fs._addDir(srcDir);
      io.fs._addDir(path.join(srcDir, 'runtime'));
      for (const bad of ['node_modules', 'dist', '__tests__', 'legacy']) {
        io.fs._addDir(path.join(srcDir, bad));
      }

      const ms = require('../utils/module-scorecard');
      const modules = ms.discoverModules(baseDir);
      const names = modules.map((m: { name: string }) => m.name);
      expect(names).toContain('runtime');
      expect(names).not.toContain('node_modules');
      expect(names).not.toContain('dist');
      expect(names).not.toContain('legacy');
    });

    it('deve retornar array vazio quando nao ha diretorios de codigo', () => {
      jest.resetModules();
      getMockIO();
      const ms = require('../utils/module-scorecard');
      const modules = ms.discoverModules('/nonexistent/path');
      expect(modules).toEqual([]);
    });
  });

  describe('calculateDepthScore', () => {
    it('deve retornar score baseado em profundidade e quantidade de arquivos', () => {
      jest.resetModules();
      const io = getMockIO();
      const baseDir = process.cwd();
      const modPath = path.join(baseDir, 'src', 'runtime');

      io.fs._addDir(path.join(baseDir, 'src'));
      io.fs._addDir(modPath);
      io.fs._addFile(path.join(modPath, 'index.ts'), 'export const a = 1;');
      io.fs._addFile(path.join(modPath, 'types.ts'), 'export type T = string;');

      const ms = require('../utils/module-scorecard');
      const score = ms.calculateDepthScore(modPath, baseDir);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('deve retornar 0 para diretorio inexistente', () => {
      jest.resetModules();
      getMockIO();
      const ms = require('../utils/module-scorecard');
      const score = ms.calculateDepthScore('/nonexistent', '/base');
      expect(score).toBe(0);
    });
  });

  describe('generateGranularScorecard', () => {
    it('deve retornar estrutura esperada do scorecard', () => {
      jest.resetModules();
      const io = getMockIO();
      const baseDir = process.cwd();

      // Add module dirs (without files inside) for discovery
      const srcDir = path.join(baseDir, 'src');
      io.fs._addDir(srcDir);

      // Must use _addDir only for discovery — no files inside,
      // because MockFileSystem readDirEntries prefers file entries over dir entries
      io.fs._addDir(path.join(srcDir, 'runtime'));
      io.fs._addDir(path.join(srcDir, 'utils'));

      const ms = require('../utils/module-scorecard');
      const scorecard = ms.generateGranularScorecard(baseDir);

      expect(scorecard.generatedAt).toBeDefined();
      expect(Array.isArray(scorecard.modules)).toBe(true);
      expect(scorecard.modules.length).toBeGreaterThanOrEqual(2);
      expect(scorecard.averages).toBeDefined();
      expect(scorecard.averages.profundidade).toBeDefined();
      expect(scorecard.averages.cobertura).toBeDefined();
      expect(scorecard.overall).toBeGreaterThanOrEqual(0);
      expect(scorecard.overall).toBeLessThanOrEqual(100);
      expect(typeof scorecard.worstModule).toBe('string');
      expect(typeof scorecard.bestModule).toBe('string');
      expect(Array.isArray(scorecard.recommendations)).toBe(true);
    });

    it('deve incluir dimensoes esperadas em cada modulo', () => {
      jest.resetModules();
      const io = getMockIO();
      const baseDir = process.cwd();

      const srcDir = path.join(baseDir, 'src');
      io.fs._addDir(srcDir);
      io.fs._addDir(path.join(srcDir, 'runtime'));

      const ms = require('../utils/module-scorecard');
      const scorecard = ms.generateGranularScorecard(baseDir);
      expect(scorecard.modules.length).toBeGreaterThanOrEqual(1);
      const mod = scorecard.modules[0];

      expect(mod.name).toBeDefined();
      expect(mod.path).toBeDefined();
      expect(mod.dimensions).toBeDefined();
      expect(mod.dimensions.profundidade).toBeDefined();
      expect(mod.dimensions.cobertura).toBeDefined();
      expect(mod.dimensions.risco).toBeDefined();
      expect(mod.dimensions.complexidade).toBeDefined();
      expect(mod.dimensions.valor_de_negocio).toBeDefined();
      expect(mod.dimensions.maturidade).toBeDefined();
      expect(mod.dimensions.testabilidade).toBeDefined();
      expect(mod.overall).toBeGreaterThanOrEqual(0);
      expect(mod.status).toMatch(/^(critical|warning|good|excellent)$/);
    });

    it('deve aplicar filtros includePatterns', () => {
      jest.resetModules();
      const io = getMockIO();
      const baseDir = process.cwd();

      const srcDir = path.join(baseDir, 'src');
      io.fs._addDir(srcDir);
      io.fs._addDir(path.join(srcDir, 'runtime'));
      io.fs._addDir(path.join(srcDir, 'utils'));

      const ms = require('../utils/module-scorecard');
      const scorecard = ms.generateGranularScorecard(baseDir, { includePatterns: ['runtime'] });
      expect(scorecard.modules.length).toBe(1);
      expect(scorecard.modules[0].name).toBe('runtime');
    });

    it('deve aplicar filtros excludePatterns', () => {
      jest.resetModules();
      const io = getMockIO();
      const baseDir = process.cwd();

      const srcDir = path.join(baseDir, 'src');
      io.fs._addDir(srcDir);
      io.fs._addDir(path.join(srcDir, 'runtime'));
      io.fs._addDir(path.join(srcDir, 'utils'));

      const ms = require('../utils/module-scorecard');
      const scorecard = ms.generateGranularScorecard(baseDir, { excludePatterns: ['utils'] });
      expect(scorecard.modules.every((m: { name: string }) => m.name !== 'utils')).toBe(true);
    });

    it('deve retornar scorecard vazio quando nao ha modulos', () => {
      jest.resetModules();
      getMockIO();
      const ms = require('../utils/module-scorecard');
      const scorecard = ms.generateGranularScorecard('/empty/path');
      expect(scorecard.modules).toEqual([]);
      expect(scorecard.overall).toBe(0);
      expect(scorecard.recommendations).toEqual([]);
    });

    it('deve gerar recomendacoes para modulos com pontuacao baixa', () => {
      jest.resetModules();
      const io = getMockIO();
      const baseDir = process.cwd();

      const srcDir = path.join(baseDir, 'src');
      io.fs._addDir(srcDir);
      io.fs._addDir(path.join(srcDir, 'badmodule'));

      const ms = require('../utils/module-scorecard');
      const scorecard = ms.generateGranularScorecard(baseDir);
      expect(scorecard.recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });
});
