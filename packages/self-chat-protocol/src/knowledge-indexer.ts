import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '@ideia/logger';

interface IndexedDocument {
  id: string;
  content: string;
  source: string;
  type: 'study' | 'source' | 'manifest' | 'docs';
  tokens: string[];
}

const log = createLogger('knowledge-indexer');

const PROJECT_ROOT = process.cwd();
const STUDIES_DIR = path.join(PROJECT_ROOT, 'docs', 'ESTUDOS');
const PACKAGES_DIR = path.join(PROJECT_ROOT, 'packages');
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'docs', 'governance', 'REALITY-MANIFEST.md');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && w.length < 30);
}

function simpleTfIdf(queryTokens: string[], docTokens: string[]): number {
  const docSet = new Set(docTokens);
  let score = 0;
  for (const token of queryTokens) {
    if (docSet.has(token)) score += 1;
    const freq = docTokens.filter(t => t === token).length;
    score += freq * 0.5;
  }
  return score / Math.max(1, queryTokens.length);
}

export class KnowledgeIndexer {
  private documents: IndexedDocument[] = [];
  private built = false;

  get documentCount(): number {
    return this.documents.length;
  }

  async buildIndex(): Promise<void> {
    if (this.built) return;
    const start = performance.now();

    try {
      await this.indexStudies();
      await this.indexSourceFiles();
      await this.indexManifest();
      await this.indexDocs();
      this.built = true;
      log.info('Knowledge index built', {
        documents: this.documents.length,
        timeMs: Math.round(performance.now() - start),
      });
    } catch (_err) {
      log.error('Failed to build knowledge index', { error: String(_err) });
    }
  }

  async searchDocs(query: string, limit = 10): Promise<Array<{ content: string; source: string; score: number }>> {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];
    const docs = this.documents.filter(d => d.type === 'docs' || d.type === 'study');
    const scored = docs
      .map(doc => ({
        content: doc.content.slice(0, 500),
        source: doc.source,
        score: simpleTfIdf(queryTokens, doc.tokens),
      }))
      .filter(d => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return scored;
  }

  async searchPackages(query: string, limit = 10): Promise<Array<{ content: string; source: string; score: number }>> {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];
    const docs = this.documents.filter(d => d.type === 'source');
    const scored = docs
      .map(doc => ({
        content: doc.content.slice(0, 500),
        source: doc.source,
        score: simpleTfIdf(queryTokens, doc.tokens),
      }))
      .filter(d => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return scored;
  }

  private async indexDocs(): Promise<void> {
    if (!fs.existsSync(DOCS_DIR)) return;
    try {
      const markdownFiles = this.findMdFiles(DOCS_DIR).slice(0, 200);
      for (const file of markdownFiles) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          const relativePath = path.relative(PROJECT_ROOT, file);
          const chunks = content.match(/(?:^|\n)(?:#{1,3}\s[^\n]+[\s\S]*?)(?=\n#{1,3}\s|$)/g) ?? [content.slice(0, 3000)];
          for (let i = 0; i < Math.min(chunks.length, 10); i++) {
            const chunk = chunks[i].slice(0, 2000);
            if (chunk.length < 20) continue;
            this.documents.push({
              id: `docs:${relativePath}:${i}`,
              content: chunk,
              source: relativePath,
              type: 'docs',
              tokens: tokenize(chunk),
            });
          }
        } catch {
          /* skip */
        }
      }
    } catch {
      /* skip */
    }
  }

