import { describe, it, expect } from '@jest/globals';
import { generateDocuments } from '../artifact-content-generator';
import { planArtifacts } from '../artifact-planner';
import { ProductScope } from '../product-model';

describe('artifact-content-generator', () => {
  it('generateDocuments should be defined', () => {
    expect(generateDocuments).toBeDefined();
  });

  it('should generate documents from plan', () => {
    const scope: ProductScope = {
      productName: 'test',
      productType: 'cli',
      goal: 'Test',
      summary: 'A test',
      priorities: [],
      constraints: [],
    };
    const plan = planArtifacts(scope);
    const docs = generateDocuments(plan);
    expect(docs.length).toBe(3);
    for (const doc of docs) {
      expect(doc.path).toBeDefined();
      expect(doc.content.length).toBeGreaterThan(50);
      expect(doc.source).toBe('ai-devkit generation pipeline');
    }
  });
});
