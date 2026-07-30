import { createSafetyDeps, runSafetyStatus } from '../safety';

describe('createSafetyDeps', () => {
  let deps: ReturnType<typeof createSafetyDeps>;

  beforeEach(() => {
    deps = createSafetyDeps();
  });

  it('starts at N2 autonomy level', () => {
    expect(deps.getLevel()).toBe('N2');
  });

  it('setLevel changes autonomy level', () => {
    deps.setLevel('N4');
    expect(deps.getLevel()).toBe('N4');
  });

  it('pause adds to log', async () => {
    await deps.pause('testing pause');
    const log = deps.getLog();
    expect(log).toHaveLength(1);
    expect(log[0].action).toBe('pause');
    expect(log[0].details).toBe('testing pause');
  });

  it('resume adds to log', async () => {
    await deps.resume();
    const log = deps.getLog();
    expect(log).toHaveLength(1);
    expect(log[0].action).toBe('resume');
  });

  it('getStatus returns status object', () => {
    const status = deps.getStatus();
    expect(status).toBeDefined();
    expect(typeof status.mode).toBe('string');
    expect(Array.isArray(status.activeTriggers)).toBe(true);
  });

  it('getStatus is idempotent', () => {
    const s1 = deps.getStatus();
    const s2 = deps.getStatus();
    expect(s1).toEqual(s2);
  });
});

describe('runSafetyStatus', () => {
  it('returns a CliCommandResult', () => {
    const deps = createSafetyDeps();
    const result = runSafetyStatus(deps, { json: true });
    expect(result.ok).toBe(true);
  });
});
