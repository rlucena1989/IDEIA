import { SettingsStore } from '../../io/settings-store';
import { resetIO, createIO } from '../../io';
import type { MockIOContainer } from '../../io/mock';

describe('SettingsStore', () => {
  let store: SettingsStore;
  let mockIO: MockIOContainer;

  beforeEach(() => {
    resetIO();
    process.env['GTI_TEST_MODE'] = '1';
    const io = createIO();
    if ('_reset' in io) {
      mockIO = io as unknown as MockIOContainer;
      mockIO._reset();
    }
    store = new SettingsStore('/tmp/.ideia');
  });

  afterEach(() => {
    process.env['GTI_TEST_MODE'] = '0';
    resetIO();
  });

  it('should get default value for missing key', () => {
    const value = store.get('theme', 'light');
    expect(value).toBe('light');
  });

  it('should set and get values', () => {
    store.set('theme', 'dark');
    expect(store.get('theme')).toBe('dark');
  });

  it('should delete values', () => {
    store.set('key', 'value');
    store.delete('key');
    expect(store.get('key')).toBeUndefined();
  });

  it('should clear all settings', () => {
    store.set('a', 1);
    store.set('b', 2);
    store.clear();
    expect(store.get('a')).toBeUndefined();
    expect(store.get('b')).toBeUndefined();
  });

  it('should get all settings', () => {
    store.set('x', 10);
    store.set('y', 'hello');
    const all = store.getAll();
    expect(all.x).toBe(10);
    expect(all.y).toBe('hello');
  });
});
