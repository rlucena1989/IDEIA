import { Disposable } from '@ideia/core-contributions';
import { IShellLayout } from './types';
import { IWidget } from '@ideia/views-widgets';
import { WidgetCodeSplitter, SplitWidgetRegistration } from './code-splitter';

import { createLogger } from '@ideia/logger';

export function requestIdleCallbackPolyfill(
  callback: () => void,
  options?: { timeout?: number }
): number {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return (window as { requestIdleCallback: (fn: () => void, opts?: { timeout?: number }) => number }).requestIdleCallback(callback, options);
  }
  return Number(setTimeout(callback, options?.timeout ?? 2000));
}

export function cancelIdleCallbackPolyfill(id: number): void {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    (window as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

export type LazyPriority = 'high' | 'medium' | 'low';

const log = createLogger('shell-layout:lazy-loader');

export interface LazyWidgetOptions {
  idleThresholdMs?: number;
  visibleThresholdMs?: number;
  preloadPriority?: string[];
  priority?: LazyPriority;
}

export class LazyWidgetLoader {
  private splitter: WidgetCodeSplitter;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private options: LazyWidgetOptions;
  private pendingDisposables = new Map<string, Disposable>();

  constructor(
    private shellLayout: IShellLayout,
    splitter?: WidgetCodeSplitter,
    options?: LazyWidgetOptions,
  ) {
    this.splitter = splitter ?? new WidgetCodeSplitter();
    this.options = {
      idleThresholdMs: 2000,
      visibleThresholdMs: 500,
      preloadPriority: [],
      priority: 'medium',
      ...options,
    };
  }

  getSplitter(): WidgetCodeSplitter {
    return this.splitter;
  }

  registerLazy(registration: SplitWidgetRegistration): Disposable {
    this.splitter.register(registration);
    const loadAndAdd = async () => {
      try {
        const widget = await this.splitter.load(registration.id);
        this.shellLayout.addWidget(widget, registration.area, {
          order: registration.priority,
        });
      } catch (err) {
        log.error(`Failed to load lazy widget "${registration.id}":`, err as Record<string, unknown> | undefined);
      }
      this.pendingDisposables.delete(registration.id);
    };
    if (registration.preload) {
      loadAndAdd();
    }
    const disposable = { dispose: () => this.splitter.unload(registration.id) };
    this.pendingDisposables.set(registration.id, disposable);
    return disposable;
  }

  cancelLazy(id: string): boolean {
    const disposable = this.pendingDisposables.get(id);
    if (disposable) {
      disposable.dispose();
      this.pendingDisposables.delete(id);
      return true;
    }
    return false;
  }

  getPendingLoads(): string[] {
    return Array.from(this.pendingDisposables.keys());
  }

  addOnIdle(registration: SplitWidgetRegistration): Disposable {
    const id = requestIdleCallbackPolyfill(
      () => this.registerLazy(registration),
      { timeout: this.options.idleThresholdMs },
    );
    return {
      dispose: () => {
        cancelIdleCallbackPolyfill(id);
        this.pendingDisposables.delete(registration.id);
      },
    };
  }

  addOnVisible(registration: SplitWidgetRegistration, container: Element): Disposable {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            this.registerLazy(registration);
            observer.disconnect();
          }
        },
        { rootMargin: `${this.options.visibleThresholdMs}px` },
      );
      observer.observe(container);
      return { dispose: () => observer.disconnect() };
    }
    return this.registerLazy(registration);
  }

  preloadHighPriority(): void {
    this.splitter.preload(this.options.preloadPriority ?? []);
  }

  getSplitWidget(id: string): IWidget | undefined {
    return this.shellLayout
      .getWidgets('main')
      .concat(
        this.shellLayout.getWidgets('left'),
        this.shellLayout.getWidgets('right'),
        this.shellLayout.getWidgets('bottom'),
        this.shellLayout.getWidgets('top'),
      )
      .find(w => w.id === id);
  }
}
