import { StateStore } from '../../io/state-store';
import { resetIO, createIO } from '../../io';
import type { MockIOContainer } from '../../io/mock';

describe('StateStore', () => {
  let store: StateStore;
  let mockIO: MockIOContainer;

  beforeEach(() => {
    resetIO();
    process.env['GTI_TEST_MODE'] = '1';
    const io = createIO();
    if ('_reset' in io) {
      mockIO = io as unknown as MockIOContainer;
      mockIO._reset();
    }
    store = new StateStore('/tmp/.ideia');
  });

  afterEach(() => {
    process.env['GTI_TEST_MODE'] = '0';
    resetIO();
  });

  it('should set and get state', () => {
    store.setState('phase', 'implementation');
    expect(store.getState('phase')).toBe('implementation');
  });

  it('should get default value for missing key', () => {
    const value = store.getState('missing', 'default');
    expect(value).toBe('default');
  });

  it('should delete state', () => {
    store.setState('temp', 'value');
    store.delete('temp');
    expect(store.getState('temp')).toBeUndefined();
  });

  it('should clear all state', () => {
    store.setState('a', 1);
    store.setState('b', 2);
    store.clear();
    expect(store.getState('a')).toBeUndefined();
    expect(store.getState('b')).toBeUndefined();
  });

  it('should get all state', () => {
    store.setState('coverageScore', 85);
    store.setState('gapsResolved', 70);
    const all = store.getAll();
    expect(all.coverageScore).toBe(85);
    expect(all.gapsResolved).toBe(70);
  });
});
