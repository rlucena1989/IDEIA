import { Command } from 'commander';
import { evolveCommand } from '../evolve';

jest.mock('../../state/state-builder', () => ({
  buildDevkitState: jest.fn().mockReturnValue({ version: '2.0.0', blocks: ['governance', 'planning', 'quality'] }),
}));
jest.mock('../../evolution/delta-engine', () => ({
  buildStateDelta: jest.fn().mockReturnValue({
    fromVersion: '1.0.0', toVersion: '2.0.0',
    summary: { added: 2, removed: 1, changed: 3, critical: 0 },
    changes: [
      { kind: 'added', path: '/blocks/quality', impact: 'medium', reason: 'New block' },
      { kind: 'removed', path: '/blocks/legacy', impact: 'low', reason: 'Deprecated' },
      { kind: 'unchanged', path: '/blocks/governance', impact: 'none', reason: 'No change' },
    ],
  }),
}));
jest.mock('../../evolution/decision-engine', () => ({
  decideEvolution: jest.fn().mockReturnValue({
    action: 'proceed', risk: 'low', confidence: 0.85,
    rationale: 'All scores above threshold', requiresApproval: false,
  }),
}));
jest.mock('../../evolution/execution-orchestrator', () => ({
  orchestrateEvolution: jest.fn().mockReturnValue({
    ok: true, action: 'generate', rationale: 'Generation needed',
    auditId: 'audit-123', validation: { notes: ['Validated OK'] },
  }),
}));
jest.mock('../../evolution/revalidation-service', () => ({
  revalidateEvolution: jest.fn().mockReturnValue({
    ok: true, beforeScore: 75, afterScore: 85, delta: 10,
    notes: ['Score improved by 10 points'],
  }),
}));
jest.mock('../../evolution/audit-trail', () => ({
  createAuditEntry: jest.fn().mockImplementation((e: any) => ({
    ...e, auditId: `audit-${e.action}-${Date.now()}`,
  })),
  buildAuditTrail: jest.fn().mockReturnValue({
    generatedAt: '2026-07-26T00:00:00.000Z',
    entries: [
      { action: 'generate', result: 'ok', auditId: 'audit-gen-123', rationale: 'Generation needed' },
      { action: 'sync', result: 'ok', auditId: 'audit-sync-456', rationale: 'Sync after generate' },
    ],
  }),
}));
jest.mock('../../evolution/evolution-report', () => ({
  buildEvolutionReport: jest.fn().mockReturnValue({
    summary: ['Delta: +2 blocks', 'Decision: proceed'],
    generatedAt: '2026-07-26T00:00:00.000Z',
    execution: { ok: true },
    delta: { fromVersion: '1.0.0', toVersion: '2.0.0' },
    decision: { action: 'proceed', confidence: 0.85 },
    audit: { entries: [{ action: 'generate' }] },
  }),
}));
jest.mock('../../evolution/evolution-policy', () => ({
  DEFAULT_EVOLUTION_POLICY: { rules: [], thresholds: {} },
}));
jest.mock('../../self-evolution/reconfiguration-plan', () => ({
  buildReconfigurationPlan: jest.fn().mockImplementation((changes: any[]) => ({
    planId: `plan-${Date.now()}`, changes,
    requiresApproval: false, rollbackAvailable: true,
  })),
}));
jest.mock('../../self-evolution/reconfiguration-engine', () => ({
  applyReconfiguration: jest.fn().mockReturnValue({
    notes: ['Applied successfully', 'All checks passed'],
  }),
}));
jest.mock('../../self-evolution/evolution-guard', () => ({
  validateEvolution: jest.fn().mockImplementation((_: any, health: number) => ({
    allowed: health >= 80, reason: health >= 80 ? 'OK' : 'Health too low',
  })),
}));
jest.mock('../../self-evolution/rollback-manager', () => ({
  rollbackEvolution: jest.fn().mockReturnValue({
    rolledBack: true, notes: ['Rollback completed', 'System restored'],
  }),
}));
jest.mock('../../self-evolution/evolution-audit', () => ({
  createEvolutionAudit: jest.fn().mockReturnValue({
    planId: 'plan-123', action: 'replace', before: '', after: 'target', success: true,
  }),
}));
jest.mock('../../hardening/output-contract', () => ({
  createEnvelope: jest.fn().mockImplementation((data: any) => data),
}));
jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
  printResult: jest.fn(),
}));
jest.mock('../../utils/version', () => ({
  getCliVersion: jest.fn().mockReturnValue('1.0.0-test'),
}));

