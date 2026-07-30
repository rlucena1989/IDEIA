import { Contribution } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { IEditorWidget } from './types';
const logger = createLogger('editor-contributions');

export interface IEditorContribution extends Contribution<unknown> {
  onEditorOpened(editor: IEditorWidget): void;
  onEditorClosed(editor: IEditorWidget): void;
  onEditorFocusChanged(editor: IEditorWidget | undefined): void;
}

export class EditorSessionManager {
  private sessions = new Map<string, EditorSession>();

  createSession(editorId: string): EditorSession {
    const session = new EditorSession(editorId);
    this.sessions.set(editorId, session);
    return session;
  }

  getSession(editorId: string): EditorSession | undefined {
    return this.sessions.get(editorId);
  }

  removeSession(editorId: string): void {
    this.sessions.delete(editorId);
  }
}

export class EditorSession {
  readonly editorId: string;
  private created = Date.now();
  private lastActive = Date.now();
  private metadata = new Map<string, unknown>();

  constructor(editorId: string) {
    this.editorId = editorId;
  }

  touch(): void {
    this.lastActive = Date.now();
  }

  setMetadata(key: string, value: unknown): void {
    this.metadata.set(key, value);
  }

  getMetadata(key: string): unknown {
    return this.metadata.get(key);
  }

  getAge(): number {
    return Date.now() - this.created;
  }

  getIdleTime(): number {
    return Date.now() - this.lastActive;
  }
}
