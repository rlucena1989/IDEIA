import { createRobotRegistry, RobotRegistry } from './robot-registry';
import { RobotRegistration, RobotCapability, RobotMetrics } from './types';

const defaultMetrics: RobotMetrics = {
  totalTasks: 0,
  successRate: 1,
  avgDuration: 0,
  errorRate: 0,
  utilization: 0,
  mttr: 0,
};

const defaultCapabilities: RobotCapability[] = [
  { id: 'code', name: 'Code', description: 'Code generation', taskTypes: ['CODE_GENERATE'], maxConcurrency: 2 },
  { id: 'test', name: 'Test', description: 'Test execution', taskTypes: ['TEST_UNIT'], maxConcurrency: 2 },
];

function makeRegistration(overrides: Partial<RobotRegistration> = {}): RobotRegistration {
  return {
    id: 'r1',
    name: 'TestBot',
    type: 'code',
    description: 'Test robot',
    capabilities: defaultCapabilities,
    status: 'idle',
    maxConcurrency: 3,
    currentLoad: 0,
    metrics: defaultMetrics,
    permissions: ['default'],
    ...overrides,
  };
}

describe('RobotRegistry', () => {
  let registry: RobotRegistry;

  beforeEach(() => {
    registry = createRobotRegistry();
  });

  it('should register a robot', () => {
    registry.register(makeRegistration({ id: 'r1', name: 'TestBot' }));
    const robot = registry.getRobot('r1');
    expect(robot).toBeDefined();
    expect(robot!.id).toBe('r1');
    expect(robot!.status).toBe('idle');
  });

  it('should find available robots by capability', () => {
    registry.register(makeRegistration({ id: 'r2', name: 'CodeBot' }));
    const available = registry.findAvailable('code');
    expect(available.length).toBeGreaterThan(0);
  });

  it('should select best robot by scoring', () => {
    registry.register(makeRegistration({ id: 'r3', name: 'SelectBot' }));
    const selected = registry.select('code');
    expect(selected).toBeDefined();
  });

  it('should update robot status and load', () => {
    registry.register(makeRegistration({ id: 'r1', name: 'TestBot' }));
    registry.updateStatus('r1', 'busy');
    registry.updateLoad('r1', 0.8);
    const stats = registry.getStats();
    expect(stats.busy).toBeGreaterThanOrEqual(1);
  });
});
