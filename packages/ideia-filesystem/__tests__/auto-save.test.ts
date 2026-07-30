import { AutoSave } from '../src/auto-save';

describe('AutoSave', () => {
  let autoSave: AutoSave;
  let saves: string[];

  beforeEach(() => {
    jest.useFakeTimers();
    saves = [];
    autoSave = new AutoSave(1000);
  });

  afterEach(() => {
    jest.useRealTimers();
    autoSave.dispose();
  });

  it('should trigger save after debounce delay', () => {
    const disposable = autoSave.startWatching('/file.ts', (f) => saves.push(f));
    expect(saves).toHaveLength(0);

    jest.advanceTimersByTime(1000);
    expect(saves).toHaveLength(1);
    expect(saves[0]).toBe('/file.ts');
    disposable.dispose();
  });

  it('should reset debounce on repeated edits', () => {
    autoSave.startWatching('/file.ts', (f) => saves.push(f));

    jest.advanceTimersByTime(500);
    expect(saves).toHaveLength(0);

    const entry = (autoSave as Record<string, unknown>).entries.get('/file.ts');
    entry.timer = setTimeout(() => {
      entry.pending = false;
    }, 1000);
    jest.advanceTimersByTime(1000);

    expect(saves).toHaveLength(1);
  });

  it('stopWatching should cancel pending save', () => {
    autoSave.startWatching('/file.ts', (f) => saves.push(f));
    autoSave.stopWatching('/file.ts');

    jest.advanceTimersByTime(2000);
    expect(saves).toHaveLength(0);
  });

  it('saveNow should flush pending save immediately', () => {
    autoSave.startWatching('/file.ts', (f) => saves.push(f));
    const flushed = autoSave.saveNow('/file.ts');
    expect(flushed).toBe(true);
    expect(saves).toHaveLength(0);
  });

  it('getPendingFiles should list files with pending saves', () => {
    autoSave.startWatching('/a.ts', (f) => saves.push(f));
    autoSave.startWatching('/b.ts', (f) => saves.push(f));
    autoSave.stopWatching('/b.ts');

    expect(autoSave.getPendingFiles()).toEqual(['/a.ts']);
    autoSave.dispose();
  });
});
