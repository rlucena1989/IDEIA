import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { boilerplateRemove } from '../boilerplate-detector';

describe('boilerplate-detector', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'boilerplate-test-'));
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'test'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects boilerplate files with Hello World', () => {
    fs.writeFileSync(path.join(tmpDir, 'src', 'app.controller.ts'), 'export function getHello() { return "Hello World"; }', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'src', 'app.service.ts'), 'export class AppService { getHello() {} }', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'src', 'app.module.ts'), 'export class AppModule {}', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'test', 'app.e2e-spec.ts'), 'describe("App", () => { it("should say hello", () => { expect(getHello()).toBeTruthy(); }); });', 'utf-8');

    boilerplateRemove({ dryRun: false, force: false, cwd: tmpDir });

    const reportPath = path.join(tmpDir, '.ai', 'reports', 'boilerplate-detection.md');
    expect(fs.existsSync(reportPath)).toBe(true);
    const report = fs.readFileSync(reportPath, 'utf-8');
    expect(report).toContain('app.controller.ts');
    expect(report).toContain('app.service.ts');
  });

  it('reports no detection when files are clean', () => {
    fs.writeFileSync(path.join(tmpDir, 'src', 'app.controller.ts'), 'export class AppController {}', 'utf-8');

    boilerplateRemove({ dryRun: false, force: false, cwd: tmpDir });

    const reportPath = path.join(tmpDir, '.ai', 'reports', 'boilerplate-detection.md');
    expect(fs.existsSync(reportPath)).toBe(false);
  });

  it('skips report generation on dryRun', () => {
    fs.writeFileSync(path.join(tmpDir, 'src', 'app.controller.ts'), 'export class AppController { getHello() {} }', 'utf-8');

    boilerplateRemove({ dryRun: true, force: false, cwd: tmpDir });

    const reportPath = path.join(tmpDir, '.ai', 'reports', 'boilerplate-detection.md');
    expect(fs.existsSync(reportPath)).toBe(false);
  });
});
