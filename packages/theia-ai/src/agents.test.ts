import { AgentRegistry, AgentExecutor } from './agents';
import { AiAgent, AiRequest, AiResponse } from './types';

jest.mock('@ideia/core-contributions', () => ({
  Emitter: jest.fn().mockImplementation(() => ({
    event: jest.fn(),
    fire: jest.fn(),
    dispose: jest.fn(),
  })),
  Disposable: { undefined },
}));

function createMockAgent(id: string, capabilities: string[]): AiAgent {
  return {
    id,
    name: `Agent ${id}`,
    description: '',
    capabilities,
    autonomyLevel: 2,
    execute: jest.fn().mockResolvedValue({
      content: `executed-by-${id}`,
      finishReason: 'stop',
      latencyMs: 2,
      cached: false,
    } as AiResponse),
    getTools: jest.fn().mockReturnValue([]),
  };
}

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  it('register adds agent and makes it retrievable by get', () => {
    const agent = createMockAgent('a1', ['code', 'test']);
    registry.register(agent);
    expect(registry.get('a1')).toBe(agent);
  });

  it('unregister removes the agent', () => {
    const agent = createMockAgent('a1', ['code']);
    registry.register(agent);
    registry.unregister('a1');
    expect(registry.get('a1')).toBeUndefined();
  });

  it('getAll returns all registered agents', () => {
    registry.register(createMockAgent('a1', ['code']));
    registry.register(createMockAgent('a2', ['test']));
    expect(registry.getAll()).toHaveLength(2);
  });

  it('findByCapability filters agents matching the capability', () => {
    const codeAgent = createMockAgent('a1', ['code', 'test']);
    const reviewAgent = createMockAgent('a2', ['review']);
    registry.register(codeAgent);
    registry.register(reviewAgent);
    const result = registry.findByCapability('test');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a1');
  });

  it('findByCapability returns empty array when none match', () => {
    registry.register(createMockAgent('a1', ['code']));
    expect(registry.findByCapability('unknown')).toEqual([]);
  });
});

describe('AgentExecutor', () => {
  let executor: AgentExecutor;

  beforeEach(() => {
    executor = new AgentExecutor();
  });

  it('execute delegates to agent.execute and returns response', async () => {
    const agent = createMockAgent('a1', ['code']);
    const request: AiRequest = { messages: [{ role: 'user', content: 'build' }] };
    const response = await executor.execute(agent, request);
    expect(agent.execute).toHaveBeenCalledWith(request);
    expect(response.content).toBe('executed-by-a1');
  });
});
