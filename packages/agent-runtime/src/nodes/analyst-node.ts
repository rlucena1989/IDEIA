import { LangGraphStateAnnotation, LangGraphAgentRole } from '../langgraph-graph';
import { LangGraphNodeFunction } from '../langgraph-graph';
import { LLMProvider, ChatMessage } from '@ideia/llm-provider';

const ANALYST_PROMPT = `You are an Analyst agent. Analyze the given requirements and produce:
1. A summary of the key requirements
2. Potential risks and considerations
3. Recommended approach

Keep your analysis concise and actionable.`;

export function createAnalystNode(provider?: LLMProvider): LangGraphNodeFunction {
  return async (state: LangGraphStateAnnotation) => {
    let analysis: string;

    if (provider) {
      const messages: ChatMessage[] = [
        { role: 'system', content: ANALYST_PROMPT },
        { role: 'user', content: state.input },
      ];
      const response = await provider.chat({ model: '', messages });
      const content = typeof response === 'object' && Symbol.asyncIterator in response
        ? ''
        : (response as { content: string }).content;
      analysis = content || `Analysis generated for: ${state.input.slice(0, 100)}`;
    } else {
      analysis = `Analisando requisitos: ${state.input}`;
    }

    return {
      outputs: {
        ...state.outputs,
        analyst: analysis,
      },
      decisions: [
        ...state.decisions,
        `Requisitos analisados para: ${state.input.slice(0, 50)}${state.input.length > 50 ? '...' : ''}`,
      ],
      artifacts: [
        ...state.artifacts,
        {
          role: 'analyst' as LangGraphAgentRole,
          type: 'requirement_analysis',
          content: state.input,
        },
      ],
      currentRole: 'analyst' as LangGraphAgentRole,
    };
  };
}
