import { describe, it, expect } from '@jest/globals';
import { AdrGitHook, createAdrGitHook, ChangeEvent } from '../src/adr-git-hook';
import { EventBus } from '@ideia/event-bus';

function createTestBus(): EventBus {
  return { emit: async () => {} } as unknown as EventBus;
}

describe('AdrGitHook', () => {
  let hook: AdrGitHook;

  beforeEach(() => {
    hook = createAdrGitHook(createTestBus());
  });

  it('can be constructed', () => {
    expect(hook).toBeDefined();
  });

  it('suggestOnChanges detects config changes', async () => {
    const changes: ChangeEvent[] = [
      { type: 'modify', file: 'tsconfig.json' },
    ];
    const suggestions = await hook.suggestOnChanges(changes);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.title.includes('Configuration'))).toBe(true);
  });

  it('suggestOnChanges detects architecture changes', async () => {
    const changes: ChangeEvent[] = [
      { type: 'modify', file: 'src/architecture/module.ts' },
    ];
    const suggestions = await hook.suggestOnChanges(changes);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.title.includes('Architecture'))).toBe(true);
  });

  it('suggestOnChanges detects API changes', async () => {
    const changes: ChangeEvent[] = [
      { type: 'add', file: 'src/api/user-service.ts' },
    ];
    const suggestions = await hook.suggestOnChanges(changes);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.title.includes('API'))).toBe(true);
  });

  it('suggestOnChanges returns empty for non-architectural changes', async () => {
    const changes: ChangeEvent[] = [
      { type: 'modify', file: 'README.md' },
      { type: 'modify', file: 'src/utils/helper.test.ts' },
    ];
    const suggestions = await hook.suggestOnChanges(changes);
    expect(suggestions.length).toBe(0);
  });

  it('onPreCommit returns warning with suggestions', async () => {
    const changes: ChangeEvent[] = [
      { type: 'modify', file: 'tsconfig.json' },
    ];
    const result = await hook.onPreCommit(changes);
    expect(result.shouldBlock).toBe(false);
    expect(result.message).toContain('Architectural');
  });

  it('onPreCommit returns no-arch message for trivial changes', async () => {
    const changes: ChangeEvent[] = [];
    const result = await hook.onPreCommit(changes);
    expect(result.shouldBlock).toBe(false);
    expect(result.message).toContain('No architectural');
  });
});
