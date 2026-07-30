import { IDiffEditorWidget } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('diff-editor');

export class DefaultDiffEditorWidget implements IDiffEditorWidget {
  private originalUri = '';
  private modifiedUri = '';
  private _readonly = false;
  private _open = false;

  async open(originalUri: string, modifiedUri: string): Promise<void> {
    this.originalUri = originalUri;
    this.modifiedUri = modifiedUri;
    this._open = true;
  }

  close(): void {
    this._open = false;
    this.originalUri = '';
    this.modifiedUri = '';
  }

  setReadonly(ro: boolean): void {
    this._readonly = ro;
  }

  isOpen(): boolean {
    return this._open;
  }

  getOriginalUri(): string {
    return this.originalUri;
  }

  getModifiedUri(): string {
    return this.modifiedUri;
  }

  isReadonly(): boolean {
    return this._readonly;
  }
}
