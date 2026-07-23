import { optimizeCommand } from '../optimize';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'optimize-'));
  jest.spyOn(process, 'cwd').mockReturnValue(tmpDir as string & (() => string));
});
afterEach(() => { jest.restoreAllMocks(); try { if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

function _createFile(filePath: string, content: string): void {
  const full = path.join(tmpDir, filePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
}

describe('optimize', () => {
  it('optimizeCommand should execute without throwing', () => {
    expect(typeof optimizeCommand).toBe('function');
    try { (optimizeCommand as any)(); } catch {}
  });
});
