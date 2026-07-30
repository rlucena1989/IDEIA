import { A2AProtocol, createA2AProtocol, AgentCard, A2AMessage } from '@ideia/mcp';
import { createLogger } from '@ideia/logger';
import { MCPRegistry, createMCPRegistry, createFileSystemTools } from '@ideia/mcp';
import { LangGraphAgent, LangGraphAgentRole, LangGraphStateAnnotation, LangGraphNodeFunction, createLangGraphAgent } from './langgraph-graph';
import { createAnalystNode } from './nodes/analyst-node';
import { createArchitectNode } from './nodes/architect-node';
import { createProgrammerNode } from './nodes/programmer-node';
import { createReviewerNode } from './nodes/reviewer-node';
import { createTesterNode } from './nodes/tester-node';
import { createDevOpsNode } from './nodes/devops-node';
import { createSupervisorNode } from './nodes/supervisor-node';
import { createDefaultEdgeConditions } from './edges';
import { createReviewerTesterParallelNode } from './parallel';
import { AgentRuntime, ExecutableStep } from './agent-runtime';
import { HandoffFileManager, HandoffPayload } from './handoff-file';

export class AgentOrchestrator {
  private a2a: A2AProtocol;
  private mcp: MCPRegistry;
  private runtime: AgentRuntime;
  private agents: Map<string, { role: LangGraphAgentRole; card: AgentCard }> = new Map();
  private mainGraph: LangGraphAgent;

  constructor(runtime: AgentRuntime, basePath?: string) {
    this.a2a = createA2AProtocol();
    this.mcp = createMCPRegistry();
    this.runtime = runtime;
    this.mainGraph = this.buildMainGraph();

    const fsTools = createFileSystemTools(basePath ?? process.cwd());
    const fsServer = { name: 'filesystem', version: '1.0.0', tools: fsTools, resources: [], prompts: [] };
    this.mcp.register(fsServer);

    this.registerAgent('analyst', 'Analyst', 'Analyzes requirements and clarifies user needs', ['analysis']);
    this.registerAgent('architect', 'Architect', 'Designs system architecture and makes technology decisions', ['architecture']);
    this.registerAgent('programmer', 'Programmer', 'Implements features following architecture', ['implementation']);
    this.registerAgent('reviewer', 'Reviewer', 'Reviews code for correctness, security, and quality', ['review']);
    this.registerAgent('tester', 'Tester', 'Creates comprehensive tests for implemented code', ['testing']);
    this.registerAgent('devops', 'DevOps', 'Configures CI/CD, infrastructure, and deployment', ['devops']);
    this.registerAgent('supervisor', 'Supervisor', 'Coordinates agents, resolves conflicts, decides next steps', ['supervision']);

    this.setupA2AHandlers();
  }

  private buildMainGraph(): LangGraphAgent {
    const agent = createLangGraphAgent({
      maxIterations: 10,
      nodeTimeout: 30000,
      maxRetries: 3,
    });

    agent.addNode('analyst', createAnalystNode());
    agent.addNode('architect', createArchitectNode());
    agent.addNode('programmer', createProgrammerNode());
    agent.addNode('reviewer', createReviewerNode());
    agent.addNode('tester', createTesterNode());
    agent.addNode('parallel_reviewer_tester', createReviewerTesterParallelNode());
    agent.addNode('devops', createDevOpsNode());
    agent.addNode('supervisor', createSupervisorNode());

    const conditions = createDefaultEdgeConditions();
    for (const [from, condition] of Object.entries(conditions)) {
      agent.addConditionalEdge(from, condition);
    }

    agent.setEntryPoint('analyst');
    return agent;
  }

