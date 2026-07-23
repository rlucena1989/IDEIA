import { Emitter } from '@ideia/core-contributions';
import { IEditorWidget, EditorSelection } from './types';

export class BaseEditorWidget implements IEditorWidget {
  readonly id: string;
  readonly uri: string;
  title: string;
  protected _dirty = false;
  protected _closed = false;
  protected content = '';

  protected onDirtyChangedEmitter = new Emitter<boolean>();
  protected onClosedEmitter = new Emitter<void>();
  protected onFocusEmitter = new Emitter<void>();

  get onDirtyChanged() { return this.onDirtyChangedEmitter.event; }
  get onClosed() { return this.onClosedEmitter.event; }
  get onFocus() { return this.onFocusEmitter.event; }

  get dirty(): boolean { return this._dirty; }
  get closed(): boolean { return this._closed; }

  constructor(id: string, uri: string, title: string) {
    this.id = id;
    this.uri = uri;
    this.title = title;
  }

  async open(uri: string): Promise<void> {
    this.content = '';
    this._dirty = false;
  }

  close(): void {
    this._closed = true;
    this.onClosedEmitter.fire(void 0);
  }

  async save(): Promise<boolean> {
    if (!this._dirty) return true;
    this._dirty = false;
    this.onDirtyChangedEmitter.fire(false);
    return true;
  }

  focus(): void {
    this.onFocusEmitter.fire(void 0);
  }

  isActive(): boolean {
    return !this._closed;
  }

  protected markDirty(): void {
    if (!this._dirty) {
      this._dirty = true;
      this.onDirtyChangedEmitter.fire(true);
    }
  }
}

export class CodeEditorWidget extends BaseEditorWidget {
  private language = 'plaintext';
  private selection?: EditorSelection;

  setLanguage(language: string): void {
    this.language = language;
  }

  getLanguage(): string {
    return this.language;
  }

  setSelection(selection: EditorSelection): void {
    this.selection = selection;
  }

  getSelection(): EditorSelection | undefined {
    return this.selection;
  }

  async open(uri: string): Promise<void> {
    await super.open(uri);
  }
}
