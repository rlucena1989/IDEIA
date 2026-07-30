import type { LLMProvider, ChatMessage, ChatResponse } from '@ideia/llm-provider';
import { createLogger } from '@ideia/logger';
import type { AiEngineerSubTask } from './types';
const logger = createLogger('task-decomposer');

export interface TaskDecompositionResult {
  subTasks: Omit<AiEngineerSubTask, 'id' | 'status'>[];
  reasoning: string;
}

function isAsyncIterable(value: unknown): value is AsyncIterable<ChatResponse> {
  return typeof value === 'object' && value !== null && Symbol.asyncIterator in value;
}

async function collectContent(response: AsyncIterable<ChatResponse> | ChatResponse): Promise<string> {
  if (isAsyncIterable(response)) {
    let full = '';
    for await (const chunk of response) {
      full += chunk.content;
    }
    return full;
  }
  return response.content;
}

export class TaskDecomposer {
  private llmProvider: LLMProvider;

  constructor(llmProvider: LLMProvider) {
    this.llmProvider = llmProvider;
  }

  async decompose(task: string): Promise<TaskDecompositionResult> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a task decomposition expert. Break down the given task into sub-tasks and assign each to the most appropriate agent role.

Available agent roles:
- analyst: Requirements analysis, clarification, understanding
- architect: System design, architecture, technology decisions
- programmer: Implementation, coding, development
- reviewer: Code review, quality assurance, security review
- tester: Test creation, coverage, verification
- devops: CI/CD, infrastructure, deployment
- supervisor: Coordination, conflict resolution, decision making

Respond with JSON only, no markdown formatting:
{
  "reasoning": "your reasoning",
  "subTasks": [
    { "description": "sub-task description", "agentRole": "role" }
  ]
}`,
      },
      {
        role: 'user',
        content: task,
      },
    ];

    const response = await this.llmProvider.chat({ model: '', messages });
    const content = await collectContent(response);

    return this.parseResponse(content);
  }

  private parseResponse(content: string): TaskDecompositionResult {
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      return this.fallbackDecomposition(content);
    }

    try {
      const parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1)) as {
        reasoning?: string;
        subTasks?: Array<{ description?: string; agentRole?: string }>;
      };
      const subTasks: Omit<AiEngineerSubTask, 'id' | 'status'>[] = [];
      if (parsed.subTasks && Array.isArray(parsed.subTasks)) {
        for (const st of parsed.subTasks) {
          if (st.description && st.agentRole) {
            subTasks.push({ description: st.description, agentRole: st.agentRole });
          }
        }
      }
      return {
        subTasks,
        reasoning: parsed.reasoning || '',
      };
    } catch {
      return this.fallbackDecomposition(content);
    }
  }

  private fallbackDecomposition(input: string): TaskDecompositionResult {
    const subTasks: Omit<AiEngineerSubTask, 'id' | 'status'>[] = [
      { description: `Analyze requirements: ${input}`, agentRole: 'analyst' },
      { description: `Design solution: ${input}`, agentRole: 'architect' },
      { description: `Implement solution: ${input}`, agentRole: 'programmer' },
      { description: `Review implementation: ${input}`, agentRole: 'reviewer' },
      { description: `Test implementation: ${input}`, agentRole: 'tester' },
    ];
    return {
      subTasks,
      reasoning: 'Fallback: LLM response could not be parsed, using default decomposition',
    };
  }
}
