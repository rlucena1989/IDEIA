import { RobotRegistry, createRobotRegistry } from '../src/robot-registry';
import { RobotRegistration, RobotType, RobotStatus } from '../src/types';

function makeRobot(id: string, overrides: Partial<RobotRegistration> = {}): RobotRegistration {
  return {
    id,
    type: 'code' as RobotType,
    name: `Robot-${id}`,
    description: 'Test robot',
    capabilities: [{ id: 'code-gen', name: 'Code Generation', description: 'Generates code', taskTypes: ['CODE_GENERATE'], maxConcurrency: 2 }],
    status: 'idle' as RobotStatus,
    maxConcurrency: 3,
    currentLoad: 0,
    metrics: { totalTasks: 10, successRate: 0.9, avgDuration: 5000, errorRate: 0.1, utilization: 0.5, mttr: 300 },
    permissions: ['read', 'write'],
    ...overrides,
  };
}

describe('RobotRegistry Extended', () => {
  let registry: RobotRegistry;

  beforeEach(() => {
    registry = createRobotRegistry();
  });

  it('should register a robot', () => {
    const robot = makeRobot('r1');
    registry.register(robot);
    const found = registry.getRobot('r1');
    expect(found).toBeDefined();
    expect(found!.name).toBe('Robot-r1');
    expect(found!.status).toBe('idle');
    expect(found!.currentLoad).toBe(0);
  });

  it('should throw when registering duplicate robot', () => {
    const robot = makeRobot('dup');
    registry.register(robot);
    expect(() => registry.register(robot)).toThrow('already registered');
  });

  it('should unregister a robot', () => {
    registry.register(makeRobot('to-remove'));
    expect(registry.unregister('to-remove')).toBe(true);
    expect(registry.getRobot('to-remove')).toBeUndefined();
  });

  it('should return false when unregistering non-existent robot', () => {
    expect(registry.unregister('ghost')).toBe(false);
  });

  it('should find available robots by capability', () => {
    registry.register(makeRobot('r1', { capabilities: [{ id: 'code-gen', name: 'Code Gen', description: '', taskTypes: ['CODE_GENERATE'], maxConcurrency: 2 }] }));
    registry.register(makeRobot('r2', { capabilities: [{ id: 'test-run', name: 'Test Runner', description: '', taskTypes: ['TEST_UNIT'], maxConcurrency: 2 }] }));
    const available = registry.findAvailable('CODE_GENERATE');
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe('r1');
  });

  it('should filter out busy robots from findAvailable', () => {
    registry.register(makeRobot('idle-robot'));
    registry.register(makeRobot('busy-robot', { status: 'busy' }));
    const available = registry.findAvailable('CODE_GENERATE');
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe('idle-robot');
  });

  it('should filter out robots at max load', () => {
    registry.register(makeRobot('full', { currentLoad: 3, maxConcurrency: 3 }));
    registry.register(makeRobot('free', { currentLoad: 1, maxConcurrency: 3 }));
    const available = registry.findAvailable('CODE_GENERATE');
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe('free');
  });

  it('should select the best robot', () => {
    registry.register(makeRobot('low-perf', { metrics: { totalTasks: 10, successRate: 0.5, avgDuration: 5000, errorRate: 0.5, utilization: 0.8, mttr: 600 } }));
    registry.register(makeRobot('high-perf', { metrics: { totalTasks: 100, successRate: 0.99, avgDuration: 1000, errorRate: 0.01, utilization: 0.3, mttr: 60 } }));
    const selected = registry.select('CODE_GENERATE');
    expect(selected).not.toBeNull();
    expect(selected!.id).toBe('high-perf');
  });

  it('should return null when no robot is available', () => {
    registry.register(makeRobot('busy', { status: 'busy' }));
    const selected = registry.select('CODE_GENERATE');
    expect(selected).toBeNull();
  });

  it('should update status and throw for unknown robot', () => {
    registry.register(makeRobot('known'));
    registry.updateStatus('known', 'busy');
    expect(registry.getRobot('known')!.status).toBe('busy');
    expect(() => registry.updateStatus('unknown', 'idle')).toThrow('not found');
  });

  it('should update load correctly', () => {
    registry.register(makeRobot('load-test'));
    registry.updateLoad('load-test', 1);
    expect(registry.getRobot('load-test')!.currentLoad).toBe(1);
    registry.updateLoad('load-test', -1);
    expect(registry.getRobot('load-test')!.currentLoad).toBe(0);
    registry.updateLoad('load-test', -5);
    expect(registry.getRobot('load-test')!.currentLoad).toBe(0);
    expect(() => registry.updateLoad('unknown', 1)).toThrow('not found');
  });

  it('should update metrics partially', () => {
    registry.register(makeRobot('metrics-test'));
    registry.updateMetrics('metrics-test', { successRate: 0.95, avgDuration: 2000 });
    const robot = registry.getRobot('metrics-test');
    expect(robot!.metrics.successRate).toBe(0.95);
    expect(robot!.metrics.avgDuration).toBe(2000);
    expect(() => registry.updateMetrics('unknown', {})).toThrow('not found');
  });

  it('should list robots by type', () => {
    registry.register(makeRobot('code-1', { type: 'code' }));
    registry.register(makeRobot('test-1', { type: 'test' }));
    registry.register(makeRobot('code-2', { type: 'code' }));
    const codeRobots = registry.listByType('code');
    expect(codeRobots).toHaveLength(2);
    const testRobots = registry.listByType('test');
    expect(testRobots).toHaveLength(1);
  });

  it('should list all robots', () => {
    registry.register(makeRobot('r1'));
    registry.register(makeRobot('r2'));
    expect(registry.listAll()).toHaveLength(2);
  });

  it('should return correct stats', () => {
    registry.register(makeRobot('idle-1'));
    registry.register(makeRobot('busy-1', { status: 'busy' }));
    registry.register(makeRobot('fault-1', { status: 'fault' }));
    registry.register(makeRobot('maint-1', { status: 'maintenance' }));
    const stats = registry.getStats();
    expect(stats.total).toBe(4);
    expect(stats.idle).toBe(1);
    expect(stats.busy).toBe(1);
    expect(stats.fault).toBe(1);
    expect(stats.maintenance).toBe(1);
  });

  it('should create registry via factory function', () => {
    const r = createRobotRegistry({ defaultMaxConcurrency: 5 });
    expect(r).toBeInstanceOf(RobotRegistry);
  });
});