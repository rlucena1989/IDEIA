import { LangGraphStateAnnotation, LangGraphAgentRole } from '../langgraph-graph';
import { createLogger } from '@ideia/logger';
import { LangGraphNodeFunction } from '../langgraph-graph';
import { LLMProvider, ChatMessage } from '@ideia/llm-provider';
const logger = createLogger('architect-node');

const ARCHITECT_PROMPT = `You are an Architect agent. Based on the requirements analysis, design a solution architecture:
1. Choose the appropriate architectural pattern
2. Define components and their responsibilities
3. Specify technology choices with rationale
4. Outline data flow between components

Be specific and practical.`;

export function createArchitectNode(provider?: LLMProvider): LangGraphNodeFunction {
  return async (state: LangGraphStateAnnotation) => {
    const analysis = state.outputs.analyst || state.input;
    let design: string;

    if (provider) {
      const messages: ChatMessage[] = [
        { role: 'system', content: ARCHITECT_PROMPT },
        { role: 'user', content: `Requirements analysis:\n${analysis}` },
      ];
      const response = await provider.chat({ model: '', messages });
      const content = typeof response === 'object' && Symbol.asyncIterator in response
        ? ''
        : (response as { content: string }).content;
      design = content || `Architecture designed for: ${analysis.slice(0, 100)}`;
    } else {
      design = `Arquitetura definida para: ${analysis.slice(0, 50)}${analysis.length > 50 ? '...' : ''}`;
    }

    return {
      outputs: {
        ...state.outputs,
        architect: design,
      },
      decisions: [
        ...state.decisions,
        'Arquitetura desenhada baseada na análise',
      ],
      artifacts: [
        ...state.artifacts,
        {
          role: 'architect' as LangGraphAgentRole,
          type: 'architecture_design',
          content: analysis,
        },
      ],
      currentRole: 'architect' as LangGraphAgentRole,
    };
  };
}