import { Disposable } from '@ideia/core-contributions';
import { IEditorWidget } from './types';

export interface IOpenHandler {
  readonly id: string;
  readonly label: string;
  readonly priority: number;
  canHandle(uri: string): boolean;
  open(uri: string): Promise<IEditorWidget | undefined>;
}

export class OpenHandlerChain {
  private handlers: IOpenHandler[] = [];

  registerHandler(handler: IOpenHandler): Disposable {
    this.handlers.push(handler);
    this.handlers.sort((a, b) => b.priority - a.priority);
    return { dispose: () => this.unregisterHandler(handler.id) };
  }

  async open(uri: string): Promise<IEditorWidget | undefined> {
    for (const handler of this.handlers) {
      if (handler.canHandle(uri)) {
        const result = await handler.open(uri);
        if (result) return result;
      }
    }
    return undefined;
  }

  getHandlers(): IOpenHandler[] {
    return [...this.handlers];
  }

  private unregisterHandler(id: string): void {
    this.handlers = this.handlers.filter(h => h.id !== id);
  }
}
