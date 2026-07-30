import { Emitter } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { IEditorWidget, EditorManager, EditorOpenOptions, EditorWidgetFactory } from './types';

export class DefaultEditorManager implements EditorManager {
  private editors = new Map<string, IEditorWidget>();
  private factories: EditorWidgetFactory[] = [];
  private activeEditor?: IEditorWidget;

  private onOpenedEmitter = new Emitter<IEditorWidget>();
  private onClosedEmitter = new Emitter<string>();
  private onActiveChangedEmitter = new Emitter<IEditorWidget | undefined>();

  get onEditorOpened() { return this.onOpenedEmitter.event; }
  get onEditorClosed() { return this.onClosedEmitter.event; }
  get onActiveEditorChanged() { return this.onActiveChangedEmitter.event; }

  registerFactory(factory: EditorWidgetFactory): void {
    this.factories.push(factory);
    this.factories.sort((a, b) => b.priority - a.priority);
  }

  async open(uri: string, options?: EditorOpenOptions): Promise<IEditorWidget> {
    const existing = this.editors.get(uri);
    if (existing) {
      existing.focus();
      this.setActiveEditor(existing);
      return existing;
    }

    for (const factory of this.factories) {
      if (factory.canHandle(uri)) {
        const widget = await factory.createWidget(uri);
        this.editors.set(uri, widget);
        this.onOpenedEmitter.fire(widget);
        this.setActiveEditor(widget);

        widget.onClosed(() => {
          this.editors.delete(uri);
          this.onClosedEmitter.fire(uri);
          if (this.activeEditor === widget) {
            this.setActiveEditor(undefined);
          }
        });

        return widget;
      }
    }

    throw new Error(`No editor factory can handle: ${uri}`);
  }

  async close(uri: string): Promise<void> {
    const widget = this.editors.get(uri);
    if (widget) {
      widget.close();
    }
  }

  async closeAll(): Promise<void> {
    const uris = Array.from(this.editors.keys());
    for (const uri of uris) {
      await this.close(uri);
    }
  }

  getActiveEditor(): IEditorWidget | undefined {
    return this.activeEditor;
  }

  getEditors(): IEditorWidget[] {
    return Array.from(this.editors.values());
  }

  getEditor(uri: string): IEditorWidget | undefined {
    return this.editors.get(uri);
  }

  private setActiveEditor(editor: IEditorWidget | undefined): void {
    this.activeEditor = editor;
    this.onActiveChangedEmitter.fire(editor);
  }
}
