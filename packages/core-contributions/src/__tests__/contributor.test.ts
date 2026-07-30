import { Emitter, DisposableCollection, DefaultContributionProvider } from '../types';
import { DefaultContributionRegistry } from '../contributor';

describe('Emitter', () => {
  it('should emit events to subscribers', () => {
    const emitter = new Emitter<string>();
    const listener = jest.fn();

    const disposable = emitter.event(listener);
    emitter.fire('hello');

    expect(listener).toHaveBeenCalledWith('hello');
    expect(listener).toHaveBeenCalledTimes(1);
    disposable.dispose();
    emitter.dispose();
  });

  it('should support multiple subscribers', () => {
    const emitter = new Emitter<number>();
    const listener1 = jest.fn();
    const listener2 = jest.fn();

    emitter.event(listener1);
    emitter.event(listener2);
    emitter.fire(42);

    expect(listener1).toHaveBeenCalledWith(42);
    expect(listener2).toHaveBeenCalledWith(42);
    emitter.dispose();
  });

  it('should pass thisArgs as context', () => {
    const emitter = new Emitter<string>();
    const ctx = { value: 'ctx' };
    const listener = jest.fn(function (this: typeof ctx, _event: string) {
      return this.value;
    });

    emitter.event(listener, ctx);
    emitter.fire('test');

    expect(listener).toHaveBeenCalledWith('test');
    emitter.dispose();
  });

  it('should not fire after dispose', () => {
    const emitter = new Emitter<string>();
    const listener = jest.fn();

    emitter.event(listener);
    emitter.dispose();
    emitter.fire('hello');

    expect(listener).not.toHaveBeenCalled();
  });

  it('should remove listener via returned disposable', () => {
    const emitter = new Emitter<string>();
    const listener = jest.fn();

    const disposable = emitter.event(listener);
    disposable.dispose();
    emitter.fire('hello');

    expect(listener).not.toHaveBeenCalled();
    emitter.dispose();
  });

  it('should have event getter that returns a function', () => {
    const emitter = new Emitter<number>();
    const eventFn = emitter.event;

    expect(typeof eventFn).toBe('function');
    emitter.dispose();
  });
});

describe('DisposableCollection', () => {
  it('should dispose all pushed disposables', () => {
    const collection = new DisposableCollection();
    const d1 = { dispose: jest.fn() };
    const d2 = { dispose: jest.fn() };

    collection.push(d1);
    collection.push(d2);
    collection.dispose();

    expect(d1.dispose).toHaveBeenCalled();
    expect(d2.dispose).toHaveBeenCalled();
  });

  it('should be reusable after dispose', () => {
    const collection = new DisposableCollection();
    const d = { dispose: jest.fn() };

    collection.push(d);
    collection.dispose();
    expect(d.dispose).toHaveBeenCalledTimes(1);

    const d2 = { dispose: jest.fn() };
    collection.push(d2);
    collection.dispose();
    expect(d2.dispose).toHaveBeenCalledTimes(1);
  });

  it('should handle empty collection', () => {
    const collection = new DisposableCollection();
    expect(() => collection.dispose()).not.toThrow();
  });
});

describe('DefaultContributionProvider', () => {
  const testContributions = [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ];

  it('should instantiate with no contributions', () => {
    const provider = new DefaultContributionProvider();
    expect(provider.getContributions()).toEqual([]);
    expect(provider.hasContributions()).toBe(false);
  });

  it('should instantiate with initial contributions', () => {
    const provider = new DefaultContributionProvider(testContributions);
    expect(provider.getContributions()).toEqual(testContributions);
    expect(provider.hasContributions()).toBe(true);
  });

  it('should register new contributions', () => {
    const provider = new DefaultContributionProvider();
    const disposable = provider.register({ id: 'c', label: 'C' });

    expect(provider.hasContributions()).toBe(true);
    expect(provider.getContributions()).toHaveLength(1);
    expect(provider.getContributions()[0].id).toBe('c');
    disposable.dispose();
  });

  it('should return registered contribution via get', () => {
    const provider = new DefaultContributionProvider(testContributions);

    const found = provider.get('a');
    expect(found).toBeDefined();
    expect(found!.id).toBe('a');

    const notFound = provider.get('nonexistent');
    expect(notFound).toBeUndefined();
  });

  it('should unregister by id', () => {
    const provider = new DefaultContributionProvider(testContributions);

    provider.unregister('a');
    expect(provider.getContributions()).toHaveLength(1);
    expect(provider.getContributions()[0].id).toBe('b');
  });

  it('should unregister via returned disposable from register', () => {
    const provider = new DefaultContributionProvider();
    const disposable = provider.register({ id: 'x' });

    expect(provider.hasContributions()).toBe(true);
    disposable.dispose();
    expect(provider.hasContributions()).toBe(false);
  });

  it('should fire onContributionsChanged on register', () => {
    const provider = new DefaultContributionProvider();
    const listener = jest.fn();

    provider.onContributionsChanged(listener);
    provider.register({ id: 'x' });

    expect(listener).toHaveBeenCalled();
  });

  it('should fire onContributionsChanged on unregister', () => {
    const provider = new DefaultContributionProvider();
    const listener = jest.fn();

    provider.onContributionsChanged(listener);
    provider.register({ id: 'x' });
    listener.mockClear();
    provider.unregister('x');

    expect(listener).toHaveBeenCalled();
  });

  it('should not share array references', () => {
    const provider = new DefaultContributionProvider(testContributions);
    const contribs = provider.getContributions();
    expect(contribs).not.toBe(provider.getContributions());
  });

  it('should implement ContributionProvider interface', () => {
    const provider = new DefaultContributionProvider();
    expect(provider.getContributions).toBeDefined();
    expect(provider.hasContributions).toBeDefined();
    expect(provider.onContributionsChanged).toBeDefined();
  });
});

describe('DefaultContributionRegistry', () => {
  it('should register and retrieve contributions by type', () => {
    const registry = new DefaultContributionRegistry();
    const contribution = { id: 'test' };

    registry.register('commands', contribution);
    const results = registry.getContributions('commands');

    expect(results).toHaveLength(1);
    expect(results[0]).toBe(contribution);
  });

  it('should report hasType correctly', () => {
    const registry = new DefaultContributionRegistry();

    expect(registry.hasType('commands')).toBe(false);
    registry.register('commands', { id: 'cmd1' });
    expect(registry.hasType('commands')).toBe(true);
  });

  it('should return empty array for unknown type', () => {
    const registry = new DefaultContributionRegistry();
    expect(registry.getContributions('unknown')).toEqual([]);
  });

  it('should remove contribution via disposable', () => {
    const registry = new DefaultContributionRegistry();
    const disposable = registry.register('items', { id: 'item1' });

    expect(registry.getContributions('items')).toHaveLength(1);
    disposable.dispose();
    expect(registry.getContributions('items')).toHaveLength(0);
  });

  it('should clear all on dispose', () => {
    const registry = new DefaultContributionRegistry();

    registry.register('a', { id: 'a1' });
    registry.register('b', { id: 'b1' });
    registry.dispose();

    expect(registry.getContributions('a')).toHaveLength(0);
    expect(registry.hasType('a')).toBe(false);
    expect(registry.hasType('b')).toBe(false);
  });

  it('should not leak disposables after dispose', () => {
    const registry = new DefaultContributionRegistry();

    registry.register('test', { id: 'x' });
    registry.dispose();

    expect(() => registry.register('test2', { id: 'y' })).not.toThrow();
    expect(registry.getContributions('test2')).toHaveLength(1);
  });
});
