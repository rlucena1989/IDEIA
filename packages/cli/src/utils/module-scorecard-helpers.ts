import path from 'node:path';
import { getIO } from '../io';

const io = () => getIO();

export function safeExists(p: string): boolean { try { return io().fs.exists(p); } catch { return false; } }
export function safeReaddir(p: string): string[] { try { if (!io().fs.exists(p)) return []; return io().fs.readDir(p); } catch { return []; } }
export function safeReaddirEntries(p: string): { name: string; isDirectory: () => boolean; isFile: () => boolean }[] { try { if (!io().fs.exists(p)) return []; return io().fs.readDirEntries(p); } catch { return []; } }
export function safeRead(p: string): string | null { try { if (!io().fs.exists(p)) return null; return io().fs.read(p, 'utf8'); } catch { return null; } }
export function safeStat(p: string): { mtimeMs: number; size: number; isDirectory: () => boolean } | null { try { if (!io().fs.exists(p)) return null; return io().fs.stat(p); } catch { return null; } }

export function walkFiles(dir: string, maxDepth: number, _currentDepth = 0): string[] {
  if (_currentDepth > maxDepth) return [];
  const results: string[] = [];
  const entries = safeReaddirEntries(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
    if (entry.isDirectory()) results.push(...walkFiles(fullPath, maxDepth, _currentDepth + 1));
    else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) results.push(fullPath);
  }
  return results;
}

export function countFiles(dir: string): number { try { return walkFiles(dir, 3).length; } catch { return 0; } }

export function findTestFiles(files: string[]): string[] { return files.filter(f => /\.(test|spec)\.(ts|tsx)$/.test(f)); }
export function findSourceFiles(files: string[]): string[] { return files.filter(f => !/\.(test|spec)\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts')); }

export function tryReadCoveragePct(): number | null {
  try {
    const summaryPath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    if (!io().fs.exists(summaryPath)) return null;
    const summary = JSON.parse(io().fs.read(summaryPath, 'utf8'));
    return typeof summary.total?.lines?.pct === 'number' ? summary.total.lines.pct : null;
  } catch { return null; }
}

export function determineStatus(score: number): 'critical' | 'warning' | 'good' | 'excellent' {
  if (score < 30) return 'critical';
  if (score < 50) return 'warning';
  if (score < 80) return 'good';
  return 'excellent';
}
