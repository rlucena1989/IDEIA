import { PersistentInstructions } from '../src/persistent-instructions';

describe('PersistentInstructions', () => {
  it('should add instruction', () => {
    const pi = new PersistentInstructions();
    const inst = pi.add('Use TypeScript', 'Write all code in TypeScript', 'project', 'high', ['typescript', 'style'], 'user');
    expect(inst.title).toBe('Use TypeScript');
    expect(inst.status).toBe('active');
    expect(inst.version).toBe(1);
  });

  it('should version and supersede', () => {
    const pi = new PersistentInstructions();
    const v1 = pi.add('Naming', 'Use camelCase', 'project');
    const v2 = pi.add('Naming', 'Use kebab-case for files', 'project');
    expect(v2.version).toBe(2);
    expect(v2.supersededBy).toBe(v1.id);
    const old = pi.get(v1.id);
    expect(old!.status).toBe('superseded');
  });

  it('should list active with correct count', () => {
    const pi = new PersistentInstructions();
    pi.add('Rule A', 'Rule A content', 'project', 'low');
    pi.add('Rule B', 'Rule B content', 'project', 'high');
    pi.add('Rule C', 'Rule C content', 'project', 'critical');
    const active = pi.listActive();
    expect(active).toHaveLength(3);
  });

  it('should sort by priority', () => {
    const pi = new PersistentInstructions();
    const low = pi.add('L', 'Low priority', 'project', 'low');
    const _high = pi.add('H', 'High priority', 'project', 'high');
    const critical = pi.add('C', 'Critical priority', 'project', 'critical');
    const sorted = pi.listActive();
    expect(sorted[0].id).toBe(critical.id);
    expect(sorted[2].id).toBe(low.id);
  });

  it('should filter by scope', () => {
    const pi = new PersistentInstructions();
    pi.add('Global rule', 'Global', 'global');
    pi.add('Project rule', 'Project-level', 'project');
    expect(pi.listActive('project')).toHaveLength(1);
    expect(pi.listActive('global')).toHaveLength(1);
  });

  it('should archive', () => {
    const pi = new PersistentInstructions();
    const inst = pi.add('Old rule', 'Outdated', 'project', 'low');
    expect(pi.archive(inst.id)).toBe(true);
    expect(pi.get(inst.id)!.status).toBe('archived');
  });

  it('should search', () => {
    const pi = new PersistentInstructions();
    pi.add('React Hooks', 'Use React hooks', 'project', 'medium', ['react']);
    pi.add('Node Versions', 'Use Node 20', 'project', 'high', ['node']);
    expect(pi.search('react')).toHaveLength(1);
    expect(pi.search('node')).toHaveLength(1);
    expect(pi.search('nonexistent')).toHaveLength(0);
  });

  it('should detect conflicts', () => {
    const pi = new PersistentInstructions();
    pi.add('DB', 'Use PostgreSQL', 'project', 'critical', [], 'user', ['database']);
    pi.add('DB2', 'Use MongoDB', 'project', 'critical', [], 'user', ['database']);
    const conflicts = pi.detectConflicts();
    expect(conflicts.length).toBeGreaterThanOrEqual(1);
  });

  it('should save and load', () => {
    const pi = new PersistentInstructions();
    pi.add('Test instruction', 'Test content', 'project');
    expect(pi.count()).toBe(1);
  });
});
