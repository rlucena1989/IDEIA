import { orchestrateCommand } from '../orchestrate';

jest.mock('../../runtime/phase-orchestrator', () => ({
  createInitialState: jest.fn().mockReturnValue({
    currentPhase: 'structuring',
    executionMode: 'guided',
    autonomyLevel: 'guided',
    confidence: 0.75,
    phases: [
      { id: 'structuring', name: 'Estruturação', status: 'running', progress: 50, completedTasks: 2, totalTasks: 4, tasks: [{ status: 'completed' }, { status: 'completed' }, { status: 'pending' }, { status: 'pending' }] },
      { id: 'logic', name: 'Lógica', status: 'pending', progress: 0, completedTasks: 0, totalTasks: 3, tasks: [] },
    ],
    checkpoints: [{ id: 'cp-1', phase: 'structuring', status: 'completed' }],
    pendingDecisions: [{ id: 'dec-1', title: 'Approve design', reason: 'Needs review' }],
  }),
  orchestrateCycle: jest.fn().mockReturnValue({
    state: {
      currentPhase: 'structuring',
      executionMode: 'guided',
      autonomyLevel: 'guided',
      confidence: 0.75,
      phases: [
        { id: 'structuring', name: 'Estruturação', status: 'running', progress: 50, completedTasks: 2, totalTasks: 4, tasks: [{ status: 'completed' }, { status: 'completed' }, { status: 'pending' }, { status: 'pending' }] },
        { id: 'logic', name: 'Lógica', status: 'pending', progress: 0, completedTasks: 0, totalTasks: 3, tasks: [] },
      ],
      checkpoints: [],
      pendingDecisions: [],
    },
    executed: [{ action: 'generate' }],
    decisions: [],
  }),
  advancePhase: jest.fn().mockImplementation((state: any) => ({ state })),
  resumeFromCheckpoint: jest.fn().mockReturnValue(null),
  PHASE_NAMES: { structuring: 'Estruturação', logic: 'Lógica', testing: 'Testes' },
}));
jest.mock('../../runtime/checkpoint-manager', () => ({
  createCheckpoint: jest.fn().mockReturnValue({ id: 'cp-1' }),
  listCheckpoints: jest.fn().mockReturnValue([]),
  loadLatestCheckpoint: jest.fn().mockReturnValue(null),
  attachDecisionToCheckpoint: jest.fn(),
}));
jest.mock('../../runtime/decision-center', () => ({
  buildDecisionRequest: jest.fn().mockReturnValue({
    id: 'dec-req-1',
    title: 'Decision Request',
    summary: 'Summary',
    context: 'Context',
    details: 'Details',
    options: [{ id: 'A', label: 'Option A' }, { id: 'B', label: 'Option B' }],
    recommendedAction: 'B',
    status: 'pending',
  }),
  buildDecisionPrompt: jest.fn().mockReturnValue({
    title: 'Prompt Title',
    summary: 'Prompt Summary',
    impact: 'High',
    recommendedAction: 'B',
    formatted: 'Formatted prompt',
  }),
  resolveDecision: jest.fn().mockReturnValue({
    id: 'dec-res-1',
    selectedOption: 'B',
    rationale: 'Good choice',
    timestamp: '2026-07-26T00:00:00.000Z',
  }),
  checkDecisionCompleteness: jest.fn().mockReturnValue({
    complete: true,
    missing: [],
  }),
}));
jest.mock('../../runtime/task-decomposer', () => ({
  decomposeTask: jest.fn().mockReturnValue({
    subtasks: [
      { id: 'st-1', name: 'Subtask 1', isDeterministic: true, dependsOn: [] },
      { id: 'st-2', name: 'Subtask 2', isDeterministic: false, dependsOn: ['st-1'] },
    ],
    parallelGroups: [['st-1'], ['st-2']],
    dependencies: [{ from: 'st-2', to: 'st-1' }],
  }),
}));
jest.mock('../../runtime/model-router', () => ({
  routeTask: jest.fn().mockReturnValue({ model: 'gpt-4', tier: 'full' }),
  routeBatch: jest.fn().mockReturnValue([]),
}));
jest.mock('../../runtime/unlock-engine', () => ({
  getReadyTasks: jest.fn().mockReturnValue([]),
  getBlockedTasks: jest.fn().mockReturnValue([]),
}));
jest.mock('../../runtime/autonomy-policy', () => ({
  getEffectiveAutonomyLevel: jest.fn().mockReturnValue('guided'),
  buildAutonomySummary: jest.fn().mockReturnValue('Autonomy: guided (confidence 75%)'),
}));
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

