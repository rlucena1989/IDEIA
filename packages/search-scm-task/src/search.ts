import { Emitter } from '@ideia/core-contributions';
import { SearchService, SearchOptions, SearchResult, ReplaceResult, SearchProvider } from './types';

export class DefaultSearchService implements SearchService {
  private providers: SearchProvider[] = [];
  private cancelled = false;
  private onProgressEmitter = new Emitter<{ results: number; total: number }>();
  private onCompleteEmitter = new Emitter<SearchResult[]>();

  get onSearchProgress() { return this.onProgressEmitter.event; }
  get onSearchComplete() { return this.onCompleteEmitter.event; }

  registerProvider(provider: SearchProvider): void {
    this.providers.push(provider);
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    this.cancelled = false;
    const results: SearchResult[] = [];

    for (const provider of this.providers) {
      if (this.cancelled) break;
      for await (const result of provider.search(query, options)) {
        if (this.cancelled) break;
        results.push(result);
        if (options?.maxResults && results.length >= options.maxResults) break;
      }
    }

    this.onCompleteEmitter.fire(results);
    return results;
  }

  async replace(query: string, replacement: string, options?: SearchOptions): Promise<ReplaceResult> {
    let replacements = 0;
    let files = 0;

    for (const provider of this.providers) {
      if (provider.replace) {
        const result = await provider.replace(query, replacement, options);
        replacements += result.replacements;
        files += result.files;
      }
    }

    return { replacements, files };
  }

  cancel(): void {
    this.cancelled = true;
  }
}
