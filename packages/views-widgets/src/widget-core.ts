import { Emitter } from '@ideia/core-contributions';
import { IWidget, WidgetTitle, WidgetResizeEvent } from './types';

export class BaseWidget implements IWidget {
  readonly id: string;
  title: WidgetTitle;
  visible = true;
  protected disposed = false;

  protected onActivatedEmitter = new Emitter<void>();
  protected onCloseEmitter = new Emitter<void>();
  protected onDisposeEmitter = new Emitter<void>();
  protected onResizeEmitter = new Emitter<WidgetResizeEvent>();

  get onActivated() { return this.onActivatedEmitter.event; }
  get onClose() { return this.onCloseEmitter.event; }
  get onDispose() { return this.onDisposeEmitter.event; }
  get onResize() { return this.onResizeEmitter.event; }

  constructor(id: string, title: WidgetTitle) {
    this.id = id;
    this.title = title;
  }

  activate(): void {
    if (!this.disposed) {
      this.onActivatedEmitter.fire(void 0);
    }
  }

  close(): void {
    if (!this.disposed) {
      this.onCloseEmitter.fire(void 0);
      this.dispose();
    }
  }

  dispose(): void {
    if (!this.disposed) {
      this.disposed = true;
      this.onDisposeEmitter.fire(void 0);
      this.onActivatedEmitter.dispose();
      this.onCloseEmitter.dispose();
      this.onDisposeEmitter.dispose();
      this.onResizeEmitter.dispose();
    }
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  protected onResize(width: number, height: number): void {
    this.onResizeEmitter.fire({ width, height });
  }
}
