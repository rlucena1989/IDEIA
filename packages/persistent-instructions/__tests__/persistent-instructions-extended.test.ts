import { PersistentInstructions, createPersistentInstructions } from '../src/persistent-instructions';

describe('PersistentInstructions - extended', () => {
  let pi: PersistentInstructions;

  beforeEach(() => {
    pi = new PersistentInstructions('/tmp/test-pi');
  });

  it('adds an instruction and returns it', () => {
    const inst = pi.add('Rule 1', 'Always use TypeScript strict mode', 'project');
    expect(inst.id).toBeDefined();
    expect(inst.title).toBe('Rule 1');
    expect(inst.status).toBe('active');
    expect(inst.version).toBe(1);
  });

  it('get returns instruction by id', () => {
    const inst = pi.add('Test', 'Content', 'project');
    const found = pi.get(inst.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe('Test');
  });

  it('get returns undefined for missing id', () => {
    expect(pi.get('non-existent')).toBeUndefined();
  });

  it('findByTitle finds active instruction', () => {
    pi.add('Unique Title', 'Content', 'project');
    const found = pi.findByTitle('Unique Title');
    expect(found).toBeDefined();
  });

  it('findByTitle returns undefined for non-existent', () => {
    expect(pi.findByTitle('Does Not Exist')).toBeUndefined();
  });

  it('adding same title supersedes previous', () => {
    pi.add('Same Title', 'Version 1', 'project');
    const v2 = pi.add('Same Title', 'Version 2', 'project');
    const found = pi.findByTitle('Same Title');
    expect(found?.id).toBe(v2.id);
    expect(found?.version).toBe(2);
  });

  it('listActive returns sorted by priority', () => {
    pi.add('Low Prio', 'Content', 'project', 'low');
    pi.add('Critical Prio', 'Content', 'project', 'critical');
    pi.add('High Prio', 'Content', 'project', 'high');
    const active = pi.listActive();
    expect(active[0].priority).toBe('critical');
    expect(active[1].priority).toBe('high');
    expect(active[2].priority).toBe('low');
  });

  it('listActive filters by scope', () => {
    pi.add('Global', 'Content', 'global');
    pi.add('Project', 'Content', 'project');
    const projectOnly = pi.listActive('project');
    expect(projectOnly.length).toBe(1);
    expect(projectOnly[0].scope).toBe('project');
  });

  it('archive sets status', () => {
    const inst = pi.add('Archivable', 'Content', 'project');
    expect(pi.archive(inst.id)).toBe(true);
    const found = pi.get(inst.id);
    expect(found?.status).toBe('archived');
  });

  it('archive returns false for non-existent', () => {
    expect(pi.archive('non-existent')).toBe(false);
  });

  it('detectConflicts finds no conflicts with single instruction', () => {
    pi.add('Only One', 'Content', 'project');
    const conflicts = pi.detectConflicts();
    expect(conflicts).toEqual([]);
  });

  it('search finds instructions by content', () => {
    pi.add('Searchable', 'This contains unique-search-term-xyz', 'project');
    const results = pi.search('unique-search-term-xyz');
    expect(results.length).toBe(1);
  });

  it('search finds instructions by tag', () => {
    pi.add('Tagged', 'Content', 'project', 'medium', ['important-tag']);
    const results = pi.search('important-tag');
    expect(results.length).toBe(1);
  });

  it('count returns number of instructions', () => {
    expect(pi.count()).toBe(0);
    pi.add('A', 'Content', 'project');
    pi.add('B', 'Content', 'project');
    expect(pi.count()).toBe(2);
  });

  it('createPersistentInstructions factory works', () => {
    const inst = createPersistentInstructions();
    expect(inst).toBeInstanceOf(PersistentInstructions);
  });
});
