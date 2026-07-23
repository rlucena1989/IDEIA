import { TutorialRegistry } from '../src/registry';
import { Tutorial } from '../src/types';

function makeTutorial(overrides: Partial<Tutorial> = {}): Tutorial {
  return {
    id: 'test-tutorial',
    name: 'Test Tutorial',
    description: 'A test tutorial',
    difficulty: 'beginner',
    prerequisites: [],
    steps: [{ id: 'step-1', title: 'Step 1', description: 'First step', hint: 'Try hard', type: 'shell' }],
    estimatedMinutes: 5,
    tags: ['test'],
    ...overrides,
  };
}

describe('TutorialRegistry', () => {
  let registry: TutorialRegistry;

  beforeEach(() => {
    registry = new TutorialRegistry();
  });

  it('should register and retrieve a tutorial', () => {
    const t = makeTutorial();
    registry.register(t);
    expect(registry.get('test-tutorial').id).toBe('test-tutorial');
  });

  it('should throw when getting unknown tutorial', () => {
    expect(() => registry.get('unknown')).toThrow('Tutorial not found');
  });

  it('should list all registered tutorials', () => {
    registry.register(makeTutorial({ id: 't1', name: 'T1', difficulty: 'beginner' }));
    registry.register(makeTutorial({ id: 't2', name: 'T2', difficulty: 'intermediate' }));
    expect(registry.list()).toHaveLength(2);
  });

  it('should filter by difficulty', () => {
    registry.register(makeTutorial({ id: 't1', difficulty: 'beginner' }));
    registry.register(makeTutorial({ id: 't2', difficulty: 'advanced' }));
    const beginners = registry.list({ difficulty: 'beginner' });
    expect(beginners).toHaveLength(1);
    expect(beginners[0].id).toBe('t1');
  });

  it('should filter by tags', () => {
    registry.register(makeTutorial({ id: 't1', tags: ['a', 'b'] }));
    registry.register(makeTutorial({ id: 't2', tags: ['c'] }));
    const filtered = registry.list({ tags: ['a'] });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('t1');
  });

  it('should find by difficulty', () => {
    registry.register(makeTutorial({ id: 't1', difficulty: 'beginner' }));
    registry.register(makeTutorial({ id: 't2', difficulty: 'expert' }));
    const experts = registry.findByDifficulty('expert');
    expect(experts).toHaveLength(1);
    expect(experts[0].id).toBe('t2');
  });

  it('should search by name, description, or tags', () => {
    registry.register(makeTutorial({ id: 't1', name: 'React Basics', tags: ['react', 'frontend'] }));
    registry.register(makeTutorial({ id: 't2', name: 'Node API', tags: ['backend', 'node'] }));
    expect(registry.search('React')).toHaveLength(1);
    expect(registry.search('backend')).toHaveLength(1);
    expect(registry.search('test')).toHaveLength(2);
  });

  it('should return next available tutorial respecting prerequisites', () => {
    registry.register(makeTutorial({ id: 'basic', difficulty: 'beginner', prerequisites: [] }));
    registry.register(makeTutorial({ id: 'advanced', difficulty: 'advanced', prerequisites: ['basic'] }));
    const next = registry.getNextTutorial([]);
    expect(next?.id).toBe('basic');
    const next2 = registry.getNextTutorial(['basic']);
    expect(next2?.id).toBe('advanced');
  });
});
