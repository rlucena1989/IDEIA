import { HistoryManager} from '../src/history-manager';

describe('HistoryManager', () => {
  let manager: HistoryManager;

  beforeEach(() => {
    manager = new HistoryManager();
  });

  it('should push actions and undo in LIFO order', () => {
    manager.push({ type: 'create', path: '/a.txt' });
    manager.push({ type: 'rename', path: '/b.txt', previousPath: '/a.txt' });
    manager.push({ type: 'delete', path: '/b.txt' });

    const undo1 = manager.undo();
    expect(undo1).toBeDefined();
    expect(undo1!.type).toBe('delete');
    expect(undo1!.path).toBe('/b.txt');

    const undo2 = manager.undo();
    expect(undo2).toBeDefined();
    expect(undo2!.type).toBe('rename');
    expect(undo2!.path).toBe('/b.txt');
    expect(undo2!.previousPath).toBe('/a.txt');
  });

  it('should redo after undo', () => {
    manager.push({ type: 'create', path: '/x.ts' });
    manager.undo();

    const redoAction = manager.redo();
    expect(redoAction).toBeDefined();
    expect(redoAction!.type).toBe('create');
    expect(redoAction!.path).toBe('/x.ts');
  });

  it('should truncate future when pushing after undo', () => {
    manager.push({ type: 'create', path: '/a.ts' });
    manager.push({ type: 'create', path: '/b.ts' });
    manager.undo();
    manager.push({ type: 'create', path: '/c.ts' });

    expect(manager.getHistory()).toHaveLength(2);
    expect(manager.getHistory()[1].path).toBe('/c.ts');
  });

  it('should return undefined when nothing to undo', () => {
    expect(manager.undo()).toBeUndefined();
  });

  it('should return undefined when nothing to redo', () => {
    expect(manager.redo()).toBeUndefined();
  });

  it('should clear all history', () => {
    manager.push({ type: 'create', path: '/a.ts' });
    manager.push({ type: 'create', path: '/b.ts' });
    manager.clear();

    expect(manager.getHistory()).toHaveLength(0);
    expect(manager.undo()).toBeUndefined();
  });

  it('should enforce max 50 actions', () => {
    for (let i = 0; i < 60; i++) {
      manager.push({ type: 'create', path: `/file-${i}.ts` });
    }
    expect(manager.getHistory()).toHaveLength(50);
    expect(manager.getHistory()[0].path).toBe('/file-10.ts');
  });
});
