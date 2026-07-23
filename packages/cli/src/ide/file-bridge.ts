import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import chokidar, { FSWatcher } from 'chokidar';

export interface FsEntry {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink';
  size: number;
  modifiedAt: string;
}

export interface FileChangeEvent {
  type: 'create' | 'modify' | 'delete';
  path: string;
  timestamp: string;
}

const IGNORE_PATTERNS = [
  /^node_modules[/\\]/,
  /^\.git[/\\]/,
  /^dist[/\\]/,
  /^\.ai[/\\]/,
  /^\.venv[/\\]/,
  /__pycache__[/\\]/,
  /\.next[/\\]/,
];

function shouldIgnore(relPath: string): boolean {
  return IGNORE_PATTERNS.some(p => p.test(relPath));
}

export class FileBridge extends EventEmitter {
  private root: string;
  private watcherActive = false;
  private watcher: FSWatcher | null = null;

  constructor(root: string) {
    super();
    this.root = root;
  }

  setRoot(root: string): void {
    this.root = root;
    if (this.watcherActive) {
      this.stopWatcher();
      this.startWatcher();
    }
  }

  isPathSafe(target: string): boolean {
    const resolved = path.resolve(this.root, target);
    try {
      const real = fs.realpathSync(resolved);
      return real.startsWith(this.root);
    } catch {
      return resolved.startsWith(this.root);
    }
  }

  async listDir(relPath: string): Promise<FsEntry[]> {
    const absPath = path.join(this.root, relPath);
    if (!this.isPathSafe(relPath)) throw new Error('Path outside workspace');
    const entries = await fsp.readdir(absPath, { withFileTypes: true });
    const result: FsEntry[] = [];
    for (const entry of entries) {
      if (shouldIgnore(path.join(relPath, entry.name))) continue;
      try {
        const stat = await fsp.stat(path.join(absPath, entry.name));
        result.push({
          name: entry.name,
          path: relPath ? `${relPath}/${entry.name}` : entry.name,
          type: entry.isDirectory() ? 'dir' : entry.isSymbolicLink() ? 'symlink' : 'file',
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        });
      } catch {
        continue;
      }
    }
    return result.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  async readFile(relPath: string): Promise<{ content: string; binary: boolean }> {
    const absPath = path.join(this.root, relPath);
    if (!this.isPathSafe(relPath)) throw new Error('Path outside workspace');
    const ext = path.extname(relPath).toLowerCase();
    const binaryExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf',
      '.zip', '.tar', '.gz', '.exe', '.dll', '.so', '.dylib', '.bin', '.wasm']);
    if (binaryExts.has(ext)) {
      return { content: `[binary file: ${relPath}]`, binary: true };
    }
    const content = await fsp.readFile(absPath, 'utf8');
    return { content, binary: false };
  }

  async writeFile(relPath: string, content: string): Promise<void> {
    const absPath = path.join(this.root, relPath);
    if (!this.isPathSafe(relPath)) throw new Error('Path outside workspace');
    await fsp.mkdir(path.dirname(absPath), { recursive: true });
    await fsp.writeFile(absPath, content, 'utf8');
    this.emit('change', { type: 'modify', path: relPath, timestamp: new Date().toISOString() });
  }

  async createFile(relPath: string): Promise<void> {
    const absPath = path.join(this.root, relPath);
    if (!this.isPathSafe(relPath)) throw new Error('Path outside workspace');
    if (fs.existsSync(absPath)) throw new Error('File already exists');
    await fsp.mkdir(path.dirname(absPath), { recursive: true });
    await fsp.writeFile(absPath, '', 'utf8');
    this.emit('change', { type: 'create', path: relPath, timestamp: new Date().toISOString() });
  }

  async createDir(relPath: string): Promise<void> {
    const absPath = path.join(this.root, relPath);
    if (!this.isPathSafe(relPath)) throw new Error('Path outside workspace');
    await fsp.mkdir(absPath, { recursive: true });
    this.emit('change', { type: 'create', path: relPath, timestamp: new Date().toISOString() });
  }

  async rename(oldRel: string, newRel: string): Promise<void> {
    const oldAbs = path.join(this.root, oldRel);
    const newAbs = path.join(this.root, newRel);
    if (!this.isPathSafe(oldRel) || !this.isPathSafe(newRel)) throw new Error('Path outside workspace');
    await fsp.mkdir(path.dirname(newAbs), { recursive: true });
    await fsp.rename(oldAbs, newAbs);
    this.emit('change', { type: 'delete', path: oldRel, timestamp: new Date().toISOString() });
    this.emit('change', { type: 'create', path: newRel, timestamp: new Date().toISOString() });
  }

  async delete(relPath: string): Promise<void> {
    const absPath = path.join(this.root, relPath);
    if (!this.isPathSafe(relPath)) throw new Error('Path outside workspace');
    const stat = await fsp.stat(absPath);
    if (stat.isDirectory()) {
      await fsp.rm(absPath, { recursive: true, force: true });
    } else {
      await fsp.unlink(absPath);
    }
    this.emit('change', { type: 'delete', path: relPath, timestamp: new Date().toISOString() });
  }

  async searchFiles(pattern: string): Promise<string[]> {
    const results: string[] = [];
    const searchDir = async (dir: string): Promise<void> => {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(this.root, fullPath);
        if (shouldIgnore(relPath)) continue;
        if (entry.name.toLowerCase().includes(pattern.toLowerCase())) {
          results.push(relPath);
        }
        if (entry.isDirectory()) {
          await searchDir(fullPath);
        }
      }
    };
    await searchDir(this.root);
    return results;
  }

  startWatcher(): void {
    if (this.watcherActive) return;
    this.watcherActive = true;

    this.watcher = chokidar.watch(this.root, {
      ignored: IGNORE_PATTERNS,
      persistent: true,
      ignoreInitial: true,
      depth: 99,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('add', (filePath: string) => {
        const rel = path.relative(this.root, filePath);
        if (!shouldIgnore(rel)) {
          this.emit('change', { type: 'create', path: rel, timestamp: new Date().toISOString() });
        }
      })
      .on('change', (filePath: string) => {
        const rel = path.relative(this.root, filePath);
        if (!shouldIgnore(rel)) {
          this.emit('change', { type: 'modify', path: rel, timestamp: new Date().toISOString() });
        }
      })
      .on('unlink', (filePath: string) => {
        const rel = path.relative(this.root, filePath);
        if (!shouldIgnore(rel)) {
          this.emit('change', { type: 'delete', path: rel, timestamp: new Date().toISOString() });
        }
      });
  }

  stopWatcher(): void {
    this.watcherActive = false;
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}
