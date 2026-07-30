import { PackManager } from '../pack-manager';

describe('PackManager', () => {
  let mgr: PackManager;
  beforeEach(() => {
    mgr = new PackManager();
    mgr.registerPack({
      name: 'arch-pack',
      version: '1.0.0',
      description: 'Architecture overview pack with comprehensive system design documentation',
      tags: ['arch'],
      categories: ['architecture'],
      level: 'advanced',
      variables: [],
      sections: [
        { id: 'S1', title: 'Overview', content: 'Architecture overview', format: 'markdown', priority: 'P0', tags: ['arch'] },
        { id: 'S2', title: 'Details', content: 'Deep dive into components for system architecture', format: 'markdown', priority: 'P1' },
        { id: 'S3', title: 'Config', content: 'Config details for deployment scenarios here', format: 'markdown', priority: 'P2' },
      ],
      dependencies: [],
      slicing: [],
      hooks: [],
      examples: [],
      totalTokens: 1000,
    });
  });

  it('should register packs', () => {
    expect(mgr.getAllPacks().length).toBe(1);
  });

  it('should assemble pack within budget', () => {
    const result = mgr.assemble('arch-pack', 600);
    expect(result.sections.length).toBeGreaterThan(0);
    expect(result.totalTokens).toBeLessThanOrEqual(600);
  });

  it('should trim sections that exceed budget', () => {
    const result = mgr.assemble('arch-pack', 10);
    expect(result.trimmedSections.length).toBeGreaterThan(0);
  });

  it('should prioritize sections by query relevance', () => {
    const priorities = mgr.prioritize('arch-pack', 'Config');
    expect(priorities[0].score).toBeGreaterThan(0);
  });
});
