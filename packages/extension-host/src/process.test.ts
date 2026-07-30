import { DefaultExtensionHostProcess } from './process';

describe('DefaultExtensionHostProcess', () => {
  let process: DefaultExtensionHostProcess;

  beforeEach(() => {
    process = new DefaultExtensionHostProcess();
  });

  it('should start and become alive', async () => {
    const startSpy = jest.fn();
    process.onStarted(startSpy);

    await process.start();
    expect(process.alive).toBe(true);
    expect(startSpy).toHaveBeenCalled();
  });

  it('should stop and become not alive', async () => {
    await process.start();
    const stopSpy = jest.fn();
    process.onStopped(stopSpy);

    await process.stop();
    expect(process.alive).toBe(false);
    expect(stopSpy).toHaveBeenCalled();
  });

  it('should restart by stopping then starting', async () => {
    await process.start();
    const startedSpy = jest.fn();
    const stoppedSpy = jest.fn();
    process.onStarted(startedSpy);
    process.onStopped(stoppedSpy);

    await process.restart();
    expect(stoppedSpy).toHaveBeenCalled();
    expect(startedSpy).toHaveBeenCalled();
    expect(process.alive).toBe(true);
  });

  it('should return true from healthCheck when alive', async () => {
    await process.start();
    await expect(process.healthCheck()).resolves.toBe(true);
  });

  it('should return false from healthCheck when not alive', async () => {
    await expect(process.healthCheck()).resolves.toBe(false);
  });
});
