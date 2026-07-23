import { EnvironmentSnapshot } from '../src/environment-snapshot';
import { ReproducibleEnvironment } from '../src/reproducible-env';

describe('EnvironmentSnapshot', () => {
  let snapshot: EnvironmentSnapshot;

  beforeEach(() => {
    snapshot = new EnvironmentSnapshot();
  });

  it('createSnapshot saves state', () => {
    const snap = snapshot.createSnapshot('test-snap');
    expect(snap).toBeDefined();
    expect(snap.metadata.name).toBe('test-snap');
    expect(snap.metadata.id).toMatch(/^snap-\d+/);
    expect(snap.metadata.nodeVersion).toBe(process.version);
  });

  it('listSnapshots returns saved snapshots', () => {
    snapshot.createSnapshot('first');
    snapshot.createSnapshot('second');
    const list = snapshot.listSnapshots();
    expect(list.length).toBeGreaterThanOrEqual(2);
    const names = list.map(m => m.name);
    expect(names).toContain('first');
    expect(names).toContain('second');
  });

  it('diffSnapshots returns changes between two snapshots', () => {
    const snapA = snapshot.createSnapshot('before');
    const snapB = snapshot.createSnapshot('after');
    const diff = snapshot.diffSnapshots(snapA.metadata.id, snapB.metadata.id);
    expect(Array.isArray(diff)).toBe(true);
    expect(diff.length).toBeGreaterThan(0);
    expect(diff[0]).toHaveProperty('file');
    expect(diff[0]).toHaveProperty('status');
  });

  it('diffSnapshots returns empty for unknown snapshots', () => {
    const diff = snapshot.diffSnapshots('invalid-a', 'invalid-b');
    expect(diff).toEqual([]);
  });

  it('verifySnapshot returns valid/invalid for nonexistent id', () => {
    const valid = snapshot.verifySnapshot('nonexistent');
    expect(valid).toBe(false);
  });

  it('verifySnapshot succeeds on a just-created snapshot', () => {
    const snap = snapshot.createSnapshot('verify-me');
    const valid = snapshot.verifySnapshot(snap.metadata.id);
    expect(valid).toBe(true);
  });

  it('restoreSnapshot returns false for unknown snapshot', () => {
    const restored = snapshot.restoreSnapshot('nonexistent');
    expect(restored).toBe(false);
  });

  it('restoreSnapshot returns true for valid snapshot', () => {
    const snap = snapshot.createSnapshot('good');
    const restored = snapshot.restoreSnapshot(snap.metadata.id);
    expect(restored).toBe(true);
  });
});

describe('ReproducibleEnvironment', () => {
  let envSnap: EnvironmentSnapshot;
  let repoEnv: ReproducibleEnvironment;

  beforeEach(() => {
    envSnap = new EnvironmentSnapshot();
    repoEnv = new ReproducibleEnvironment(envSnap);
  });

  it('setup returns false for unknown snapshot', () => {
    const result = repoEnv.setup('nonexistent');
    expect(result).toBe(false);
  });

  it('setup/teardown lifecycle works', () => {
    const snap = envSnap.createSnapshot('lifecycle-test');
    const setupResult = repoEnv.setup(snap.metadata.id);
    expect(setupResult).toBe(true);

    repoEnv.teardown();
    const report = repoEnv.getEnvReport();
    expect(report.envSnapshot).toBe('none');
  });

  it('teardown is safe when no active snapshot', () => {
    expect(() => repoEnv.teardown()).not.toThrow();
  });

  it('getEnvReport returns environment info', () => {
    const report = repoEnv.getEnvReport();
    expect(report).toHaveProperty('nodeVersion');
    expect(report).toHaveProperty('npmVersion');
    expect(report).toHaveProperty('packagesCount');
    expect(report).toHaveProperty('gitCommit');
    expect(report).toHaveProperty('envSnapshot');
    expect(report).toHaveProperty('verified');
    expect(report).toHaveProperty('issues');
    expect(typeof report.nodeVersion).toBe('string');
  });

  it('verifyEnv returns boolean', () => {
    const snap = envSnap.createSnapshot('verify');
    const result = repoEnv.verifyEnv(snap.metadata.id);
    expect(typeof result).toBe('boolean');
  });
});
