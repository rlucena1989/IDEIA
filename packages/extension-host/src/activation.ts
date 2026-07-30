import { Emitter, Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { ActivationEvent, ActivationEventHandler, ExtensionActivationService } from './types';
const logger = createLogger('activation');

export class DefaultExtensionActivationService implements ExtensionActivationService {
  private handlers: ActivationEventHandler[] = [];
  private activatedExtensions = new Set<string>();
  private onActivatedEmitter = new Emitter<string>();
  private onDeactivatedEmitter = new Emitter<string>();

  get onExtensionActivated() { return this.onActivatedEmitter.event; }
  get onExtensionDeactivated() { return this.onDeactivatedEmitter.event; }

  fireActivationEvent(event: ActivationEvent): void {
    for (const handler of this.handlers) {
      if (handler.canHandle(event)) {
        handler.handle(event);
        this.activatedExtensions.add(event.extensionId);
        this.onActivatedEmitter.fire(event.extensionId);
      }
    }
  }

  registerHandler(handler: ActivationEventHandler): Disposable {
    this.handlers.push(handler);
    return { dispose: () => this.unregisterHandler(handler) };
  }

  isActivated(extensionId: string): boolean {
    return this.activatedExtensions.has(extensionId);
  }

  deactivate(extensionId: string): void {
    this.activatedExtensions.delete(extensionId);
    this.onDeactivatedEmitter.fire(extensionId);
  }

  private unregisterHandler(handler: ActivationEventHandler): void {
    this.handlers = this.handlers.filter(h => h !== handler);
  }
}