describe('orchestrateCommand', () => {
  let consoleSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    exitSpy.mockRestore();
  });

  function makeCmd() { return orchestrateCommand(); }

  it('should be defined', () => {
    expect(makeCmd()).toBeDefined();
  });

  it('should have name orchestrate', () => {
    expect(makeCmd().name()).toBe('orchestrate');
  });

  it('should have description', () => {
    expect(makeCmd().description().length).toBeGreaterThan(0);
  });

  it('should have subcommands', () => {
    expect(makeCmd().commands.length).toBeGreaterThanOrEqual(0);
  });

  it('start subcommand prints JSON output', () => {
    const start = makeCmd().commands.find(c => c.name() === 'start')!;
    start.parse(['--json'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalled();
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(parsed.state).toBeDefined();
    expect(parsed.state.currentPhase).toBe('structuring');
  });

  it('start subcommand prints text output', () => {
    const start = makeCmd().commands.find(c => c.name() === 'start')!;
    start.parse(['start'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Orquestracao Iniciada'));
  });

  it('start subcommand accepts autonomy level', () => {
    const { createInitialState } = require('../../runtime/phase-orchestrator');
    const start = makeCmd().commands.find(c => c.name() === 'start')!;
    start.parse(['--autonomy', 'autonomous'], { from: 'user' });
    expect(createInitialState).toHaveBeenCalledWith(expect.any(String), expect.any(Array), 'autonomous');
  });

  it('status subcommand shows no checkpoint message', () => {
    const status = makeCmd().commands.find(c => c.name() === 'status')!;
    status.parse(['status'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Nenhum checkpoint encontrado'));
  });

  it('status subcommand shows checkpoint info when available', () => {
    const { loadLatestCheckpoint, listCheckpoints } = require('../../runtime/checkpoint-manager');
    loadLatestCheckpoint.mockReturnValueOnce({ id: 'cp-latest', phase: 'structuring', status: 'running' });
    listCheckpoints.mockReturnValueOnce([
      { id: 'cp-1', phase: 'structuring', status: 'completed' },
      { id: 'cp-2', phase: 'structuring', status: 'completed' },
    ]);
    const status = makeCmd().commands.find(c => c.name() === 'status')!;
    status.parse(['status'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Status da Orquestracao'));
  });

  it('status subcommand prints JSON output', () => {
    const { loadLatestCheckpoint } = require('../../runtime/checkpoint-manager');
    loadLatestCheckpoint.mockReturnValueOnce({ id: 'cp-latest', phase: 'structuring', status: 'running' });
    const status = makeCmd().commands.find(c => c.name() === 'status')!;
    status.parse(['--json'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalled();
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(parsed.latestCheckpoint).toBeDefined();
  });

  it('resume subcommand shows no checkpoint message', () => {
    const resume = makeCmd().commands.find(c => c.name() === 'resume')!;
    resume.parse(['resume'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Nenhum checkpoint encontrado'));
  });

  it('resume subcommand shows checkpoint info when available', () => {
    const { resumeFromCheckpoint } = require('../../runtime/phase-orchestrator');
    resumeFromCheckpoint.mockReturnValueOnce({
      currentPhase: 'structuring',
      pendingDecisions: [{ id: 'dec-1', title: 'Test Decision', reason: 'Needs input' }],
      checkpoints: [{ id: 'cp-1' }],
    });
    const resume = makeCmd().commands.find(c => c.name() === 'resume')!;
    resume.parse(['resume'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Orquestracao Retomada'));
  });

  it('resume subcommand prints JSON output', () => {
    const { resumeFromCheckpoint } = require('../../runtime/phase-orchestrator');
    resumeFromCheckpoint.mockReturnValueOnce({
      currentPhase: 'structuring',
      pendingDecisions: [],
      checkpoints: [{ id: 'cp-1' }],
    });
    const resume = makeCmd().commands.find(c => c.name() === 'resume')!;
    resume.parse(['--json'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalled();
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(parsed.currentPhase).toBe('structuring');
  });

  it('checkpoints subcommand shows empty message', () => {
    const checkpoints = makeCmd().commands.find(c => c.name() === 'checkpoints')!;
    checkpoints.parse(['checkpoints'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Nenhum checkpoint encontrado'));
  });

  it('checkpoints subcommand lists items', () => {
    const { listCheckpoints } = require('../../runtime/checkpoint-manager');
    listCheckpoints.mockReturnValueOnce([
      { id: 'cp-1', phase: 'structuring', status: 'completed', metrics: { coverage: 85, scorecard: 90 } },
      { id: 'cp-2', phase: 'logic', status: 'failed', taskId: 'task-1' },
    ]);
    const checkpoints = makeCmd().commands.find(c => c.name() === 'checkpoints')!;
    checkpoints.parse(['checkpoints'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Checkpoints'));
  });

  it('checkpoints subcommand filters by phase', () => {
    const { listCheckpoints } = require('../../runtime/checkpoint-manager');
    listCheckpoints.mockReturnValueOnce([{ id: 'cp-1', phase: 'structuring', status: 'completed' }]);
    const checkpoints = makeCmd().commands.find(c => c.name() === 'checkpoints')!;
    checkpoints.parse(['--phase', 'structuring'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('checkpoints subcommand prints JSON', () => {
    const { listCheckpoints } = require('../../runtime/checkpoint-manager');
    listCheckpoints.mockReturnValueOnce([{ id: 'cp-1', phase: 'structuring', status: 'completed' }]);
    const checkpoints = makeCmd().commands.find(c => c.name() === 'checkpoints')!;
    checkpoints.parse(['--json'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalled();
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('decide subcommand shows not found message', () => {
    const decide = makeCmd().commands.find(c => c.name() === 'decide')!;
    decide.parse(['decide', 'nonexistent'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('nao encontrada'));
  });

  it('decide subcommand shows already resolved message', () => {
    const { listCheckpoints } = require('../../runtime/checkpoint-manager');
    listCheckpoints.mockReturnValueOnce([{ id: 'dec-1', phase: 'structuring', status: 'completed' }]);
    const decide = makeCmd().commands.find(c => c.name() === 'decide')!;
    decide.parse(['dec-1'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ja foi resolvido'));
  });

  it('decide subcommand resolves decision', () => {
    const { listCheckpoints } = require('../../runtime/checkpoint-manager');
    listCheckpoints.mockReturnValueOnce([{ id: 'dec-1', phase: 'structuring', status: 'needs-decision' }]);
    const decide = makeCmd().commands.find(c => c.name() === 'decide')!;
    decide.parse(['dec-1', '--option', 'B', '--reason', 'Best choice'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Decisao registrada'));
  });

  it('decide subcommand prints JSON output', () => {
    const { listCheckpoints } = require('../../runtime/checkpoint-manager');
    listCheckpoints.mockReturnValueOnce([{ id: 'dec-1', phase: 'structuring', status: 'needs-decision' }]);
    const decide = makeCmd().commands.find(c => c.name() === 'decide')!;
    decide.parse(['dec-1', '--option', 'A', '--json'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalled();
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(parsed.decisionId).toBe('dec-1');
  });

  it('explain-decision subcommand shows not found', () => {
    const explain = makeCmd().commands.find(c => c.name() === 'explain-decision')!;
    explain.parse(['explain-decision', 'nonexistent'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('nao encontrado'));
  });

  it('explain-decision subcommand shows details', () => {
    const { listCheckpoints } = require('../../runtime/checkpoint-manager');
    listCheckpoints.mockReturnValueOnce([{
      id: 'dec-1', phase: 'structuring', status: 'needs-decision', taskId: 'task-1',
      createdAt: 'now', nextActions: ['review', 'approve'],
      metrics: { coverage: 80, scorecard: 85, risk: 20 },
    }]);
    const explain = makeCmd().commands.find(c => c.name() === 'explain-decision')!;
    explain.parse(['dec-1'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Formatted prompt'));
  });

  it('explain-decision subcommand prints JSON', () => {
    const { listCheckpoints } = require('../../runtime/checkpoint-manager');
    listCheckpoints.mockReturnValueOnce([{
      id: 'dec-1', phase: 'structuring', status: 'completed', taskId: 'task-1',
      createdAt: 'now', nextActions: [],
    }]);
    const explain = makeCmd().commands.find(c => c.name() === 'explain-decision')!;
    explain.parse(['dec-1', '--json'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalled();
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(parsed.checkpoint).toBeDefined();
    expect(parsed.completeness).toBeDefined();
  });

  it('decompose subcommand prints text output', () => {
    const decompose = makeCmd().commands.find(c => c.name() === 'decompose')!;
    decompose.parse(['decompose', 'My Feature'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Decomposicao'));
  });

  it('decompose subcommand prints JSON output', () => {
    const decompose = makeCmd().commands.find(c => c.name() === 'decompose')!;
    decompose.parse(['My Feature', '--json'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalled();
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(parsed.subtasks).toBeDefined();
  });

  it('decompose subcommand accepts complexity and domain', () => {
    const { decomposeTask } = require('../../runtime/task-decomposer');
    const decompose = makeCmd().commands.find(c => c.name() === 'decompose')!;
    decompose.parse(['Feature', '--complexity', 'high', '--domain', 'typescript,frontend'], { from: 'user' });
    expect(decomposeTask).toHaveBeenCalledWith(
      expect.objectContaining({ estimatedComplexity: 'high', domain: ['typescript', 'frontend'] }),
      expect.any(String),
    );
  });
});
