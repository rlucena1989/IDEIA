import { LangGraphStateAnnotation, LangGraphAgentRole } from '../langgraph-graph';
import { createLogger } from '@ideia/logger';
import { LangGraphNodeFunction } from '../langgraph-graph';
import { LLMProvider, ChatMessage } from '@ideia/llm-provider';
const logger = createLogger('tester-node');

const TESTER_PROMPT = `You are a Tester agent. Generate comprehensive tests for the provided implementation:
1. Unit tests for core logic
2. Integration tests for component interactions
3. Edge cases and error scenarios
4. Test structure following best practices

Be specific with test cases.`;

export function createTesterNode(provider?: LLMProvider): LangGraphNodeFunction {
  return async (state: LangGraphStateAnnotation) => {
    const code = state.outputs.programmer || '';
    let tests: string;

    if (provider) {
      const messages: ChatMessage[] = [
        { role: 'system', content: TESTER_PROMPT },
        { role: 'user', content: `Implementation to test:\n${code}` },
      ];
      const response = await provider.chat({ model: '', messages });
      const content = typeof response === 'object' && Symbol.asyncIterator in response
        ? ''
        : (response as { content: string }).content;
      tests = content || `Tests generated for implementation`;
    } else {
      tests = 'Testes gerados para implementação';
    }

    return {
      outputs: {
        ...state.outputs,
        tester: tests,
      },
      artifacts: [
        ...state.artifacts,
        {
          role: 'tester' as LangGraphAgentRole,
          type: 'test_suite',
          content: code,
        },
      ],
      currentRole: 'tester' as LangGraphAgentRole,
    };
  };
}