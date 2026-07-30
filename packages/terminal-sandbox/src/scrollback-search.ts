import { createLogger } from '@ideia/logger';

const _log = createLogger('scrollback-search');

export interface SearchMatch {
  index: number;
  line: number;
  column: number;
  length: number;
  text: string;
}

export class ScrollbackSearch {
  private buffer: string[];
  private matches: SearchMatch[] = [];
  private currentIndex = -1;
  private lastQuery = '';

  constructor(buffer?: string[]) {
    this.buffer = buffer ?? [];
  }

  setBuffer(lines: string[]): void {
    this.buffer = lines;
    this.matches = [];
    this.currentIndex = -1;
    this.lastQuery = '';
  }

  search(query: string): SearchMatch[] {
    this.clearHighlight();
    if (!query) return [];

    this.lastQuery = query;
    const isRegex = query.startsWith('/') && query.endsWith('/');

    try {
      const pattern = isRegex
        ? new RegExp(query.slice(1, -1), 'gi')
        : new RegExp(this.escapeRegExp(query), 'gi');

      this.matches = [];
      let matchIndex = 0;

      for (let lineIdx = 0; lineIdx < this.buffer.length; lineIdx++) {
        const line = this.buffer[lineIdx];
        let m: RegExpExecArray | null;

        while ((m = pattern.exec(line)) !== null) {
          this.matches.push({
            index: matchIndex++,
            line: lineIdx,
            column: m.index,
            length: m[0].length,
            text: line.slice(Math.max(0, m.index), m.index + m[0].length),
          });

          if (pattern.lastIndex === m.index) {
            pattern.lastIndex++;
          }
        }
      }

      if (this.matches.length > 0) {
        this.currentIndex = 0;
      }

      return [...this.matches];
    } catch {
      _log.warn('Invalid search pattern');
      return [];
    }
  }

  next(): SearchMatch | undefined {
    if (this.matches.length === 0) return undefined;
    this.currentIndex = (this.currentIndex + 1) % this.matches.length;
    return this.matches[this.currentIndex];
  }

  previous(): SearchMatch | undefined {
    if (this.matches.length === 0) return undefined;
    this.currentIndex = (this.currentIndex - 1 + this.matches.length) % this.matches.length;
    return this.matches[this.currentIndex];
  }

  clearHighlight(): void {
    this.matches = [];
    this.currentIndex = -1;
  }

  getMatchCount(): number {
    return this.matches.length;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getCurrentMatch(): SearchMatch | undefined {
    if (this.currentIndex < 0 || this.currentIndex >= this.matches.length) return undefined;
    return this.matches[this.currentIndex];
  }

  highlightMatches(buffer: string[], query: string): Array<{ line: string; matches: SearchMatch[] }> {
    this.setBuffer(buffer);
    this.search(query);
    return buffer.map((line, lineIdx) => ({
      line,
      matches: this.matches.filter(m => m.line === lineIdx),
    }));
  }

  searchAll(buffer: string[], query: string): SearchMatch[] {
    this.setBuffer(buffer);
    return this.search(query);
  }

  clearHighlights(): void {
    this.clearHighlight();
  }

  private escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
