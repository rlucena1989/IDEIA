import { Emitter, Disposable } from '@ideia/core-contributions';
import { EditorWidgetFactory } from './types';

export interface EditorRegistry {
  registerFactory(factory: EditorWidgetFactory): Disposable;
  getFactories(): EditorWidgetFactory[];
  getFactoryForUri(uri: string): EditorWidgetFactory | undefined;
  onFactoryRegistered: import('@ideia/core-contributions').Event<EditorWidgetFactory>;
}

export class DefaultEditorRegistry implements EditorRegistry {
  private factories: EditorWidgetFactory[] = [];
  private onRegisteredEmitter = new Emitter<EditorWidgetFactory>();

  get onFactoryRegistered() { return this.onRegisteredEmitter.event; }

  registerFactory(factory: EditorWidgetFactory): Disposable {
    this.factories.push(factory);
    this.factories.sort((a, b) => b.priority - a.priority);
    this.onRegisteredEmitter.fire(factory);
    return { dispose: () => this.unregisterFactory(factory.id) };
  }

  getFactories(): EditorWidgetFactory[] {
    return [...this.factories];
  }

  getFactoryForUri(uri: string): EditorWidgetFactory | undefined {
    return this.factories.find(f => f.canHandle(uri));
  }

  private unregisterFactory(id: string): void {
    this.factories = this.factories.filter(f => f.id !== id);
  }
}
