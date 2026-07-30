import { LangGraphStateAnnotation, LangGraphAgentRole } from '../langgraph-graph';
import { createLogger } from '@ideia/logger';
import { LangGraphNodeFunction } from '../langgraph-graph';
import { LLMProvider, ChatMessage } from '@ideia/llm-provider';
const logger = createLogger('devops-node');

const DEVOPS_PROMPT = `You are a DevOps agent. Configure the deployment pipeline:
1. Choose deployment strategy (blue-green, canary, rolling)
2. Define CI/CD pipeline stages
3. Configure monitoring and alerts
4. Plan rollback strategy

Be practical and specific.`;

export function createDevOpsNode(provider?: LLMProvider): LangGraphNodeFunction {
  return async (state: LangGraphStateAnnotation) => {
    let pipeline: string;

    if (provider) {
      const messages: ChatMessage[] = [
        { role: 'system', content: DEVOPS_PROMPT },
        { role: 'user', content: `Project context:\n${state.input}` },
      ];
      const response = await provider.chat({ model: '', messages });
      const content = typeof response === 'object' && Symbol.asyncIterator in response
        ? ''
        : (response as { content: string }).content;
      pipeline = content || 'Pipeline configured for deployment';
    } else {
      pipeline = 'Pipeline configurado para deploy';
    }

    return {
      outputs: {
        ...state.outputs,
        devops: pipeline,
      },
      artifacts: [
        ...state.artifacts,
        {
          role: 'devops' as LangGraphAgentRole,
          type: 'deployment_config',
          content: state.input,
        },
      ],
      currentRole: 'devops' as LangGraphAgentRole,
    };
  };
}