import { BulkFileOperator, FileDeleteOptions, FileSystemProvider } from './types';
import { createLogger } from '@ideia/logger';

export class DefaultBulkFileOperator implements BulkFileOperator {
  private history: Array<{ action: string; sources: string[]; target?: string }> = [];

  async move(sources: string[], target: string): Promise<void> {
    this.history.push({ action: 'move', sources, target });
  }

  async copy(sources: string[], target: string): Promise<void> {
    this.history.push({ action: 'copy', sources, target });
  }

  async delete(sources: string[], options?: FileDeleteOptions): Promise<void> {
    this.history.push({ action: 'delete', sources });
  }

  async rename(source: string, target: string): Promise<void> {
    this.history.push({ action: 'rename', sources: [source], target });
  }

  async undo(): Promise<void> {
    this.history.pop();
  }

  getHistory(): Array<{ action: string; sources: string[]; target?: string }> {
    return [...this.history];
  }
}
