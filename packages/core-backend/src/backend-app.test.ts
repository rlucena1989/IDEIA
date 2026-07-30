import { DefaultBackendApplication, DEFAULT_CONFIG } from './backend-app';
import { BackendApplicationContribution } from './types';

describe('DefaultBackendApplication', () => {
  it('should start and stop without contributions', async () => {
    const app = new DefaultBackendApplication(DEFAULT_CONFIG);
    await expect(app.start()).resolves.not.toThrow();
    expect(app.isRunning()).toBe(true);
    await expect(app.stop()).resolves.not.toThrow();
    expect(app.isRunning()).toBe(false);
  });

  it('should register and start contributions', async () => {
    const app = new DefaultBackendApplication(DEFAULT_CONFIG);
    const contribution: BackendApplicationContribution = {
      onStart: jest.fn().mockResolvedValue(undefined),
      onStop: jest.fn().mockResolvedValue(undefined),
    };
    app.registerContribution(contribution);
    await app.start();
    expect(contribution.onStart).toHaveBeenCalledWith(app);
    await app.stop();
    expect(contribution.onStop).toHaveBeenCalledWith(app);
  });

  it('should handle contribution start failure gracefully', async () => {
    const app = new DefaultBackendApplication(DEFAULT_CONFIG);
    const contribution: BackendApplicationContribution = {
      onStart: jest.fn().mockRejectedValue(new Error('start failed')),
      onStop: jest.fn().mockResolvedValue(undefined),
    };
    app.registerContribution(contribution);
    await expect(app.start()).resolves.not.toThrow();
    expect(app.isRunning()).toBe(true);
  });

  it('should use default config when none provided', () => {
    expect(DEFAULT_CONFIG).toBeDefined();
    expect(DEFAULT_CONFIG.port).toBe(3000);
    expect(DEFAULT_CONFIG.host).toBe('127.0.0.1');
  });

  it('should unregister contribution via disposable', () => {
    const app = new DefaultBackendApplication(DEFAULT_CONFIG);
    const contribution: BackendApplicationContribution = {};
    const disposable = app.registerContribution(contribution);
    disposable.dispose();
  });
});
