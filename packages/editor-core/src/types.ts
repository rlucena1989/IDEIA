import { Disposable, Contribution, Event } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';

export interface IEditorWidget {
  readonly uri: string;
  readonly id: string;
  readonly title: string;
  readonly dirty: boolean;
  readonly closed: boolean;

  open(uri: string): Promise<void>;
  close(): void;
  save(): Promise<boolean>;
  focus(): void;
  isActive(): boolean;
  onDirtyChanged: Event<boolean>;
  onClosed: Event<void>;
  onFocus: Event<void>;
}

export interface EditorWidgetFactory {
  readonly id: string;
  readonly priority: number;
  canHandle(uri: string): boolean;
  createWidget(uri: string): Promise<IEditorWidget>;
}

export interface EditorManager {
  open(uri: string, options?: EditorOpenOptions): Promise<IEditorWidget>;
  close(uri: string): Promise<void>;
  closeAll(): Promise<void>;
  getActiveEditor(): IEditorWidget | undefined;
  getEditors(): IEditorWidget[];
  getEditor(uri: string): IEditorWidget | undefined;
  onEditorOpened: Event<IEditorWidget>;
  onEditorClosed: Event<string>;
  onActiveEditorChanged: Event<IEditorWidget | undefined>;
}

export interface EditorOpenOptions {
  preview?: boolean;
  pinned?: boolean;
  side?: 'left' | 'right' | 'main';
  selection?: EditorSelection;
}

export interface EditorSelection {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface ITextModel {
  uri: string;
  getContent(): string;
  setContent(content: string): void;
  getLineCount(): number;
  getLineContent(line: number): string;
  getEncoding(): string;
  setEncoding(encoding: string): void;
  isDirty(): boolean;
  onContentChanged: Event<string>;
}

export interface IDocument {
  uri: string;
  fileName: string;
  languageId: string;
  lineCount: number;
  getText(): string;
  setText(text: string): void;
}

export interface INavigationLocation {
  uri: string;
  selection: EditorSelection;
  timestamp: number;
}

export interface INavigationService {
  goBack(): Promise<void>;
  goForward(): Promise<void>;
  canGoBack(): boolean;
  canGoForward(): boolean;
  navigateTo(uri: string, selection: EditorSelection): void;
  clear(): void;
}

export interface IDiffEditorWidget {
  open(originalUri: string, modifiedUri: string): Promise<void>;
  close(): void;
  setReadonly(ro: boolean): void;
}

export interface UndoRedoStack {
  undoStack: EditAction[];
  redoStack: EditAction[];
  maxSize: number;
  canUndo: boolean;
  canRedo: boolean;
}

export interface AutoSaveConfig {
  enabled: boolean;
  delay: number;
  onFocusChange: boolean;
  onWindowChange: boolean;
}

export interface EditAction {
  type: string;
  timestamp: number;
  description: string;
  data: unknown;
  undo(): void;
  redo(): void;
}

export interface EditorPreferences {
  tabSize: number;
  insertSpaces: boolean;
  wordWrap: 'off' | 'on' | 'wordWrapColumn';
  lineNumbers: 'on' | 'off' | 'relative';
  minimap: { enabled: boolean; maxColumn: number };
  fontSize: number;
  fontFamily: string;
  autoSave: 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange';
  autoSaveDelay: number;
  autoSaveOnFocusChange: boolean;
  formatOnSave: boolean;
  formatOnPaste: boolean;
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  cursorStyle: 'line' | 'block' | 'underline' | 'line-thin' | 'block-outline' | 'underline-thin';
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';
  bracketPairColorization: { enabled: boolean };
  suggestOnTriggerCharacters: boolean;
  quickSuggestions: { other: boolean; comments: boolean; strings: boolean };
  enableUndoRedo: boolean;
  undoStackSize: number;
}
