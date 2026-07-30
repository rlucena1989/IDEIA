import { LangGraphAgent, LangGraphAgentRole, LangGraphStateAnnotation, LangGraphNodeFunction, LangGraphNodeTiming, LangGraphExecutionSummary, LangGraphConfig, createLangGraphAgent } from './langgraph-graph';
import { createLogger } from '@ideia/logger';

/**
 * @deprecated Use {@link LangGraphAgent} directly. This class delegates to LangGraphAgent for backwards compatibility.
 */
export type AgentRole = LangGraphAgentRole;
export type AgentState = LangGraphStateAnnotation;

export interface AgentNode {
  role: AgentRole;
  execute(state: AgentState): Promise<AgentState>;
}

export type EdgeCondition = (state: AgentState) => AgentRole | 'end';

export interface NodeTiming extends LangGraphNodeTiming {}
export interface ExecutionSummary extends LangGraphExecutionSummary {}

/** @deprecated Use {@link LangGraphAgent} instead. */
export class AgentGraph {
  private langGraph: LangGraphAgent;
  private nodeAdapters: Map<string, AgentNode> = new Map();
  private edgeAdapters: Map<string, EdgeCondition> = new Map();
  private startRole: AgentRole = 'analyst';

  constructor(startRole: AgentRole = 'analyst', maxIterations = 10) {
    this.startRole = startRole;
    this.langGraph = createLangGraphAgent({ maxIterations, nodeTimeout: 30000, maxRetries: 3 });
    this.langGraph.setEntryPoint(startRole);
  }

  setNodeTimeout(ms: number): void {
    this.langGraph.setConfig({ nodeTimeout: ms });
  }

  setMaxRetries(retries: number): void {
    this.langGraph.setConfig({ maxRetries: retries });
  }

  onStatusChange(cb: (role: AgentRole, status: NodeTiming['status'], timing: NodeTiming) => void): void {
    this.langGraph.onStatusChange(cb);
  }

  addNode(node: AgentNode): void {
    this.nodeAdapters.set(node.role, node);
    const adaptedFn: LangGraphNodeFunction = async (state: LangGraphStateAnnotation) => {
      const result = await node.execute(state);
      return result;
    };
    this.langGraph.addNode(node.role, adaptedFn);
  }

  addEdge(from: AgentRole, condition: EdgeCondition): void {
    this.edgeAdapters.set(from, condition);
    this.langGraph.addConditionalEdge(from, condition);
  }

  async run(input: string, _initialState?: Partial<AgentState>): Promise<{
    finalState: AgentState;
    trace: Array<{ role: AgentRole; step: number }>;
    summary: ExecutionSummary;
  }> {
    const result = await this.langGraph.invoke(input);

    const trace = result.summary.timing.map((t, i) => ({
      role: t.role,
      step: i,
    }));

    return {
      finalState: result.finalState,
      trace,
      summary: result.summary,
    };
  }

  getHistory() {
    return [];
  }

  reset(): void {
    this.langGraph.reset();
  }
}

export class AnalystNode implements AgentNode {
  role: AgentRole = 'analyst';
  async execute(state: AgentState): Promise<AgentState> {
    state.outputs.analyst = `Analisando requisitos: ${state.input}`;
    state.decisions.push(`Requisitos analisados para: ${state.input.slice(0, 50)}`);
    state.artifacts.push({ role: 'analyst', type: 'requirement_analysis', content: state.input });
    return state;
  }
}

export class ArchitectNode implements AgentNode {
  role: AgentRole = 'architect';
  async execute(state: AgentState): Promise<AgentState> {
    const analysis = state.outputs.analyst || state.input;
    state.outputs.architect = `Arquitetura definida para: ${analysis.slice(0, 50)}`;
    state.decisions.push(`Arquitetura desenhada baseada na análise`);
    state.artifacts.push({ role: 'architect', type: 'architecture_design', content: analysis });
    return state;
  }
}

export class ProgrammerNode implements AgentNode {
  role: AgentRole = 'programmer';
  async execute(state: AgentState): Promise<AgentState> {
    const design = state.outputs.architect || state.input;
    state.outputs.programmer = `Implementação gerada para: ${design.slice(0, 50)}`;
    state.artifacts.push({ role: 'programmer', type: 'code_implementation', content: design });
    return state;
  }
}

export class ReviewerNode implements AgentNode {
  role: AgentRole = 'reviewer';
  async execute(state: AgentState): Promise<AgentState> {
    const code = state.outputs.programmer || '';
    state.outputs.reviewer = `Revisão concluída para implementação`;
    state.artifacts.push({ role: 'reviewer', type: 'code_review', content: code });
    return state;
  }
}

export class TesterNode implements AgentNode {
  role: AgentRole = 'tester';
  async execute(state: AgentState): Promise<AgentState> {
    const code = state.outputs.programmer || '';
    state.outputs.tester = `Testes gerados para implementação`;
    state.artifacts.push({ role: 'tester', type: 'test_suite', content: code });
    return state;
  }
}

export class DevOpsNode implements AgentNode {
  role: AgentRole = 'devops';
  async execute(state: AgentState): Promise<AgentState> {
    state.outputs.devops = `Pipeline configurado para deploy`;
    state.artifacts.push({ role: 'devops', type: 'deployment_config', content: state.input });
    return state;
  }
}

export class SupervisorNode implements AgentNode {
  role: AgentRole = 'supervisor';
  async execute(state: AgentState): Promise<AgentState> {
    const errors = state.errors;
    const hasErrors = errors.length > 0;
    state.decisions.push(hasErrors ? `Erros detectados: ${errors.length}` : 'Fluxo normal, sem erros');
    return state;
  }
}

export function createDefaultGraph(_input: string): AgentGraph {
  const graph = new AgentGraph('analyst', 10);

  graph.addNode(new AnalystNode());
  graph.addNode(new ArchitectNode());
  graph.addNode(new ProgrammerNode());
  graph.addNode(new ReviewerNode());
  graph.addNode(new TesterNode());
  graph.addNode(new DevOpsNode());
  graph.addNode(new SupervisorNode());

  graph.addEdge('analyst', () => 'architect');
  graph.addEdge('architect', () => 'programmer');
  graph.addEdge('programmer', () => 'reviewer');
  graph.addEdge('reviewer', (s) => s.errors.length > 0 ? 'programmer' : 'tester');
  graph.addEdge('tester', (s) => s.errors.length > 0 ? 'programmer' : 'devops');
  graph.addEdge('devops', () => 'supervisor');
  graph.addEdge('supervisor', () => 'end');

  return graph;
}

export function createAgentGraph(startRole?: AgentRole): AgentGraph {
  return new AgentGraph(startRole);
}
