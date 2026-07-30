import { injectable, inject } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { EventBus } from '@ideia/event-bus';
import { IDEIA_SEARCH_SERVICE, IDEIA_SearchService, SearchResult } from '../common/ideia-protocol';
import * as fs from 'fs';
import * as path from 'path';

const SCAN_DIRS = ['packages', 'docs', 'scripts'];
const SCAN_EXTENSIONS = ['.ts', '.tsx', '.md', '.json', '.js'];
const MAX_RESULTS = 30;

@injectable()
export class IDEIA_SearchBackendService implements IDEIA_SearchService {
  private fileIndex: { path: string; name: string; content: string }[] = [];

  constructor(
    @inject(EventBus) private eventBus: EventBus,
  ) {
    this.buildIndex();
  }

  private buildIndex(): void {
    const rootDir = path.resolve(__dirname, '..', '..', '..', '..');
    for (const dirName of SCAN_DIRS) {
      const dir = path.join(rootDir, dirName);
      if (fs.existsSync(dir)) this.scanDir(dir, dirName, 0);
    }
  }

  private scanDir(dir: string, relPrefix: string, depth: number): void {
    if (depth > 3) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'dist' || e.name === 'lib' || e.name === 'coverage') continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) this.scanDir(full, path.join(relPrefix, e.name), depth + 1);
        else if (SCAN_EXTENSIONS.some(ext => e.name.endsWith(ext))) {
          try {
            const content = fs.readFileSync(full, 'utf-8');
            this.fileIndex.push({ path: path.join(relPrefix, e.name), name: e.name, content });
          } catch { /* ignore unreadable */ }
        }
      }
    } catch { /* ignore */ }
  }

  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const entry of this.fileIndex) {
      const nameMatch = entry.name.toLowerCase().includes(q);
      const pathMatch = entry.path.toLowerCase().includes(q);
      const contentMatch = entry.content.toLowerCase().includes(q);

      if (nameMatch || pathMatch || contentMatch) {
        let icon = 'codicon codicon-file-code';
        if (entry.name.endsWith('.md')) icon = 'codicon codicon-file';
        else if (entry.name.endsWith('.json')) icon = 'codicon codicon-json';
        else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) icon = 'codicon codicon-file-code';

        const matchLine = contentMatch
          ? this.extractContext(entry.content, q)
          : entry.path;

        results.push({
          id: entry.path,
          label: entry.name,
          description: matchLine,
          icon,
        });
      }
    }

    results.sort((a, b) => {
      const aName = a.label.toLowerCase().includes(q) ? 1 : 0;
      const bName = b.label.toLowerCase().includes(q) ? 1 : 0;
      if (aName !== bName) return bName - aName;
      return a.description.length - b.description.length;
    });

    return results.slice(0, MAX_RESULTS);
  }

  private extractContext(content: string, query: string): string {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(query)) {
        const start = Math.max(0, i - 1);
        const end = Math.min(lines.length, i + 2);
        return lines.slice(start, end).map(l => l.trim()).join(' | ').substring(0, 150);
      }
    }
    return '';
  }
}
