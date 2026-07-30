import fs from 'fs';
import path from 'path';
import os from 'os';
import { PipelineDeployer } from '../src/deploy-executor';

describe('PipelineDeployer (DeployExecutor)', () => {
  let tmpDir: string;
  let executor: PipelineDeployer;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-exec-'));
    executor = new PipelineDeployer({ cwd: tmpDir, deployDir: path.join(tmpDir, '.deploy') });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should fail pipeline when build step fails', async () => {
    const result = await executor.execute('1.0.0', 'development', []);
    expect(result.success).toBe(false);
  });

  it('should handle rollback from backup', () => {
    const depDir = path.join(tmpDir, '.deploy');
    const backupDir = path.join(depDir, 'backups', '1_0_0');
    fs.mkdirSync(path.join(backupDir, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(backupDir, 'dist', 'bundle.js'), 'v1-backup');

    const success = executor.rollback('1.0.0');
    expect(success).toBe(true);

    const markerPath = path.join(tmpDir, '.deploy', 'active-version.txt');
    expect(fs.existsSync(markerPath)).toBe(true);
    expect(fs.readFileSync(markerPath, 'utf-8').trim()).toBe('1.0.0');
  });

  it('should handle rollback when no backup exists', () => {
    const success = executor.rollback('9.9.9');
    expect(success).toBe(false);
  });

  it('should execute steps in order and stop at first failure', async () => {
    const result = await executor.execute('1.0.0', 'development', []);
    expect(result.steps.length).toBeGreaterThanOrEqual(1);
    expect(result.steps[0]!.name).toBe('build');
    expect(result.steps[0]!.success).toBe(false);
  });

  it('should have correct pipeline step names', async () => {
    const result = await executor.execute('1.0.0', 'development', []);
    const names = result.steps.map(s => s.name);
    expect(names[0]).toBe('build');
  });

  it('should report environment and version on failure', async () => {
    const result = await executor.execute('3.0.0', 'production', []);
    expect(result.version).toBe('3.0.0');
    expect(result.environment).toBe('production');
    expect(result.startedAt).toBeTruthy();
    expect(result.completedAt).toBeTruthy();
  });
});
