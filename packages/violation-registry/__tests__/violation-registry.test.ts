import { ViolationRegistry } from '../src/violation-registry';
describe('ViolationRegistry', () => {
  it('should record violations', () => {
    const vr = new ViolationRegistry();
    vr.record('agent-runtime', 'contract', 'critical', 'Payload validation failed');
    expect(vr.list().length).toBe(1);
  });
  it('should filter by module', () => {
    const vr = new ViolationRegistry();
    vr.record('mod-a', 'type1', 'warning', 'msg1'); vr.record('mod-b', 'type2', 'error', 'msg2');
    expect(vr.list('mod-a')).toHaveLength(1);
  });
  it('should track active violations', () => {
    const vr = new ViolationRegistry();
    vr.record('mod', 'type', 'critical', 'bad');
    expect(vr.hasActiveViolations()).toBe(true);
    vr.resolve(vr.list()[0].id);
    expect(vr.hasActiveViolations()).toBe(false);
  });
  it('should generate stats', () => {
    const vr = new ViolationRegistry();
    vr.record('mod-a', 'type1', 'error', 'err1'); vr.record('mod-a', 'type2', 'warning', 'warn1');
    const stats = vr.getStats();
    expect(stats.total).toBe(2); expect(stats.byModule['mod-a']).toBe(2);
  });
});
