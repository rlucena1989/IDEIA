import { describe, it, expect, beforeEach } from '@jest/globals';
import { TaskSampler } from '../src/task-sampler';
import { Task, TaskFamily, DecompositionStrategy } from '../src/types';

describe('TaskSampler', () => {
  let sampler: TaskSampler;
  let mockFamilies: TaskFamily[];
  let mockTasks: Task[];

  beforeEach(() => {
    sampler = new TaskSampler();
    mockTasks = [
      {
        id: 'task-1',
        goal: {
          description: 'Test task 1',
          complexity: 1,
          domain: 'web',
          constraints: [],
          successCriteria: [],
        },
        context: {
          fileCount: 10,
          agentSkillLevel: 0.5,
          similarProjects: 5,
          hasExistingCode: true,
          isBugfix: false,
          isRefactor: false,
          timeEstimate: 60,
          historyLength: 100,
          teamSize: 3,
          techStack: ['typescript'],
        },
        expectedSteps: 5,
        optimalStrategy: 'top-down',
        groundTruth: [],
        metadata: {
          source: 'synthetic',
          qualityScore: 0.9,
          timestamp: Date.now(),
        },
      },
      {
        id: 'task-2',
        goal: {
          description: 'Test task 2',
          complexity: 2,
          domain: 'web',
          constraints: [],
          successCriteria: [],
        },
        context: {
          fileCount: 20,
          agentSkillLevel: 0.7,
          similarProjects: 3,
          hasExistingCode: false,
          isBugfix: true,
          isRefactor: false,
          timeEstimate: 90,
          historyLength: 50,
          teamSize: 2,
          techStack: ['typescript'],
        },
        expectedSteps: 8,
        optimalStrategy: 'bottom-up',
        groundTruth: [],
        metadata: {
          source: 'human',
          qualityScore: 0.8,
          timestamp: Date.now(),
        },
      },
    ];

    mockFamilies = [
      {
        id: 'family-1',
        name: 'Web Development',
        domain: 'web',
        supportSet: [mockTasks[0]],
        querySet: [mockTasks[1]],
        similarityThreshold: 0.8,
        metaFeatures: { complexity: 1.5 },
        curriculumOrder: 1,
      },
    ];
  });

  describe('sampleTask', () => {
    it('should sample a task from families', () => {
      const task = sampler.sampleTask(mockFamilies);
      expect(task).toBeDefined();
      expect(mockTasks).toContain(task);
    });
  });

  describe('sampleBatch', () => {
    it('should sample batch from families', () => {
      const batches = sampler.sampleBatch(mockFamilies, 1, 1);
      expect(batches).toHaveLength(1);
      expect(batches[0].support).toHaveLength(1);
      expect(batches[0].query).toHaveLength(1);
      expect(batches[0].family).toEqual(mockFamilies[0]);
    });
  });

  describe('sampleBatchFromFamily', () => {
    it('should sample batch from single family', () => {
      const batch = sampler.sampleBatchFromFamily(mockFamilies[0], 1, 1);
      expect(batch.support).toHaveLength(1);
      expect(batch.query).toHaveLength(1);
    });
  });

  describe('curriculumBatch', () => {
    it('should sample from early phase', () => {
      const family = sampler.curriculumBatch(mockFamilies, 0.2);
      expect(family).toBeDefined();
    });

    it('should sample from middle phase', () => {
      const family = sampler.curriculumBatch(mockFamilies, 0.5);
      expect(family).toBeDefined();
    });

    it('should sample from late phase', () => {
      const family = sampler.curriculumBatch(mockFamilies, 0.8);
      expect(family).toBeDefined();
    });

    it('should throw error for empty families', () => {
      expect(() => sampler.curriculumBatch([], 0.5)).toThrow('No task families available');
    });
  });

  describe('stratifyByDomain', () => {
    it('should group tasks by domain', () => {
      const groups = sampler.stratifyByDomain(mockTasks);
      expect(groups.has('web')).toBe(true);
      expect(groups.get('web')).toHaveLength(2);
    });
  });

  describe('curriculumOrder', () => {
    it('should order families by complexity', () => {
      const ordered = sampler.curriculumOrder(mockFamilies);
      expect(ordered).toHaveLength(1);
    });
  });

  describe('similaritySort', () => {
    it('should sort by similarity to target', () => {
      const sorted = sampler.similaritySort(mockFamilies, mockFamilies[0]);
      expect(sorted).toHaveLength(1);
      expect(sorted[0]).toEqual(mockFamilies[0]);
    });
  });
});
