import { LangGraphStateAnnotation, LangGraphAgentRole } from './langgraph-graph';
import { LangGraphNodeFunction } from './langgraph-graph';
import { LLMProvider } from '@ideia/llm-provider';
import { createReviewerNode, createTesterNode } from './nodes';

export interface ParallelNodeConfig {
  role: LangGraphAgentRole;
  nodeFn: LangGraphNodeFunction;
  dependencies?: LangGraphAgentRole[];
}

export function createParallelExecutionNode(
  nodes: ParallelNodeConfig[]
): LangGraphNodeFunction {
  return async (state: LangGraphStateAnnotation) => {
    const results = await Promise.all(
      nodes.map(async ({ role, nodeFn }) => {
        try {
          const result = await nodeFn(state);
          return result;
        } catch (err) {
          return {
            errors: [...state.errors, `[parallel ${role}] ${err instanceof Error ? err.message : String(err)}`],
          } as Partial<LangGraphStateAnnotation>;
        }
      })
    );

    const mergedState: LangGraphStateAnnotation = {
      input: state.input,
      context: { ...state.context },
      currentRole: state.currentRole,
      outputs: { ...state.outputs },
      decisions: [...state.decisions],
      artifacts: [...state.artifacts],
      errors: [...state.errors],
      completed: state.completed,
      messages: [...state.messages],
    };

    for (const result of results) {
      if (result.outputs) {
        mergedState.outputs = { ...mergedState.outputs, ...result.outputs };
      }
      if (result.decisions) {
        for (const d of result.decisions) {
          mergedState.decisions.push(d);
        }
      }
      if (result.artifacts) {
        for (const a of result.artifacts) {
          mergedState.artifacts.push(a);
        }
      }
      if (result.errors) {
        for (const e of result.errors) {
          mergedState.errors.push(e);
        }
      }
    }

    return mergedState;
  };
}

export function createReviewerTesterParallelNode(provider?: LLMProvider): LangGraphNodeFunction {
  return createParallelExecutionNode([
    {
      role: 'reviewer',
      nodeFn: createReviewerNode(provider),
    },
    {
      role: 'tester',
      nodeFn: createTesterNode(provider),
    },
  ]);
}