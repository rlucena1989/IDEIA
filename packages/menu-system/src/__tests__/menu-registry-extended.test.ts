import { DefaultMenuModelRegistry, MENU_PATHS, MENU_GROUPS } from '../registry';
import { MenuAction, MenuPath } from '../types';

describe('DefaultMenuModelRegistry', () => {
  const FILE: MenuPath = ['file'];
  const EDIT: MenuPath = ['edit'];
  const VIEW: MenuPath = ['view'];
  const HELP: MenuPath = ['help'];

  const makeAction = (overrides: Partial<MenuAction> = {}): MenuAction => ({
    commandId: 'test.command',
    label: 'Test Command',
    ...overrides,
  });

  it('registers a menu action', () => {
    const disposable = new DefaultMenuModelRegistry().registerMenuAction(FILE, makeAction({ commandId: 'file.save' }));
    expect(disposable).toBeDefined();
    expect(typeof disposable.dispose).toBe('function');
  });

  it('getMenuNode returns root for existing path', () => {
    const reg = new DefaultMenuModelRegistry();
    reg.registerMenuAction(EDIT, makeAction({ commandId: 'edit.undo' }));
    const node = reg.getMenuNode(EDIT);
    expect(node).toBeDefined();
    expect(node!.id).toBe('edit');
  });

  it('getActionsForPath returns registered actions', () => {
    const reg = new DefaultMenuModelRegistry();
    reg.registerMenuAction(VIEW, makeAction({ commandId: 'view.toggle' }));
    const actions = reg.getActionsForPath(VIEW);
    expect(actions.length).toBe(1);
    expect(actions[0].commandId).toBe('view.toggle');
  });

  it('getActionsForPath returns empty for unregistered path', () => {
    const reg = new DefaultMenuModelRegistry();
    const actions = reg.getActionsForPath(['missing']);
    expect(actions).toEqual([]);
  });

  it('getMenuNodes returns all roots', () => {
    const reg = new DefaultMenuModelRegistry();
    reg.registerMenuAction(FILE, makeAction({ commandId: 'file.new' }));
    reg.registerMenuAction(HELP, makeAction({ commandId: 'help.about' }));
    const nodes = reg.getMenuNodes();
    expect(nodes.size).toBeGreaterThanOrEqual(2);
  });

  it('registerSubmenu creates a submenu', () => {
    const reg = new DefaultMenuModelRegistry();
    reg.registerSubmenu(FILE, 'Recent Files');
    const node = reg.getMenuNode(FILE);
    expect(node!.children.some(c => c.label === 'Recent Files')).toBe(true);
  });

  it('registerSubmenu returns no-op for duplicate', () => {
    const reg = new DefaultMenuModelRegistry();
    reg.registerSubmenu(FILE, 'Recent');
    const before = reg.getMenuNode(FILE)!.children.length;
    reg.registerSubmenu(FILE, 'Recent');
    const after = reg.getMenuNode(FILE)!.children.length;
    expect(after).toBe(before);
  });

  it('removeMenuAction removes the action', () => {
    const reg = new DefaultMenuModelRegistry();
    reg.registerMenuAction(FILE, makeAction({ commandId: 'file.remove' }));
    reg.removeMenuAction(FILE, 'file.remove');
    const actions = reg.getActionsForPath(FILE);
    expect(actions.length).toBe(0);
  });

  it('dispose unregisters the action', () => {
    const reg = new DefaultMenuModelRegistry();
    const disposable = reg.registerMenuAction(FILE, makeAction({ commandId: 'file.dispose' }));
    disposable.dispose();
    const actions = reg.getActionsForPath(FILE);
    expect(actions.length).toBe(0);
  });

  it('MENU_PATHS has all expected paths', () => {
    expect(MENU_PATHS.FILE).toEqual(['file']);
    expect(MENU_PATHS.EDIT).toEqual(['edit']);
    expect(MENU_PATHS.HELP).toEqual(['help']);
    expect(MENU_PATHS.VIEW).toEqual(['view']);
    expect(MENU_PATHS.PREFERENCES).toEqual(['preferences']);
  });

  it('MENU_GROUPS has navigation constants', () => {
    expect(MENU_GROUPS.NAVIGATION).toBe('navigation');
    expect(MENU_GROUPS.Z_OPEN).toBe('1_open');
  });
});
