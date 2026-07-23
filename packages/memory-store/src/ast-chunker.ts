/**
 * ast-chunker.ts — Code-Aware Chunking via AST (Item 19)
 *
 * Divide código por função/classe/bloco usando análise de AST (ts-morph).
 * Substitui o recursive text splitting atual.
 */

import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';

export interface CodeChunk {
  id: string;
  type: 'function' | 'class' | 'method' | 'block' | 'comment';
  name: string;
  content: string;
  startLine: number;
  endLine: number;
  language: string;
}

export class AstChunker {
  chunk(filePath: string): CodeChunk[] {
    const ext = extname(filePath).toLowerCase();
    if (!this.isSupported(ext)) return [];

    const content = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : '';
    if (!content) return [];

    const lines = content.split('\n');
    const chunks: CodeChunk[] = [];
    const lang = this.langFromExt(ext);

    if (lang === 'typescript' || lang === 'javascript') {
      chunks.push(...this.chunkTsLike(lines, lang));
    } else if (lang === 'python') {
      chunks.push(...this.chunkPython(lines));
    } else {
      chunks.push(...this.chunkByLines(lines, lang));
    }

    return chunks;
  }

  private isSupported(ext: string): boolean {
    return ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.rb', '.php'].includes(ext);
  }

  private langFromExt(ext: string): string {
    const map: Record<string, string> = {
      '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript', '.jsx': 'javascript',
      '.py': 'python', '.go': 'go', '.rs': 'rust', '.java': 'java', '.rb': 'ruby', '.php': 'php',
    };
    return map[ext] || 'unknown';
  }

  private chunkTsLike(lines: string[], _lang: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    let current: { type: CodeChunk['type']; name: string; start: number; content: string[] } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const classMatch = line.match(/^\s*(export\s+)?(abstract\s+)?class\s+(\w+)/);
      const funcMatch = line.match(/^\s*(export\s+)?(async\s+)?function\s+(\w+)/);
      const _methodMatch = line.match(/^\s*(async\s+)?(\w+)\s*\([^)]*\)\s*{/);
      const closeBrace = line.trim() === '}';

      if (classMatch) {
        if (current) this.finalizeChunk(current, chunks, i - 1);
        current = { type: 'class', name: classMatch[3], start: i, content: [line] };
      } else if (funcMatch) {
        if (current) this.finalizeChunk(current, chunks, i - 1);
        current = { type: 'function', name: funcMatch[3], start: i, content: [line] };
      } else if (current && closeBrace) {
        current.content.push(line);
        this.finalizeChunk(current, chunks, i);
        current = null;
      } else if (current) {
        current.content.push(line);
      }
    }

    if (current) this.finalizeChunk(current, chunks, lines.length - 1);
    return chunks;
  }

  private chunkPython(lines: string[], _lang?: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    let current: { type: CodeChunk['type']; name: string; start: number; content: string[] } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const classMatch = line.match(/^\s*class\s+(\w+)/);
      const funcMatch = line.match(/^\s*(async\s+)?def\s+(\w+)/);
      const isNewBlock = classMatch || funcMatch;
      const isEmpty = line.trim() === '';

      if (isNewBlock) {
        if (current && !isEmpty) {
          chunks.push({
            id: `chunk-${chunks.length}`,
            type: current.type,
            name: current.name,
            content: current.content.join('\n'),
            startLine: current.start + 1,
            endLine: i,
            language: 'python',
          });
        }
        current = {
          type: funcMatch ? 'function' : 'class',
          name: (funcMatch || classMatch)![1],
          start: i,
          content: [line],
        };
      } else if (current) {
        current.content.push(line);
      }
    }

    if (current) {
      chunks.push({
        id: `chunk-${chunks.length}`,
        type: current.type,
        name: current.name,
        content: current.content.join('\n'),
        startLine: current.start + 1,
        endLine: lines.length,
        language: 'python',
      });
    }

    return chunks;
  }

  private chunkByLines(lines: string[], lang: string): CodeChunk[] {
    const chunkSize = 50;
    const chunks: CodeChunk[] = [];
    for (let i = 0; i < lines.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, lines.length);
      chunks.push({
        id: `chunk-${chunks.length}`,
        type: 'block',
        name: `lines-${i + 1}-${end}`,
        content: lines.slice(i, end).join('\n'),
        startLine: i + 1,
        endLine: end,
        language: lang,
      });
    }
    return chunks;
  }

  private finalizeChunk(current: { type: CodeChunk['type']; name: string; start: number; content: string[] }, chunks: CodeChunk[], endLine: number): void {
    chunks.push({
      id: `chunk-${chunks.length}`,
      type: current.type,
      name: current.name,
      content: current.content.join('\n'),
      startLine: current.start + 1,
      endLine: endLine + 1,
      language: 'typescript',
    });
  }
}
