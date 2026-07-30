import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { PlanningService } from '../src/planning-service';

describe('PlanningService', () => {
  let service: PlanningService;

  beforeEach(() => {
    service = new PlanningService();
  });

  it('should create a plan', () => {
    const plan = service.createPlan('Test Plan', 'A test plan', [
      { description: 'Step 1', order: 0 },
      { description: 'Step 2', order: 1 },
    ]);
    expect(plan.id).toBeDefined();
    expect(plan.status).toBe('draft');
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0]?.status).toBe('draft');
  });

  it('should execute a plan and complete steps', () => {
    const plan = service.createPlan('Execute Test', 'Testing execution', [
      { description: 'First', order: 0 },
      { description: 'Second', order: 1 },
    ]);

    const active = service.executePlan(plan.id);
    expect(active?.status).toBe('active');
    expect(active?.steps[0]?.status).toBe('active');

    const step1 = service.completeStep(plan.id, active!.steps[0]!.id);
    expect(step1?.steps[0]?.status).toBe('completed');
    expect(step1?.steps[1]?.status).toBe('active');

    const step2 = service.completeStep(plan.id, active!.steps[1]!.id);
    expect(step2?.status).toBe('completed');
    expect(step2?.completedAt).toBeDefined();
  });

  it('should return undefined for nonexistent plans', () => {
    expect(service.executePlan('nonexistent')).toBeUndefined();
    expect(service.getPlanStatus('nonexistent')).toBeUndefined();
    expect(service.completeStep('nonexistent', 'nonexistent')).toBeUndefined();
  });

  it('should track history', () => {
    const plan = service.createPlan('History Test', 'Testing history', [{ description: 'Only step', order: 0 }]);
    service.executePlan(plan.id);
    const history = service.getPlanHistory(plan.id);
    expect(history).toHaveLength(2);
    expect(history[0]?.action).toBe('created');
  });

  describe('getPlan', () => {
    it('should return a plan by id', () => {
      const plan = service.createPlan('Get Test', 'Testing getPlan', [{ description: 'Step', order: 0 }]);
      const result = service.getPlan(plan.id);
      expect(result).toBeDefined();
      expect(result!.id).toBe(plan.id);
    });

    it('should return undefined for nonexistent plan', () => {
      expect(service.getPlan('nonexistent')).toBeUndefined();
    });
  });

  describe('cancelPlan', () => {
    it('should cancel an active plan', () => {
      const plan = service.createPlan('Cancel Test', 'Testing cancel', [
        { description: 'Step 1', order: 0 },
        { description: 'Step 2', order: 1 },
      ]);
      service.executePlan(plan.id);
      const cancelled = service.cancelPlan(plan.id);
      expect(cancelled?.status).toBe('cancelled');
      expect(cancelled?.updatedAt).toBeDefined();
    });

    it('should set active steps to cancelled', () => {
      const plan = service.createPlan('Cancel Steps', 'Testing step cancel', [
        { description: 'Step 1', order: 0 },
      ]);
      service.executePlan(plan.id);
      const cancelled = service.cancelPlan(plan.id);
      expect(cancelled!.steps[0]!.status).toBe('cancelled');
    });

    it('should return undefined for nonexistent plan', () => {
      expect(service.cancelPlan('nonexistent')).toBeUndefined();
    });

    it('should add cancelled entry to history', () => {
      const plan = service.createPlan('History Cancel', 'Testing cancel history', [
        { description: 'Step', order: 0 },
      ]);
      service.cancelPlan(plan.id);
      const history = service.getPlanHistory(plan.id);
      expect(history.some(h => h.action === 'cancelled')).toBe(true);
    });
  });

  describe('failPlan', () => {
    it('should fail an active plan', () => {
      const plan = service.createPlan('Fail Test', 'Testing fail', [
        { description: 'Step 1', order: 0 },
      ]);
      service.executePlan(plan.id);
      const failed = service.failPlan(plan.id, 'Something went wrong');
      expect(failed?.status).toBe('failed');
      expect(failed?.failReason).toBe('Something went wrong');
    });

    it('should set active steps to failed', () => {
      const plan = service.createPlan('Fail Steps', 'Testing step fail', [
        { description: 'Step 1', order: 0 },
      ]);
      service.executePlan(plan.id);
      const failed = service.failPlan(plan.id, 'Error');
      expect(failed!.steps[0]!.status).toBe('failed');
    });

    it('should return undefined for nonexistent plan', () => {
      expect(service.failPlan('nonexistent', 'reason')).toBeUndefined();
    });

    it('should add failed entry to history', () => {
      const plan = service.createPlan('History Fail', 'Testing fail history', [
        { description: 'Step', order: 0 },
      ]);
      service.failPlan(plan.id, 'Failed');
      const history = service.getPlanHistory(plan.id);
      expect(history.some(h => h.action === 'failed')).toBe(true);
    });
  });

  describe('listPlans', () => {
    it('should list all plans', () => {
      service.createPlan('Plan A', 'First', [{ description: 'Step', order: 0 }]);
      service.createPlan('Plan B', 'Second', [{ description: 'Step', order: 0 }]);
      const list = service.listPlans();
      expect(list).toHaveLength(2);
    });

    it('should filter plans by status', () => {
      const plan = service.createPlan('Filter Test', 'Testing filter', [
        { description: 'Step', order: 0 },
      ]);
      service.executePlan(plan.id);
      const active = service.listPlans('active');
      expect(active).toHaveLength(1);
      expect(active[0]!.status).toBe('active');
      const draft = service.listPlans('draft');
      expect(draft).toHaveLength(0);
    });

    it('should return empty array for unmatched status filter', () => {
      service.createPlan('Empty', 'Test', [{ description: 'Step', order: 0 }]);
      const result = service.listPlans('completed' as unknown as 'draft' | 'active' | 'completed' | 'failed' | 'cancelled' | undefined);
      expect(result).toHaveLength(0);
    });
  });

  describe('validatePlan', () => {
    it('should validate a valid plan', () => {
      const plan = service.createPlan('Valid', 'A valid plan', [
        { description: 'Step 0', order: 0 },
        { description: 'Step 1', order: 1 },
      ]);
      const result = service.validatePlan(plan.id);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.rules).toContain('ordered-steps');
    });

    it('should return errors for nonexistent plan', () => {
      const result = service.validatePlan('nonexistent');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Plan not found');
    });

    it('should detect missing name', () => {
      const plan = service.createPlan('', 'No name', [{ description: 'Step', order: 0 }]);
      const result = service.validatePlan(plan.id);
      expect(result.errors).toContain('Plan name is required');
    });

    it('should detect incorrect step order', () => {
      const plan = service.createPlan('Order', 'Bad order', [
        { description: 'Step 1', order: 1 },
      ]);
      const result = service.validatePlan(plan.id);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('incorrect order');
    });
  });

  describe('event listeners', () => {
    it('should notify listeners on create', () => {
      const events: string[] = [];
      service.addEventListener(e => events.push(e.action));
      service.createPlan('Event Test', 'Testing events', [{ description: 'Step', order: 0 }]);
      expect(events).toContain('created');
    });

    it('should notify listeners on cancel', () => {
      const events: string[] = [];
      service.addEventListener(e => events.push(e.action));
      const plan = service.createPlan('Cancel Event', 'Cancel', [{ description: 'Step', order: 0 }]);
      service.cancelPlan(plan.id);
      expect(events).toContain('cancelled');
    });

    it('should notify listeners on fail', () => {
      const events: string[] = [];
      service.addEventListener(e => events.push(e.action));
      const plan = service.createPlan('Fail Event', 'Fail', [{ description: 'Step', order: 0 }]);
      service.failPlan(plan.id, 'reason');
      expect(events).toContain('failed');
    });

    it('should support removing listeners', () => {
      const events: string[] = [];
      const remove = service.addEventListener(e => events.push(e.action));
      remove();
      service.createPlan('Remove Test', 'Remove', [{ description: 'Step', order: 0 }]);
      expect(events).toHaveLength(0);
    });
  });

  describe('persistence', () => {
    const tmpDir = path.join(os.tmpdir(), 'planning-test-' + Date.now());
    const persistPath = path.join(tmpDir, 'plans.json');

    beforeAll(() => {
      fs.mkdirSync(tmpDir, { recursive: true });
    });

    afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should save and load plans', async () => {
      const svc = new PlanningService(persistPath);
      svc.createPlan('Persist Test', 'Testing save/load', [
        { description: 'Step A', order: 0 },
        { description: 'Step B', order: 1 },
      ]);
      await svc.save();

      const loaded = new PlanningService(persistPath);
      await loaded.load();
      const plans = loaded.listPlans();
      expect(plans).toHaveLength(1);
      expect(plans[0]?.name).toBe('Persist Test');
    });

    it('should save and restore history', async () => {
      const svc = new PlanningService(persistPath);
      const plan = svc.createPlan('History Persist', 'History', [{ description: 'Step', order: 0 }]);
      svc.cancelPlan(plan.id);
      await svc.save();

      const loaded = new PlanningService(persistPath);
      await loaded.load();
      const history = loaded.getPlanHistory(plan.id);
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history.some(h => h.action === 'cancelled')).toBe(true);
    });

    it('should throw on save without path', async () => {
      const svc = new PlanningService();
      await expect(svc.save()).rejects.toThrow('No persist path configured');
    });

    it('should throw on load without path', async () => {
      const svc = new PlanningService();
      await expect(svc.load()).rejects.toThrow('No persist path configured');
    });

    it('should use explicit file path over constructor path', async () => {
      const explicitPath = path.join(tmpDir, 'explicit.json');
      const svc = new PlanningService(persistPath);
      svc.createPlan('Explicit Test', 'Testing explicit path', [{ description: 'Step', order: 0 }]);
      await svc.save(explicitPath);

      const loaded = new PlanningService();
      await loaded.load(explicitPath);
      expect(loaded.listPlans()).toHaveLength(1);
    });
  });
});
