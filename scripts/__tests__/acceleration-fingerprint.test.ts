import { createProjectFingerprint, createTextFingerprint } from '../acceleration/fingerprint';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('acceleration - fingerprint', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fp-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('createTextFingerprint deve gerar hash SHA-256 hex', () => {
    const hash = createTextFingerprint('hello world');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    const expected = crypto.createHash('sha256').update('hello world').digest('hex');
    expect(hash).toBe(expected);
  });

  it('createTextFingerprint deve ser deterministico', () => {
    const a = createTextFingerprint('same text');
    const b = createTextFingerprint('same text');
    expect(a).toBe(b);
  });

  it('createTextFingerprint deve diferir para textos diferentes', () => {
    const a = createTextFingerprint('text a');
    const b = createTextFingerprint('text b');
    expect(a).not.toBe(b);
  });

  it('createProjectFingerprint deve retornar hash e contagem de arquivos', () => {
    // Create test files
    fs.writeFileSync(path.join(tmpDir, 'a.ts'), 'content a');
    fs.writeFileSync(path.join(tmpDir, 'b.ts'), 'content b');
    fs.mkdirSync(path.join(tmpDir, 'sub'));
    fs.writeFileSync(path.join(tmpDir, 'sub', 'c.ts'), 'content c');

    const fp = createProjectFingerprint(tmpDir);
    expect(fp.hash).toHaveLength(64);
    expect(fp.files).toBe(3);
  });

  it('createProjectFingerprint deve ignorar node_modules', () => {
    fs.writeFileSync(path.join(tmpDir, 'main.ts'), 'main');
    fs.mkdirSync(path.join(tmpDir, 'node_modules'));
    fs.writeFileSync(path.join(tmpDir, 'node_modules', 'dep.ts'), 'dep');

    const fp = createProjectFingerprint(tmpDir);
    expect(fp.files).toBe(1); // only main.ts
  });

  it('createProjectFingerprint deve ignorar dist, coverage, .git, .ai-devkit', () => {
    for (const dir of ['dist', 'coverage', '.git', '.ai-devkit']) {
      fs.mkdirSync(path.join(tmpDir, dir));
      fs.writeFileSync(path.join(tmpDir, dir, 'file.ts'), 'content');
    }
    fs.writeFileSync(path.join(tmpDir, 'real.ts'), 'real');

    const fp = createProjectFingerprint(tmpDir);
    expect(fp.files).toBe(1); // only real.ts
  });

  it('createProjectFingerprint deve ser deterministico', () => {
    fs.writeFileSync(path.join(tmpDir, 'a.ts'), 'const x = 1;');
    fs.writeFileSync(path.join(tmpDir, 'b.ts'), 'const y = 2;');

    const fp1 = createProjectFingerprint(tmpDir);
    const fp2 = createProjectFingerprint(tmpDir);
    expect(fp1.hash).toBe(fp2.hash);
    expect(fp1.files).toBe(fp2.files);
  });

  it('createProjectFingerprint muda se arquivo eh alterado', () => {
    fs.writeFileSync(path.join(tmpDir, 'file.ts'), 'original');

    const fp1 = createProjectFingerprint(tmpDir);
    fs.writeFileSync(path.join(tmpDir, 'file.ts'), 'modified');
    const fp2 = createProjectFingerprint(tmpDir);

    expect(fp1.hash).not.toBe(fp2.hash);
  });
});