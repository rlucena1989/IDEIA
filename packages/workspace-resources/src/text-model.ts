import { Emitter } from '@ideia/core-contributions';
import { TextModelService, ITextModel } from './types';

class DefaultTextModel implements ITextModel {
  readonly uri: string;
  private content = '';
  private _dirty = false;
  private onChangedEmitter = new Emitter<string>();

  get onContentChanged() { return this.onChangedEmitter.event; }

  constructor(uri: string, content = '') {
    this.uri = uri;
    this.content = content;
  }

  getContent(): string { return this.content; }

  setContent(content: string): void {
    this.content = content;
    this._dirty = true;
    this.onChangedEmitter.fire(content);
  }

  getLineCount(): number {
    if (!this.content) return 0;
    return this.content.split('\n').length;
  }

  getLineContent(line: number): string {
    const lines = this.content.split('\n');
    return lines[line - 1] || '';
  }

  isDirty(): boolean { return this._dirty; }
  markClean(): void { this._dirty = false; }
}

export class DefaultTextModelService implements TextModelService {
  private models = new Map<string, DefaultTextModel>();
  private onCreatedEmitter = new Emitter<ITextModel>();
  private onRemovedEmitter = new Emitter<string>();

  get onModelCreated() { return this.onCreatedEmitter.event; }
  get onModelRemoved() { return this.onRemovedEmitter.event; }

  getModel(uri: string): ITextModel | undefined {
    return this.models.get(uri);
  }

  createModel(uri: string, content?: string): ITextModel {
    const existing = this.models.get(uri);
    if (existing) return existing;

    const model = new DefaultTextModel(uri, content);
    this.models.set(uri, model);
    this.onCreatedEmitter.fire(model);
    return model;
  }

  removeModel(uri: string): void {
    this.models.delete(uri);
    this.onRemovedEmitter.fire(uri);
  }
}
