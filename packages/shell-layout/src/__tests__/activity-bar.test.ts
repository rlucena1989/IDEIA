import { DefaultActivityBar } from '../activity-bar';

describe('DefaultActivityBar', () => {
  let activityBar: DefaultActivityBar;

  beforeEach(() => {
    activityBar = new DefaultActivityBar();
  });

  it('should start with empty items', () => {
    expect(activityBar.getItems()).toEqual([]);
  });

  it('should add an item', () => {
    activityBar.addItem({ id: 'explorer', iconClass: 'fa-folder', tooltip: 'Explorer' });
    const items = activityBar.getItems();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('explorer');
  });

  it('should remove an item', () => {
    activityBar.addItem({ id: 'explorer', iconClass: 'fa-folder', tooltip: 'Explorer' });
    activityBar.removeItem('explorer');
    expect(activityBar.getItems()).toEqual([]);
  });

  it('should return a disposable from addItem', () => {
    const disposable = activityBar.addItem({ id: 'search', iconClass: 'fa-search', tooltip: 'Search' });
    disposable.dispose();
    expect(activityBar.getItems()).toEqual([]);
  });

  it('should set first active item from flag', () => {
    activityBar.addItem({ id: 'explorer', iconClass: 'fa-folder', tooltip: 'Explorer', active: true });
    expect(activityBar.getActiveItem()?.id).toBe('explorer');
  });

  it('should return undefined active item when none set', () => {
    activityBar.addItem({ id: 'explorer', iconClass: 'fa-folder', tooltip: 'Explorer' });
    expect(activityBar.getActiveItem()).toBeUndefined();
  });

  it('should set active item', () => {
    activityBar.addItem({ id: 'explorer', iconClass: 'fa-folder', tooltip: 'Explorer' });
    activityBar.addItem({ id: 'search', iconClass: 'fa-search', tooltip: 'Search' });
    activityBar.setActiveItem('search');
    expect(activityBar.getActiveItem()?.id).toBe('search');
  });

  it('should only activate one item at a time', () => {
    activityBar.addItem({ id: 'a', iconClass: 'fa-a', tooltip: 'A', active: true });
    activityBar.addItem({ id: 'b', iconClass: 'fa-b', tooltip: 'B' });
    activityBar.setActiveItem('b');
    const items = activityBar.getItems();
    expect(items.find(i => i.id === 'a')?.active).toBe(false);
    expect(items.find(i => i.id === 'b')?.active).toBe(true);
  });

  it('should not set active item for unknown id', () => {
    activityBar.addItem({ id: 'explorer', iconClass: 'fa-folder', tooltip: 'Explorer' });
    activityBar.setActiveItem('unknown');
    expect(activityBar.getActiveItem()).toBeUndefined();
  });

  it('should clear active item when active item is removed', () => {
    activityBar.addItem({ id: 'explorer', iconClass: 'fa-folder', tooltip: 'Explorer', active: true });
    activityBar.removeItem('explorer');
    expect(activityBar.getActiveItem()).toBeUndefined();
  });

  it('should update badge', () => {
    activityBar.addItem({ id: 'explorer', iconClass: 'fa-folder', tooltip: 'Explorer' });
    activityBar.updateBadge('explorer', 5);
    const item = activityBar.getItems().find(i => i.id === 'explorer');
    expect(item?.badge).toBe(5);
  });

  it('should not throw when updating badge on unknown item', () => {
    expect(() => activityBar.updateBadge('unknown', 1)).not.toThrow();
  });

  it('should handle items with all optional fields', () => {
    activityBar.addItem({
      id: 'full',
      iconClass: 'fa-star',
      tooltip: 'Full',
      command: 'cmd',
      badge: 3,
      active: true,
    });
    const item = activityBar.getActiveItem();
    expect(item?.command).toBe('cmd');
    expect(item?.badge).toBe(3);
  });
});
