import { PolicyManager } from '../src/policy-manager';

describe('PolicyManager', () => {
  let manager: PolicyManager;

  beforeEach(() => {
    manager = new PolicyManager();
  });

  test('createPolicy creates a new policy', () => {
    const policy = manager.createPolicy('Data Retention Policy', 'How long we keep data');
    expect(policy.title).toBe('Data Retention Policy');
    expect(policy.status).toBe('draft');
    expect(policy.id).toBeDefined();
    expect(policy.version).toBe('1.0.0');
  });

  test('activatePolicy changes status to active', () => {
    const policy = manager.createPolicy('Active Policy', 'Test');
    const activated = manager.activatePolicy(policy.id);
    expect(activated!.status).toBe('active');
    expect(manager.getPolicy(policy.id)!.status).toBe('active');
  });

  test('activatePolicy deactivates previously active policy', () => {
    const p1 = manager.createPolicy('My Policy', 'v1');
    manager.activatePolicy(p1.id);
    const p2 = manager.createPolicy('My Policy', 'v2');
    manager.activatePolicy(p2.id);
    expect(manager.getPolicy(p1.id)!.status).toBe('draft');
    expect(manager.getPolicy(p2.id)!.status).toBe('active');
  });

  test('archivePolicy changes status to archived', () => {
    const policy = manager.createPolicy('Archive Me', 'Test');
    manager.activatePolicy(policy.id);
    const archived = manager.archivePolicy(policy.id);
    expect(archived!.status).toBe('archived');
  });

  test('getActivePolicy returns the active policy', () => {
    const p1 = manager.createPolicy('My Policy', 'content');
    manager.activatePolicy(p1.id);
    const active = manager.getActivePolicy();
    expect(active).toBeDefined();
    expect(active!.id).toBe(p1.id);
  });

  test('getActivePolicy returns undefined when none active', () => {
    manager.createPolicy('Inactive', 'draft');
    expect(manager.getActivePolicy()).toBeUndefined();
  });

  test('listPolicies returns all policies', () => {
    manager.createPolicy('P1', 'First');
    manager.createPolicy('P2', 'Second');
    expect(manager.listPolicies()).toHaveLength(2);
  });

  test('listPolicies filters by status', () => {
    const p = manager.createPolicy('Test', 'Content');
    manager.activatePolicy(p.id);
    expect(manager.listPolicies('draft')).toHaveLength(0);
    expect(manager.listPolicies('active')).toHaveLength(1);
  });

  test('compareVersions returns comparison between two policies', () => {
    const p1 = manager.createPolicy('Compare', 'Initial content');
    manager.activatePolicy(p1.id);
    const p2 = manager.createPolicy('Compare', 'Updated content');
    const diff = manager.compareVersions(p1.id, p2.id);
    expect(diff).toBeDefined();
    expect(diff.same).toBe(false);
    expect(diff.idA).toBeDefined();
    expect(diff.idB).toBeDefined();
  });

  test('compareVersions returns same=true for identical content', () => {
    const p1 = manager.createPolicy('Same', 'Content');
    const p2 = manager.createPolicy('Same', 'Content');
    const diff = manager.compareVersions(p1.id, p2.id);
    expect(diff.same).toBe(true);
  });

  test('getPolicy returns undefined for unknown ID', () => {
    expect(manager.getPolicy('nonexistent')).toBeUndefined();
  });

  test('archivePolicy returns undefined for unknown ID', () => {
    expect(manager.archivePolicy('nonexistent')).toBeUndefined();
  });
});
