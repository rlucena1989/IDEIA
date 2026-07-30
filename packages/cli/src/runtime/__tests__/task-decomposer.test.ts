import {
  decomposeTask,
  detectDependencies,
  detectParallelism,
  separateDeterministic,
} from '../task-decomposer';
import type { TaskNode } from '../orchestration-types';
import type { DecompositionInput } from '../task-decomposer';

const makeTask = (overrides: Partial<TaskNode> & { id: string }): TaskNode => ({
  name: `task-${overrides.id}`,
  description: '',
  phase: 'diagnosis',
  status: 'pending',
  dependsOn: [],
  blockedBy: [],
  riskLevel: 'low',
  estimatedEffort: 'minutes',
  canParallelize: true,
  isDeterministic: false,
  requiresLLM: false,
  ...overrides,
});

describe('task-decomposer', () => {
  describe('decomposeTask', () => {
    it('decomposes a simple low-complexity task without LLM or deterministic parts', () => {
      const input: DecompositionInput = {
        id: 'task1',
        name: 'MyTask',
        description: 'A simple task',
        estimatedComplexity: 'low',
        domain: ['backend'],
        hasLLMRequirement: false,
        hasDeterministicParts: false,
      };
      const result = decomposeTask(input, 'diagnosis');
      expect(result.originalId).toBe('task1');
      expect(result.subtasks.length).toBe(1); // only validacao final
      expect(result.subtasks[0].name).toContain('validacao final');
    });

    it('generates deterministic structure/stubs/tests when hasDeterministicParts is true', () => {
      const input: DecompositionInput = {
        id: 'task2',
        name: 'WithDet',
        description: 'Has deterministic parts',
        estimatedComplexity: 'medium',
        domain: ['frontend'],
        hasLLMRequirement: false,
        hasDeterministicParts: true,
      };
      const result = decomposeTask(input, 'structuring');
      const names = result.subtasks.map(s => s.name);
      expect(names).toEqual([
        'WithDet: estrutura',
        'WithDet: stubs',
        'WithDet: testes base',
        'WithDet: validacao final',
      ]);
      // stubs depends on estrutura, testes base depends on estrutura
      const stubs = result.subtasks.find(s => s.name === 'WithDet: stubs');
      expect(stubs?.dependsOn).toEqual(['task2-sub-1']);
    });

    it('adds LLM subtask when hasLLMRequirement is true', () => {
      const input: DecompositionInput = {
        id: 'task3',
        name: 'WithLLM',
        description: 'Has LLM requirement',
        estimatedComplexity: 'medium',
        domain: ['ai'],
        hasLLMRequirement: true,
        hasDeterministicParts: false,
      };
      const result = decomposeTask(input, 'parallelization');
      const llmSubtasks = result.subtasks.filter(s => s.requiresLLM);
      expect(llmSubtasks.length).toBeGreaterThanOrEqual(1);
      expect(llmSubtasks[0].name).toContain('logica principal');
    });

    it('adds review subtask for high complexity LLM tasks', () => {
      const input: DecompositionInput = {
        id: 'task4',
        name: 'ComplexLLM',
        description: 'High complexity LLM task',
        estimatedComplexity: 'high',
        domain: ['ai', 'security'],
        hasLLMRequirement: true,
        hasDeterministicParts: false,
      };
      const result = decomposeTask(input, 'diagnosis');
      const names = result.subtasks.map(s => s.name);
      expect(names).toContain('ComplexLLM: revisao');
      const revSubtask = result.subtasks.find(s => s.name === 'ComplexLLM: revisao');
      expect(revSubtask).toBeDefined();
      expect(revSubtask!.riskLevel).toBe('medium');
    });

    it('sets correct model tiers based on risk', () => {
      const input: DecompositionInput = {
        id: 'task5',
        name: 'RiskLLM',
        description: 'High risk LLM task',
        estimatedComplexity: 'high',
        domain: ['ai'],
        hasLLMRequirement: true,
        hasDeterministicParts: false,
      };
      const result = decomposeTask(input, 'diagnosis');
      const llmSubtask = result.subtasks.find(s => s.name === 'RiskLLM: logica principal');
      expect(llmSubtask?.requiredModelTier).toBe('strong');
    });

    it('produces parallel groups in the result', () => {
      const input: DecompositionInput = {
        id: 'task6',
        name: 'ParTest',
        description: 'Parallelism test',
        estimatedComplexity: 'low',
        domain: ['backend'],
        hasLLMRequirement: false,
        hasDeterministicParts: true,
      };
      const result = decomposeTask(input, 'checkpoint');
      expect(result.parallelGroups.length).toBeGreaterThanOrEqual(1);
      // estrutura (sub-1) should be first group
      expect(result.parallelGroups[0]).toContain('task6-sub-1');
    });
  });

  describe('detectDependencies', () => {
    it('extracts dependency pairs from tasks', () => {
      const tasks: TaskNode[] = [
        makeTask({ id: 'a', dependsOn: [] }),
        makeTask({ id: 'b', dependsOn: ['a'] }),
        makeTask({ id: 'c', dependsOn: ['a', 'b'] }),
      ];
      const deps = detectDependencies(tasks);
      expect(deps).toEqual([
        { from: 'a', to: 'b' },
        { from: 'a', to: 'c' },
        { from: 'b', to: 'c' },
      ]);
    });

    it('returns empty array for tasks with no dependencies', () => {
      const tasks: TaskNode[] = [
        makeTask({ id: 'a', dependsOn: [] }),
        makeTask({ id: 'b', dependsOn: [] }),
      ];
      expect(detectDependencies(tasks)).toEqual([]);
    });
  });

  describe('detectParallelism', () => {
    it('finds parallel groups in dependency chain', () => {
      const tasks: TaskNode[] = [
        makeTask({ id: 'a', dependsOn: [] }),
        makeTask({ id: 'b', dependsOn: ['a'] }),
        makeTask({ id: 'c', dependsOn: ['b'] }),
      ];
      const groups = detectParallelism(tasks);
      expect(groups.length).toBe(3); // a, then b, then c
      expect(groups[0]).toEqual(['a']);
      expect(groups[1]).toEqual(['b']);
      expect(groups[2]).toEqual(['c']);
    });

    it('groups parallel tasks at the same level', () => {
      const tasks: TaskNode[] = [
        makeTask({ id: 'root', dependsOn: [] }),
        makeTask({ id: 'child1', dependsOn: ['root'] }),
        makeTask({ id: 'child2', dependsOn: ['root'] }),
      ];
      const groups = detectParallelism(tasks);
      expect(groups[0]).toEqual(['root']);
      expect(groups[1].sort()).toEqual(['child1', 'child2']);
    });
  });

  describe('separateDeterministic', () => {
    it('separates deterministic from creative tasks', () => {
      const tasks: TaskNode[] = [
        makeTask({ id: 'a', isDeterministic: true }),
        makeTask({ id: 'b', isDeterministic: false }),
        makeTask({ id: 'c', isDeterministic: true }),
      ];
      const { deterministic, creative } = separateDeterministic(tasks);
      expect(deterministic.map(t => t.id)).toEqual(['a', 'c']);
      expect(creative.map(t => t.id)).toEqual(['b']);
    });

    it('handles empty input', () => {
      const { deterministic, creative } = separateDeterministic([]);
      expect(deterministic).toEqual([]);
      expect(creative).toEqual([]);
    });
  });
});
