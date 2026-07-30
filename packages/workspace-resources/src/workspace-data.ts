import { WorkspaceInput, WorkspaceData, ScopedStorageService } from './types';
import { createLogger } from '@ideia/logger';

export class DefaultWorkspaceDataService {
  parseWorkspaceFile(content: string): WorkspaceData {
    try {
      return JSON.parse(content) as WorkspaceData;
    } catch {
      return { folders: [] };
    }
  }

  serializeWorkspaceData(data: WorkspaceData): string {
    return JSON.stringify(data, null, 2);
  }
}

export class DefaultScopedStorageService implements ScopedStorageService {
  private globalStore = new Map<string, unknown>();
  private workspaceStore = new Map<string, unknown>();
  private folderStore = new Map<string, unknown>();

  getGlobal<T>(key: string): T | undefined { return this.globalStore.get(key) as T | undefined; }
  setGlobal<T>(key: string, value: T): void { this.globalStore.set(key, value); }

  getWorkspace<T>(key: string): T | undefined { return this.workspaceStore.get(key) as T | undefined; }
  setWorkspace<T>(key: string, value: T): void { this.workspaceStore.set(key, value); }

  getFolder<T>(key: string): T | undefined { return this.folderStore.get(key) as T | undefined; }
  setFolder<T>(key: string, value: T): void { this.folderStore.set(key, value); }
}
