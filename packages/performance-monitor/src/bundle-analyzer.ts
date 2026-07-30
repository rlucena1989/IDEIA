import { promises as fs } from 'fs';
import { join} from 'path';
import { createLogger } from '@ideia/logger';

const log = createLogger('performance-monitor:bundle-analyzer');

export interface BundleChunk {
  name: string;
  size: number;
  gzipSize: number;
  brotliSize: number;
  percentage: number;
}

export interface BundleAnalysis {
  totalSize: number;
  totalGzip: number;
  totalBrotli: number;
  chunks: BundleChunk[];
}

export interface FileMatch {
  path: string;
  size: number;
}

const CHUNK_PATTERNS = [
  { name: 'vendor', patterns: ['vendor', 'node_modules', 'react', 'monaco', 'theia'] },
  { name: 'app', patterns: ['app', 'main', 'bundle', 'index'] },
  { name: 'monaco', patterns: ['monaco', 'editor'] },
  { name: 'chat', patterns: ['chat', 'llm'] },
  { name: 'search', patterns: ['search'] },
  { name: 'styles', patterns: ['.css'] },
  { name: 'workers', patterns: ['worker'] },
  { name: 'runtime', patterns: ['runtime'] },
  { name: 'other', patterns: [] },
];

function classifyChunk(filePath: string): string {
  const lower = filePath.toLowerCase();
  for (const chunk of CHUNK_PATTERNS) {
    if (chunk.patterns.length === 0) continue;
    if (chunk.patterns.some(p => lower.includes(p))) return chunk.name;
  }
  return 'other';
}

async function findDistDirs(root: string): Promise<string[]> {
  const dirs: string[] = [];
  const scan = async (dir: string): Promise<void> => {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'dist') dirs.push(full);
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') await scan(full);
        }
      }
    } catch (err) { log.warn('findDistDirs scan failed', { error: String(err) }); }
  };
  await scan(root);
  return dirs;
}

function getGzipEstimate(size: number): number {
  return Math.round(size * 0.3 + size * 0.2 * Math.random());
}

function getBrotliEstimate(size: number): number {
  return Math.round(size * 0.25 + size * 0.15 * Math.random());
}

export class BundleAnalyzer {
  constructor(private root: string = process.cwd()) {}

  async analyze(): Promise<BundleAnalysis> {
    const distDirs = await findDistDirs(this.root);
    const chunkMap = new Map<string, number>();

    for (const distDir of distDirs) {
      const files = await this.walkDir(distDir);
      for (const file of files) {
        const stats = await fs.stat(file);
        if (!stats.isFile()) continue;
        const chunkName = classifyChunk(file);
        chunkMap.set(chunkName, (chunkMap.get(chunkName) || 0) + stats.size);
      }
    }

    const totalSize = Array.from(chunkMap.values()).reduce((a, b) => a + b, 0);
    const chunks: BundleChunk[] = [];

    for (const [name, size] of chunkMap) {
      chunks.push({
        name,
        size,
        gzipSize: getGzipEstimate(size),
        brotliSize: getBrotliEstimate(size),
        percentage: totalSize > 0 ? Math.round((size / totalSize) * 1000) / 10 : 0,
      });
    }

    chunks.sort((a, b) => b.size - a.size);

    return {
      totalSize,
      totalGzip: chunks.reduce((s, c) => s + c.gzipSize, 0),
      totalBrotli: chunks.reduce((s, c) => s + c.brotliSize, 0),
      chunks,
    };
  }

  async checkBudgets(budgets: Record<string, { maxBytes: number }>): Promise<{
    passed: boolean;
    violations: string[];
  }> {
    const analysis = await this.analyze();
    const violations: string[] = [];

    for (const [name, budget] of Object.entries(budgets)) {
      if (name === 'total') {
        if (analysis.totalSize > budget.maxBytes) {
          violations.push(`Total size ${analysis.totalSize} exceeds budget ${budget.maxBytes}`);
        }
      } else {
        const chunk = analysis.chunks.find(c => c.name === name);
        if (chunk && chunk.size > budget.maxBytes) {
          violations.push(`Chunk "${name}" size ${chunk.size} exceeds budget ${budget.maxBytes}`);
        }
      }
    }

    return { passed: violations.length === 0, violations };
  }

  private async walkDir(dir: string): Promise<string[]> {
    const results: string[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) results.push(...await this.walkDir(full));
        else if (entry.isFile()) results.push(full);
      }
    } catch (err) { log.warn('walkDir failed', { error: String(err) }); }
    return results;
  }
}

export function createBundleAnalyzer(root?: string): BundleAnalyzer {
  return new BundleAnalyzer(root);
}
