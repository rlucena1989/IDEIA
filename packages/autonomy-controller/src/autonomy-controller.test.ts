import { createAutonomyController } from './autonomy-controller';
import { Task } from './types';

const makeTask = (overrides?: Partial<Task>): Task => ({
  id: 't1', type: 'read', description: 'simple read with sandbox and rollback',
  risk: 0.1, filesChanged: 1, tokensConsumed: 100,
  accessSecrets: false, isDeploy: false, assignedAgent: 'agent-1',
  ...overrides,
});

describe('AutonomyController', () => {
  it('should determine effective level based on task', async () => {
    const controller = createAutonomyController();
    const result = await controller.getEffectiveLevel(makeTask());
    expect(typeof result.level).toBe('number');
    expect(result.limits).toBeDefined();
    expect(result.rationale).toBeDefined();
  });

  it('should allow execution within limits', () => {
    const controller = createAutonomyController();
    const result = controller.canExecute(makeTask(), 0);
    expect(result.allowed).toBe(true);
  });

  it('should block execution beyond limits', () => {
    const controller = createAutonomyController();
    const result = controller.canExecute(makeTask({
      description: 'dangerous write without rollback',
      risk: 0.9, accessSecrets: true, isDeploy: true,
    }), 0);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('should accept custom config', () => {
    const custom = createAutonomyController({ defaultMaxAutonomyLevel: 4 });
    custom.setMaxAutonomyLevel(2);
    expect(custom).toBeDefined();
  });
});
