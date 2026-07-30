import { ContributionType, Emitter, DisposableCollection, DefaultContributionProvider, bindContributionProvider } from '../types';

describe('ContributionType', () => {
  it('should have 10 values', () => {
    const keys = Object.keys(ContributionType);
    expect(keys.filter(k => isNaN(Number(k)))).toHaveLength(10);
  });

  it('should have expected enum values', () => {
    expect(ContributionType.Command).toBe('command');
    expect(ContributionType.Menu).toBe('menu');
    expect(ContributionType.Keybinding).toBe('keybinding');
    expect(ContributionType.View).toBe('view');
    expect(ContributionType.Widget).toBe('widget');
    expect(ContributionType.Tool).toBe('tool');
    expect(ContributionType.Agent).toBe('agent');
    expect(ContributionType.Preference).toBe('preference');
    expect(ContributionType.Theme).toBe('theme');
    expect(ContributionType.Custom).toBe('custom');
  });
});

describe('types exports', () => {
  it('should export Emitter class', () => {
    expect(Emitter).toBeDefined();
    expect(typeof Emitter).toBe('function');
  });

  it('should export DisposableCollection class', () => {
    expect(DisposableCollection).toBeDefined();
    expect(typeof DisposableCollection).toBe('function');
  });

  it('should export DefaultContributionProvider class', () => {
    expect(DefaultContributionProvider).toBeDefined();
    expect(typeof DefaultContributionProvider).toBe('function');
  });

  it('should export bindContributionProvider function', () => {
    expect(bindContributionProvider).toBeDefined();
    expect(typeof bindContributionProvider).toBe('function');
  });
});

describe('object shape: ContributionMetadata', () => {
  it('should accept valid metadata with all fields', () => {
    const meta: Record<string, unknown> = {
      type: ContributionType.Command,
      id: 'test-command',
      name: 'Test Command',
      version: '1.0.0',
      provider: 'test',
      tags: ['test'],
    };
    expect(meta.type).toBe('command');
    expect(meta.id).toBe('test-command');
    expect(meta.name).toBe('Test Command');
    expect(meta.tags).toEqual(['test']);
  });

  it('should allow optional fields to be omitted', () => {
    const meta: { type: string; id: string; name: string; version?: unknown; provider?: unknown; tags?: unknown } = {
      type: ContributionType.Menu,
      id: 'test-menu',
      name: 'Test Menu',
    };
    expect(meta.version).toBeUndefined();
    expect(meta.provider).toBeUndefined();
    expect(meta.tags).toBeUndefined();
  });
});
