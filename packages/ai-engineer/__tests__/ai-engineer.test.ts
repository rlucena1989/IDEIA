import { AiEngineer } from '../src/ai-engineer';
import { TaskDecomposer } from '../src/task-decomposer';
import type { LLMProvider, ChatResponse, ChatMessage } from '@ideia/llm-provider';

const _ = {
  executePipeline: jest.fn().mockResolvedValue([]),
  executeParallel: jest.fn().mockResolvedValue([]),
  getRegistry: jest.fn().mockReturnValue({
    register: jest.fn(),
    findById: jest.fn(),
    findByRole: jest.fn().mockReturnValue([]),
    listAll: jest.fn().mockReturnValue([]),
    unregister: jest.fn(),
  }),
  getCoordinationState: jest.fn().mockReturnValue({ running: 0, completed: 0, failed: 0 }),
};

jest.mock('@ideia/agent-runtime', () => {
  class MockCoordinator {}
  Object.assign(MockCoordinator.prototype, {
    executePipeline: jest.fn().mockResolvedValue([]),
    executeParallel: jest.fn().mockResolvedValue([]),
    getRegistry: jest.fn().mockReturnValue({
      register: jest.fn(),
      findById: jest.fn(),
      findByRole: jest.fn().mockReturnValue([]),
      listAll: jest.fn().mockReturnValue([]),
      unregister: jest.fn(),
    }),
    getCoordinationState: jest.fn().mockReturnValue({ running: 0, completed: 0, failed: 0 }),
  });
  class MockRegistry {}
  Object.assign(MockRegistry.prototype, {
    register: jest.fn(),
    findById: jest.fn(),
    findByRole: jest.fn().mockReturnValue([]),
    listAll: jest.fn().mockReturnValue([]),
    unregister: jest.fn(),
  });
  return {
    AgentRegistry: MockRegistry,
    AgentCoordinator: MockCoordinator,
    createAgentRegistry: jest.fn(() => new MockRegistry()),
    createAgentCoordinator: jest.fn(() => new MockCoordinator()),
  };
});

import { AgentCoordinator, createAgentRegistry} from '@ideia/agent-runtime';

class MockLLMProvider implements LLMProvider {
  readonly name = 'mock';
  private response: string;

  constructor(response: string) {
    this.response = response;
  }

  async chat(_request: { model: string; messages: ChatMessage[] }): Promise<AsyncIterable<ChatResponse> | ChatResponse> {
    return {
      content: this.response,
      model: 'mock',
      provider: 'mock',
    };
  }

  async embed(): Promise<{ embeddings: number[][]; model: string; provider: string }> {
    return { embeddings: [], model: 'mock', provider: 'mock' };
  }
}

