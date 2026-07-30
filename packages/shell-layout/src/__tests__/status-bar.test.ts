import { DefaultStatusBar } from '../status-bar';
import { StatusBarEntry } from '../types';

describe('DefaultStatusBar', () => {
  let statusBar: DefaultStatusBar;

  beforeEach(() => {
    statusBar = new DefaultStatusBar();
  });

  it('should start with empty entries', () => {
    expect(statusBar.getEntries()).toEqual([]);
  });

  it('should add an entry', () => {
    const entry: StatusBarEntry = {
      id: 'lang',
      text: 'TypeScript',
      alignment: 'left',
      priority: 0,
    };
    statusBar.addEntry(entry);
    expect(statusBar.getEntries()).toHaveLength(1);
    expect(statusBar.getEntries()[0].text).toBe('TypeScript');
  });

  it('should remove an entry', () => {
    statusBar.addEntry({ id: 'lang', text: 'TS', alignment: 'left', priority: 0 });
    statusBar.removeEntry('lang');
    expect(statusBar.getEntries()).toEqual([]);
  });

  it('should return a disposable from addEntry', () => {
    const disposable = statusBar.addEntry({ id: 'test', text: 'test', alignment: 'left', priority: 0 });
    disposable.dispose();
    expect(statusBar.getEntries()).toEqual([]);
  });

  it('should sort entries by alignment then priority', () => {
    statusBar.addEntry({ id: 'r2', text: 'right2', alignment: 'right', priority: 5 });
    statusBar.addEntry({ id: 'l1', text: 'left1', alignment: 'left', priority: 1 });
    statusBar.addEntry({ id: 'r1', text: 'right1', alignment: 'right', priority: 1 });
    statusBar.addEntry({ id: 'l2', text: 'left2', alignment: 'left', priority: 2 });
    const entries = statusBar.getEntries();
    expect(entries[0].id).toBe('l1');
    expect(entries[1].id).toBe('l2');
    expect(entries[2].id).toBe('r1');
    expect(entries[3].id).toBe('r2');
  });

  it('should get only left entries', () => {
    statusBar.addEntry({ id: 'l1', text: 'l', alignment: 'left', priority: 0 });
    statusBar.addEntry({ id: 'r1', text: 'r', alignment: 'right', priority: 0 });
    const left = statusBar.getLeftEntries();
    expect(left).toHaveLength(1);
    expect(left[0].id).toBe('l1');
  });

  it('should get only right entries', () => {
    statusBar.addEntry({ id: 'l1', text: 'l', alignment: 'left', priority: 0 });
    statusBar.addEntry({ id: 'r1', text: 'r', alignment: 'right', priority: 0 });
    const right = statusBar.getRightEntries();
    expect(right).toHaveLength(1);
    expect(right[0].id).toBe('r1');
  });

  it('should set background color', () => {
    statusBar.setBackground('#ff0000');
    expect(statusBar.getBackground()).toBe('#ff0000');
  });

  it('should have default background color', () => {
    expect(statusBar.getBackground()).toBe('#007acc');
  });

  it('should handle entries with optional fields', () => {
    statusBar.addEntry({
      id: 'full',
      text: 'full',
      tooltip: 'Tooltip',
      command: 'cmd',
      alignment: 'left',
      priority: 0,
      backgroundColor: '#000',
      color: '#fff',
    });
    const entry = statusBar.getEntries()[0];
    expect(entry.tooltip).toBe('Tooltip');
    expect(entry.command).toBe('cmd');
    expect(entry.backgroundColor).toBe('#000');
    expect(entry.color).toBe('#fff');
  });

  it('should not throw when removing non-existent entry', () => {
    expect(() => statusBar.removeEntry('nope')).not.toThrow();
  });

  it('should return a frozen view of entries via getEntries', () => {
    const entry: StatusBarEntry = { id: 'e1', text: 'x', alignment: 'left', priority: 0 };
    statusBar.addEntry(entry);
    const entries = statusBar.getEntries();
    expect(entries).not.toBe((statusBar as unknown as Record<string, unknown>).entries);
  });
});
