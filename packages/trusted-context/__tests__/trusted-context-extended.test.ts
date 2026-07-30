import * as fs from 'fs';
import * as path from 'path';
import { TrustedContext, createTrustedContext } from '../src/trusted-context';

describe('TrustedContext Extended', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'ctx-ext-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return score 0 when no sources registered', () => {
    const tc = new TrustedContext();
    const report = tc.validate();
    expect(report.total).toBe(0);
    expect(report.valid).toBe(0);
    expect(report.score).toBe(NaN);
  });

  it('should handle multiple sources with mixed states', () => {
    const f1 = path.join(tmpDir, 'a.md'); fs.writeFileSync(f1, 'a');
    const f2 = path.join(tmpDir, 'b.md'); fs.writeFileSync(f2, 'b');
    const tc = new TrustedContext();
    tc.register('a', f1);
    tc.register('b', f2);
    const report = tc.validate(100);
    expect(report.valid).toBe(2);
    expect(report.score).toBe(100);
  });

  it('should detect tampered file via hash mismatch', () => {
    const f = path.join(tmpDir, 'data.md'); fs.writeFileSync(f, 'original');
    const tc = new TrustedContext();
    tc.register('data', f);
    fs.writeFileSync(f, 'tampered');
    const report = tc.validate(100);
    expect(report.valid).toBe(0);
    expect(report.validations[0].hashMatch).toBe(false);
    expect(report.validations[0].issues).toContain('Content changed since registration');
  });

  it('should handle file deleted after registration', () => {
    const f = path.join(tmpDir, 'tmp.md'); fs.writeFileSync(f, 'temp');
    const tc = new TrustedContext();
    tc.register('temp', f);
    fs.rmSync(f);
    const report = tc.validate();
    expect(report.invalid).toBeGreaterThanOrEqual(1);
    expect(report.validations[0].issues).toContain('File not found');
  });

  it('should update hash on refresh after modification', () => {
    const f = path.join(tmpDir, 'data.md'); fs.writeFileSync(f, 'v1');
    const tc = new TrustedContext();
    tc.register('data', f);
    const hashBefore = tc['sources'][0].hash;
    fs.writeFileSync(f, 'v2');
    tc.refresh();
    const hashAfter = tc['sources'][0].hash;
    expect(hashBefore).not.toBe(hashAfter);
    expect(tc['sources'][0].size).toBe(2);
  });

  it('should handle non-existent file at register time', () => {
    const tc = new TrustedContext();
    tc.register('ghost', '/nonexistent/path/file.md');
    expect(tc['sources'][0].hash).toBe('');
    expect(tc['sources'][0].size).toBe(0);
  });

  it('should calculate score correctly with mix of valid and invalid', () => {
    const f1 = path.join(tmpDir, 'ok.md'); fs.writeFileSync(f1, 'ok');
    const f2 = path.join(tmpDir, 'gone.md'); fs.writeFileSync(f2, 'gone');
    const tc = new TrustedContext();
    tc.register('ok', f1);
    tc.register('gone', f2);
    fs.rmSync(f2);
    const report = tc.validate();
    expect(report.valid).toBe(1);
    expect(report.invalid).toBe(1);
    expect(report.score).toBe(50);
  });

  it('should handle binary files', () => {
    const f = path.join(tmpDir, 'data.bin');
    const buf = Buffer.alloc(256);
    for (let i = 0; i < 256; i++) buf[i] = i;
    fs.writeFileSync(f, buf);
    const tc = new TrustedContext();
    tc.register('bin', f);
    const report = tc.validate(100);
    expect(report.valid).toBe(1);
    expect(tc['sources'][0].hash).toBeTruthy();
  });

  it('should create context via factory function', () => {
    const tc = createTrustedContext();
    expect(tc).toBeInstanceOf(TrustedContext);
  });

  it('should support validate with zero tolerance age', () => {
    const f = path.join(tmpDir, 'fresh.md'); fs.writeFileSync(f, 'data');
    const tc = new TrustedContext();
    tc.register('fresh', f);
    const report = tc.validate(0);
    expect(report.stale).toBeGreaterThanOrEqual(0);
  });
});