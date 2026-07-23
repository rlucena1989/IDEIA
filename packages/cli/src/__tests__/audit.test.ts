import { runAudit, AuditDeps } from '../commands/audit';

function makeDeps(overrides: Partial<AuditDeps> = {}): AuditDeps {
  return {
    cwd: '/test',
    __dirname: '/test/cli/src/commands',
    existsSync: () => true,
    statSync: () => ({ size: 100 }),
    readdirSync: () => [],
    spawnSync: () => ({ status: 0, stdout: 'AI-Devkit initialized', stderr: '' }),
    computeStatus: () => ({ belowRecommended: false }),
    log: () => {},
    ...overrides,
  };
}

describe('runAudit', () => {
  it('returns empty findings when all checks pass', () => {
    const result = runAudit(makeDeps());
    expect(result.allChecksPassed).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('reports missing agent safety policy', () => {
    const deps = makeDeps({
      existsSync: (p: string) => !p.includes('agent-safety-policy'),
    });
    const result = runAudit(deps);
    expect(result.findings.some(f => f.id === 'SEC-AGENT-POLICY-MISSING')).toBe(true);
  });

  it('reports missing adapter contract', () => {
    const deps = makeDeps({
      existsSync: (p: string) => !p.includes('adapter-contract'),
    });
    const result = runAudit(deps);
    expect(result.findings.some(f => f.id === 'ARCH-ADAPTER-CONTRACT-MISSING')).toBe(true);
  });

  it('reports missing critical files', () => {
    const deps = makeDeps({
      existsSync: (p: string) => !p.includes('laws.yaml') && !p.includes('project-manifest') && !p.includes('ai-handoff'),
    });
    const result = runAudit(deps);
    const e2eFindings = result.findings.filter(f => f.id.startsWith('E2E-FILE-MISSING'));
    expect(e2eFindings.length).toBe(3);
  });

  it('reports empty critical files', () => {
    const deps = makeDeps({
      statSync: () => ({ size: 3 }),
    });
    const result = runAudit(deps);
    expect(result.findings.some(f => f.id.startsWith('E2E-FILE-EMPTY'))).toBe(true);
  });

  it('reports failed audit checks', () => {
    const deps = makeDeps({
      spawnSync: () => ({ status: 1, stdout: '', stderr: 'error' }),
    });
    const result = runAudit(deps);
    expect(result.allChecksPassed).toBe(false);
    expect(result.findings.some(f => f.id.startsWith('AUDIT-CHECK-FAILED'))).toBe(true);
  });

  it('reports status check failure', () => {
    const deps = makeDeps({
      computeStatus: () => ({ belowRecommended: true }),
    });
    const result = runAudit(deps);
    expect(result.findings.some(f => f.id === 'STATUS-CHECK-FAILED')).toBe(true);
  });

  it('reports doctor failure', () => {
    const deps = makeDeps({
      spawnSync: () => ({ status: 1, stdout: '', stderr: '' }),
    });
    const result = runAudit(deps);
    expect(result.findings.some(f => f.id === 'E2E-DOCTOR-FAILED')).toBe(true);
  });

  it('reports missing dist index', () => {
    const deps = makeDeps({
      existsSync: (p: string) => !p.includes('index.js'),
    });
    const result = runAudit(deps);
    expect(result.findings.some(f => f.id === 'E2E-BUILD-MISSING')).toBe(true);
  });

  it('reports feature brief issues', () => {
    const deps = makeDeps({
      readdirSync: () => ['login', 'backup'],
      existsSync: (p: string) => !p.includes('feature-brief.md'),
    });
    const result = runAudit(deps);
    expect(result.findings.some(f => f.id === 'E2E-FEATURE-BRIEF-MISSING-LOGIN')).toBe(true);
  });

  it('reports skeleton syntax error', () => {
    const deps = makeDeps({
      spawnSync: (cmd, args) => {
        if (args.includes('-c')) return { status: 1, stdout: '', stderr: 'syntax error' };
        return { status: 0, stdout: 'AI-Devkit initialized', stderr: '' };
      },
    });
    const result = runAudit(deps);
    expect(result.findings.some(f => f.id === 'E2E-SKELETON-INVALID')).toBe(true);
  });

  it('allChecksPassed is false when an audit check fails', () => {
    const deps = makeDeps({
      spawnSync: () => ({ status: 1, stdout: '', stderr: '' }),
    });
    const result = runAudit(deps);
    expect(result.allChecksPassed).toBe(false);
  });
});
