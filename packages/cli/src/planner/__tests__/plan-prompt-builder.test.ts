import { describe, it, expect } from '@jest/globals';
import { PlanPromptBuilder } from '../plan-prompt-builder';
import type { PlanPromptConfig } from '../plan-prompt-builder';

describe('plan-prompt-builder', () => {
  const builder = new PlanPromptBuilder();

  it('should be defined', () => {
    expect(builder).toBeDefined();
    expect(builder.build).toBeDefined();
  });

  it('should build a system message with task type', () => {
    const config: PlanPromptConfig = {
      taskType: 'tests',
      title: 'Add unit tests',
      description: 'Create unit tests for auth module',
      context: [],
      constraints: [],
    };

    const messages = builder.build(config);
    const systemMsg = messages.find(m => m.role === 'system');

    expect(systemMsg).toBeDefined();
    expect(systemMsg!.content).toContain('Task type: tests');
  });

  it('should include user message with title and description', () => {
    const config: PlanPromptConfig = {
      taskType: 'refactor',
      title: 'Refactor auth service',
      description: 'Split monolithic auth into smaller modules',
      context: [],
      constraints: [],
    };

    const messages = builder.build(config);
    const userMsg = messages.find(m => m.role === 'user');

    expect(userMsg).toBeDefined();
    expect(userMsg!.content).toContain('Title: Refactor auth service');
    expect(userMsg!.content).toContain('Description: Split monolithic auth');
  });

  it('should include context in user message when provided', () => {
    const config: PlanPromptConfig = {
      taskType: 'execution',
      title: 'Implement feature',
      description: 'Add login',
      context: ['src/auth/login.ts is the entry point', 'Use JWT tokens'],
      constraints: [],
    };

    const messages = builder.build(config);
    const userMsg = messages.find(m => m.role === 'user');

    expect(userMsg!.content).toContain('src/auth/login.ts');
    expect(userMsg!.content).toContain('JWT tokens');
  });

  it('should include constraints in system message', () => {
    const config: PlanPromptConfig = {
      taskType: 'audit',
      title: 'Security audit',
      description: 'Audit code',
      context: [],
      constraints: ['Must be OWASP compliant', 'No credentials in logs'],
    };

    const messages = builder.build(config);
    const systemMsg = messages.find(m => m.role === 'system');

    expect(systemMsg!.content).toContain('OWASP compliant');
    expect(systemMsg!.content).toContain('No credentials in logs');
  });

  it('should include knowledge context in system message when provided', () => {
    const config: PlanPromptConfig = {
      taskType: 'design',
      title: 'Design system',
      description: 'Design the API',
      context: [],
      constraints: [],
      knowledge: ['The system uses Clean Architecture', 'Authentication is via OAuth2'],
    };

    const messages = builder.build(config);
    const systemMsg = messages.find(m => m.role === 'system');

    expect(systemMsg!.content).toContain('Clean Architecture');
    expect(systemMsg!.content).toContain('OAuth2');
  });

  it('should include few-shot examples when provided (max 2)', () => {
    const examples = [
      { input: 'Example 1 input', output: 'Example 1 output' },
      { input: 'Example 2 input', output: 'Example 2 output' },
      { input: 'Example 3 input', output: 'Example 3 output' },
    ];

    const config: PlanPromptConfig = {
      taskType: 'tests',
      title: 'Test',
      description: 'Desc',
      context: [],
      constraints: [],
      examples,
    };

    const messages = builder.build(config);
    const userExamples = messages.filter(m => m.role === 'user' && m.content === 'Example 1 input');
    const assistantExamples = messages.filter(m => m.role === 'assistant');

    expect(userExamples.length).toBe(1);
    expect(assistantExamples.length).toBe(2);
  });

  it('should include JSON output format in system message', () => {
    const config: PlanPromptConfig = {
      taskType: 'execution',
      title: 'Task',
      description: 'Desc',
      context: [],
      constraints: [],
    };

    const messages = builder.build(config);
    const systemMsg = messages.find(m => m.role === 'system');

    expect(systemMsg!.content).toContain('"steps"');
    expect(systemMsg!.content).toContain('"risks"');
    expect(systemMsg!.content).toContain('"estimatedEffort"');
  });

  it('should return messages in correct order: system, examples, user', () => {
    const config: PlanPromptConfig = {
      taskType: 'execution',
      title: 'T',
      description: 'D',
      context: [],
      constraints: [],
      examples: [{ input: 'In', output: 'Out' }],
    };

    const messages = builder.build(config);

    expect(messages[0].role).toBe('system');
    expect(messages[messages.length - 1].role).toBe('user');
  });

  it('should handle empty context gracefully', () => {
    const config: PlanPromptConfig = {
      taskType: 'maintenance',
      title: 'Fix bug',
      description: 'Fix the login bug',
      context: [],
      constraints: [],
    };

    const messages = builder.build(config);
    const userMsg = messages.find(m => m.role === 'user');

    expect(userMsg!.content).not.toContain('Context:');
  });
});
