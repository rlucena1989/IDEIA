import fs from 'fs';
import { createLogger } from '@ideia/logger';
import path from 'path';
import crypto from 'crypto';
import { Chunk, Document, DocumentSource, DocumentCategory, IndexOptions } from './types';
const logger = createLogger('doc-indexer');

const DEFAULT_EXTENSIONS = new Set(['.ts', '.js', '.md', '.yaml', '.yml', '.json', '.py', '.go', '.rs', '.sh', '.ps1', '.bat']);
const DEFAULT_IGNORE = new Set(['node_modules', '.git', 'dist', 'coverage', '.venv', '__pycache__', 'target', 'build']);

function inferSource(filePath: string): DocumentSource {
  const parts = path.dirname(filePath).split(path.sep);
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'src' || lower === 'packages') return 'source';
    if (lower === 'docs' || lower === 'doc' || lower === '.ai' || lower === 'estudos') return 'study';
    if (lower === 'test' || lower === 'tests' || lower === '__tests__') return 'test';
    if (lower === 'config' || lower === 'scripts' || lower === '.github') return 'config';
  }
  return 'other';
}

function inferCategory(filePath: string): DocumentCategory {
  const lower = filePath.toLowerCase();
  if (lower.includes('arquitetura') || lower.includes('architecture')) return 'architecture';
  if (lower.includes('implementacao') || lower.includes('implementation') || lower.includes('codigo')) return 'implementation';
  if (lower.includes('ux') || lower.includes('usuario') || lower.includes('usability')) return 'ux';
  if (lower.includes('seguranca') || lower.includes('security') || lower.includes('safety')) return 'security';
  if (lower.includes('performance') || lower.includes('benchmark') || lower.includes('escalabilidade')) return 'performance';
  if (lower.includes('integracao') || lower.includes('integration') || lower.includes('barramento')) return 'integration';
  if (lower.includes('test') || lower.includes('qualidade') || lower.includes('quality')) return 'testing';
  if (lower.includes('deploy') || lower.includes('entrega') || lower.includes('ci/cd')) return 'deployment';
  if (lower.includes('governanca') || lower.includes('governance') || lower.includes('compliance')) return 'governance';
  return 'general';
}

function walkFiles(dir: string, exts: Set<string>, ignoreDirs: Set<string>): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (ignoreDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(full, exts, ignoreDirs));
    } else {
      const ext = path.extname(entry.name);
      if (exts.has(ext)) files.push(full);
    }
  }
  return files;
}

function chunkText(content: string, filePath: string, chunkSize: number, chunkOverlap: number): Chunk[] {
  const chunks: Chunk[] = [];
  if (!content) return chunks;

  const separators = ['\n\n', '\n', '.', ' ', ''];
  const effectiveOverlap = Math.min(chunkOverlap, chunkSize - 1);
  let start = 0;
  let chunkIndex = 0;

  while (start < content.length) {
    let end = Math.min(start + chunkSize, content.length);

    if (end < content.length) {
      let found = false;
      for (const sep of separators) {
        if (sep === '') break;
        const searchStart = Math.max(start, end - Math.floor(chunkSize * 0.3));
        const sepIdx = content.lastIndexOf(sep, end);
        if (sepIdx > searchStart && sepIdx < end) {
          end = sepIdx + sep.length;
          found = true;
          break;
        }
      }
      if (!found) {
        end = Math.min(start + chunkSize, content.length);
      }
    }

    const chunkContent = content.slice(start, end).trim();
    if (chunkContent) {
      chunks.push({
        id: `${filePath}:${start}-${end}`,
        path: filePath,
        content: chunkContent,
        index: chunkIndex,
        totalChunks: 0,
        startOffset: start,
        endOffset: end,
        metadata: {},
      });
      chunkIndex++;
    }

    if (end >= content.length) break;
    start = end - effectiveOverlap;
  }

  for (const chunk of chunks) {
    chunk.totalChunks = chunks.length;
  }

  return chunks;
}

export class DocIndexer {
  private documents: Map<string, Document> = new Map();
  private chunks: Chunk[] = [];
  private extensions: Set<string>;
  private ignoreDirs: Set<string>;

  constructor(options?: { extensions?: string[]; ignorePatterns?: string[] }) {
    this.extensions = options?.extensions ? new Set(options.extensions) : DEFAULT_EXTENSIONS;
    this.ignoreDirs = new Set(DEFAULT_IGNORE);
    if (options?.ignorePatterns) {
      for (const p of options.ignorePatterns) {
        this.ignoreDirs.add(p);
      }
    }
  }

  get documentCount(): number {
    return this.documents.size;
  }

  get chunkCount(): number {
    return this.chunks.length;
  }

  getDocuments(): Document[] {
    return Array.from(this.documents.values());
  }

  getChunks(): Chunk[] {
    return [...this.chunks];
  }

  indexDirectory(dirPath: string, options?: IndexOptions): { documents: number; chunks: number } {
    const chunkSize = options?.chunkSize ?? 1000;
    const chunkOverlap = options?.chunkOverlap ?? 200;
    const reindex = options?.reindex ?? true;

    if (!fs.existsSync(dirPath)) {
      return { documents: 0, chunks: 0 };
    }

    if (reindex) {
      this.documents.clear();
      this.chunks = [];
    }

    const files = walkFiles(dirPath, this.extensions, this.ignoreDirs);
    let docCount = 0;
    let chunkCount = 0;

    for (const filePath of files) {
      try {
        const stat = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf-8');

        const doc: Document = {
          path: filePath,
          source: inferSource(filePath),
          category: inferCategory(filePath),
          content,
          mtimeMs: stat.mtimeMs,
          size: stat.size,
        };

        const docKey = crypto.createHash('md5').update(filePath).digest('hex');
        this.documents.set(docKey, doc);
        docCount++;

        const fileChunks = chunkText(content, filePath, chunkSize, chunkOverlap);
        this.chunks.push(...fileChunks);
        chunkCount += fileChunks.length;
      } catch {
        continue;
      }
    }

    return { documents: docCount, chunks: chunkCount };
  }

  indexFiles(filePaths: string[], options?: IndexOptions): { documents: number; chunks: number } {
    const chunkSize = options?.chunkSize ?? 1000;
    const chunkOverlap = options?.chunkOverlap ?? 200;
    const reindex = options?.reindex ?? true;

    if (reindex) {
      this.documents.clear();
      this.chunks = [];
    }

    let docCount = 0;
    let chunkCount = 0;

    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) continue;
      try {
        const stat = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf-8');

        const doc: Document = {
          path: filePath,
          source: inferSource(filePath),
          category: inferCategory(filePath),
          content,
          mtimeMs: stat.mtimeMs,
          size: stat.size,
        };

        const docKey = crypto.createHash('md5').update(filePath).digest('hex');
        this.documents.set(docKey, doc);
        docCount++;

        const fileChunks = chunkText(content, filePath, chunkSize, chunkOverlap);
        this.chunks.push(...fileChunks);
        chunkCount += fileChunks.length;
      } catch {
        continue;
      }
    }

    return { documents: docCount, chunks: chunkCount };
  }

  clear(): void {
    this.documents.clear();
    this.chunks = [];
  }
}
