import { ProgressiveLoader } from '../browser/ideia-progressive-loader';

const mockEl = { style: new Proxy({} as Record<string, string>, { get(t, p) { return p === 'cssText' ? '' : t[p as string]; }, set(t, p, v) { if (typeof p === 'string') t[p] = v; return true; } }), appendChild: () => {}, querySelector: () => null, remove: () => {} };
if (typeof document === 'undefined') (globalThis as Record<string, unknown>).document = { createElement: () => mockEl };

describe('ProgressiveLoader', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('constructs with required props', () => {
    const loader = new ProgressiveLoader({
      container,
      estimatedTime: 10000,
      message: 'Processing...',
    });
    expect(loader).toBeDefined();
  });

  it.skip('mounts without error (needs jsdom)', () => {
    const loader = new ProgressiveLoader({
      container,
      estimatedTime: 10000,
      message: 'Processing...',
    });
    expect(() => loader.mount()).not.toThrow();
  });

  it.skip('unmounts without error (needs jsdom)', () => {
    const loader = new ProgressiveLoader({
      container,
      estimatedTime: 10000,
      message: 'Processing...',
    });
    loader.mount();
    expect(() => loader.unmount()).not.toThrow();
  });

  it('accepts cancel callback', () => {
    const onCancel = jest.fn();
    const loader = new ProgressiveLoader({
      container,
      estimatedTime: 10000,
      message: 'Processing...',
      onCancel,
    });
    expect(loader).toBeDefined();
  });

  it('provides updateMessage method', () => {
    const loader = new ProgressiveLoader({
      container,
      estimatedTime: 10000,
      message: 'Initial message',
    });
    expect(() => loader.updateMessage('Updated message')).not.toThrow();
  });

  it.skip('renders different stages over time (needs jsdom)', () => {
    const loader = new ProgressiveLoader({
      container,
      estimatedTime: 5000,
      message: 'Working...',
    });

    loader.mount();
    const rootEl = container.querySelector('#ideia-progressive-loader');
    expect(rootEl).toBeDefined();

    loader.unmount();
  });
});
