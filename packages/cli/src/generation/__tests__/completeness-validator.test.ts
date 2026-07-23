import { describe, it, expect } from '@jest/globals';
import { validateCompleteness } from '../completeness-validator';
import { ProductPlan, ProductScope, ProductArtifactSpec } from '../product-model';
import { GeneratedDocument } from '../artifact-content-generator';

describe('completeness-validator', () => {
  it('validateCompleteness should be defined', () => {
    expect(validateCompleteness).toBeDefined();
  });

  it('should pass for complete generation', () => {
    const scope: ProductScope = { productName: 't', productType: 'cli', goal: '', summary: '', priorities: [], constraints: [] };
    const artifacts: ProductArtifactSpec[] = [
      { path: 'docs/t/overview.md', title: 'Overview', purpose: 'Test', sections: [], required: true, priority: 'high' },
    ];
    const plan: ProductPlan = { scope, artifacts, gaps: [], confidence: 1 };
    const docs: GeneratedDocument[] = [
      { path: 'docs/t/overview.md', content: 'x'.repeat(200), source: 'test', generatedAt: new Date().toISOString() },
    ];
    const result = validateCompleteness(plan, docs);
    expect(result.ok).toBe(true);
    expect(result.missing.length).toBe(0);
  });

  it('should report missing documents', () => {
    const scope: ProductScope = { productName: 't', productType: 'cli', goal: '', summary: '', priorities: [], constraints: [] };
    const artifacts: ProductArtifactSpec[] = [
      { path: 'docs/t/overview.md', title: 'Overview', purpose: 'Test', sections: [], required: true, priority: 'high' },
      { path: 'docs/t/ops.md', title: 'Ops', purpose: 'Ops', sections: [], required: true, priority: 'medium' },
    ];
    const plan: ProductPlan = { scope, artifacts, gaps: [], confidence: 1 };
    const docs: GeneratedDocument[] = [
      { path: 'docs/t/overview.md', content: 'x'.repeat(200), source: 'test', generatedAt: new Date().toISOString() },
    ];
    const result = validateCompleteness(plan, docs);
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('docs/t/ops.md');
  });

  it('should report insufficient content', () => {
    const scope: ProductScope = { productName: 't', productType: 'cli', goal: '', summary: '', priorities: [], constraints: [] };
    const artifacts: ProductArtifactSpec[] = [
      { path: 'docs/t/short.md', title: 'Short', purpose: 'Test', sections: [], required: true, priority: 'high' },
    ];
    const plan: ProductPlan = { scope, artifacts, gaps: [], confidence: 1 };
    const docs: GeneratedDocument[] = [
      { path: 'docs/t/short.md', content: 'short', source: 'test', generatedAt: new Date().toISOString() },
    ];
    const result = validateCompleteness(plan, docs);
    expect(result.ok).toBe(false);
    expect(result.insufficient).toContain('docs/t/short.md');
  });
});
