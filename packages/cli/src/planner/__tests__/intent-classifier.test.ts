import { describe, it, expect, jest } from '@jest/globals';
import { IntentClassifier } from '../intent-classifier';

describe('intent-classifier', () => {
  let classifier: IntentClassifier;

  beforeEach(() => {
    classifier = new IntentClassifier();
  });

  describe('keyword classification', () => {
    it('should classify test-related input as tests', async () => {
      const result = await classifier.classify('Create unit tests for the auth module');

      expect(result.primary).toBe('tests');
      expect(result.method).toBe('keyword');
    });

    it('should classify refactor-related input as refactor', async () => {
      const result = await classifier.classify('Refactor the authentication service');

      expect(result.primary).toBe('refactor');
      expect(result.method).toBe('keyword');
    });

    it('should classify audit-related input as audit', async () => {
      const result = await classifier.classify('Audit code quality and security');

      expect(result.primary).toBe('audit');
      expect(result.method).toBe('keyword');
    });

    it('should classify documentation input as documentation', async () => {
      const result = await classifier.classify('Write documentation for the API');

      expect(result.primary).toBe('documentation');
      expect(result.method).toBe('keyword');
    });

    it('should classify strategy input as strategy', async () => {
      const result = await classifier.classify('Define project roadmap for Q3');

      expect(result.primary).toBe('strategy');
      expect(result.method).toBe('keyword');
    });

    it('should classify maintenance input as maintenance', async () => {
      const result = await classifier.classify('Fix critical bug in login flow');

      expect(result.primary).toBe('maintenance');
      expect(result.method).toBe('keyword');
    });

    it('should classify implementation input as execution', async () => {
      const result = await classifier.classify('Create a new REST endpoint for users');

      expect(result.primary).toBe('execution');
      expect(result.method).toBe('keyword');
    });

    it('should classify deploy input as deploy', async () => {
      const result = await classifier.classify('Deploy the application to production');

      expect(result.primary).toBe('deploy');
      expect(result.method).toBe('keyword');
    });

    it('should classify design input as design', async () => {
      const result = await classifier.classify('Design the database schema');

      expect(result.primary).toBe('design');
      expect(result.method).toBe('keyword');
    });

    it('should classify performance input as performance', async () => {
      const result = await classifier.classify('Optimize query performance');

      expect(result.primary).toBe('performance');
      expect(result.method).toBe('keyword');
    });

    it('should classify configuration input as configuration', async () => {
      const result = await classifier.classify('Setup the CI/CD environment');

      expect(result.primary).toBe('configuration');
      expect(result.method).toBe('keyword');
    });

    it('should classify migration input as migration', async () => {
      const result = await classifier.classify('Convert the legacy codebase to the new platform version');

      expect(result.primary).toBe('migration');
      expect(result.method).toBe('keyword');
    });

    it('should return execution as default for unknown input', async () => {
      const result = await classifier.classify('Hello world');

      expect(result.primary).toBe('execution');
      expect(result.method).toBe('keyword');
    });

    it('should extract entities from input', async () => {
      const result = await classifier.classify('Create tests for file "src/auth.ts"');

      expect(result.entities.length).toBeGreaterThan(0);
      const fileEntity = result.entities.find(e => e.type === 'file');
      expect(fileEntity).toBeDefined();
      expect(fileEntity!.value).toContain('src/auth.ts');
    });

    it('should extract module entities', async () => {
      const result = await classifier.classify('Refactor module user-service');

      const moduleEntity = result.entities.find(e => e.type === 'module');
      expect(moduleEntity).toBeDefined();
      expect(moduleEntity!.value).toContain('user-service');
    });

    it('should provide confidence score between 0 and 1', async () => {
      const result = await classifier.classify('Write tests for the API');

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should include alternatives sorted by score', async () => {
      const result = await classifier.classify('Fix and test the login module');

      expect(result.alternatives.length).toBeGreaterThanOrEqual(1);
      for (const alt of result.alternatives) {
        expect(alt.score).toBeGreaterThan(0);
      }
      const altTypes = result.alternatives.map(a => a.type);
      expect(altTypes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('LLM fallback', () => {
    it('should fall back to keyword when LLM throws', async () => {
      const classifierWithBrokenFetch = new IntentClassifier();

      const origFetch = globalThis.fetch;
      globalThis.fetch = jest.fn<typeof fetch>().mockRejectedValue(new Error('Network error'));

      const result = await classifierWithBrokenFetch.classify('Add unit tests');
      expect(result.method).toBe('keyword');
      expect(result.primary).toBe('tests');

      globalThis.fetch = origFetch;
    });
  });
});
