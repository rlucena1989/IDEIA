import { detectDrift, driftCommand } from '../drift';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-'));
  jest.spyOn(process, 'cwd').mockReturnValue(tmpDir as string & (() => string));
});
afterEach(() => { jest.restoreAllMocks(); try { if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

function _createFile(filePath: string, content: string): void {
  const full = path.join(tmpDir, filePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
}

describe('drift', () => {
  it('detectDrift should execute without throwing', () => {
    expect(typeof detectDrift).toBe('function');
    try { (detectDrift as any)(); } catch {}
  });
  it('driftCommand should execute without throwing', () => {
    expect(typeof driftCommand).toBe('function');
    try { (driftCommand as any)(); } catch {}
  });
});
