import { A2AProtocol, createA2AProtocol } from '../src/a2a';

describe('A2AProtocol', () => {
  let a2a: A2AProtocol;

  beforeEach(() => { a2a = createA2AProtocol(); });

  it('starts empty', () => {
    expect(a2a.listAgents()).toHaveLength(0);
  });

  it('registers agent', () => {
    a2a.registerAgent({ agentId: 'agent1', name: 'Analyst', description: 'Analyzes requirements', version: '1.0', capabilities: ['analysis'], status: 'idle', skills: [{ id: 's1', name: 'analyze', description: '', inputType: 'text', outputType: 'report' }] });
    expect(a2a.listAgents()).toHaveLength(1);
    expect(a2a.getAgent('agent1')?.name).toBe('Analyst');
  });

  it('unregisters agent', () => {
    a2a.registerAgent({ agentId: 'a1', name: 'Test', description: '', version: '1.0', capabilities: [], status: 'idle', skills: [] });
    expect(a2a.unregisterAgent('a1')).toBe(true);
    expect(a2a.listAgents()).toHaveLength(0);
  });

  it('sends message and gets response', async () => {
    a2a.registerAgent({ agentId: 'worker', name: 'Worker', description: '', version: '1.0', capabilities: ['work'], status: 'idle', skills: [{ id: 's1', name: 'process', description: '', inputType: 'text', outputType: 'result' }] });
    a2a.setHandler('worker', async (msg) => ({
      id: `resp-${Date.now()}`, from: 'worker', to: msg.from, type: 'response', skill: msg.skill, payload: { result: 'done' }, timestamp: new Date().toISOString(), correlationId: msg.id,
    }));
    const response = await a2a.sendMessage({ id: 'req-1', from: 'orchestrator', to: 'worker', type: 'request', skill: 'process', payload: { task: 'test' }, timestamp: new Date().toISOString() });
    expect(response.type).toBe('response');
    expect(response.payload.result).toBe('done');
  });

  it('returns error for unknown agent', async () => {
    const response = await a2a.sendMessage({ id: 'req-1', from: 'orch', to: 'unknown', type: 'request', skill: 'test', payload: {}, timestamp: new Date().toISOString() });
    expect(response.type).toBe('error');
  });

  it('creates and executes task', async () => {
    a2a.registerAgent({ agentId: 'helper', name: 'Helper', description: '', version: '1.0', capabilities: ['help'], status: 'idle', skills: [{ id: 's1', name: 'compute', description: '', inputType: 'json', outputType: 'json' }] });
    a2a.setHandler('helper', async (msg) => ({
      id: `r-${Date.now()}`, from: 'helper', to: msg.from, type: 'response', skill: msg.skill, payload: { computed: (msg.payload.x as number) * 2 }, timestamp: new Date().toISOString(), correlationId: msg.id,
    }));
    const task = a2a.createTask('helper', 'compute', { x: 21 });
    expect(task.status).toBe('running');
    expect(task.agentId).toBe('helper');
  });

  it('lists tasks by agent', () => {
    a2a.registerAgent({ agentId: 'a1', name: 'A1', description: '', version: '1.0', capabilities: [], status: 'idle', skills: [] });
    a2a.registerAgent({ agentId: 'a2', name: 'A2', description: '', version: '1.0', capabilities: [], status: 'idle', skills: [] });
    a2a.createTask('a1', 'test', {});
    a2a.createTask('a2', 'test', {});
    expect(a2a.listTasks('a1')).toHaveLength(1);
    expect(a2a.listTasks()).toHaveLength(2);
  });

  it('lists messages', async () => {
    a2a.registerAgent({ agentId: 'echo', name: 'Echo', description: '', version: '1.0', capabilities: ['echo'], status: 'idle', skills: [{ id: 's1', name: 'echo', description: '', inputType: 'text', outputType: 'text' }] });
    a2a.setHandler('echo', async (msg) => msg);
    await a2a.sendMessage({ id: 'm1', from: 'orch', to: 'echo', type: 'request', skill: 'echo', payload: { data: 'hello' }, timestamp: new Date().toISOString() });
    expect(a2a.getMessages().length).toBe(2);
  });

  it('updates agent status', () => {
    a2a.registerAgent({ agentId: 'x', name: 'X', description: '', version: '1.0', capabilities: [], status: 'idle', skills: [] });
    a2a.updateAgentStatus('x', 'busy');
    expect(a2a.getAgent('x')?.status).toBe('busy');
  });

  it('discovers capabilities', async () => {
    a2a.registerAgent({ agentId: 'skilled', name: 'Skilled', description: '', version: '1.0', capabilities: ['code', 'test'], status: 'idle', skills: [] });
    a2a.setHandler('skilled', async (msg) => ({
      id: `r-${Date.now()}`, from: 'skilled', to: msg.from, type: 'response', skill: msg.skill, payload: { capabilities: a2a.getAgent('skilled') }, timestamp: new Date().toISOString(), correlationId: msg.id,
    }));
    const result = await a2a.discoverCapabilities('skilled');
    expect(result).not.toBeNull();
  });
});
