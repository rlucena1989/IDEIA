import { ReleaseOrchestrator, type ReleaseConfig, type ReleaseResult } from '../release-orchestrator';
import { RollbackManager } from '../rollback-manager';
import { generateWorkflowYaml, type WorkflowConfig } from '../workflow-generator';

describe('ReleaseOrchestrator', () => {
  it('should execute with dry run and return success', async () => {
    const orchestrator = new ReleaseOrchestrator({ version: '1.0.0' });
    const result = await orchestrator.execute();
    expect(result.success).toBe(true);
    expect(result.version).toBe('1.0.0');
  });

  it('should fail when version is missing', async () => {
    const orchestrator = new ReleaseOrchestrator({});
    await expect(orchestrator.execute()).rejects.toThrow('ReleaseConfig.version is required');
  });

  it('should fail when platforms is empty', async () => {
    const orchestrator = new ReleaseOrchestrator({ version: '1.0.0', platforms: [] });
    await expect(orchestrator.execute()).rejects.toThrow('ReleaseConfig.platforms must have at least one platform');
  });

  it('should have default config with all required fields', () => {
    const orchestrator = new ReleaseOrchestrator({});
    const config = (orchestrator as unknown as { _config: ReleaseConfig })._config;
    expect(config.platforms).toEqual(['win-x64', 'mac-arm64', 'linux-x64']);
    expect(config.channel).toBe('alpha');
    expect(config.dryRun).toBe(true);
    expect(config.qualityGateTimeoutMs).toBe(300000);
    expect(config.signArtifacts).toBe(false);
    expect(config.notarizeMacOS).toBe(false);
  });

  it('should run phases in correct order', async () => {
    const orchestrator = new ReleaseOrchestrator({ version: '1.0.0', channel: 'beta' });
    const result: ReleaseResult = await orchestrator.execute();
    const phaseNames = result.phases.map(p => p.phase);
    expect(phaseNames).toEqual(['sanity-check', 'build', 'sign', 'package', 'publish', 'verify']);
  });

  it('should skip sign phase for alpha channel', async () => {
    const orchestrator = new ReleaseOrchestrator({ version: '1.0.0', channel: 'alpha' });
    const result: ReleaseResult = await orchestrator.execute();
    const phaseNames = result.phases.map(p => p.phase);
    expect(phaseNames).not.toContain('sign');
  });
});

describe('RollbackManager', () => {
  it('should create plan with 4 steps', () => {
    const manager = new RollbackManager();
    const plan = manager.createPlan('2.0.0', '1.0.0', 'Release failed quality gate');
    expect(plan.steps).toHaveLength(4);
    expect(plan.releaseVersion).toBe('2.0.0');
    expect(plan.targetVersion).toBe('1.0.0');
    expect(plan.reason).toBe('Release failed quality gate');
  });

  it('should execute plan and return result', async () => {
    const manager = new RollbackManager();
    const plan = manager.createPlan('2.0.0', '1.0.0', 'Test rollback');
    const result = await manager.executePlan(plan);
    expect(result.success).toBe(true);
    expect(result.completedSteps).toBe(4);
    expect(result.totalSteps).toBe(4);
    expect(result.error).toBeNull();
  });

  it('should return history of executed plans', async () => {
    const manager = new RollbackManager();
    const plan1 = manager.createPlan('2.0.0', '1.0.0', 'First rollback');
    const plan2 = manager.createPlan('3.0.0', '2.0.0', 'Second rollback');
    await manager.executePlan(plan1);
    await manager.executePlan(plan2);
    const history = manager.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0]!.plan.reason).toBe('First rollback');
    expect(history[1]!.plan.reason).toBe('Second rollback');
  });

  it('should return last rollback', async () => {
    const manager = new RollbackManager();
    expect(manager.getLastRollback()).toBeNull();
    const plan = manager.createPlan('2.0.0', '1.0.0', 'Test last');
    await manager.executePlan(plan);
    const last = manager.getLastRollback();
    expect(last).not.toBeNull();
    expect(last!.plan.reason).toBe('Test last');
  });

  it('should mark steps as executed after execution', async () => {
    const manager = new RollbackManager();
    const plan = manager.createPlan('2.0.0', '1.0.0', 'Verify step tracking');
    await manager.executePlan(plan);
    for (const step of plan.steps) {
      expect(step.executed).toBe(true);
      expect(step.success).toBe(true);
    }
  });
});

