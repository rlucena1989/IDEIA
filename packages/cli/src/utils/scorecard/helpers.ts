import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';

export const root = (): string => process.cwd();
export const ex = (f: string): boolean => fs.existsSync(path.join(root(), f));
export const read = (f: string): string | null => {
  try { return fs.readFileSync(path.join(root(), f), 'utf8'); } catch { return null; }
};
export const hasContent = (f: string): boolean => {
  const c = read(f); return c !== null && c.trim().length > 100;
};
export const dirSize = (d: string): number => {
  try { return fs.readdirSync(path.join(root(), d)).length; } catch { return 0; }
};
export const jsonParse = (f: string): Record<string, unknown> | null => {
  try { return JSON.parse(read(f) || 'null'); } catch { return null; }
};
export const runNode = (script: string, args: string[] = []): boolean => {
  try {
    if (args.length === 0) {
      const exampleRequest = path.join(root(), '.ai/optimizer/examples/request.example.json');
      if (fs.existsSync(exampleRequest)) args = [exampleRequest];
    }
    return spawnSync('node', [path.join(root(), script), ...args], { cwd: root(), stdio: 'pipe', encoding: 'utf-8', timeout: 15000 }).status === 0;
  } catch { return false; }
};
export const git = (args: string[]): string | null => {
  try { return execFileSync('git', args, { cwd: root(), encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }).trim(); } catch { return null; }
};
export const gitExists = (): boolean => { try { return execFileSync('git', ['rev-parse', '--git-dir'], { cwd: root(), encoding: 'utf-8', timeout: 3000 }).toString().trim().length > 0; } catch { return false; } };
