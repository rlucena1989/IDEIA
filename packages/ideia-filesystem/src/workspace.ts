import { Emitter } from '@ideia/core-contributions';
import { WorkspaceService } from './types';

export class DefaultWorkspaceService implements WorkspaceService {
  private _roots: string[] = [];
  private workspaceFile?: string;
  private onChangedEmitter = new Emitter<string[]>();

  get roots(): string[] { return [...this._roots]; }
  get onRootsChanged() { return this.onChangedEmitter.event; }

  constructor(initialRoots?: string[]) {
    if (initialRoots) {
      this._roots = initialRoots;
    }
  }

  async addRoot(uri: string): Promise<void> {
    if (!this._roots.includes(uri)) {
      this._roots.push(uri);
      this.notifyChanged();
    }
  }

  async removeRoot(uri: string): Promise<void> {
    this._roots = this._roots.filter(r => r !== uri);
    this.notifyChanged();
  }

  getWorkspaceFile(): string | undefined {
    return this.workspaceFile;
  }

  isMultiRoot(): boolean {
    return this._roots.length > 1;
  }

  setWorkspaceFile(uri: string): void {
    this.workspaceFile = uri;
  }

  private notifyChanged(): void {
    this.onChangedEmitter.fire(this._roots);
  }
}
