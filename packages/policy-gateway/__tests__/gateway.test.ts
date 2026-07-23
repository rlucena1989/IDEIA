import { PolicyGateway, processRequest, processBatch } from '../src/gateway';

describe('processRequest', () => {
  it('should allow low risk actions', () => {
    const res = processRequest({ actionType: 'file.read', riskLevel: 'low' });
    expect(res.allowed).toBe(true);
    expect(res.requiresApproval).toBe(false);
  });

  it('should block high risk actions', () => {
    const res = processRequest({ actionType: 'file.delete', riskLevel: 'high' });
    expect(res.allowed).toBe(false);
    expect(res.decision).toBe('block');
  });

  it('should require approval for medium risk', () => {
    const res = processRequest({ actionType: 'file.write', riskLevel: 'medium' });
    expect(res.requiresApproval).toBe(true);
    expect(res.decision).toBe('ask');
  });

  it('should block destructive patterns', () => {
    const res = processRequest({ actionType: 'shell.exec', resource: 'rm -rf /' });
    expect(res.allowed).toBe(false);
    expect(res.decision).toBe('block');
  });
});

describe('processBatch', () => {
  it('should process multiple requests', () => {
    const results = processBatch([
      { actionType: 'file.read', riskLevel: 'low' },
      { actionType: 'file.delete', riskLevel: 'high' },
      { actionType: 'file.write', riskLevel: 'medium' },
    ]);
    expect(results).toHaveLength(3);
    expect(results[0].allowed).toBe(true);
    expect(results[1].decision).toBe('block');
    expect(results[2].requiresApproval).toBe(true);
  });
});

describe('PolicyGateway', () => {
  it('should maintain audit log', () => {
    const gateway = new PolicyGateway();
    gateway.evaluate({ actionType: 'file.read', actor: 'user1' });
    gateway.evaluate({ actionType: 'file.delete', actor: 'user2', riskLevel: 'high' });
    const log = gateway.getAuditLog();
    expect(log).toHaveLength(2);
    expect(log[0].actor).toBe('user1');
    expect(log[0].decision).toBe('auto');
    expect(log[1].actor).toBe('user2');
    expect(log[1].decision).toBe('block');
  });

  it('should clear audit log', () => {
    const gateway = new PolicyGateway();
    gateway.evaluate({ actionType: 'file.read', actor: 'test' });
    gateway.clearAuditLog();
    expect(gateway.getAuditLog()).toHaveLength(0);
  });

  it('should handle batch evaluation with audit', () => {
    const gateway = new PolicyGateway();
    const requests = [
      { actionType: 'file.read', actor: 'tester' },
      { actionType: 'policy.change', actor: 'admin', riskLevel: 'high' as const },
    ];
    gateway.evaluateBatch(requests);
    expect(gateway.getAuditLog()).toHaveLength(2);
  });
});
