import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import _path from 'node:path';
import type { Shell, ShellResult, FileSystem, HttpClient } from './interfaces';

/** Classe responsável por processa shell. */
export class RealShell implements Shell {
  exec(command: string, args: string[], cwd?: string, timeout?: number): ShellResult {
    const isWin = process.platform === 'win32';
    try {
      const result = spawnSync(command, args, {
        cwd: cwd || process.cwd(),
        encoding: 'utf8',
        timeout: timeout || 60000,
        shell: isWin,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return {
        status: result.status ?? 1,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
      };
    } catch (err: unknown) {
      return { status: 1, stdout: '', stderr: err instanceof Error ? err.message : String(err) };
    }
  }

  execString(command: string, cwd?: string): { stdout: string; status: number } {
    try {
      const result = spawnSync(command, [], {
        cwd: cwd || process.cwd(),
        encoding: 'utf8',
        shell: true,
        timeout: 60000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { stdout: result.stdout || '', status: result.status ?? 1 };
    } catch (err: unknown) {
      return { stdout: '', status: 1 };
    }
  }
}

/** Classe responsável por processa file system. */
export class RealFileSystem implements FileSystem {
  exists(filePath: string): boolean { return fs.existsSync(filePath); }
  read(filePath: string, encoding: string = 'utf8'): string { return fs.readFileSync(filePath, encoding as BufferEncoding); }
  readBuffer(filePath: string): Buffer { return fs.readFileSync(filePath); }
  write(filePath: string, content: string): void { fs.writeFileSync(filePath, content, 'utf8'); }
  append(filePath: string, content: string): void { fs.appendFileSync(filePath, content, 'utf8'); }
  mkDir(dirPath: string, recursive?: boolean): void { fs.mkdirSync(dirPath, { recursive: recursive ?? true }); }
  readDir(dirPath: string): string[] { return fs.readdirSync(dirPath); }
  readDirEntries(dirPath: string): { name: string; isDirectory: () => boolean; isFile: () => boolean }[] {
    return fs.readdirSync(dirPath, { withFileTypes: true }).map(e => ({
      name: e.name,
      isDirectory: () => e.isDirectory(),
      isFile: () => e.isFile(),
    }));
  }
  stat(filePath: string): { mtimeMs: number; size: number; isDirectory: () => boolean } {
    const s = fs.statSync(filePath);
    return { mtimeMs: s.mtimeMs, size: s.size, isDirectory: () => s.isDirectory() };
  }
  remove(filePath: string, opts?: { recursive?: boolean; force?: boolean }): void { fs.rmSync(filePath, opts); }
  copy(src: string, dest: string): void { fs.copyFileSync(src, dest); }
  ensureDir(dirPath: string): void { fs.mkdirSync(dirPath, { recursive: true }); }
  cwd(): string { return process.cwd(); }
}

/** Classe responsável por processa http client. */
export class RealHttpClient implements HttpClient {
  async post(url: string, body: unknown, headers?: Record<string, string>, timeout?: number): Promise<{ status: number; data: string }> {
    const http = url.startsWith('https') ? await import('https') : await import('http');
    return new Promise((resolve) => {
      const req = http.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        timeout: timeout || 30000,
      }, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => data += chunk.toString());
        res.on('end', () => resolve({ status: res.statusCode || 500, data }));
      });
      req.on('error', () => resolve({ status: 0, data: '' }));
      req.write(JSON.stringify(body));
      req.end();
    });
  }

  async get(url: string, timeout?: number): Promise<{ status: number; data: string }> {
    const http = url.startsWith('https') ? await import('https') : await import('http');
    return new Promise((resolve) => {
      const req = http.request(url, { method: 'GET', timeout: timeout || 30000 }, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => data += chunk.toString());
        res.on('end', () => resolve({ status: res.statusCode || 500, data }));
      });
      req.on('error', () => resolve({ status: 0, data: '' }));
      req.end();
    });
  }
}
