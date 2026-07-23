import { Emitter } from '@ideia/core-contributions';
import { ITextModel } from './types';

export class DefaultTextModel implements ITextModel {
  readonly uri: string;
  private content = '';
  private encoding = 'utf-8';
  private _dirty = false;
  private onChangedEmitter = new Emitter<string>();

  get onContentChanged() { return this.onChangedEmitter.event; }

  constructor(uri: string) {
    this.uri = uri;
  }

  getContent(): string {
    return this.content;
  }

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

  getEncoding(): string {
    return this.encoding;
  }

  setEncoding(encoding: string): void {
    this.encoding = encoding;
  }

  isDirty(): boolean {
    return this._dirty;
  }

  markClean(): void {
    this._dirty = false;
  }
}

export class TextModelService {
  private models = new Map<string, DefaultTextModel>();

  getModel(uri: string): DefaultTextModel | undefined {
    return this.models.get(uri);
  }

  createModel(uri: string, content = ''): DefaultTextModel {
    const existing = this.models.get(uri);
    if (existing) return existing;

    const model = new DefaultTextModel(uri);
    model.setContent(content);
    this.models.set(uri, model);
    return model;
  }

  removeModel(uri: string): void {
    this.models.delete(uri);
  }
}
