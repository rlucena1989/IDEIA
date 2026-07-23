import { Emitter, Disposable, DisposableCollection } from '@ideia/core-contributions';
import { WidgetFactory, WidgetManager } from './types';

export class DefaultWidgetManager implements WidgetManager {
  private factories = new Map<string, WidgetFactory>();
  private disposables = new DisposableCollection();
  private onRegisteredEmitter = new Emitter<WidgetFactory>();

  get onFactoryRegistered() { return this.onRegisteredEmitter.event; }

  registerFactory(factory: WidgetFactory): Disposable {
    if (this.factories.has(factory.id)) {
      throw new Error(`Widget factory already registered: ${factory.id}`);
    }
    this.factories.set(factory.id, factory);
    this.onRegisteredEmitter.fire(factory);
    const d = { dispose: () => this.factories.delete(factory.id) };
    this.disposables.push(d);
    return d;
  }

  getFactory(id: string): WidgetFactory | undefined {
    return this.factories.get(id);
  }

  createWidget(id: string, options?: unknown): unknown {
    const factory = this.factories.get(id);
    if (!factory) {
      throw new Error(`No widget factory registered for: ${id}`);
    }
    return factory.createWidget(options);
  }

  getWidgets(): string[] {
    return Array.from(this.factories.keys());
  }
}
