import { MENU_PATHS, MENU_GROUPS, DefaultMenuModelRegistry } from '../registry';
import { MenuAction } from '../types';

describe('MENU_PATHS', () => {
  it('should contain standard menu paths', () => {
    expect([...MENU_PATHS.FILE]).toEqual(['file']);
    expect([...MENU_PATHS.EDIT]).toEqual(['edit']);
    expect(MENU_PATHS.VIEW).toEqual(['view']);
    expect(MENU_PATHS.HELP).toEqual(['help']);
    expect(MENU_PATHS.SELECTION).toEqual(['selection']);
    expect(MENU_PATHS.GO).toEqual(['go']);
    expect(MENU_PATHS.RUN).toEqual(['run']);
    expect(MENU_PATHS.TERMINAL).toEqual(['terminal']);
    expect(MENU_PATHS.PREFERENCES).toEqual(['preferences']);
    expect(MENU_PATHS.PANEL).toEqual(['panel']);
  });
});

describe('MENU_GROUPS', () => {
  it('should contain standard menu groups', () => {
    expect(MENU_GROUPS.NAVIGATION).toBe('navigation');
    expect(MENU_GROUPS.Z_OPEN).toBe('1_open');
    expect(MENU_GROUPS.Z_CLOSE).toBe('9_close');
    expect(MENU_GROUPS.Z_UNDO).toBe('1_undo');
    expect(MENU_GROUPS.Z_CUT).toBe('3_cut');
    expect(MENU_GROUPS.Z_MODIFICATION).toBe('2_modification');
    expect(MENU_GROUPS.Z_WORKSPACE).toBe('1_workspace');
    expect(MENU_GROUPS.Z_TOOLS).toBe('3_tools');
  });
});

describe('DefaultMenuModelRegistry', () => {
  let registry: DefaultMenuModelRegistry;

  beforeEach(() => {
    registry = new DefaultMenuModelRegistry();
  });

  it('should register a menu action', () => {
    const action: MenuAction = { commandId: 'file.save', label: 'Save', order: 100 };
    const disposable = registry.registerMenuAction([...MENU_PATHS.FILE], action);
    expect(disposable).toBeDefined();
    const actions = registry.getActionsForPath([...MENU_PATHS.FILE]);
    expect(actions).toHaveLength(1);
    expect(actions[0].commandId).toBe('file.save');
  });

  it('should create root nodes on first action registration', () => {
    registry.registerMenuAction(['custom'], { commandId: 'test', label: 'Test' });
    const node = registry.getMenuNode(['custom']);
    expect(node).toBeDefined();
    expect(node!.id).toBe('custom');
    expect(node!.label).toBe('Custom');
  });

  it('should return undefined for unknown path', () => {
    expect(registry.getMenuNode(['nonexistent'])).toBeUndefined();
  });

  it('should retrieve menu node', () => {
    registry.registerMenuAction([...MENU_PATHS.FILE], { commandId: 'file.open', label: 'Open' });
    const node = registry.getMenuNode([...MENU_PATHS.FILE]);
    expect(node).toBeDefined();
    expect(node!.id).toBe('file');
  });

  it('should get all menu nodes', () => {
    registry.registerMenuAction([...MENU_PATHS.FILE], { commandId: 'a', label: 'A' });
    registry.registerMenuAction([...MENU_PATHS.EDIT], { commandId: 'b', label: 'B' });
    const nodes = registry.getMenuNodes();
    expect(nodes.size).toBe(2);
    expect(nodes.has('file')).toBe(true);
    expect(nodes.has('edit')).toBe(true);
  });

  it('should remove a menu action by command ID', () => {
    registry.registerMenuAction([...MENU_PATHS.FILE], { commandId: 'save', label: 'Save' });
    registry.removeMenuAction([...MENU_PATHS.FILE], 'save');
    expect(registry.getActionsForPath([...MENU_PATHS.FILE])).toHaveLength(0);
  });

  it('should return empty actions for unknown path', () => {
    expect(registry.getActionsForPath(['unknown'])).toEqual([]);
  });

  it('should support removeMenuAction on non-existent path gracefully', () => {
    expect(() => registry.removeMenuAction(['unknown'], 'cmd')).not.toThrow();
  });

  it('should handle menu action disposal', () => {
    const action: MenuAction = { commandId: 'file.close', label: 'Close' };
    const disposable = registry.registerMenuAction([...MENU_PATHS.FILE], action);
    expect(registry.getActionsForPath([...MENU_PATHS.FILE])).toHaveLength(1);
    disposable.dispose();
    expect(registry.getActionsForPath([...MENU_PATHS.FILE])).toHaveLength(0);
  });

  it('should register a submenu', () => {
    const disposable = registry.registerSubmenu(['view'], 'View');
    expect(disposable).toBeDefined();
    const node = registry.getMenuNode(['view']);
    expect(node).toBeDefined();
    expect(node!.children.some(c => c.id === 'view')).toBe(true);
  });

  it('should not duplicate submenu on second registration', () => {
    registry.registerSubmenu(['view'], 'View');
    registry.registerSubmenu(['view'], 'View');
    const node = registry.getMenuNode(['view']);
    expect(node!.children.filter(c => c.id === 'view')).toHaveLength(1);
  });

  it('should remove submenu on disposal', () => {
    const disposable = registry.registerSubmenu(['edit'], 'Edit');
    disposable.dispose();
    const node = registry.getMenuNode(['edit']);
    expect(node!.children.some(c => c.id === 'edit')).toBe(false);
  });

  it('should include icon and group in menu node', () => {
    registry.registerMenuAction([...MENU_PATHS.FILE], { commandId: 'save', label: 'Save', icon: 'save-icon', group: '1_open' });
    const actions = registry.getActionsForPath([...MENU_PATHS.FILE]);
    expect(actions[0].icon).toBe('save-icon');
    expect(actions[0].group).toBe('1_open');
  });

  it('should use default order of 100 when not specified', () => {
    registry.registerMenuAction([...MENU_PATHS.FILE], { commandId: 'save', label: 'Save' });
    const node = registry.getMenuNode([...MENU_PATHS.FILE]);
    const child = node!.children.find(c => c.id === 'save');
    expect(child!.order).toBe(100);
  });
});
