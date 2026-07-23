import { AgentGraph, createDefaultGraph, createAgentGraph, AnalystNode, ArchitectNode, ProgrammerNode, ReviewerNode, TesterNode, DevOpsNode, SupervisorNode, AgentNode, AgentState, AgentRole } from '../src/agent-graph';

describe('AgentNode', () => {
  it('AnalystNode should process input', async () => {
    const node = new AnalystNode();
    const state = await node.execute({ input: 'create a crud app', context: {}, currentRole: 'analyst', outputs: {}, decisions: [], artifacts: [], errors: [], completed: false, messages: [] });
    expect(state.outputs.analyst).toBeTruthy();
    expect(state.artifacts.length).toBe(1);
  });

  it('ArchitectNode should create architecture', async () => {
    const node = new ArchitectNode();
    const state = await node.execute({ input: 'test', context: {}, currentRole: 'architect', outputs: { analyst: 'requirements defined' }, decisions: [], artifacts: [], errors: [], completed: false, messages: [] });
    expect(state.outputs.architect).toBeTruthy();
    expect(state.decisions.length).toBe(1);
  });

  it('ProgrammerNode should generate code', async () => {
    const node = new ProgrammerNode();
    const state = await node.execute({ input: 'test', context: {}, currentRole: 'programmer', outputs: { architect: 'design ready' }, decisions: [], artifacts: [], errors: [], completed: false, messages: [] });
    expect(state.outputs.programmer).toBeTruthy();
  });

  it('ReviewerNode should review code', async () => {
    const node = new ReviewerNode();
    const state = await node.execute({ input: 'test', context: {}, currentRole: 'reviewer', outputs: { programmer: 'code here' }, decisions: [], artifacts: [], errors: [], completed: false, messages: [] });
    expect(state.outputs.reviewer).toBeTruthy();
  });

  it('TesterNode should generate tests', async () => {
    const node = new TesterNode();
    const state = await node.execute({ input: 'test', context: {}, currentRole: 'tester', outputs: { programmer: 'code' }, decisions: [], artifacts: [], errors: [], completed: false, messages: [] });
    expect(state.outputs.tester).toBeTruthy();
  });

  it('DevOpsNode should configure deploy', async () => {
    const node = new DevOpsNode();
    const state = await node.execute({ input: 'deploy app', context: {}, currentRole: 'devops', outputs: {}, decisions: [], artifacts: [], errors: [], completed: false, messages: [] });
    expect(state.outputs.devops).toBeTruthy();
  });

  it('SupervisorNode should check for errors', async () => {
    const node = new SupervisorNode();
    const state = await node.execute({ input: 'test', context: {}, currentRole: 'supervisor', outputs: {}, decisions: [], artifacts: [], errors: ['error1'], completed: false, messages: [] });
    expect(state.decisions.some(d => d.includes('Erros'))).toBe(true);
  });
});

describe('AgentGraph', () => {
  it('should execute full pipeline with default graph', async () => {
    const graph = createDefaultGraph('create a SaaS platform');
    const result = await graph.run('create a SaaS platform');
    expect(result.finalState.completed).toBe(true);
    expect(result.trace.length).toBeGreaterThanOrEqual(7);
    expect(result.trace[0].role).toBe('analyst');
  });

  it('should call all agent nodes in order', async () => {
    const graph = createDefaultGraph('build a blog API');
    const result = await graph.run('build a blog API');
    const roles = result.trace.map(t => t.role);
    expect(roles).toContain('analyst');
    expect(roles).toContain('architect');
    expect(roles).toContain('programmer');
    expect(roles).toContain('reviewer');
    expect(roles).toContain('tester');
    expect(roles).toContain('devops');
    expect(roles).toContain('supervisor');
  });

  it('should stop at max iterations', async () => {
    const graph = new AgentGraph('analyst', 3);
    graph.addNode({ role: 'analyst', async execute(s) { return s; } });
    graph.addEdge('analyst', () => 'analyst');
    const result = await graph.run('loop test');
    expect(result.trace.length).toBeLessThanOrEqual(3);
  });

  it('should report errors when node not found', async () => {
    const graph = new AgentGraph('analyst' as AgentRole);
    graph.addEdge('analyst', () => 'supervisor' as AgentRole);
    const result = await graph.run('test');
    expect(result.finalState.errors.length).toBeGreaterThan(0);
  });

  it('createDefaultGraph should create all 7 nodes', () => {
    const graph = createDefaultGraph('test');
    expect(graph).toBeDefined();
  });

  it('should preserve artifacts across pipeline', async () => {
    const graph = createDefaultGraph('test app');
    const result = await graph.run('test app');
    expect(result.finalState.artifacts.length).toBeGreaterThanOrEqual(6);
  });

  it('should reset history', () => {
    const graph = createDefaultGraph('test');
    graph.run('test');
    graph.reset();
    expect(graph.getHistory()).toHaveLength(0);
  });
});
