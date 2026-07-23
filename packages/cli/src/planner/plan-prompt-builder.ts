/**
 * plan-prompt-builder.ts — Plan-and-Solve Dinâmico (Item 6)
 *
 * Constrói prompts adaptativos com Generated Knowledge, few-shot examples,
 * e constraints do policy engine. Suporte a PS+ (extract variables + calculate).
 */

export interface PlanPromptConfig {
  taskType: string;
  title: string;
  description: string;
  context: string[];
  constraints: string[];
  knowledge?: string[];
  examples?: Array<{ input: string; output: string }>;
}

export class PlanPromptBuilder {
  build(config: PlanPromptConfig): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    const systemParts: string[] = [
      'You are an expert software architect and developer. Generate a detailed execution plan.',
      `Task type: ${config.taskType}`,
    ];

    if (config.knowledge && config.knowledge.length > 0) {
      systemParts.push('\nRelevant context:\n' + config.knowledge.map(k => `- ${k}`).join('\n'));
    }

    if (config.constraints.length > 0) {
      systemParts.push('\nConstraints:\n' + config.constraints.map(c => `- ${c}`).join('\n'));
    }

    systemParts.push(`
Output format (JSON):
{
  "steps": [
    { "order": 1, "action": "...", "file": "...", "description": "...", "estimatedTokens": 50 }
  ],
  "risks": ["..."],
  "estimatedEffort": "X hours"
}`);
    messages.push({ role: 'system', content: systemParts.join('\n') });

    if (config.examples && config.examples.length > 0) {
      for (const ex of config.examples.slice(0, 2)) {
        messages.push({ role: 'user', content: ex.input });
        messages.push({ role: 'assistant', content: ex.output });
      }
    }

    const userParts: string[] = [`Title: ${config.title}`, `Description: ${config.description}`];
    if (config.context.length > 0) {
      userParts.push('Context:\n' + config.context.map(c => `- ${c}`).join('\n'));
    }

    messages.push({ role: 'user', content: userParts.join('\n') });
    return messages;
  }
}
