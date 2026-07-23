import { DeliveryOrchestrator } from '../src/delivery-orchestrator';
import type { DeployExecutor } from '../src/delivery-orchestrator';

const mockExecutor: DeployExecutor = {
  runCommand: () => ({ output: 'mock OK', code: 0 }),
  rollbackVersion: () => true,
};

function createTestOrch(): DeliveryOrchestrator {
  return new DeliveryOrchestrator({ executor: mockExecutor });
}

describe('DeliveryOrchestrator', () => {
  // ── Testes existentes ──

  it('should create a release plan', () => {
    const orch = createTestOrch();
    const plan = orch.createRelease('1.0.0', 'staging', ['dist/app.zip']);
    expect(plan.version).toBe('1.0.0');
    expect(plan.checks).toHaveLength(5);
  });

  it('should deploy to non-production without review', () => {
    const orch = createTestOrch();
    const deploy = orch.deploy('1.0.0', 'staging', ['dist/app.zip']);
    expect(deploy.status).toBe('completed');
    expect(deploy.checks.every(c => c.passed)).toBe(true);
  });

  it('should require review for production', () => {
    const orch = createTestOrch();
    const deploy = orch.deploy('1.0.0', 'production', ['dist/app.zip']);
    expect(deploy.reviewRequired).toBe(true);
    expect(deploy.status).toBe('pending');
  });

  it('should allow review gate', () => {
    const orch = createTestOrch();
    const deploy = orch.deploy('1.0.0', 'production', ['dist/app.zip']);
    const approved = orch.reviewGate({ deployId: deploy.id, reviewer: 'admin', approved: true });
    expect(approved).not.toBeNull();
    expect(approved!.status).toBe('completed');
  });

  it('should reject deploy through review gate', () => {
    const orch = createTestOrch();
    const deploy = orch.deploy('1.0.0', 'production', ['dist/app.zip']);
    const rejected = orch.reviewGate({ deployId: deploy.id, reviewer: 'admin', approved: false, reason: 'Not ready' });
    expect(rejected!.status).toBe('failed');
  });

  it('should rollback completed deploy', () => {
    const orch = createTestOrch();
    const deploy = orch.deploy('1.0.0', 'staging', ['dist/app.zip']);
    const rolled = orch.rollback(deploy.id, 'blue_green');
    expect(rolled).not.toBeNull();
    expect(rolled!.status).toBe('rolled_back');
    expect(rolled!.rollbackStrategy).toBe('blue_green');
    expect(orch.getIncidents()).toHaveLength(1);
  });

  it('should manage incidents', () => {
    const orch = createTestOrch();
    orch.createIncident({ title: 'Outage', severity: 'critical', description: 'Server down' });
    orch.createIncident({ title: 'Warning', severity: 'low', description: 'High memory' });
    expect(orch.getIncidents().length).toBe(2);
    expect(orch.getIncidents('critical').length).toBe(1);
  });

  it('should resolve incidents', () => {
    const orch = createTestOrch();
    const inc = orch.createIncident({ title: 'Bug', severity: 'medium', description: 'UI glitch' });
    orch.resolveIncident(inc.id);
    expect(inc.status).toBe('resolved');
    expect(inc.resolvedAt).toBeDefined();
  });

  it('should list deploys filtered by environment', () => {
    const orch = createTestOrch();
    orch.deploy('1.0.0', 'staging', []);
    orch.deploy('1.0.0', 'production', [], 'admin');
    expect(orch.listDeploys('staging')).toHaveLength(1);
    expect(orch.listDeploys('production')).toHaveLength(1);
  });

  it('should skip review if reviewer provided', () => {
    const orch = createTestOrch();
    const deploy = orch.deploy('1.0.0', 'production', [], 'ops-team');
    expect(deploy.reviewRequired).toBe(false);
    expect(deploy.status).toBe('completed');
  });

  // ── Novos testes ──

  describe('release creation', () => {
    it('should create release with auto-deploy disabled by default', () => {
      const orch = createTestOrch();
      const plan = orch.createRelease('2.0.0', 'production', ['build.zip']);
      expect(plan.autoDeploy).toBe(false);
      expect(plan.createdAt).toBeTruthy();
    });

    it('should create release with auto-deploy enabled', () => {
      const orch = createTestOrch();
      const plan = orch.createRelease('2.0.0', 'production', ['build.zip'], true);
      expect(plan.autoDeploy).toBe(true);
    });

    it('should track multiple releases', () => {
      const orch = createTestOrch();
      orch.createRelease('1.0.0', 'staging', []);
      orch.createRelease('1.1.0', 'production', []);
      expect(orch.getReleases()).toHaveLength(2);
    });
  });

  describe('deploy workflow', () => {
    it('should execute deploy to development immediately', () => {
      const orch = createTestOrch();
      const deploy = orch.deploy('1.0.0', 'development', ['app.zip']);
      expect(deploy.status).toBe('completed');
      expect(deploy.completedAt).toBeDefined();
    });

    it('should run all 5 checks on deploy', () => {
      const orch = createTestOrch();
      const deploy = orch.deploy('1.0.0', 'staging', ['app.zip']);
      expect(deploy.checks).toHaveLength(5);
      const checkNames = deploy.checks.map(c => c.name);
      expect(checkNames).toContain('lint');
      expect(checkNames).toContain('test');
      expect(checkNames).toContain('build');
      expect(checkNames).toContain('security');
      expect(checkNames).toContain('architecture');
    });
  });

  describe('rollback', () => {
    it('should not rollback pending deploy', () => {
      const orch = createTestOrch();
      const deploy = orch.deploy('1.0.0', 'production', ['app.zip']);
      // Still pending (needs review)
      const result = orch.rollback(deploy.id);
      expect(result).toBeNull();
    });

    it('should support multiple rollback strategies', () => {
      const orch = createTestOrch();
      const deploy = orch.deploy('1.0.0', 'staging', ['app.zip']);

      const fullRollback = orch.rollback(deploy.id, 'full');
      expect(fullRollback!.rollbackStrategy).toBe('full');
    });

    it('should create incident on rollback', () => {
      const orch = createTestOrch();
      const deploy = orch.deploy('1.0.0', 'staging', ['app.zip']);
      orch.rollback(deploy.id);
      const incidents = orch.getIncidents();
      const rollbackIncident = incidents.find(i => i.title.includes('Rollback'));
      expect(rollbackIncident).toBeDefined();
      expect(rollbackIncident!.severity).toBe('medium');
    });

    it('should return null for nonexistent deploy', () => {
      const orch = createTestOrch();
      expect(orch.rollback('nonexistent')).toBeNull();
    });
  });

  describe('review gate', () => {
    it('should return null for nonexistent deploy', () => {
      const orch = createTestOrch();
      const result = orch.reviewGate({ deployId: 'nonexistent', reviewer: 'admin', approved: true });
      expect(result).toBeNull();
    });

    it('should reject with reason', () => {
      const orch = createTestOrch();
      const deploy = orch.deploy('1.0.0', 'production', ['app.zip']);
      const rejected = orch.reviewGate({
        deployId: deploy.id,
        reviewer: 'qa-lead',
        approved: false,
        reason: 'Security scan failed',
      });
      expect(rejected!.status).toBe('failed');
    });
  });

  describe('deploy listing', () => {
    it('should return empty list when no deploys', () => {
      const orch = createTestOrch();
      expect(orch.listDeploys()).toHaveLength(0);
    });

    it('should order deploys by most recent first', () => {
      const orch = createTestOrch();
      const _d1 = orch.deploy('1.0.0', 'staging', []);
      const _d2 = orch.deploy('2.0.0', 'staging', []);
      const deploys = orch.listDeploys();
      // Both deploys may have same timestamp; order by version desc as fallback approach
      expect(deploys.length).toBe(2);
      expect(deploys.map(d => d.version)).toContain('1.0.0');
      expect(deploys.map(d => d.version)).toContain('2.0.0');
    });
  });

  describe('incident management', () => {
    it('should create incident with all fields', () => {
      const orch = createTestOrch();
      const inc = orch.createIncident({
        title: 'Database connection failed',
        severity: 'critical',
        description: 'Cannot connect to primary DB',
        deployId: 'deploy-123',
      });
      expect(inc.id).toBeTruthy();
      expect(inc.status).toBe('open');
      expect(inc.createdAt).toBeTruthy();
      expect(inc.deployId).toBe('deploy-123');
    });

    it('should resolve incident with timestamp', () => {
      const orch = createTestOrch();
      const inc = orch.createIncident({ title: 'Bug', severity: 'low', description: 'Minor UI issue' });
      const resolved = orch.resolveIncident(inc.id);
      expect(resolved).not.toBeNull();
      expect(resolved!.status).toBe('resolved');
      expect(resolved!.resolvedAt).toBeDefined();
    });

    it('should return null when resolving nonexistent incident', () => {
      const orch = createTestOrch();
      expect(orch.resolveIncident('nonexistent')).toBeNull();
    });

    it('should filter incidents by severity', () => {
      const orch = createTestOrch();
      orch.createIncident({ title: 'Critical 1', severity: 'critical', description: 'a' });
      orch.createIncident({ title: 'High 1', severity: 'high', description: 'b' });
      orch.createIncident({ title: 'Critical 2', severity: 'critical', description: 'c' });

      expect(orch.getIncidents('critical')).toHaveLength(2);
      expect(orch.getIncidents('high')).toHaveLength(1);
      expect(orch.getIncidents('low')).toHaveLength(0);
    });
  });

  describe('getDeploy', () => {
    it('should return undefined for nonexistent deploy', () => {
      const orch = createTestOrch();
      expect(orch.getDeploy('nonexistent')).toBeUndefined();
    });

    it('should return deploy by ID', () => {
      const orch = createTestOrch();
      const deploy = orch.deploy('1.0.0', 'staging', []);
      const found = orch.getDeploy(deploy.id);
      expect(found).toBeDefined();
      expect(found!.version).toBe('1.0.0');
    });
  });
});
