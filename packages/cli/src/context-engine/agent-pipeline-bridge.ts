import { PromptPipeline, ProcessedPrompt } from './prompt-pipeline';
import { ContextEngine } from './index';
import { LangGraphAgent, LangGraphStateAnnotation, createAnalyzeSubgraph, createPlanSubgraph, createExecuteSubgraph, createDeploySubgraph } from '@ideia/agent-runtime';
import { createLogger } from '@ideia/logger';

const log = createLogger('pipeline-bridge');

export interface AgentPipelineResult {
  prompt: ProcessedPrompt;
  finalState: LangGraphStateAnnotation;
  durationMs: number;
  subgraphUsed: string;
  success: boolean;
}

export class AgentPipelineBridge {
  private pipeline: PromptPipeline;
  private analyzeAgent: LangGraphAgent;
  private planAgent: LangGraphAgent;
  private executeAgent: LangGraphAgent;
  private deployAgent: LangGraphAgent;

  constructor(engine: ContextEngine) {
    this.pipeline = new PromptPipeline(engine);
    this.analyzeAgent = createAnalyzeSubgraph();
    this.planAgent = createPlanSubgraph();
    this.executeAgent = createExecuteSubgraph();
    this.deployAgent = createDeploySubgraph();
  }

  async execute(prompt: string, systemPrompt?: string): Promise<AgentPipelineResult> {
    const start = Date.now();

    const processed = await this.pipeline.process({ raw: prompt, system: systemPrompt });

    if (!processed.guardResult.passed) {
      return {
        prompt: processed,
        finalState: {
          input: prompt,
          context: {},
          currentRole: 'analyst',
          outputs: {},
          decisions: ['BLOCKED by guardrails'],
          artifacts: [],
          errors: processed.guardResult.issues.map(i => i.message),
          completed: true,
          messages: [],
        },
        durationMs: Date.now() - start,
        subgraphUsed: 'none',
        success: false,
      };
    }

    let agent: LangGraphAgent;
    let subgraphUsed: string;

    switch (processed.intent.category) {
      case 'feature':
      case 'refactor':
        agent = this.executeAgent;
        subgraphUsed = 'execute';
        break;
      case 'bugfix':
      case 'test':
        agent = this.planAgent;
        subgraphUsed = 'plan';
        break;
      case 'devops':
      case 'review':
        agent = this.deployAgent;
        subgraphUsed = 'deploy';
        break;
      case 'documentation':
      case 'question':
      default:
        agent = this.analyzeAgent;
        subgraphUsed = 'analyze';
        break;
    }

    try {
      const result = await agent.invoke(processed.optimized);
      log.info(`Pipeline executed: intent=${processed.intent.category}, subgraph=${subgraphUsed}, duration=${Date.now() - start}ms`);

      return {
        prompt: processed,
        finalState: result.finalState,
        durationMs: Date.now() - start,
        subgraphUsed,
        success: true,
      };
    } catch (err) {
      log.error(`Pipeline failed: ${err}`);
      return {
        prompt: processed,
        finalState: {
          input: prompt,
          context: {},
          currentRole: 'analyst',
          outputs: {},
          decisions: [],
          artifacts: [],
          errors: [String(err)],
          completed: true,
          messages: [],
        },
        durationMs: Date.now() - start,
        subgraphUsed,
        success: false,
      };
    }
  }
}

export function createAgentPipelineBridge(engine: ContextEngine): AgentPipelineBridge {
  return new AgentPipelineBridge(engine);
}
