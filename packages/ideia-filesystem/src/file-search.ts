import { FileSearchService, FileSearchOptions } from './types';
import { createLogger } from '@ideia/logger';

export class DefaultFileSearchService implements FileSearchService {
  async search(query: string, options?: FileSearchOptions): Promise<string[]> {
    return [];
  }
}
