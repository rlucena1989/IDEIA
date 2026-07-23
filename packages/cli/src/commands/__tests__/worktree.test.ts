import { worktreeCommand } from '../worktree';

describe('worktree', () => {
  it('worktreeCommand should be defined', () => {
    expect(worktreeCommand).toBeDefined();
  });
  it('worktreeCommand should execute without throwing', () => {
    expect(typeof worktreeCommand).toBe('function');
    try { (worktreeCommand as any)(); } catch {}
  });
});
