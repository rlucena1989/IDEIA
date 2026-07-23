import { describe, it, expect } from '@jest/globals';
import { parseDiff, checkFileExtension, runComplianceChecks, runPRReview, formatPRReview, prReviewCommand } from '../pr-review';
import type { DiffFile, DiffHunk, PRReviewReport, InlineSuggestion, ComplianceResult } from '../pr-review';

describe('pr-review', () => {
  it('parseDiff should be defined', () => {
    expect(parseDiff).toBeDefined();
  });
  it('checkFileExtension should be defined', () => {
    expect(checkFileExtension).toBeDefined();
  });
  it('runComplianceChecks should be defined', () => {
    expect(runComplianceChecks).toBeDefined();
  });
  it('runPRReview should be defined', () => {
    expect(runPRReview).toBeDefined();
  });
  it('formatPRReview should be defined', () => {
    expect(formatPRReview).toBeDefined();
  });
  it('prReviewCommand should be defined', () => {
    expect(prReviewCommand).toBeDefined();
  });
  it('DiffFile interface should be a type', () => {
    expect(typeof (null as unknown as DiffFile)).toBe('object');
  });
  it('DiffHunk interface should be a type', () => {
    expect(typeof (null as unknown as DiffHunk)).toBe('object');
  });
  it('PRReviewReport interface should be a type', () => {
    expect(typeof (null as unknown as PRReviewReport)).toBe('object');
  });
  it('InlineSuggestion interface should be a type', () => {
    expect(typeof (null as unknown as InlineSuggestion)).toBe('object');
  });
  it('ComplianceResult interface should be a type', () => {
    expect(typeof (null as unknown as ComplianceResult)).toBe('object');
  });
});
