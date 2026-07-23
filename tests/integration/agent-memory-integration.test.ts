import {
  AgentRegistry,
  createAgentRegistry,
  AgentCoordinator,
  createAgentCoordinator,
  PlannerExecutorPipeline,
  createPlannerExecutorPipeline,
} from '../../packages/agent-runtime/src';

describe('Agent-Memory Integration', () => {
  let registry: AgentRegistry;
  let coordinator: AgentCoordinator;
  let planner: PlannerExecutorPipeline;

  beforeEach(() => {
    registry = createAgentRegistry();
    coordinator = createAgentCoordinator(registry);
    planner = createPlannerExecutorPipeline({
      requireApproval: false,
      autoExecute: true,
      maxPlanSteps: 10,
    });
  });

  test('planner creates plan from goal', () => {
    const result = planner.createPlan('Create a REST API', {});
    expect(result).toBeDefined();
    expect(result.goal).toBe('Create a REST API');
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.status).toBe('draft');
  });

  test('planner approves and executes plan via coordinator', async () => {
    const plan = planner.createPlan('Fix login bug', {});
    planner.reviewPlan(plan.id, 'test');
    planner.approvePlan(plan.id, 'test');
    const approved = planner.getPlan(plan.id);
    expect(approved).toBeDefined();
    expect(approved!.status).toBe('approved');
    const result = await planner.executePlan(plan.id, coordinator);
    expect(result).toBeDefined();
    expect(result.status).toBe('completed');
  });

  test('coordinator selects agents by capability', () => {
    const agents = coordinator.selectAgentsForTask('code review', [
      'review',
      'code-review',
    ]);
    expect(agents.length).toBeGreaterThan(0);
    expect(agents.some((a) => a.role === 'reviewer')).toBeTruthy();
  });

  test('coordinator rejects plan without approval', () => {
    const plan = planner.createPlan('Delete everything', {});
    planner.rejectPlan(plan.id, 'test', 'Too risky');
    const rejected = planner.getPlan(plan.id);
    expect(rejected).toBeDefined();
    expect(rejected!.status).toBe('rejected');
  });
});
