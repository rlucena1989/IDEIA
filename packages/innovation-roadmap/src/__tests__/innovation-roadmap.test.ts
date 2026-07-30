import { InnovationTracker, type InnovationInitiative } from '../innovation-tracker';
import { RoadmapGenerator } from '../roadmap-generator';
import { MilestonePlanner } from '../milestone-planner';
import { PriorityScorer } from '../priority-scorer';

describe('InnovationTracker', () => {
  it('should add and retrieve initiatives', () => {
    const tracker = new InnovationTracker();
    const init: InnovationInitiative = {
      id: 'init-1', name: 'AI Code Review', description: '', category: 'ai',
      status: 'proposed', priority: 5, effort: 40, impact: 8,
      dependencies: [], owner: 'team-ai', created: new Date(), updated: new Date(), tags: [],
    };
    tracker.add(init);
    expect(tracker.get('init-1')).toBeDefined();
    expect(tracker.get('init-1')!.name).toBe('AI Code Review');
  });

  it('should update status', () => {
    const tracker = new InnovationTracker();
    tracker.add({ id: 'i2', name: 'Feature', description: '', category: 'core', status: 'proposed', priority: 3, effort: 20, impact: 5, dependencies: [], owner: '', created: new Date(), updated: new Date(), tags: [] });
    tracker.updateStatus('i2', 'in-progress');
    expect(tracker.get('i2')!.status).toBe('in-progress');
  });

  it('should filter by status', () => {
    const tracker = new InnovationTracker();
    tracker.add({ id: 'a', name: 'A', description: '', category: 'ai', status: 'approved', priority: 1, effort: 10, impact: 5, dependencies: [], owner: '', created: new Date(), updated: new Date(), tags: [] });
    tracker.add({ id: 'b', name: 'B', description: '', category: 'security', status: 'proposed', priority: 2, effort: 20, impact: 8, dependencies: [], owner: '', created: new Date(), updated: new Date(), tags: [] });
    expect(tracker.getByStatus('approved').length).toBe(1);
    expect(tracker.getByCategory('security').length).toBe(1);
  });

  it('should provide stats', () => {
    const tracker = new InnovationTracker();
    const init: InnovationInitiative = { id: 's1', name: 'S1', description: '', category: 'core', status: 'in-progress', priority: 4, effort: 30, impact: 7, dependencies: [], owner: '', created: new Date(), updated: new Date(), tags: [] };
    tracker.add(init);
    const stats = tracker.getStats();
    expect(stats.total).toBe(1);
    expect(stats.byStatus['in-progress']).toBe(1);
  });

  it('should search', () => {
    const tracker = new InnovationTracker();
    const init: InnovationInitiative = { id: 'f1', name: 'Federated Learning', description: 'Federated ML training across edge', category: 'ai', status: 'proposed', priority: 5, effort: 80, impact: 9, dependencies: [], owner: '', created: new Date(), updated: new Date(), tags: ['ml', 'edge'] };
    tracker.add(init);
    expect(tracker.search('federated').length).toBe(1);
    expect(tracker.search('edge').length).toBe(1);
    expect(tracker.search('nonexistent').length).toBe(0);
  });
});

describe('RoadmapGenerator', () => {
  it('should generate roadmap document', () => {
    const gen = new RoadmapGenerator();
    const initiatives: InnovationInitiative[] = [
      { id: 'r1', name: 'Feature X', description: '', category: 'core', status: 'approved', priority: 5, effort: 40, impact: 8, dependencies: [], owner: '', created: new Date(), updated: new Date(), tags: [] },
      { id: 'r2', name: 'Feature Y', description: '', category: 'ai', status: 'in-progress', priority: 4, effort: 60, impact: 9, dependencies: [], owner: '', created: new Date(), updated: new Date(), tags: [] },
    ];
    const doc = gen.generate(initiatives, { title: 'Q3 Roadmap', description: '', horizon: 'q3', startDate: new Date(), includeCompleted: false, groupBy: 'category' });
    expect(doc.summary.total).toBe(2);
    expect(doc.sections.length).toBeGreaterThan(0);
  });

  it('should generate markdown output', () => {
    const gen = new RoadmapGenerator();
    const initiatives: InnovationInitiative[] = [
      { id: 'm1', name: 'Migration', description: '', category: 'core', status: 'approved', priority: 5, effort: 40, impact: 8, dependencies: [], owner: '', created: new Date(), updated: new Date(), tags: [] },
    ];
    const doc = gen.generate(initiatives, { title: 'Test', description: '', horizon: 'q1', startDate: new Date(), includeCompleted: true, groupBy: 'category' });
    const md = gen.toMarkdown(doc);
    expect(md).toContain('# Test');
    expect(md).toContain('Migration');
  });
});

describe('MilestonePlanner', () => {
  it('should add phases and milestones', () => {
    const planner = new MilestonePlanner();
    planner.addPhase({ id: 'p1', name: 'Phase 1', description: '', startDate: new Date(), endDate: new Date(), milestones: [], status: 'planned' });
    planner.addMilestone('p1', { id: 'm1', name: 'Alpha', description: '', date: new Date(), deliverables: ['core'], phase: 'p1', dependencies: [], completed: false });
    expect(planner.getPhases().length).toBe(1);
    expect(planner.getMilestones().length).toBe(1);
  });

  it('should calculate completion percentage', () => {
    const planner = new MilestonePlanner();
    planner.addPhase({ id: 'p1', name: 'P1', description: '', startDate: new Date(), endDate: new Date(), milestones: [
      { id: 'm1', name: 'M1', description: '', date: new Date(), deliverables: [], phase: 'p1', dependencies: [], completed: true },
      { id: 'm2', name: 'M2', description: '', date: new Date(), deliverables: [], phase: 'p1', dependencies: [], completed: false },
    ], status: 'active' });
    expect(planner.getCompletion().percent).toBe(50);
  });

  it('should generate Gantt chart', () => {
    const planner = new MilestonePlanner();
    planner.addPhase({ id: 'p1', name: 'Foundation', description: '', startDate: new Date(), endDate: new Date(), milestones: [
      { id: 'm1', name: 'Setup', description: '', date: new Date(), deliverables: [], phase: 'p1', dependencies: [], completed: true },
    ], status: 'completed' });
    const gantt = planner.generateGantt();
    expect(gantt).toContain('gantt');
    expect(gantt).toContain('Foundation');
  });
});

describe('PriorityScorer', () => {
  it('should score initiatives', () => {
    const scorer = new PriorityScorer();
    const init: InnovationInitiative = { id: 's1', name: 'Scored', description: '', category: 'core', status: 'proposed', priority: 5, effort: 40, impact: 8, dependencies: [], owner: '', created: new Date(), updated: new Date(), tags: [] };
    const scored = scorer.score(init);
    expect(scored.totalScore).toBeGreaterThan(0);
    expect(scored.urgencyScore).toBe(100);
  });

  it('should sort by score descending', () => {
    const scorer = new PriorityScorer();
    const inits: InnovationInitiative[] = [
      { id: 'a', name: 'Low', description: '', category: 'core', status: 'proposed', priority: 1, effort: 10, impact: 2, dependencies: [], owner: '', created: new Date(), updated: new Date(), tags: [] },
      { id: 'b', name: 'High', description: '', category: 'ai', status: 'proposed', priority: 5, effort: 40, impact: 9, dependencies: [], owner: '', created: new Date(), updated: new Date(), tags: [] },
    ];
    const scored = scorer.scoreBatch(inits);
    expect(scored[0].name).toBe('High');
    expect(scored[1].name).toBe('Low');
  });
});
