import { WorkflowEngine } from '../src/workflow-engine';

describe('WorkflowEngine', () => {
  function makeEngine(): WorkflowEngine {
    return new WorkflowEngine({ enableQualityGates: false });
  }

  it('should create a workflow', () => {
    const eng = makeEngine();
    const wf = eng.createWorkflow('Release v2', 'Q3 release');
    expect(wf.name).toBe('Release v2');
    expect(wf.status).toBe('pending');
  });

  it('should add steps with dependencies', () => {
    const eng = makeEngine();
    const wf = eng.createWorkflow('Test');
    const step1 = eng.addStep(wf.id, 'Build');
    const step2 = eng.addStep(wf.id, 'Test', [step1!.id]);
    const step3 = eng.addStep(wf.id, 'Deploy', [step2!.id]);

    expect(eng.getWorkflow(wf.id)!.steps).toHaveLength(3);
    expect(step3!.dependsOn).toEqual([step2!.id]);
  });

  it('should update step status', async () => {
    const eng = makeEngine();
    const wf = eng.createWorkflow('Test');
    const step = eng.addStep(wf.id, 'Build')!;
    const result = await eng.updateStepStatus(wf.id, step.id, 'completed');
    expect(result.success).toBe(true);
    expect(eng.getWorkflow(wf.id)!.steps[0]!.status).toBe('completed');
  });

  it('should set workflow completed when all steps done', async () => {
    const eng = makeEngine();
    const wf = eng.createWorkflow('Test');
    const s1 = eng.addStep(wf.id, 'Step 1')!;
    const s2 = eng.addStep(wf.id, 'Step 2')!;
    await eng.updateStepStatus(wf.id, s1.id, 'completed');
    await eng.updateStepStatus(wf.id, s2.id, 'completed');
    expect(eng.getWorkflow(wf.id)!.status).toBe('completed');
  });

  it('should generate summary', () => {
    const eng = makeEngine();
    eng.createWorkflow('W1');
    eng.createWorkflow('W2');
    const summary = eng.getSummary();
    expect(summary.total).toBe(2);
  });

  it('should create and manage sprint', () => {
    const eng = makeEngine();
    const sprint = eng.createSprint('Sprint 1', 'Finish auth', '2026-07-15', '2026-07-29', 40);
    expect(sprint.status).toBe('planning');
    eng.addTaskToSprint(sprint.id, 'task-1');
    eng.startSprint(sprint.id);
    expect(sprint.status).toBe('active');
    eng.recordBurndown(sprint.id, 1);
    eng.completeSprint(sprint.id);
    expect(sprint.status).toBe('completed');
    expect(sprint.burndown).toHaveLength(2);
  });

  it('should select next available task', () => {
    const eng = makeEngine();
    const wf = eng.createWorkflow('Test');
    const s1 = eng.addStep(wf.id, 'Build', [], 5)!;
    eng.addStep(wf.id, 'Deploy', [s1.id], 3);
    const next = eng.selectNextTask(wf.id);
    expect(next).not.toBeNull();
    expect(next!.name).toBe('Build');
  });

  it('should respect dependencies in scheduling', async () => {
    const eng = makeEngine();
    const wf = eng.createWorkflow('Test');
    const s1 = eng.addStep(wf.id, 'Build', [], 5)!;
    eng.addStep(wf.id, 'Deploy', [s1.id], 3);
    await eng.updateStepStatus(wf.id, s1.id, 'completed');
    const next = eng.selectNextTask(wf.id);
    expect(next).not.toBeNull();
    expect(next!.name).toBe('Deploy');
  });

  it('should return null when no tasks available', () => {
    const eng = makeEngine();
    const wf = eng.createWorkflow('Empty');
    expect(eng.selectNextTask(wf.id)).toBeNull();
  });

  describe('workflow creation', () => {
    it('should create workflow with default status pending', () => {
      const eng = makeEngine();
      const wf = eng.createWorkflow('Test');
      expect(wf.status).toBe('pending');
      expect(wf.steps).toEqual([]);
      expect(wf.createdAt).toBeTruthy();
      expect(wf.updatedAt).toBeTruthy();
    });

    it('should generate unique IDs for each workflow', () => {
      const eng = makeEngine();
      const wf1 = eng.createWorkflow('A');
      const wf2 = eng.createWorkflow('B');
      expect(wf1.id).not.toBe(wf2.id);
    });

    it('should create workflow without description', () => {
      const eng = makeEngine();
      const wf = eng.createWorkflow('Minimal');
      expect(wf.name).toBe('Minimal');
      expect(wf.description).toBeUndefined();
    });
  });

  describe('step dependencies', () => {
    it('should handle step status changes without throwing', async () => {
      const eng = makeEngine();
      const wf = eng.createWorkflow('Step Test');
      const s1 = eng.addStep(wf.id, 'Step1', [])!;
      await expect(eng.updateStepStatus(wf.id, s1.id, 'active')).resolves.toBeDefined();
    });

    it('should not select task with unmet dependencies', () => {
      const eng = makeEngine();
      const wf = eng.createWorkflow('Dep Test');
      const s1 = eng.addStep(wf.id, 'Setup', [], 2)!;
      eng.addStep(wf.id, 'Build', [s1.id], 5);
      const next = eng.selectNextTask(wf.id);
      expect(next).not.toBeNull();
      expect(next!.name).toBe('Setup');
    });
  });

  describe('step status transitions', () => {
    it('should update step status to various states', async () => {
      const eng = makeEngine();
      const wf = eng.createWorkflow('States');
      const step = eng.addStep(wf.id, 'Step')!;

      const r1 = await eng.updateStepStatus(wf.id, step.id, 'active');
      expect(r1.success).toBe(true);
      expect(eng.getWorkflow(wf.id)!.steps[0]!.status).toBe('active');

      const r2 = await eng.updateStepStatus(wf.id, step.id, 'completed');
      expect(r2.success).toBe(true);
      expect(eng.getWorkflow(wf.id)!.steps[0]!.status).toBe('completed');
    });

    it('should return false for invalid workflow ID', async () => {
      const eng = makeEngine();
      const result = await eng.updateStepStatus('nonexistent', 'step1', 'completed');
      expect(result.success).toBe(false);
    });

    it('should return false for invalid step ID', async () => {
      const eng = makeEngine();
      const wf = eng.createWorkflow('Test');
      const result = await eng.updateStepStatus(wf.id, 'nonexistent', 'completed');
      expect(result.success).toBe(false);
    });

    it('should return null when adding step to nonexistent workflow', () => {
      const eng = makeEngine();
      expect(eng.addStep('nonexistent', 'Step')).toBeNull();
    });
  });

  describe('workflow listing', () => {
    it('should list all workflows', () => {
      const eng = makeEngine();
      eng.createWorkflow('A');
      eng.createWorkflow('B');
      eng.createWorkflow('C');
      expect(eng.listWorkflows()).toHaveLength(3);
    });

    it('should filter workflows by status', async () => {
      const eng = makeEngine();
      eng.createWorkflow('Pending');
      const wf = eng.createWorkflow('To Complete');
      const step = eng.addStep(wf.id, 'Step')!;
      await eng.updateStepStatus(wf.id, step.id, 'completed');
      expect(eng.listWorkflows('pending')).toHaveLength(1);
      expect(eng.listWorkflows('completed')).toHaveLength(1);
    });
  });

  describe('sprint management', () => {
    it('should not add tasks to non-planning sprint', () => {
      const eng = makeEngine();
      const sprint = eng.createSprint('S1', 'Goal', '2026-01-01', '2026-01-15', 20);
      eng.startSprint(sprint.id);
      const result = eng.addTaskToSprint(sprint.id, 'task-2');
      expect(result).toBeNull();
    });

    it('should create burndown on sprint start', () => {
      const eng = makeEngine();
      const sprint = eng.createSprint('S1', 'Goal', '2026-01-01', '2026-01-15', 20);
      eng.addTaskToSprint(sprint.id, 'task-1');
      eng.addTaskToSprint(sprint.id, 'task-2');
      eng.startSprint(sprint.id);
      expect(sprint.burndown).toHaveLength(1);
      expect(sprint.burndown[0]!.remaining).toBe(2);
    });

    it('should return null for invalid sprint operations', () => {
      const eng = makeEngine();
      expect(eng.addTaskToSprint('invalid', 'task-1')).toBeNull();
      expect(eng.startSprint('invalid')).toBeNull();
      expect(eng.recordBurndown('invalid', 5)).toBeNull();
      expect(eng.completeSprint('invalid')).toBeNull();
      expect(eng.getSprint('invalid')).toBeUndefined();
    });

    it('should retrieve sprint by ID', () => {
      const eng = makeEngine();
      const sprint = eng.createSprint('S1', 'Goal', '2026-01-01', '2026-01-15', 20);
      const retrieved = eng.getSprint(sprint.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('S1');
    });
  });

  describe('AI scheduler', () => {
    it('should prefer task with lower estimated hours', () => {
      const eng = makeEngine();
      const wf = eng.createWorkflow('Scheduler Test');
      eng.addStep(wf.id, 'Long Task', [], 10);
      eng.addStep(wf.id, 'Short Task', [], 2);
      const next = eng.selectNextTask(wf.id);
      expect(next!.name).toBe('Short Task');
    });

    it('should return null for completed workflow', async () => {
      const eng = makeEngine();
      const wf = eng.createWorkflow('Done');
      const s1 = eng.addStep(wf.id, 'Only step')!;
      await eng.updateStepStatus(wf.id, s1.id, 'completed');
      expect(eng.selectNextTask(wf.id)).toBeNull();
    });
  });

  describe('summary', () => {
    it('should compute completion rate correctly', async () => {
      const eng = makeEngine();
      const wf = eng.createWorkflow('Test Summary');
      const s1 = eng.addStep(wf.id, 'Step 1')!;
      const _s2 = eng.addStep(wf.id, 'Step 2')!;
      await eng.updateStepStatus(wf.id, s1.id, 'completed');
      const summary = eng.getSummary();
      expect(summary.completionRate).toBe(50);
    });

    it('should return 0 completion rate for workflows with no steps', () => {
      const eng = makeEngine();
      eng.createWorkflow('Empty');
      const summary = eng.getSummary();
      expect(summary.completionRate).toBe(0);
    });
  });
});
