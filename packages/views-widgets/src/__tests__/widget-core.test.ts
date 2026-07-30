import { BaseWidget } from '../widget-core';

describe('BaseWidget', () => {
  const id = 'test-widget-1';
  const title = { label: 'Test Widget', caption: 'A test widget', iconClass: 'icon-test', closable: true };

  it('should create with id and title', () => {
    const w = new BaseWidget(id, title);
    expect(w.id).toBe(id);
    expect(w.title.label).toBe('Test Widget');
    expect(w.title.closable).toBe(true);
    expect(w.visible).toBe(true);
    expect(w.isDisposed()).toBe(false);
  });

  it('should fire onActivated on activate()', () => {
    const w = new BaseWidget(id, title);
    const listener = jest.fn();
    w.onActivated(listener);
    w.activate();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should not fire onActivated after dispose', () => {
    const w = new BaseWidget(id, title);
    const listener = jest.fn();
    w.onActivated(listener);
    w.dispose();
    w.activate();
    expect(listener).not.toHaveBeenCalled();
  });

  it('should fire onClose and onDispose on close()', () => {
    const w = new BaseWidget(id, title);
    const closeListener = jest.fn();
    const disposeListener = jest.fn();
    w.onClose(closeListener);
    w.onDispose(disposeListener);
    w.close();
    expect(closeListener).toHaveBeenCalledTimes(1);
    expect(disposeListener).toHaveBeenCalledTimes(1);
    expect(w.isDisposed()).toBe(true);
  });

  it('should fire onDispose on dispose()', () => {
    const w = new BaseWidget(id, title);
    const listener = jest.fn();
    w.onDispose(listener);
    w.dispose();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(w.isDisposed()).toBe(true);
  });

  it('should be idempotent on dispose()', () => {
    const w = new BaseWidget(id, title);
    const listener = jest.fn();
    w.onDispose(listener);
    w.dispose();
    w.dispose();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should fire onResize when emitter fires', () => {
    const w = new BaseWidget(id, title);
    const listener = jest.fn();
    w.onResize(listener);
    (w as unknown as { onResizeEmitter: { fire: (arg: { width: number; height: number }) => void } }).onResizeEmitter.fire({ width: 800, height: 600 });
    expect(listener).toHaveBeenCalledWith({ width: 800, height: 600 });
  });

  it('should have default title values', () => {
    const w = new BaseWidget('minimal', { label: 'Minimal', closable: false });
    expect(w.title.caption).toBeUndefined();
    expect(w.title.iconClass).toBeUndefined();
  });
});
