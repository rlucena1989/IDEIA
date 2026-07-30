import { LangGraphStateAnnotation, LangGraphAgentRole } from '../langgraph-graph';
import { createLogger } from '@ideia/logger';
import { LangGraphNodeFunction } from '../langgraph-graph';
import { LLMProvider, ChatMessage } from '@ideia/llm-provider';
const logger = createLogger('reviewer-node');

const REVIEWER_PROMPT = `You are a Code Reviewer agent. Review the provided implementation:
1. Check for bugs, security issues, and code smells
2. Verify the implementation matches the requirements
3. Suggest improvements
4. List any issues found

Be thorough and constructive.`;

export function createReviewerNode(provider?: LLMProvider): LangGraphNodeFunction {
  return async (state: LangGraphStateAnnotation) => {
    const code = state.outputs.programmer || '';
    let review: string;

    if (provider) {
      const messages: ChatMessage[] = [
        { role: 'system', content: REVIEWER_PROMPT },
        { role: 'user', content: `Implementation to review:\n${code}` },
      ];
      const response = await provider.chat({ model: '', messages });
      const content = typeof response === 'object' && Symbol.asyncIterator in response
        ? ''
        : (response as { content: string }).content;
      review = content || `Review completed for implementation`;
    } else {
      review = 'Revisão concluída para implementação';
    }

    return {
      outputs: {
        ...state.outputs,
        reviewer: review,
      },
      artifacts: [
        ...state.artifacts,
        {
          role: 'reviewer' as LangGraphAgentRole,
          type: 'code_review',
          content: code,
        },
      ],
      currentRole: 'reviewer' as LangGraphAgentRole,
    };
  };
}