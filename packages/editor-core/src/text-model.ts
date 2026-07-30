import { Emitter } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { ITextModel, EditAction, UndoRedoStack } from './types';
const logger = createLogger('text-model');

export class UndoRedoManager {
  private undoStack: EditAction[] = [];
  private redoStack: EditAction[] = [];
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  push(action: EditAction): void {
    this.undoStack.push(action);
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(): EditAction | undefined {
    const action = this.undoStack.pop();
    if (action) {
      this.redoStack.push(action);
      action.undo();
    }
    return action;
  }

  redo(): EditAction | undefined {
    const action = this.redoStack.pop();
    if (action) {
      this.undoStack.push(action);
      action.redo();
    }
    return action;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getStats(): UndoRedoStack {
    return {
      undoStack: [...this.undoStack],
      redoStack: [...this.redoStack],
      maxSize: this.maxSize,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    };
  }

  getUndoStack(): EditAction[] {
    return [...this.undoStack];
  }

  getRedoStack(): EditAction[] {
    return [...this.redoStack];
  }

  setMaxSize(size: number): void {
    this.maxSize = size;
    while (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
  }
}

export class AutoSaveManager {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private delay: number;
  private enabled: boolean;
  private onSave: () => void;

  constructor(onSave: () => void, delay = 1000, enabled = true) {
    this.onSave = onSave;
    this.delay = delay;
    this.enabled = enabled;
  }

  schedule(): void {
    if (!this.enabled) return;
    this.cancel();
    this.timer = setTimeout(() => {
      this.onSave();
      this.timer = null;
    }, this.delay);
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  setDelay(delay: number): void {
    this.delay = delay;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.cancel();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  dispose(): void {
    this.cancel();
  }
}

export class DefaultTextModel implements ITextModel {
  readonly uri: string;
  private content = '';
  private encoding = 'utf-8';
  private _dirty = false;
  private onChangedEmitter = new Emitter<string>();
  private undoRedoManager: UndoRedoManager;
  private autoSaveManager: AutoSaveManager;

  get onContentChanged() { return this.onChangedEmitter.event; }

  constructor(uri: string, undoStackSize = 100, autoSaveDelay = 1000) {
    this.uri = uri;
    this.undoRedoManager = new UndoRedoManager(undoStackSize);
    this.autoSaveManager = new AutoSaveManager(() => this.save(), autoSaveDelay);
  }

  getContent(): string {
    return this.content;
  }

  setContent(content: string): void {
    const oldContent = this.content;
    const action: EditAction = {
      type: 'text-change',
      timestamp: Date.now(),
      description: `Text change (${oldContent.length} → ${content.length} chars)`,
      data: { oldContent, newContent: content },
      undo: () => { this.content = oldContent; this._dirty = true; this.onChangedEmitter.fire(oldContent); },
      redo: () => { this.content = content; this._dirty = true; this.onChangedEmitter.fire(content); },
    };
    this.undoRedoManager.push(action);
    this.content = content;
    this._dirty = true;
    this.onChangedEmitter.fire(content);
    this.autoSaveManager.schedule();
  }

  save(): void {
    if (this._dirty) {
      this._dirty = false;
      this.onChangedEmitter.fire(this.content);
    }
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

  undo(): EditAction | undefined {
    return this.undoRedoManager.undo();
  }

  redo(): EditAction | undefined {
    return this.undoRedoManager.redo();
  }

  getUndoRedoManager(): UndoRedoManager {
    return this.undoRedoManager;
  }

  getAutoSaveManager(): AutoSaveManager {
    return this.autoSaveManager;
  }

  getUndoStack(): EditAction[] {
    return this.undoRedoManager.getUndoStack();
  }

  getRedoStack(): EditAction[] {
    return this.undoRedoManager.getRedoStack();
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