  private registerAgent(role: string, name: string, description: string, capabilities: string[]): void {
    const agentRole = role as LangGraphAgentRole;
    const card: AgentCard = {
      agentId: `agent-${role}`, name, description, version: '1.0.0',
      capabilities, status: 'idle',
      skills: [
        { id: `${role}.process`, name: `process_${role}`, description: `Execute the ${role} agent's function`, inputType: 'json', outputType: 'json' },
        { id: `${role}.status`, name: `get_${role}_status`, description: `Get current status`, inputType: 'text', outputType: 'text' },
      ],
    };
    this.a2a.registerAgent(card);
    this.agents.set(agentRole, { role: agentRole, card });
  }

  private setupA2AHandlers(): void {
    for (const [role, info] of this.agents) {
      this.a2a.setHandler(info.card.agentId, async (msg: A2AMessage) => {
        this.a2a.updateAgentStatus(info.card.agentId, 'busy');
        try {
          if (msg.skill.endsWith('.status')) {
            return { id: `rsp-${Date.now()}`, from: info.card.agentId, to: msg.from, type: 'response', skill: msg.skill, payload: { status: 'ok', role }, timestamp: new Date().toISOString(), correlationId: msg.id };
          }
          return { id: `rsp-${Date.now()}`, from: info.card.agentId, to: msg.from, type: 'response', skill: msg.skill, payload: { result: `${role} processed: ${JSON.stringify(msg.payload).slice(0, 100)}` }, timestamp: new Date().toISOString(), correlationId: msg.id };
        } finally {
          this.a2a.updateAgentStatus(info.card.agentId, 'idle');
        }
      });
    }
  }

  getA2A(): A2AProtocol { return this.a2a; }
  getMCP(): MCPRegistry { return this.mcp; }

  async runPipeline(input: string): Promise<{ state: LangGraphStateAnnotation; steps: ExecutableStep[] }> {
    const handoff = new HandoffFileManager((this.runtime as unknown as Record<string, string>)['workspace'] || '.')
    const taskId = `task-${Date.now()}`

    const planPayload: HandoffPayload = {
      taskId, from: 'orchestrator', to: 'analyst', phase: 'orchestrator',
      input: { spec: input, context: {}, constraints: [] },
      metadata: { createdAt: new Date().toISOString() },
      status: 'pending',
    }
    await handoff.save(planPayload)

    const result = await this.mainGraph.invoke(input);
    const state = result.finalState;

    const planResponse = await this.a2a.sendMessage({
      id: `plan-${Date.now()}`, from: 'orchestrator', to: 'agent-analyst',
      type: 'request', skill: 'analyst.process', payload: { input },
      timestamp: new Date().toISOString(),
    });

    state.outputs.analyst = JSON.stringify(planResponse.payload);

    const execPayload: HandoffPayload = {
      taskId, from: 'analyst', to: 'build', phase: 'build',
      input: { spec: input, context: { analysis: planResponse.payload }, constraints: [] },
      metadata: { createdAt: new Date().toISOString() },
      status: 'in-progress',
    }
    await handoff.save(execPayload)

    const steps: ExecutableStep[] = [
      { type: 'interpret', description: `Interpret: ${input}`, params: { input } },
      { type: 'execute', description: 'Run agent pipeline', handler: 'agent_pipeline', params: { trace: result.summary.timing.map(t => ({ role: t.role, status: t.status })) } },
      { type: 'log', description: 'Log results', handler: 'audit_trail' },
    ];

    return { state, steps };
  }

  async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const result = await this.mcp.callTool(name, args);
    if (!result.ok) throw new Error(result.error ?? 'Tool execution failed');
    return result.result;
  }

  async discoverAgent(role: string): Promise<AgentCard | null> {
    const info = this.agents.get(role);
    if (!info) return null;
    return this.a2a.discoverCapabilities(info.card.agentId);
  }

  listAgents(): Array<{ role: string; status: string }> {
    return Array.from(this.agents.values()).map(a => ({
      role: a.role,
      status: this.a2a.getAgent(a.card.agentId)?.status ?? 'unknown',
    }));
  }
}

export function createAgentOrchestrator(runtime: AgentRuntime, basePath?: string): AgentOrchestrator {
  return new AgentOrchestrator(runtime, basePath);
}
