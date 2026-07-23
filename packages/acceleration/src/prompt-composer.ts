export interface PromptSpec {
  system?: string;
  context?: string;
  question: string;
  examples?: string[];
  outputFormat?: string;
}

export function composePrompt(spec: PromptSpec): string {
  const parts: string[] = [];
  if (spec.system) parts.push(`## System\n${spec.system}`);
  if (spec.context) parts.push(`## Context\n${spec.context}`);
  if (spec.examples && spec.examples.length > 0) {
    parts.push('## Examples');
    spec.examples.forEach((ex, i) => parts.push(`Example ${i + 1}:\n${ex}`));
  }
  parts.push(`## Question\n${spec.question}`);
  if (spec.outputFormat) parts.push(`## Output Format\n${spec.outputFormat}`);
  return parts.join('\n\n');
}

export function composeMinimalPrompt(spec: PromptSpec): string {
  const parts: string[] = [];
  if (spec.system) parts.push(spec.system);
  if (spec.context) parts.push(spec.context);
  parts.push(spec.question);
  return parts.join('\n');
}

export function createCodeReviewPrompt(diff: string, rules?: string): PromptSpec {
  const system = 'You are an expert code reviewer. Analyze the following diff and provide constructive feedback.';
  const context = rules ? `## Rules\n${rules}` : undefined;
  return { system, context, question: `## Diff\n\`\`\`diff\n${diff}\n\`\`\``, outputFormat: 'JSON with fields: issues[], suggestions[], score' };
}
