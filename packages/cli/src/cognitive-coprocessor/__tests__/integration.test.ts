import { CognitiveCoprocessor } from '../integration';

describe('CognitiveCoprocessor', () => {
  let coprocessor: CognitiveCoprocessor;

  beforeAll(() => {
    coprocessor = new CognitiveCoprocessor();
  });

  it('should process a simple development request', async () => {
    const result = await coprocessor.process({
      title: 'Add unit tests for auth module',
      description: 'Create Jest unit tests for the authentication module covering login, register, and token validation',
    });
    expect(result.intent).toBeDefined();
    expect(result.plan).toBeDefined();
    expect(typeof result.validated).toBe('boolean');
  }, 10000);

  it('should detect missing required fields', async () => {
    const result = await coprocessor.process({
      title: '',
      description: '',
    });
    expect(result.validated).toBe(false);
    expect(result.validationErrors.length).toBeGreaterThan(0);
  });

  it('should return prompt messages for LLM', async () => {
    const result = await coprocessor.process({
      title: 'Refactor database layer',
      description: 'Extract repository pattern from the current database access implementation',
    });
    expect(result.promptMessages.length).toBeGreaterThan(0);
    expect(result.promptMessages[0].role).toBe('system');
  });
});
