import { Command } from 'commander';

jest.mock('../../governance/policy-registry', () => ({
  PolicyRegistry: jest.fn().mockImplementation(() => ({
    register: jest.fn(),
    list: jest.fn().mockReturnValue([{ id: 'default', name: 'Default Policy', rules: [] }]),
  })),
}));

jest.mock('../../governance/permission-engine', () => ({
  evaluatePermission: jest.fn().mockReturnValue({
    allowed: true,
    requiresApproval: false,
    policyId: 'default',
    reason: 'Permitido por politica padrao',
  }),
}));

jest.mock('../../governance/governance-policy', () => ({
  DEFAULT_GOVERNANCE_POLICY: { id: 'default', name: 'Default Policy', rules: [] },
}));

jest.mock('../../governance/governance-audit', () => ({
  buildGovernanceAudit: jest.fn().mockReturnValue({
    policyId: 'default',
    action: 'test',
    contextId: 'default',
    allowed: true,
    requiresApproval: false,
    decidedAt: new Date().toISOString(),
    reason: 'Permitido',
  }),
  GovernanceAuditEntry: jest.fn(),
}));

jest.mock('../../governance/governance-report', () => ({
  buildGovernanceReport: jest.fn().mockReturnValue({
    summary: ['1 politica registrada', '0 auditorias realizadas'],
    policies: [{ id: 'default', name: 'Default Policy' }],
    audits: [],
  }),
}));

jest.mock('../../governance/governance-context', () => ({
  buildGovernanceContext: jest.fn().mockReturnValue({
    contextId: 'default',
    risk: 'medium',
    timestamp: new Date().toISOString(),
  }),
}));

jest.mock('../../ecosystem/governance-council', () => ({
  decideGovernance: jest.fn().mockReturnValue({
    topic: 'test',
    approved: true,
    reason: 'Maioria aprovou',
  }),
}));

jest.mock('../../ecosystem/federation-auditor', () => ({
  auditEcosystem: jest.fn(),
}));

jest.mock('../../hardening/output-contract', () => ({
  createEnvelope: jest.fn((data: unknown) => data),
}));

jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
  printResult: jest.fn(),
}));

jest.mock('../../utils/version', () => ({
  getCliVersion: jest.fn().mockReturnValue('1.0.0-test'),
}));

import { governanceCommand } from '../governance';

describe('governanceCommand', () => {
  it('returns a Commander Command with name governance', () => {
    const cmd = governanceCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('governance');
  });

  it('has description', () => {
    const cmd = governanceCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has subcommand check', () => {
    const cmd = governanceCommand();
    const sub = cmd.commands.find(c => c.name() === 'check');
    expect(sub).toBeDefined();
  });

  it('has subcommand audit', () => {
    const cmd = governanceCommand();
    const sub = cmd.commands.find(c => c.name() === 'audit');
    expect(sub).toBeDefined();
  });

  it('has subcommand report', () => {
    const cmd = governanceCommand();
    const sub = cmd.commands.find(c => c.name() === 'report');
    expect(sub).toBeDefined();
  });

  it('has subcommand vote', () => {
    const cmd = governanceCommand();
    const sub = cmd.commands.find(c => c.name() === 'vote');
    expect(sub).toBeDefined();
  });

  it('has subcommand decide', () => {
    const cmd = governanceCommand();
    const sub = cmd.commands.find(c => c.name() === 'decide');
    expect(sub).toBeDefined();
  });

  it('has subcommand review', () => {
    const cmd = governanceCommand();
    const sub = cmd.commands.find(c => c.name() === 'review');
    expect(sub).toBeDefined();
  });

  it('returns all expected subcommands', () => {
    const cmd = governanceCommand();
    const names = cmd.commands.map(c => c.name());
    expect(names).toEqual(expect.arrayContaining(['check', 'audit', 'report', 'vote', 'decide', 'review']));
  });
});
