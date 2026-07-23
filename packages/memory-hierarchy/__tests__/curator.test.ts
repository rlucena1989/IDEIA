import { MemoryCurator } from '../src/curator';
import { WorkingMemory } from '../src/working-memory';
import { ProjectMemory } from '../src/project-memory';
import { InstitutionalMemory } from '../src/institutional-memory';
import { GlobalMemory } from '../src/global-memory';

describe('MemoryCurator', () => {
  let working: WorkingMemory;
  let project: ProjectMemory;
  let institutional: InstitutionalMemory;
  let global: GlobalMemory;
  let curator: MemoryCurator;

  beforeEach(() => {
    working = new WorkingMemory();
    project = new ProjectMemory();
    institutional = new InstitutionalMemory();
    global = new GlobalMemory();
    curator = new MemoryCurator(working, project, institutional, global);
  });

  it('promotes entries meeting criteria', () => {
    const entry = working.store('Cache Redis implementado', 'decision', 'dev', ['redis']);
    for (let i = 0; i < 5; i++) working.get(entry.id);
    entry.confidence = 0.9;

    const { promoted } = curator.evaluatePromotions();
    expect(promoted.length).toBeGreaterThanOrEqual(1);
  });

  it('promotes working to project', () => {
    const entry = working.store('Decisão técnica', 'decision', 'arch');
    for (let i = 0; i < 5; i++) working.get(entry.id);

    const result = curator.promote(entry, 'project');
    expect(result.level).toBe('project');
    expect(result.tags).toContain('promoted_from_working');
  });
});
