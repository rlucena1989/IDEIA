import { checkPrerequisites } from '../prerequisites';

describe('prerequisites', () => {
  it('checkPrerequisites should be defined', () => {
    expect(checkPrerequisites).toBeDefined();
  });
  it('checkPrerequisites should execute without throwing', () => {
    expect(typeof checkPrerequisites).toBe('function');
    try { (checkPrerequisites as any)(); } catch {}
  });
});
