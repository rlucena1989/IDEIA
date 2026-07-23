import { Guardrails, createGuardrails } from '../guardrails';

describe('Guardrails', () => {
  let guard: Guardrails;

  beforeEach(() => {
    guard = new Guardrails({ maxPromptLength: 100 });
  });

  describe('checkInput', () => {
    it('passes safe input', () => {
      const r = guard.checkInput('hello world');
      expect(r.passed).toBe(true);
    });

    it('fails oversized input', () => {
      const r = guard.checkInput('a'.repeat(200));
      expect(r.passed).toBe(false);
      expect(r.checks[0].name).toBe('prompt_length');
    });

    it('detects API keys in input', () => {
      const r = guard.checkInput('my key is sk-test-placeholder');
      expect(r.passed).toBe(false);
    });
  });

  describe('checkOutput', () => {
    it('passes safe output', () => {
      const r = guard.checkOutput('function add(a,b) { return a + b; }');
      expect(r.passed).toBe(true);
    });

    it('detects eval in output', () => {
      const r = guard.checkOutput('const result = eval(userInput);');
      expect(r.passed).toBe(false);
    });

    it('returns sanitized output', () => {
      const r = guard.checkOutput('const apiKey = "sk-test-placeholder";');
      expect(r.sanitized).toBeDefined();
    });
  });

  describe('checkDeployApproval', () => {
    it('requires approval for production', () => {
      const r = guard.checkDeployApproval('production');
      expect(r.passed).toBe(false);
      expect(r.details).toContain('aprovação');
    });

    it('allows dev deploy', () => {
      const r = guard.checkDeployApproval('development');
      expect(r.passed).toBe(true);
    });
  });

  describe('checkModelAllowed', () => {
    it('passes when no restrictions', () => {
      const r = guard.checkModelAllowed('gpt-4');
      expect(r.passed).toBe(true);
    });

    it('fails when model not in allowed', () => {
      const g = new Guardrails({ allowedModels: ['llama3'] });
      const r = g.checkModelAllowed('gpt-4');
      expect(r.passed).toBe(false);
    });
  });

  describe('createGuardrails factory', () => {
    it('creates with default config', () => {
      const g = createGuardrails();
      expect(g).toBeInstanceOf(Guardrails);
    });
  });
});
