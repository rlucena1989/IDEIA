import { EndpointGuard } from '../src/endpoint-guard';

describe('EndpointGuard', () => {
  it('should block destructive delete', () => {
    const guard = new EndpointGuard();
    const result = guard.check({ action: 'delete', resource: '/etc/config.yaml', actor: 'ai-agent' });
    expect(result.allowed).toBe(false);
    expect(result.bypassed).toBe(false);
  });

  it('should allow write with medium risk', () => {
    const guard = new EndpointGuard();
    const result = guard.check({ action: 'write', resource: 'src/main.ts', actor: 'dev' });
    expect(result.allowed).toBe(false);
    expect(result.requiresApproval).toBe(true);
  });

  it('should allow create with bypass reason', () => {
    const guard = new EndpointGuard();
    const result = guard.check({ action: 'create', resource: 'src/new.ts', actor: 'admin', bypassReason: 'Approved by lead' });
    expect(result.allowed).toBe(true);
    expect(result.bypassed).toBe(true);
    expect(result.reason).toContain('Approved by lead');
  });

  it('should block shell exec', () => {
    const guard = new EndpointGuard();
    const result = guard.check({ action: 'shell', resource: 'rm -rf /' });
    expect(result.allowed).toBe(false);
  });

  it('should handle batch checks', () => {
    const guard = new EndpointGuard();
    const results = guard.checkBatch([
      { action: 'write', resource: 'src/file.ts', actor: 'dev' },
      { action: 'delete', resource: 'src/old.ts', actor: 'ai-agent' },
      { action: 'create', resource: 'src/new.ts', actor: 'admin', bypassReason: 'Approved' },
    ]);
    expect(results).toHaveLength(3);
    expect(results[2].bypassed).toBe(true);
    expect(results[2].allowed).toBe(true);
  });

  it('should maintain audit log', () => {
    const guard = new EndpointGuard();
    guard.check({ action: 'write', resource: 'file.ts', actor: 'tester' });
    guard.check({ action: 'delete', resource: 'config.yml', actor: 'admin' });
    expect(guard.getAuditLog()).toHaveLength(2);
  });

  it('should rename medium risk', () => {
    const guard = new EndpointGuard();
    const result = guard.check({ action: 'rename', resource: 'src/old.ts', actor: 'dev' });
    expect(result.requiresApproval).toBe(true);
  });
});
