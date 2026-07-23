import * as fs from 'fs'; import * as path from 'path';
import { PrototypingEngine } from '../src/prototyping-engine';
describe('PrototypingEngine', () => {
  it('should generate API blueprint', () => {
    const pe = new PrototypingEngine();
    const result = pe.generate({ name: 'test-api', type: 'api', language: 'ts', framework: 'express', features: [] });
    expect(result.files).toBeGreaterThan(0);
    expect(fs.existsSync(path.join('test-api', 'src/index.ts'))).toBe(true);
    fs.rmSync('test-api', { recursive: true, force: true });
  });
  it('should generate web blueprint with template vars', () => {
    const pe = new PrototypingEngine();
    const _result = pe.generate({ name: 'my-app', type: 'web', language: 'ts', framework: 'react', features: [] });
    const pkg = fs.readFileSync(path.join('my-app', 'package.json'), 'utf-8');
    expect(pkg).toContain('my-app');
    fs.rmSync('my-app', { recursive: true, force: true });
  });
  it('should support custom blueprints', () => {
    const pe = new PrototypingEngine();
    pe.registerBlueprint('custom', [{ path: 'custom.txt', content: 'custom content', template: false }]);
    expect(pe.listBlueprints()).toContain('custom');
  });
  it('should list available blueprints', () => {
    const pe = new PrototypingEngine();
    expect(pe.listBlueprints()).toContain('api');
    expect(pe.listBlueprints()).toContain('web');
    expect(pe.listBlueprints()).toContain('cli');
  });
});