describe('generateWorkflowYaml', () => {
  const baseConfig: WorkflowConfig = {
    appName: 'test-app',
    buildCommand: 'npm run build',
    testCommand: 'npm test',
    packageCommand: 'npx electron-builder',
    nodeVersion: '20',
    platforms: [
      { os: 'ubuntu-latest', target: 'linux', arch: 'x64', formats: 'AppImage' },
      { os: 'macos-latest', target: 'mac', arch: 'arm64', formats: 'dmg' },
      { os: 'windows-latest', target: 'win', arch: 'x64', formats: 'nsis' },
    ],
    codeSign: false,
    notarize: false,
  };

  it('should produce valid YAML structure', () => {
    const yaml = generateWorkflowYaml(baseConfig);
    expect(yaml).toContain('name: Release test-app');
    expect(yaml).toContain('on:');
    expect(yaml).toContain('jobs:');
    expect(yaml).toContain('steps:');
  });

  it('should include all platform entries', () => {
    const yaml = generateWorkflowYaml(baseConfig);
    expect(yaml).toContain('ubuntu-latest');
    expect(yaml).toContain('macos-latest');
    expect(yaml).toContain('windows-latest');
    expect(yaml).toContain('target: linux');
    expect(yaml).toContain('target: mac');
    expect(yaml).toContain('target: win');
  });

  it('should include quality gate step', () => {
    const yaml = generateWorkflowYaml(baseConfig);
    expect(yaml).toContain('Quality Gate Verification');
    expect(yaml).toContain('npm run test:integration');
    expect(yaml).toContain('npm run test:contract');
  });

  it('should include code signing when enabled', () => {
    const configWithSign: WorkflowConfig = { ...baseConfig, codeSign: true };
    const yaml = generateWorkflowYaml(configWithSign);
    expect(yaml).toContain('Code Sign (Windows)');
    expect(yaml).toContain('AzureSignTool');
    expect(yaml).toContain('AZURE_KEY_VAULT_URI');
  });

  it('should include notarization when enabled', () => {
    const configWithNotarize: WorkflowConfig = { ...baseConfig, notarize: true };
    const yaml = generateWorkflowYaml(configWithNotarize);
    expect(yaml).toContain('Notarize (macOS)');
    expect(yaml).toContain('notarytool');
    expect(yaml).toContain('APPLE_ID');
  });

  it('should not include code signing when disabled', () => {
    const yaml = generateWorkflowYaml(baseConfig);
    expect(yaml).not.toContain('Code Sign (Windows)');
    expect(yaml).not.toContain('AzureSignTool');
  });

  it('should not include notarization when disabled', () => {
    const yaml = generateWorkflowYaml(baseConfig);
    expect(yaml).not.toContain('Notarize (macOS)');
    expect(yaml).not.toContain('notarytool');
  });

  it('should include release step with softprops action', () => {
    const yaml = generateWorkflowYaml(baseConfig);
    expect(yaml).toContain('softprops/action-gh-release@v2');
    expect(yaml).toContain('generate_release_notes: true');
    expect(yaml).toContain('fail_on_unmatched_files: true');
  });

  it('should include all standard CI steps', () => {
    const yaml = generateWorkflowYaml(baseConfig);
    expect(yaml).toContain('actions/checkout@v4');
    expect(yaml).toContain('actions/setup-node@v4');
    expect(yaml).toContain('npm run lint');
    expect(yaml).toContain('npx tsc --noEmit');
    expect(yaml).toContain('NODE_ENV: production');
    expect(yaml).toContain('actions/upload-artifact@v4');
  });
});
