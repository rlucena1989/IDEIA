import { describe, it, expect } from '@jest/globals';
import { linkEvidence } from '../evidence-linker';

describe('evidence-linker', () => {
  it('linkEvidence should be defined', () => {
    expect(linkEvidence).toBeDefined();
  });

  it('should create evidence links from items', () => {
    const items = [
      { sourceType: 'metric' as const, sourceRef: 'cpu_usage', description: 'CPU usage exceeded 90%' },
      { sourceType: 'alert' as const, sourceRef: 'alert-123', description: 'Memory alert triggered' },
    ];
    const links = linkEvidence(items);
    expect(links.length).toBe(2);
    expect(links[0].evidenceId).toContain('evidence-');
    expect(links[0].sourceType).toBe('metric');
    expect(links[0].sourceRef).toBe('cpu_usage');
    expect(links[1].sourceType).toBe('alert');
  });

  it('should handle empty items', () => {
    expect(linkEvidence([])).toEqual([]);
  });
});
