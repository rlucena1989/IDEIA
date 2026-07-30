import { Command } from 'commander';

jest.mock('@ideia/audit-trail', () => ({
  AuditTrail: jest.fn(),
}));

import { AuditTrail } from '@ideia/audit-trail';
import { auditTrailCommand } from '../audit-trail';

const mockAuditTrail = () => ({
  load: jest.fn().mockReturnValue([
    { timestamp: '2026-07-22T10:00:00.000Z', eventType: 'cmd.exec', actor: 'user', target: 'status', result: 'pass' },
    { timestamp: '2026-07-22T10:01:00.000Z', eventType: 'cmd.exec', actor: 'user', target: 'recover', result: 'pass' },
  ]),
  verifyChain: jest.fn().mockReturnValue({ valid: true, totalEvents: 2, currentTipHash: 'abc123' }),
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (AuditTrail as jest.Mock).mockImplementation(() => mockAuditTrail());
});

describe('auditTrailCommand', () => {
  it('returns a Commander Command with name audit-trail', () => {
    const auditTrail = new AuditTrail('/tmp/.ideia/audit.json');
    const cmd = auditTrailCommand(auditTrail);
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('audit-trail');
  });

  it('has description', () => {
    const auditTrail = new AuditTrail('/tmp/.ideia/audit.json');
    const cmd = auditTrailCommand(auditTrail);
    expect(cmd.description()).toBeTruthy();
  });

  it('has sub-commands query, verify, status', () => {
    const auditTrail = new AuditTrail('/tmp/.ideia/audit.json');
    const cmd = auditTrailCommand(auditTrail);
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toEqual(expect.arrayContaining(['query', 'verify', 'status']));
  });
});
