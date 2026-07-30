import { LangGraphStateAnnotation, LangGraphAgentRole } from '../langgraph-graph';
import { createLogger } from '@ideia/logger';
import { LangGraphNodeFunction } from '../langgraph-graph';
import { LLMProvider, ChatMessage } from '@ideia/llm-provider';
const logger = createLogger('programmer-node');

const PROGRAMMER_PROMPT = `You are a Programmer agent. Implement the solution based on the architectural design:
1. Write clean, well-structured code following best practices
2. Implement all components described in the architecture
3. Include error handling and logging
4. Follow the project's coding conventions

Be thorough and production-ready.`;

export function createProgrammerNode(provider?: LLMProvider): LangGraphNodeFunction {
  return async (state: LangGraphStateAnnotation) => {
    const design = state.outputs.architect || state.input;
    let implementation: string;

    if (provider) {
      const messages: ChatMessage[] = [
        { role: 'system', content: PROGRAMMER_PROMPT },
        { role: 'user', content: `Architecture design:\n${design}` },
      ];
      const response = await provider.chat({ model: '', messages });
      const content = typeof response === 'object' && Symbol.asyncIterator in response
        ? ''
        : (response as { content: string }).content;
      implementation = content || `Implementation generated for: ${design.slice(0, 100)}`;
    } else {
      implementation = `Implementação gerada para: ${design.slice(0, 50)}${design.length > 50 ? '...' : ''}`;
    }

    return {
      outputs: {
        ...state.outputs,
        programmer: implementation,
      },
      artifacts: [
        ...state.artifacts,
        {
          role: 'programmer' as LangGraphAgentRole,
          type: 'code_implementation',
          content: design,
        },
      ],
      currentRole: 'programmer' as LangGraphAgentRole,
    };
  };
}