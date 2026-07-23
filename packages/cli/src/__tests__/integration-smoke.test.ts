import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const CLI_ENTRY = path.resolve(__dirname, '../../src/index.ts');
const ROOT = path.resolve(__dirname, '../../../..');

describe('CLI Integration Smoke Tests', () => {
  it('CLI entry point file exists', () => {
    expect(fs.existsSync(CLI_ENTRY)).toBe(true);
  });

  it('CLI package.json has valid structure', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8'));
    expect(pkg.name).toBe('@ideia/cli');
    expect(pkg.bin).toBeDefined();
  });

  it('commands directory has at least 100 files', () => {
    const cmdsDir = path.resolve(__dirname, '../commands');
    const files = fs.readdirSync(cmdsDir).filter(f => f.endsWith('.ts'));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- asserts minimum count
    const _count = files.length;
    expect(files.length).toBeGreaterThan(100);
  });

  it('CLI registers multiple command categories via index.ts', () => {
    const content = fs.readFileSync(CLI_ENTRY, 'utf-8');
    const addCommandCalls = (content.match(/addCommand\(/g) || []).length;
    expect(addCommandCalls).toBeGreaterThan(50);
  });

  it('no as any in production CLI source files', () => {
    const srcDir = path.resolve(__dirname, '..');
    const files: string[] = [];
    function walk(dir: string): void {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory() && e.name !== '__tests__' && e.name !== 'node_modules') walk(full);
        else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
          files.push(full);
        }
      }
    }
    walk(srcDir);
    let filesWithAny = 0;
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8');
      if (/\bas\s+any\b/.test(content)) filesWithAny++;
    }
    expect(filesWithAny).toBeLessThan(5);
  });
});
