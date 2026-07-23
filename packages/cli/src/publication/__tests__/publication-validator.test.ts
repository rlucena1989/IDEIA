import { describe, it, expect } from '@jest/globals';
import { validatePublication } from '../publication-validator';
import { buildPublicationPlan } from '../publication-builder';

describe('publication-validator', () => {
  it('validatePublication should be defined', () => {
    expect(validatePublication).toBeDefined();
  });

  it('should pass for valid plan', () => {
    const plan = buildPublicationPlan('Title', 'Summary', 'Content here', 'cli');
    const result = validatePublication(plan);
    expect(result.ok).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it('should fail for empty title', () => {
    const plan = buildPublicationPlan('', 'Summary', 'Content', 'cli');
    const result = validatePublication(plan);
    expect(result.ok).toBe(false);
    expect(result.issues.some(i => i.includes('title'))).toBe(true);
  });

  it('should fail for empty summary', () => {
    const plan = buildPublicationPlan('Title', '', 'Content', 'cli');
    const result = validatePublication(plan);
    expect(result.ok).toBe(false);
    expect(result.issues.some(i => i.includes('summary'))).toBe(true);
  });

  it('should fail for empty content', () => {
    const plan = buildPublicationPlan('Title', 'Summary', '', 'cli');
    const result = validatePublication(plan);
    expect(result.ok).toBe(false);
    expect(result.issues.some(i => i.includes('content'))).toBe(true);
  });
});
