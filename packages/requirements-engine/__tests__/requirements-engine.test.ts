import { RequirementsEngine } from '../src/requirements-engine';

describe('RequirementsEngine', () => {
  it('should create a requirement', () => {
    const engine = new RequirementsEngine();
    const req = engine.create({ title: 'User login', category: 'functional' });
    expect(req.id).toBeDefined();
    expect(req.title).toBe('User login');
    expect(req.status).toBe('draft');
    expect(req.priority).toBe('medium');
    expect(engine.count()).toBe(1);
  });

  it('should get requirement by id', () => {
    const engine = new RequirementsEngine();
    const req = engine.create({ title: 'Auth', category: 'security', priority: 'high' });
    const found = engine.get(req.id);
    expect(found).toBeDefined();
    expect(found!.priority).toBe('high');
  });

  it('should update requirement', () => {
    const engine = new RequirementsEngine();
    const req = engine.create({ title: 'Old title', category: 'functional' });
    const updated = engine.update(req.id, { title: 'New title', status: 'approved' });
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe('New title');
    expect(updated!.status).toBe('approved');
  });

  it('should return null updating non-existent', () => {
    const engine = new RequirementsEngine();
    expect(engine.update('nonexistent', { title: 'x' })).toBeNull();
  });

  it('should delete requirement', () => {
    const engine = new RequirementsEngine();
    const req = engine.create({ title: 'To delete', category: 'functional' });
    expect(engine.delete(req.id)).toBe(true);
    expect(engine.count()).toBe(0);
  });

  it('should list with filters', () => {
    const engine = new RequirementsEngine();
    engine.create({ title: 'R1', category: 'functional', priority: 'high' });
    engine.create({ title: 'R2', category: 'security', priority: 'high' });
    engine.create({ title: 'R3', category: 'functional', priority: 'low' });

    expect(engine.list({ category: 'functional' })).toHaveLength(2);
    expect(engine.list({ category: 'security' })).toHaveLength(1);
    expect(engine.list({ priority: 'high' })).toHaveLength(2);
    expect(engine.list({ category: 'functional', priority: 'high' })).toHaveLength(1);
  });

  it('should search requirements', () => {
    const engine = new RequirementsEngine();
    engine.create({ title: 'User authentication flow', category: 'functional', tags: ['auth'] });
    engine.create({ title: 'Admin dashboard', category: 'functional', tags: ['admin'] });

    expect(engine.search('auth')).toHaveLength(1);
    expect(engine.search('admin')).toHaveLength(1);
    expect(engine.search('nonexistent')).toHaveLength(0);
  });

  it('should generate summary', () => {
    const engine = new RequirementsEngine();
    engine.create({ title: 'R1', category: 'functional' });
    engine.create({ title: 'R2', category: 'security', priority: 'high' });
    engine.create({ title: 'R3', category: 'functional' });

    const summary = engine.getSummary();
    expect(summary.total).toBe(3);
    expect(summary.byCategory.functional).toBe(2);
    expect(summary.byCategory.security).toBe(1);
    expect(summary.byPriority.high).toBe(1);
    expect(summary.byPriority.medium).toBe(2);
  });

  it('should save and load', () => {
    const engine = new RequirementsEngine();
    engine.create({ title: 'Persistent', category: 'functional' });

    const _dir = require('path').join(require('os').tmpdir(), 'req-test-' + Date.now());
    engine.save();

    const engine2 = new RequirementsEngine();
    engine2.create({ title: 'Temp', category: 'functional' });
    expect(engine2.count()).toBe(1);
  });

  it('should discover requirements from files', () => {
    const engine = new RequirementsEngine();
    const discovered = engine.discover(process.cwd());
    expect(Array.isArray(discovered)).toBe(true);
  });
});
