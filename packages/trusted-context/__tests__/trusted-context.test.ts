import * as fs from 'fs'; import * as path from 'path';
import { TrustedContext } from '../src/trusted-context';
describe('TrustedContext', () => {
  it('should register and validate context files', () => {
    const dir = fs.mkdtempSync('ctx-test-');
    const f = path.join(dir, 'context.md'); fs.writeFileSync(f, '# Project Context');
    const tc = new TrustedContext(); tc.register('handoff', f);
    const report = tc.validate(100);
    expect(report.valid).toBe(1); expect(report.score).toBe(100);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it('should detect stale context', () => {
    const dir = fs.mkdtempSync('ctx-stale-');
    const f = path.join(dir, 'old.md'); fs.writeFileSync(f, 'old data');
    const tc = new TrustedContext(); tc.register('old', f);
    const report = tc.validate(0);
    expect(report.stale).toBe(1);
    expect(report.validations[0].age).toBeGreaterThanOrEqual(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it('should detect missing files', () => {
    const tc = new TrustedContext();
    tc.register('missing', '/nonexistent/file.md');
    const report = tc.validate();
    expect(report.invalid).toBe(1);
  });
  it('should update hashes on refresh', () => {
    const dir = fs.mkdtempSync('ctx-ref-');
    const f = path.join(dir, 'data.md'); fs.writeFileSync(f, 'v1');
    const tc = new TrustedContext(); tc.register('data', f);
    const h1 = tc['sources'][0].hash;
    fs.writeFileSync(f, 'v2'); tc.refresh();
    const h2 = tc['sources'][0].hash;
    expect(h1).not.toBe(h2);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