  private findMdFiles(dir: string): string[] {
    const results: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('node_modules')) {
          results.push(...this.findMdFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          results.push(fullPath);
        }
      }
    } catch {
      /* skip */
    }
    return results;
  }

  private async indexStudies(): Promise<void> {
    if (!fs.existsSync(STUDIES_DIR)) {
      log.warn('Studies directory not found', { path: STUDIES_DIR });
      return;
    }

    const files = fs.readdirSync(STUDIES_DIR)
      .filter(f => f.endsWith('.md'))
      .slice(0, 100);

    for (const file of files) {
      try {
        const filePath = path.join(STUDIES_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim().length > 0);

        for (let i = 0; i < lines.length; i += 50) {
          const chunk = lines.slice(i, i + 50).join('\n').slice(0, 2000);
          if (chunk.length < 20) continue;

          this.documents.push({
            id: `study:${file}:${i}`,
            content: chunk,
            source: `docs/ESTUDOS/${file}`,
            type: 'study',
            tokens: tokenize(chunk),
          });
        }
      } catch (_err) {
        log.warn('Failed to index study file', { file, error: String(_err) });
      }
    }
  }

  private async indexSourceFiles(): Promise<void> {
    if (!fs.existsSync(PACKAGES_DIR)) {
      log.warn('Packages directory not found', { path: PACKAGES_DIR });
      return;
    }

    const packages = fs.readdirSync(PACKAGES_DIR)
      .filter(d => {
        const pkgPath = path.join(PACKAGES_DIR, d);
        return fs.statSync(pkgPath).isDirectory() && fs.existsSync(path.join(pkgPath, 'package.json'));
      })
      .slice(0, 50);

    for (const pkg of packages) {
      const srcDir = path.join(PACKAGES_DIR, pkg, 'src');
      if (!fs.existsSync(srcDir)) continue;

      try {
        const tsFiles = this.findTypeScriptFiles(srcDir);
        for (const file of tsFiles.slice(0, 20)) {
          try {
            const content = fs.readFileSync(file, 'utf-8');
            const relativePath = path.relative(PROJECT_ROOT, file);

            const chunks = this.chunkSource(content);
            for (let i = 0; i < chunks.length; i++) {
              this.documents.push({
                id: `source:${relativePath}:${i}`,
                content: chunks[i],
                source: relativePath,
                type: 'source',
                tokens: tokenize(chunks[i]),
              });
            }
          } catch {
            /* skip unreadable files */
          }
        }
      } catch (_err) {
        log.warn('Failed to index package source', { pkg, error: String(_err) });
      }
    }
  }

  private async indexManifest(): Promise<void> {
    if (!fs.existsSync(MANIFEST_PATH)) {
      log.warn('Manifest not found', { path: MANIFEST_PATH });
      return;
    }

    try {
      const content = fs.readFileSync(MANIFEST_PATH, 'utf-8');
      const chunks = content.match(/(?:^|\n)(?:#{1,3}\s[^\n]+[\s\S]*?)(?=\n#{1,3}\s|$)/g) ?? [content.slice(0, 3000)];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i].slice(0, 2000);
        this.documents.push({
          id: `manifest:section:${i}`,
          content: chunk,
          source: 'docs/governance/REALITY-MANIFEST.md',
          type: 'manifest',
          tokens: tokenize(chunk),
        });
      }
    } catch (_err) {
      log.warn('Failed to index manifest', { error: String(_err) });
    }
  }

  search(query: string, limit = 10): Array<{ content: string; source: string; score: number }> {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const scored = this.documents
      .map(doc => ({
        content: doc.content.slice(0, 500),
        source: doc.source,
        score: simpleTfIdf(queryTokens, doc.tokens),
      }))
      .filter(d => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  }

  private findTypeScriptFiles(dir: string): string[] {
    const results: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          results.push(...this.findTypeScriptFiles(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          results.push(fullPath);
        }
      }
    } catch {
      /* skip inaccessible dirs */
    }
    return results;
  }

  private chunkSource(content: string): string[] {
    const chunks: string[] = [];
    const lines = content.split('\n');
    const maxChunkLines = 80;

    for (let i = 0; i < lines.length; i += maxChunkLines) {
      const chunk = lines.slice(i, i + maxChunkLines).join('\n');
      if (chunk.trim().length > 10) {
        chunks.push(chunk.slice(0, 3000));
      }
    }
    return chunks;
  }
}

export function createKnowledgeIndexer(): KnowledgeIndexer {
  return new KnowledgeIndexer();
}
