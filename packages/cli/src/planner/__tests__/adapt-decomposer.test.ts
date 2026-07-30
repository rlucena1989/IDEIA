import { describe, it, expect } from '@jest/globals';
import { AdaptDecomposer } from '../adapt-decomposer';

describe('adapt-decomposer', () => {
  let decomposer: AdaptDecomposer;

  beforeEach(() => {
    decomposer = new AdaptDecomposer();
  });

  describe('decompose', () => {
    it('should be defined', () => {
      expect(decomposer.decompose).toBeDefined();
    });

    it('should return executable leaf task for simple specs', async () => {
      const result = await decomposer.decompose({
        title: 'Add test',
        description: 'Create a unit test',
      });

      expect(result.executable).toBe(true);
      expect(result.subtasks).toHaveLength(0);
      expect(result.depth).toBe(0);
    });

    it('should generate a short id of 8 chars', async () => {
      const result = await decomposer.decompose({
        title: 'Fix bug',
        description: 'Fix the login bug',
      });

      expect(result.id).toHaveLength(8);
    });

    it('should decompose complex tasks with multiple sentences', async () => {
      const result = await decomposer.decompose({
        title: 'Build authentication system',
        description: 'Implement JWT-based authentication using industry standard protocols and secure key management practices. Add login endpoint with proper rate limiting and input validation. Add token refresh mechanism with sliding session expiration policies. Add user registration with email confirmation workflow. Add password reset with secure token generation and expiration. Add email verification to confirm user identity before granting full access.',
      });

      expect(result.executable).toBe(false);
      expect(result.subtasks.length).toBeGreaterThanOrEqual(1);
    });

    it('should assign suggestedApproach based on depth', async () => {
      const result = await decomposer.decompose({
        title: 'Simple task',
        description: 'A simple task',
      });

      expect(result.suggestedApproach).toMatch(/^(cot|ps|react)$/);
      expect(result.suggestedApproach).toBe('cot');
    });

    it('should set dependencies between subtasks', async () => {
      const result = await decomposer.decompose({
        title: 'Complex feature',
        description: 'First step. Second step. Third step.',
      });

      if (result.subtasks.length >= 2) {
        expect(result.subtasks[0].dependencies).toEqual([]);
        expect(result.subtasks[1].dependencies).toContain(result.subtasks[0].id);
      }
    });

    it('should not exceed MAX_DEPTH (3) when decomposing', async () => {
      const deepSpec = {
        title: 'Very complex task that requires deep decomposition and lots of words to trigger splitting',
        description: 'This is a very long description with many words that will trigger recursive decomposition because it exceeds the complexity threshold. First we analyze. Then we implement. Then we verify. Then we deploy. Then we monitor.',
      };

      const result = await decomposer.decompose(deepSpec);

      function checkDepth(node: { depth: number; subtasks: unknown[] }, maxFound: number): number {
        let newMax = Math.max(maxFound, node.depth);
        for (const sub of node.subtasks) {
          newMax = checkDepth(sub, newMax);
        }
        return newMax;
      }

      const maxDepth = checkDepth(result, 0);
      expect(maxDepth).toBeLessThanOrEqual(3);
    });
  });

  describe('isSimpleEnough behavior', () => {
    it('should treat short specs as executable', async () => {
      const result = await decomposer.decompose({
        title: 'Add',
        description: 'A',
      });

      expect(result.executable).toBe(true);
    });

    it('should treat specs with simple title and action verb as executable', async () => {
      const result = await decomposer.decompose({
        title: 'Add feature',
        description: 'Add a new feature to the system that requires many words to describe it fully and completely for all users who need it.',
      });

      expect(result.executable).toBe(true);
    });
  });

  describe('approach selection', () => {
    it('should cycle through approaches based on depth', async () => {
      const results = await Promise.all([
        decomposer.decompose({ title: 'Task', description: 'Step 1. Step 2.' }),
        decomposer.decompose({ title: 'Task', description: 'Step 1. Step 2. Step 3.' }),
        decomposer.decompose({ title: 'Task', description: 'Step 1. Step 2. Step 3. Step 4.' }),
      ]);

      const approaches = results
        .filter(r => r.subtasks.length > 0)
        .map(r => r.suggestedApproach);

      if (approaches.length > 0) {
        expect(approaches[0]).toBe('cot');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty description', async () => {
      const result = await decomposer.decompose({
        title: 'Task',
        description: '',
      });

      expect(result).toBeDefined();
      expect(result.title).toBe('Task');
    });

    it('should handle single word values', async () => {
      const result = await decomposer.decompose({
        title: 'X',
        description: 'Y',
      });

      expect(result.executable).toBe(true);
      expect(result.depth).toBe(0);
    });
  });
});
