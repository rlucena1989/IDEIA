import { DefaultContributionRegistry } from './contributions';

describe('DefaultContributionRegistry', () => {
  let registry: DefaultContributionRegistry;

  beforeEach(() => {
    registry = new DefaultContributionRegistry();
  });

  it('should register and retrieve contributions by type', () => {
    registry.register('commands', { id: 'cmd1' });
    registry.register('commands', { id: 'cmd2' });
    registry.register('menus', { id: 'menu1' });

    const commands = registry.getContributions<{ id: string }>('commands');
    expect(commands).toHaveLength(2);
    expect(commands[0].id).toBe('cmd1');
    expect(commands[1].id).toBe('cmd2');

    const menus = registry.getContributions<{ id: string }>('menus');
    expect(menus).toHaveLength(1);
  });

  it('should return empty array for unregistered type', () => {
    expect(registry.getContributions('unknown')).toEqual([]);
  });

  it('should remove contribution when disposable is disposed', () => {
    const disposable = registry.register('views', { id: 'view1' });
    expect(registry.getContributions('views')).toHaveLength(1);

    disposable.dispose();
    expect(registry.getContributions('views')).toHaveLength(0);
  });

  it('should report hasType correctly', () => {
    expect(registry.hasType('foo')).toBe(false);
    registry.register('foo', 'bar');
    expect(registry.hasType('foo')).toBe(true);
  });

  it('should clear all contributions', () => {
    registry.register('a', 1);
    registry.register('b', 2);
    registry.clear();
    expect(registry.hasType('a')).toBe(false);
    expect(registry.hasType('b')).toBe(false);
    expect(registry.getContributions('a')).toEqual([]);
  });
});
