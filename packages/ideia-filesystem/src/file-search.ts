import { FileSearchService, FileSearchOptions } from './types';

export class DefaultFileSearchService implements FileSearchService {
  async search(query: string, options?: FileSearchOptions): Promise<string[]> {
    return [];
  }
}