describe('evolveCommand', () => {
  let consoleSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;
  let printLine: jest.Mock;
  let printHeader: jest.Mock;
  let printResult: jest.Mock;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const output = require('../../utils/output');
    printLine = output.printLine;
    printHeader = output.printHeader;
    printResult = output.printResult;
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  function makeCmd(): Command {
    return evolveCommand();
  }

  it('returns a Commander Command with name evolve', () => {
    const cmd = makeCmd();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('evolve');
  });

  it('has all expected subcommands', () => {
    const cmd = makeCmd();
    const names = cmd.commands.map(c => c.name());
    expect(names).toContain('delta');
    expect(names).toContain('decide');
    expect(names).toContain('run');
    expect(names).toContain('audit');
    expect(names).toContain('revalidate');
    expect(names).toContain('report');
    expect(names).toContain('plan');
    expect(names).toContain('apply');
    expect(names).toContain('rollback');
  });

  it('has description', () => {
    const cmd = makeCmd();
    expect(cmd.description()).toBeTruthy();
  });

  it('delta subcommand prints text output', () => {
    const delta = makeCmd().commands.find(c => c.name() === 'delta')!;
    delta.parse(['delta'], { from: 'user' });
    expect(printHeader).toHaveBeenCalledWith('Delta de Estado');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('1.0.0'));
  });

  it('delta subcommand prints JSON output', () => {
    const delta = makeCmd().commands.find(c => c.name() === 'delta')!;
    delta.parse(['--json'], { from: 'user' });
    expect(printLine).toHaveBeenCalled();
    const call = printLine.mock.calls[0][0];
    const parsed = JSON.parse(call);
    expect(parsed.ok).toBe(true);
    expect(parsed.command).toBe('evolve delta');
  });

  it('decide subcommand uses default scores', () => {
    const decide = makeCmd().commands.find(c => c.name() === 'decide')!;
    decide.parse(['decide'], { from: 'user' });
    expect(printHeader).toHaveBeenCalledWith('Decisão de Evolução');
    expect(printResult).toHaveBeenCalled();
  });

  it('decide subcommand accepts custom scores', () => {
    const decide = makeCmd().commands.find(c => c.name() === 'decide')!;
    decide.parse(['--consistency', '90', '--hardening', '95', '--generation', '85'], { from: 'user' });
    const { decideEvolution } = require('../../evolution/decision-engine');
    expect(decideEvolution).toHaveBeenCalledWith(
      expect.objectContaining({ consistencyScore: 90, hardeningScore: 95, generationScore: 85 }),
      expect.anything(),
    );
  });

  it('decide subcommand prints JSON output', () => {
    const decide = makeCmd().commands.find(c => c.name() === 'decide')!;
    decide.parse(['--json'], { from: 'user' });
    expect(printLine).toHaveBeenCalled();
    const parsed = JSON.parse(printLine.mock.calls[0][0]);
    expect(parsed.command).toBe('evolve decide');
  });

  it('run subcommand prints text output', () => {
    const run = makeCmd().commands.find(c => c.name() === 'run')!;
    run.parse(['run'], { from: 'user' });
    expect(printHeader).toHaveBeenCalledWith('Execução de Evolução');
    expect(printResult).toHaveBeenCalled();
  });

  it('run subcommand prints JSON output', () => {
    const run = makeCmd().commands.find(c => c.name() === 'run')!;
    run.parse(['--json'], { from: 'user' });
    expect(printLine).toHaveBeenCalled();
    const parsed = JSON.parse(printLine.mock.calls[0][0]);
    expect(parsed.command).toBe('evolve run');
  });

  it('audit subcommand prints text output', () => {
    const audit = makeCmd().commands.find(c => c.name() === 'audit')!;
    audit.parse(['audit'], { from: 'user' });
    expect(printHeader).toHaveBeenCalledWith('Trilha de Auditoria');
  });

  it('audit subcommand prints JSON output', () => {
    const audit = makeCmd().commands.find(c => c.name() === 'audit')!;
    audit.parse(['--json'], { from: 'user' });
    expect(printLine).toHaveBeenCalled();
    const parsed = JSON.parse(printLine.mock.calls[0][0]);
    expect(parsed.command).toBe('evolve audit');
  });

  it('revalidate subcommand prints text output', () => {
    const reval = makeCmd().commands.find(c => c.name() === 'revalidate')!;
    reval.parse(['revalidate'], { from: 'user' });
    expect(printHeader).toHaveBeenCalledWith('Revalidação');
  });

  it('revalidate subcommand uses custom before/after scores', () => {
    const reval = makeCmd().commands.find(c => c.name() === 'revalidate')!;
    reval.parse(['--before', '50', '--after', '90'], { from: 'user' });
    const { revalidateEvolution } = require('../../evolution/revalidation-service');
    expect(revalidateEvolution).toHaveBeenCalledWith(50, 90);
  });

  it('revalidate subcommand prints JSON output', () => {
    const reval = makeCmd().commands.find(c => c.name() === 'revalidate')!;
    reval.parse(['--json'], { from: 'user' });
    expect(printLine).toHaveBeenCalled();
    const parsed = JSON.parse(printLine.mock.calls[0][0]);
    expect(parsed.command).toBe('evolve revalidate');
  });

  it('report subcommand prints text output', () => {
    const report = makeCmd().commands.find(c => c.name() === 'report')!;
    report.parse(['report'], { from: 'user' });
    expect(printHeader).toHaveBeenCalledWith('Relatório de Evolução');
  });

  it('report subcommand prints JSON output', () => {
    const report = makeCmd().commands.find(c => c.name() === 'report')!;
    report.parse(['--json'], { from: 'user' });
    expect(printLine).toHaveBeenCalled();
    const parsed = JSON.parse(printLine.mock.calls[0][0]);
    expect(parsed.command).toBe('evolve report');
  });

  it('plan subcommand prints text output', () => {
    const plan = makeCmd().commands.find(c => c.name() === 'plan')!;
    plan.parse(['plan', 'target-component', 'enable'], { from: 'user' });
    expect(printHeader).toHaveBeenCalledWith('Plano de Evolução');
  });

  it('plan subcommand prints JSON output', () => {
    const plan = makeCmd().commands.find(c => c.name() === 'plan')!;
    plan.parse(['target', 'enable', '--json'], { from: 'user' });
    expect(printLine).toHaveBeenCalled();
    const parsed = JSON.parse(printLine.mock.calls[0][0]);
    expect(parsed.command).toBe('evolve plan');
  });

  it('plan subcommand accepts custom reason', () => {
    const { buildReconfigurationPlan } = require('../../self-evolution/reconfiguration-plan');
    const plan = makeCmd().commands.find(c => c.name() === 'plan')!;
    plan.parse(['target', 'replace', '--reason', 'Custom reason'], { from: 'user' });
    expect(buildReconfigurationPlan).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'Custom reason', target: 'target', type: 'replace' }),
      ]),
    );
  });

  it('apply subcommand prints text output on success', () => {
    const apply = makeCmd().commands.find(c => c.name() === 'apply')!;
    apply.parse(['apply', 'target', 'replace'], { from: 'user' });
    expect(printHeader).toHaveBeenCalledWith('Evolução Aplicada');
  });

  it('apply subcommand prints JSON output on success', () => {
    const apply = makeCmd().commands.find(c => c.name() === 'apply')!;
    apply.parse(['target', 'replace', '--json'], { from: 'user' });
    expect(printLine).toHaveBeenCalled();
    const parsed = JSON.parse(printLine.mock.calls[0][0]);
    expect(parsed.command).toBe('evolve apply');
  });

  it('apply subcommand blocks when health too low', () => {
    const apply = makeCmd().commands.find(c => c.name() === 'apply')!;
    apply.parse(['apply', 'target', 'replace', '--health', '50'], { from: 'user' });
    const { validateEvolution } = require('../../self-evolution/evolution-guard');
    expect(validateEvolution).toHaveBeenCalledWith(expect.anything(), 50);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Health too low'));
  });

  it('apply subcommand blocks with JSON output when health too low', () => {
    const apply = makeCmd().commands.find(c => c.name() === 'apply')!;
    apply.parse(['target', 'replace', '--health', '50', '--json'], { from: 'user' });
    expect(printLine).toHaveBeenCalled();
    const parsed = JSON.parse(printLine.mock.calls[0][0]);
    expect(parsed.ok).toBe(false);
  });

  it('rollback subcommand prints text output', () => {
    const rollback = makeCmd().commands.find(c => c.name() === 'rollback')!;
    rollback.parse(['rollback', 'target'], { from: 'user' });
    expect(printHeader).toHaveBeenCalledWith('Rollback');
  });

  it('rollback subcommand prints JSON output', () => {
    const rollback = makeCmd().commands.find(c => c.name() === 'rollback')!;
    rollback.parse(['target', '--json'], { from: 'user' });
    expect(printLine).toHaveBeenCalled();
    const parsed = JSON.parse(printLine.mock.calls[0][0]);
    expect(parsed.command).toBe('evolve rollback');
  });
});
