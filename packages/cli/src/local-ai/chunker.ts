import fs from 'node:fs';
import path from 'node:path';

/** Interface que define a estrutura de chunk. */
export interface Chunk {
  id: string;
  path: string;
  content: string;
  index: number;
  totalChunks: number;
  startOffset: number;
  endOffset: number;
  metadata: Record<string, string>;
}

/** Interface que define a estrutura de chunker config. */
export interface ChunkerConfig {
  chunkSize: number;
  chunkOverlap: number;
  separators: string[];
}

const DEFAULT_CONFIG: ChunkerConfig = {
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', '.', ' ', ''],
};

/**
 * Define chunker config.
 * @param overrides - Valor overrides.
 * @returns O resultado da operação.
 */
export function setChunkerConfig(overrides: Partial<ChunkerConfig>): ChunkerConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

/**
 * Processa text.
 * @param content - Valor content.
 * @param filePath - Valor path.
 * @param config - Valor config.
 * @returns O resultado da operação.
 */
export function chunkText(
  content: string,
  filePath: string,
  config: ChunkerConfig = DEFAULT_CONFIG
): Chunk[] {
  const chunks: Chunk[] = [];
  if (!content) return chunks;

  const { chunkSize, chunkOverlap, separators } = config;
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

/**
 * Processa file.
 * @param filePath - Valor path.
 * @param config - Valor config.
 * @returns O resultado da operação.
 */
export function chunkFile(
  filePath: string,
  config?: ChunkerConfig
): Chunk[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  return chunkText(content, filePath, config);
}

/**
 * Processa directory.
 * @param dirPath - Valor path.
 * @param exts - Valor exts.
 * @param ignoreDirs - Valor dirs.
 * @param config - Valor config.
 * @returns O resultado da operação.
 */
export function chunkDirectory(
  dirPath: string,
  exts: Set<string>,
  ignoreDirs: Set<string>,
  config?: ChunkerConfig
): Chunk[] {
  const chunks: Chunk[] = [];
  const files = walkFiles(dirPath, exts, ignoreDirs);
  for (const file of files) {
    try {
      const fileChunks = chunkFile(file, config);
      chunks.push(...fileChunks);
    } catch { /* skip unreadable */ }
  }
  return chunks;
}

function walkFiles(dir: string, exts: Set<string>, ignoreDirs: Set<string>): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) continue;
    if (entry.name.startsWith('.')) continue;
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
