jest.mock('@ideia/core-contributions', () => {
  class Emitter<T> {
    private listeners: Array<(event: T) => void> = [];
    get event() {
      return (listener: (event: T) => void) => {
        this.listeners.push(listener);
        return { dispose: () => { this.listeners = this.listeners.filter(l => l !== listener); } };
      };
    }
    fire(event: T): void { this.listeners.forEach(l => l(event)); }
    dispose(): void { this.listeners = []; }
  }
  return { Emitter };
});

import { DefaultOutputChannelManager } from './output-channel';

describe('DefaultOutputChannelManager', () => {
  let manager: DefaultOutputChannelManager;

  beforeEach(() => {
    manager = new DefaultOutputChannelManager();
  });

  it('should create a channel and set it as active', () => {
    const ch = manager.createChannel('build', 'Build Output');
    expect(ch.id).toBe('build');
    expect(ch.label).toBe('Build Output');
    expect(manager.getActiveChannel()).toBe(ch);
  });

  it('should reuse an existing channel with the same id', () => {
    const ch1 = manager.createChannel('log', 'Log');
    const ch2 = manager.createChannel('log', 'Log');
    expect(ch1).toBe(ch2);
  });

  it('should append content and return it via getContent', () => {
    const ch = manager.createChannel('test', 'Test');
    ch.append('line1');
    ch.appendLine('line2');
    expect(ch.getContent()).toBe('line1line2\n');
  });

  it('should clear the channel buffer', () => {
    const ch = manager.createChannel('tmp', 'Temp');
    ch.append('data');
    ch.clear();
    expect(ch.getContent()).toBe('');
  });

  it('should manage active channel switching', () => {
    manager.createChannel('a', 'A');
    manager.createChannel('b', 'B');
    manager.setActiveChannel('b');
    expect(manager.getActiveChannel()?.id).toBe('b');
    manager.setActiveChannel('nonexistent');
    expect(manager.getActiveChannel()?.id).toBe('b');
  });

  it('should delete a channel and update active channel', () => {
    manager.createChannel('x', 'X');
    manager.createChannel('y', 'Y');
    manager.setActiveChannel('x');
    manager.deleteChannel('x');
    expect(manager.getChannel('x')).toBeUndefined();
    expect(manager.getActiveChannel()?.id).toBe('y');
  });
});
