import fs from 'node:fs';
import path from 'node:path';
import { IndexedDocument, generateTFIDFVector, hashContent } from './embeddings';

const INDEX_DIR = '.ai/local-ai/index';
const INDEX_FILE = 'documents.json';
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.venv', '__pycache__']);
const WATCH_EXTS = new Set(['.ts', '.js', '.md', '.yaml', '.yml', '.json', '.py', '.go', '.rs', '.sh', '.ps1', '.bat']);

function getIndexPath(root: string): string {
  return path.join(root, INDEX_DIR, INDEX_FILE);
}

function loadIndex(root: string): IndexedDocument[] {
  const indexPath = getIndexPath(root);
  if (!fs.existsSync(indexPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch {
    return [];
  }
}

function saveIndex(root: string, docs: IndexedDocument[]): void {
  const indexPath = getIndexPath(root);
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, JSON.stringify(docs, null, 2));
}

function walkFiles(dir: string, baseDir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(full, baseDir));
    } else {
      const ext = path.extname(entry.name);
      if (WATCH_EXTS.has(ext)) {
        files.push(full);
      }
    }
  }

  return files;
}

/** Interface que define a estrutura de index status. */
export interface IndexStatus {
  total: number;
  indexed: number;
  skipped: number;
  errors: number;
}

/**
 * Constrói index.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function buildIndex(root: string): IndexStatus {
  const existing = loadIndex(root);
  const existingMap = new Map(existing.map(d => [d.path, d]));

  const indexableDirs = ['.ai', 'packages/cli/src', 'packages/cli/templates'];
  const files: string[] = [];

  for (const dir of indexableDirs) {
    const fullDir = path.join(root, dir);
    if (fs.existsSync(fullDir)) {
      files.push(...walkFiles(fullDir, root));
    }
  }

  let indexed = 0;
  let skipped = 0;
  let errors = 0;

  const result: IndexedDocument[] = [];

  for (const file of files) {
    const relPath = path.relative(root, file).replace(/\\/g, '/');
    try {
      const content = fs.readFileSync(file, 'utf8');
      const h = hashContent(content);

      const existingDoc = existingMap.get(relPath);
      if (existingDoc && existingDoc.hash === h) {
        result.push(existingDoc);
        skipped++;
        continue;
      }

      const doc: IndexedDocument = {
        path: relPath,
        content,
        hash: h,
        vector: generateTFIDFVector(content),
        indexedAt: new Date().toISOString(),
      };

      result.push(doc);
      indexed++;
    } catch {
      errors++;
    }
  }

  saveIndex(root, result);
  return { total: result.length, indexed, skipped, errors };
}

/**
 * Obtém index.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function getIndex(root: string): IndexedDocument[] {
  return loadIndex(root);
}

/**
 * Obtém index status.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function getIndexStatus(root: string): IndexStatus & { fileCount: number } {
  const docs = loadIndex(root);
  return { total: docs.length, indexed: 0, skipped: 0, errors: 0, fileCount: docs.length };
}
