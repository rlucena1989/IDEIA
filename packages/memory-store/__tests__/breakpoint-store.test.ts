import { describe, it, expect} from '@jest/globals';
import { BreakpointStore, createBreakpointStore } from '../src/breakpoint-store';

describe('BreakpointStore', () => {
  it('should create via factory', () => {
    const store = createBreakpointStore();
    expect(store).toBeInstanceOf(BreakpointStore);
  });

  it('should add and retrieve breakpoints', () => {
    const store = new BreakpointStore();
    const bp = store.addBreakpoint({ filePath: 'src/main.ts', line: 42, enabled: true });
    expect(bp.id).toBeDefined();
    expect(bp.filePath).toBe('src/main.ts');
    expect(bp.line).toBe(42);
    expect(bp.createdAt).toBeDefined();
    expect(bp.updatedAt).toBeDefined();
    expect(store.breakpointCount).toBe(1);
  });

  it('should update breakpoints', () => {
    const store = new BreakpointStore();
    const bp = store.addBreakpoint({ filePath: 'src/main.ts', line: 42, enabled: true });
    const updated = store.updateBreakpoint(bp.id, { line: 43, condition: 'x > 5' });
    expect(updated).not.toBeNull();
    expect(updated!.line).toBe(43);
    expect(updated!.condition).toBe('x > 5');
    expect(updated!.enabled).toBe(true);
  });

  it('should return null when updating unknown breakpoint', () => {
    const store = new BreakpointStore();
    expect(store.updateBreakpoint('nonexistent', { line: 1 })).toBeNull();
  });

  it('should remove breakpoints', () => {
    const store = new BreakpointStore();
    const bp = store.addBreakpoint({ filePath: 'src/main.ts', line: 42, enabled: true });
    expect(store.removeBreakpoint(bp.id)).toBe(true);
    expect(store.breakpointCount).toBe(0);
    expect(store.removeBreakpoint('nonexistent')).toBe(false);
  });

  it('should get breakpoints for a file', () => {
    const store = new BreakpointStore();
    store.addBreakpoint({ filePath: 'src/a.ts', line: 1, enabled: true });
    store.addBreakpoint({ filePath: 'src/a.ts', line: 5, enabled: true });
    store.addBreakpoint({ filePath: 'src/b.ts', line: 10, enabled: true });
    const aBps = store.getBreakpointsForFile('src/a.ts');
    expect(aBps.length).toBe(2);
    expect(store.getAllBreakpoints().length).toBe(3);
  });

  it('should get enabled breakpoints only', () => {
    const store = new BreakpointStore();
    store.addBreakpoint({ filePath: 'a.ts', line: 1, enabled: true });
    store.addBreakpoint({ filePath: 'a.ts', line: 2, enabled: false });
    expect(store.getEnabledBreakpoints().length).toBe(1);
  });

  it('should toggle breakpoints', () => {
    const store = new BreakpointStore();
    const bp = store.addBreakpoint({ filePath: 'a.ts', line: 1, enabled: true });
    const toggled = store.toggleBreakpoint(bp.id);
    expect(toggled!.enabled).toBe(false);
    const toggledAgain = store.toggleBreakpoint(bp.id);
    expect(toggledAgain!.enabled).toBe(true);
  });

  it('should manage breakpoint groups', () => {
    const store = new BreakpointStore();
    const bp1 = store.addBreakpoint({ filePath: 'a.ts', line: 1, enabled: true });
    const bp2 = store.addBreakpoint({ filePath: 'a.ts', line: 2, enabled: true });
    const group = store.createGroup('debug-session', 'Debug session breakpoints');
    expect(group.name).toBe('debug-session');
    expect(store.groupCount).toBe(1);
    expect(store.addBreakpointToGroup('debug-session', bp1.id)).toBe(true);
    expect(store.addBreakpointToGroup('debug-session', bp2.id)).toBe(true);
    expect(store.addBreakpointToGroup('nonexistent', bp1.id)).toBe(false);
    const groups = store.getGroups();
    expect(groups.length).toBe(1);
    expect(groups[0].breakpoints.length).toBe(2);
    expect(store.removeBreakpointFromGroup('debug-session', bp1.id)).toBe(true);
    expect(store.removeBreakpointFromGroup('debug-session', 'nonexistent')).toBe(false);
  });

  it('should persist and load from file', () => {
    const tmpDir = require('os').tmpdir();
    const filePath = require('path').join(tmpDir, `breakpoint-test-${Date.now()}.json`);
    const store1 = new BreakpointStore(filePath);
    store1.addBreakpoint({ filePath: 'src/main.ts', line: 42, enabled: true, condition: 'x > 5' });
    const store2 = new BreakpointStore(filePath);
    store2.load();
    expect(store2.breakpointCount).toBe(1);
    const bp = store2.getBreakpointsForFile('src/main.ts')[0];
    expect(bp).toBeDefined();
    expect(bp.condition).toBe('x > 5');
    try { require('fs').unlinkSync(filePath); } catch { }
  });

  it('should handle corrupted file gracefully', () => {
    const tmpDir = require('os').tmpdir();
    const filePath = require('path').join(tmpDir, `breakpoint-corrupt-${Date.now()}.json`);
    require('fs').writeFileSync(filePath, 'not-json', 'utf-8');
    const store = new BreakpointStore(filePath);
    store.load();
    expect(store.breakpointCount).toBe(0);
    try { require('fs').unlinkSync(filePath); } catch { }
  });
});
