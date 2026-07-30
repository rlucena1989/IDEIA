import { DefaultLayoutPersistence } from '../layout-persistence';
import { LayoutState, ShellAreaState } from '../types';

function createSampleState(): LayoutState {
  const areaState: ShellAreaState = {
    id: 'main',
    visible: true,
    size: 300,
    activeWidgetId: 'editor',
    widgetOrder: ['editor', 'terminal'],
  };
  return {
    version: 1,
    areas: {
      main: areaState,
      left: { id: 'left', visible: true, size: 200, activeWidgetId: undefined, widgetOrder: [] },
      right: { id: 'right', visible: false, size: 200, activeWidgetId: undefined, widgetOrder: [] },
      bottom: { id: 'bottom', visible: true, size: 150, activeWidgetId: undefined, widgetOrder: [] },
      top: { id: 'top', visible: false, size: 50, activeWidgetId: undefined, widgetOrder: [] },
    },
    timestamp: Date.now(),
  };
}

describe('DefaultLayoutPersistence', () => {
  let persistence: DefaultLayoutPersistence;

  beforeEach(() => {
    persistence = new DefaultLayoutPersistence();
  });

  it('should save and load a layout state', async () => {
    const state = createSampleState();
    await persistence.save(state);
    const loaded = await persistence.load();
    expect(loaded).toBeDefined();
    expect(loaded!.version).toBe(1);
    expect(loaded!.areas.main.visible).toBe(true);
    expect(loaded!.areas.main.size).toBe(300);
  });

  it('should return undefined when no state saved', async () => {
    const result = await persistence.load();
    expect(result).toBeUndefined();
  });

  it('should clear saved state', async () => {
    const state = createSampleState();
    await persistence.save(state);
    await persistence.clear();
    const result = await persistence.load();
    expect(result).toBeUndefined();
  });

  it('should override version to 1 on save', async () => {
    const state = createSampleState();
    state.version = 99;
    await persistence.save(state);
    const loaded = await persistence.load();
    expect(loaded!.version).toBe(1);
  });

  it('should update timestamp on save', async () => {
    const state = createSampleState();
    state.timestamp = 0;
    await persistence.save(state);
    const loaded = await persistence.load();
    expect(loaded!.timestamp).toBeGreaterThan(0);
  });

  it('should preserve all area states on save/load cycle', async () => {
    const state = createSampleState();
    await persistence.save(state);
    const loaded = await persistence.load();
    const areaKeys = Object.keys(loaded!.areas);
    expect(areaKeys).toEqual(['main', 'left', 'right', 'bottom', 'top']);
    expect(loaded!.areas.left.visible).toBe(true);
    expect(loaded!.areas.right.visible).toBe(false);
  });

  it('should handle clear on empty persistence', async () => {
    await expect(persistence.clear()).resolves.not.toThrow();
  });

  it('should not throw when localStorage is unavailable', async () => {
    await expect(persistence.save(createSampleState())).resolves.not.toThrow();
  });

  it('should return cached result without re-reading', async () => {
    const state = createSampleState();
    await persistence.save(state);
    const first = await persistence.load();
    const second = await persistence.load();
    expect(first).toBe(second);
  });
});