describe('AiEngineer', () => {
  describe('constructor', () => {
    it('creates an instance with an LLM provider', () => {
      const llm = new MockLLMProvider(JSON.stringify({ reasoning: 'test', subTasks: [] }));
      const engineer = new AiEngineer(llm);
      expect(engineer).toBeInstanceOf(AiEngineer);
    });

    it('creates an instance with a custom registry', () => {
      const llm = new MockLLMProvider(JSON.stringify({ reasoning: 'test', subTasks: [] }));
      const registry = createAgentRegistry();
      const engineer = new AiEngineer(llm, registry);
      expect(engineer).toBeInstanceOf(AiEngineer);
    });

    it('creates an instance with config', () => {
      const llm = new MockLLMProvider(JSON.stringify({ reasoning: 'test', subTasks: [] }));
      const engineer = new AiEngineer(llm, undefined, { maxSubTasks: 5, requireSequential: true });
      expect(engineer).toBeInstanceOf(AiEngineer);
    });
  });

  describe('getCoordinator', () => {
    it('returns the internal coordinator', () => {
      const llm = new MockLLMProvider(JSON.stringify({ reasoning: 'test', subTasks: [] }));
      const engineer = new AiEngineer(llm);
      const coordinator = engineer.getCoordinator();
      expect(coordinator).toBeInstanceOf(AgentCoordinator);
    });
  });

  describe('executeTask', () => {
    it('executes a task and returns a result', async () => {
      const llm = new MockLLMProvider(JSON.stringify({
        reasoning: 'Need to implement the feature',
        subTasks: [
          { description: 'Analyze requirements', agentRole: 'analyst' },
          { description: 'Design architecture', agentRole: 'architect' },
          { description: 'Implement code', agentRole: 'programmer' },
        ],
      }));
      const engineer = new AiEngineer(llm, undefined, { requireSequential: true, subTaskTimeout: 5000 });

      const result = await engineer.executeTask('Build a login feature');

      expect(result).toBeDefined();
      expect(result.taskId).toBeDefined();
      expect(result.subTasks.length).toBe(3);
      expect(result.status).toBe('completed');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('handles an empty task gracefully', async () => {
      const llm = new MockLLMProvider('invalid json');
      const engineer = new AiEngineer(llm);
      const result = await engineer.executeTask('');
      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
    });

    it('stores tasks and allows retrieval', async () => {
      const llm = new MockLLMProvider(JSON.stringify({
        reasoning: 'test',
        subTasks: [
          { description: 'Task 1', agentRole: 'analyst' },
        ],
      }));
      const engineer = new AiEngineer(llm);
      const result = await engineer.executeTask('Test task');
      const tasks = engineer.getTasks();
      expect(tasks.length).toBeGreaterThanOrEqual(1);
      const retrieved = engineer.getTask(result.taskId);
      expect(retrieved).toBeDefined();
      expect(retrieved!.description).toBe('Test task');
    });

    it('executes sub-tasks in sequential mode', async () => {
      const llm = new MockLLMProvider(JSON.stringify({
        reasoning: 'plan',
        subTasks: [
          { description: 'Step 1', agentRole: 'analyst' },
          { description: 'Step 2', agentRole: 'architect' },
          { description: 'Step 3', agentRole: 'programmer' },
        ],
      }));
      const engineer = new AiEngineer(llm, undefined, { requireSequential: true });
      const result = await engineer.executeTask('Sequential task');
      expect(result.status).toBe('completed');
      expect(result.subTasks.every((st: { status: string }) => st.status === 'completed')).toBe(true);
    });

    it('executes sub-tasks in parallel mode', async () => {
      const llm = new MockLLMProvider(JSON.stringify({
        reasoning: 'plan',
        subTasks: [
          { description: 'Step 1', agentRole: 'analyst' },
          { description: 'Step 2', agentRole: 'architect' },
          { description: 'Step 3', agentRole: 'programmer' },
        ],
      }));
      const engineer = new AiEngineer(llm, undefined, { requireSequential: false });
      const result = await engineer.executeTask('Parallel task');
      expect(result.status).toBe('completed');
    });

    it('respects maxSubTasks limit', async () => {
      const llm = new MockLLMProvider(JSON.stringify({
        reasoning: 'many tasks',
        subTasks: [
          { description: 'T1', agentRole: 'analyst' },
          { description: 'T2', agentRole: 'architect' },
          { description: 'T3', agentRole: 'programmer' },
          { description: 'T4', agentRole: 'reviewer' },
          { description: 'T5', agentRole: 'tester' },
          { description: 'T6', agentRole: 'devops' },
        ],
      }));
      const engineer = new AiEngineer(llm, undefined, { maxSubTasks: 3 });
      const result = await engineer.executeTask('Limited task');
      expect(result.subTasks.length).toBeLessThanOrEqual(3);
    });
  });
});

describe('TaskDecomposer', () => {
  it('decomposes a task into sub-tasks', async () => {
    const llm = new MockLLMProvider(JSON.stringify({
      reasoning: 'reasoning',
      subTasks: [
        { description: 'Analyze', agentRole: 'analyst' },
        { description: 'Build', agentRole: 'programmer' },
      ],
    }));
    const decomposer = new TaskDecomposer(llm);
    const result = await decomposer.decompose('Build a website');
    expect(result.subTasks.length).toBe(2);
    expect(result.reasoning).toBe('reasoning');
  });

  it('falls back to default decomposition on invalid JSON', async () => {
    const llm = new MockLLMProvider('not valid json at all');
    const decomposer = new TaskDecomposer(llm);
    const result = await decomposer.decompose('Test task');
    expect(result.subTasks.length).toBe(5);
    expect(result.reasoning).toContain('Fallback');
  });

  it('handles empty subTasks gracefully', async () => {
    const llm = new MockLLMProvider(JSON.stringify({
      reasoning: 'empty',
      subTasks: [],
    }));
    const decomposer = new TaskDecomposer(llm);
    const result = await decomposer.decompose('Empty task');
    expect(result.subTasks.length).toBe(0);
  });

  it('filters out invalid sub-tasks without description', async () => {
    const llm = new MockLLMProvider(JSON.stringify({
      reasoning: 'partial',
      subTasks: [
        { description: 'Valid task', agentRole: 'analyst' },
        { description: '', agentRole: 'programmer' },
        { agentRole: 'tester' },
        { description: 'Another valid', agentRole: 'devops' },
      ],
    }));
    const decomposer = new TaskDecomposer(llm);
    const result = await decomposer.decompose('Partial task');
    expect(result.subTasks.length).toBe(2);
  });

  it('filters out invalid sub-tasks without agentRole', async () => {
    const llm = new MockLLMProvider(JSON.stringify({
      reasoning: 'missing role',
      subTasks: [
        { description: 'Has role', agentRole: 'analyst' },
        { description: 'No role' },
      ],
    }));
    const decomposer = new TaskDecomposer(llm);
    const result = await decomposer.decompose('Missing role task');
    expect(result.subTasks.length).toBe(1);
  });
});
