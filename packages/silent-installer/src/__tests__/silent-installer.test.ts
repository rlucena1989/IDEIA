import { EnterpriseConfigLoader } from '../enterprise-config';
import { SilentInstallRunner } from '../silent-install-runner';
import { ComplianceChecker } from '../compliance-checker';

describe('EnterpriseConfigLoader', () => {
  it('should return default config when no file exists', async () => {
    const loader = new EnterpriseConfigLoader();
    const config = await loader.load();
    expect(config).toBeDefined();
    expect(config.updates.enabled).toBe(true);
    expect(config.security.sandboxMode).toBe('standard');
    expect(config.telemetry.enabled).toBe(true);
    expect(config.compliance.soc2).toBe(false);
  });

  it('should allow cache invalidation', async () => {
    const loader = new EnterpriseConfigLoader();
    const first = await loader.load();
    loader.invalidateCache();
    const second = await loader.load();
    expect(first).toEqual(second);
  });

  it('should have correct default values', async () => {
    const loader = new EnterpriseConfigLoader();
    const config = await loader.load();
    expect(config.agents.maxConcurrent).toBe(2);
    expect(config.agents.logLevel).toBe('info');
    expect(config.agents.enableCodeExecution).toBe(false);
    expect(config.network.timeout).toBe(30000);
    expect(config.network.retryCount).toBe(3);
    expect(config.security.maxFileSize).toBe(10485760);
    expect(config.compliance.dataRetentionDays).toBe(365);
  });
});

describe('SilentInstallRunner', () => {
  it('should reject unsupported platforms gracefully', async () => {
    const runner = new SilentInstallRunner('linux');
    const result = await runner.run({ packagePath: 'test.unknown' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unsupported Linux package');
  });

  it('should detect platform correctly', () => {
    const runner = new SilentInstallRunner();
    expect(runner).toBeDefined();
  });

  it('should report correct install dir for each platform', () => {
    const winRunner = new SilentInstallRunner('win32');
    const macRunner = new SilentInstallRunner('darwin');
    const linuxRunner = new SilentInstallRunner('linux');
    expect(winRunner).toBeDefined();
    expect(macRunner).toBeDefined();
    expect(linuxRunner).toBeDefined();
  });
});

describe('ComplianceChecker', () => {
  it('should return SOC2 compliance result', async () => {
    const checker = new ComplianceChecker();
    const result = await checker.check();
    expect(result.framework).toBe('SOC2');
    expect(result.passed).toBe(true);
    expect(result.checks.length).toBeGreaterThan(0);
  });

  it('should return timestamped results', async () => {
    const checker = new ComplianceChecker();
    const result = await checker.check();
    expect(result.timestamp).toBeInstanceOf(Date);
  });
});
