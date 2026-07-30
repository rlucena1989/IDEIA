import { DefaultShellLayout, DefaultShellArea } from '../shell-layout';
import { WidgetCodeSplitter } from '../code-splitter';
import { ShellArea } from '../types';

function createMockWidget(id: string) {
  return {
    id,
    title: { label: `Widget ${id}`, closable: true },
    visible: true,
    activate: jest.fn(),
    close: jest.fn(),
    dispose: jest.fn(),
    onActivated: jest.fn(),
    onClose: jest.fn(),
    onDispose: jest.fn(),
    onResize: jest.fn(),
  };
}

describe('DefaultShellArea', () => {
  it('should create with initial state', () => {
    const area = new DefaultShellArea('left');
    expect(area.id).toBe('left');
    expect(area.visible).toBe(true);
    expect(area.widgets).toEqual([]);
  });

  it('should add widgets', () => {
    const area = new DefaultShellArea('main');
    const widget = createMockWidget('editor');
    area.addWidget(widget);
    expect(area.widgets).toHaveLength(1);
    expect(area.widgets[0].id).toBe('editor');
  });

  it('should set first widget as active when added', () => {
    const area = new DefaultShellArea('main');
    const w1 = createMockWidget('w1');
    const w2 = createMockWidget('w2');
    area.addWidget(w1);
    expect(area.getActiveWidget()?.id).toBe('w1');
    area.addWidget(w2);
    expect(area.getActiveWidget()?.id).toBe('w1');
  });

  it('should remove widgets', () => {
    const area = new DefaultShellArea('main');
    const w1 = createMockWidget('w1');
    const w2 = createMockWidget('w2');
    area.addWidget(w1);
    area.addWidget(w2);
    area.removeWidget('w1');
    expect(area.widgets).toHaveLength(1);
    expect(area.widgets[0].id).toBe('w2');
  });

  it('should switch active widget when active is removed', () => {
    const area = new DefaultShellArea('main');
    area.addWidget(createMockWidget('w1'));
    area.addWidget(createMockWidget('w2'));
    area.setActiveWidget('w1');
    area.removeWidget('w1');
    expect(area.getActiveWidget()?.id).toBe('w2');
  });

  it('should clear active widget when last widget removed', () => {
    const area = new DefaultShellArea('main');
    area.addWidget(createMockWidget('w1'));
    area.removeWidget('w1');
    expect(area.getActiveWidget()).toBeUndefined();
  });

  it('should set active widget', () => {
    const area = new DefaultShellArea('main');
    area.addWidget(createMockWidget('w1'));
    area.addWidget(createMockWidget('w2'));
    area.setActiveWidget('w2');
    expect(area.getActiveWidget()?.id).toBe('w2');
  });

  it('should not set active widget for non-existent id', () => {
    const area = new DefaultShellArea('main');
    area.addWidget(createMockWidget('w1'));
    area.setActiveWidget('unknown');
    expect(area.getActiveWidget()?.id).toBe('w1');
  });

  it('should toggle visibility', () => {
    const area = new DefaultShellArea('main');
    expect(area.visible).toBe(true);
    area.toggle();
    expect(area.visible).toBe(false);
    area.toggle();
    expect(area.visible).toBe(true);
  });

  it('should show and hide', () => {
    const area = new DefaultShellArea('main');
    area.hide();
    expect(area.visible).toBe(false);
    area.show();
    expect(area.visible).toBe(true);
  });

  it('should set size', () => {
    const area = new DefaultShellArea('main');
    area.setSize(500);
    expect((area as any).getSize()).toBe(500);
  });

  it('should serialize state', () => {
    const area = new DefaultShellArea('right');
    area.addWidget(createMockWidget('w1'));
    area.setSize(400);
    area.hide();
    const state = area.serialize();
    expect(state.id).toBe('right');
    expect(state.visible).toBe(false);
    expect(state.size).toBe(400);
    expect(state.widgetOrder).toEqual(['w1']);
  });

  it('should deserialize state', () => {
    const area = new DefaultShellArea('bottom');
    area.deserialize({ id: 'bottom', visible: false, size: 200, activeWidgetId: 'w1', widgetOrder: ['w1'] });
    expect(area.visible).toBe(false);
    expect((area as any).getSize()).toBe(200);
  });

  it('should get widget by id', () => {
    const area = new DefaultShellArea('main');
    area.addWidget(createMockWidget('w1'));
    expect(area.getWidget('w1')).toBeDefined();
    expect(area.getWidget('unknown')).toBeUndefined();
  });
});

describe('DefaultShellLayout', () => {
  let layout: DefaultShellLayout;

  beforeEach(() => {
    layout = new DefaultShellLayout();
  });

  it('should create all five areas', () => {
    expect(layout.areas.main).toBeDefined();
    expect(layout.areas.left).toBeDefined();
    expect(layout.areas.right).toBeDefined();
    expect(layout.areas.bottom).toBeDefined();
    expect(layout.areas.top).toBeDefined();
  });

  it('should add widget to an area', () => {
    const widget = createMockWidget('explorer');
    layout.addWidget(widget, 'left');
    expect(layout.getWidget('left', 'explorer')).toBe(widget);
  });

  it('should return a disposable from addWidget', () => {
    const widget = createMockWidget('explorer');
    const disposable = layout.addWidget(widget, 'left');
    expect(disposable).toBeDefined();
    expect(typeof disposable.dispose).toBe('function');
  });

  it('should remove widget via disposable', () => {
    const widget = createMockWidget('explorer');
    const disposable = layout.addWidget(widget, 'left');
    disposable.dispose();
    expect(layout.getWidget('left', 'explorer')).toBeUndefined();
  });

  it('should remove widget by id across areas', () => {
    layout.addWidget(createMockWidget('w1'), 'left');
    layout.addWidget(createMockWidget('w2'), 'right');
    layout.removeWidget('w1');
    expect(layout.getWidget('left', 'w1')).toBeUndefined();
    expect(layout.getWidget('right', 'w2')).toBeDefined();
  });

  it('should get all widgets in an area', () => {
    layout.addWidget(createMockWidget('w1'), 'bottom');
    layout.addWidget(createMockWidget('w2'), 'bottom');
    const widgets = layout.getWidgets('bottom');
    expect(widgets).toHaveLength(2);
  });

  it('should set and get active widget', () => {
    const w1 = createMockWidget('w1');
    const w2 = createMockWidget('w2');
    layout.addWidget(w1, 'main');
    layout.addWidget(w2, 'main');
    layout.setActiveWidget('main', 'w2');
    expect(layout.getActiveWidget('main')?.id).toBe('w2');
  });

  it('should fire onWidgetAdded event', () => {
    jest.useFakeTimers();
    const handler = jest.fn();
    layout.onWidgetAdded(handler);
    layout.addWidget(createMockWidget('test'), 'top');
    jest.advanceTimersByTime(50);
    expect(handler).toHaveBeenCalledWith({ area: 'top', widget: expect.objectContaining({ id: 'test' }) });
    jest.useRealTimers();
  });

  it('should fire onWidgetRemoved event', () => {
    const handler = jest.fn();
    layout.onWidgetRemoved(handler);
    const widget = createMockWidget('test');
    layout.addWidget(widget, 'top');
    layout.removeWidget('test');
    expect(handler).toHaveBeenCalledWith({ area: 'top', widgetId: 'test' });
  });

  it('should fire onLayoutChanged on add and remove', () => {
    jest.useFakeTimers();
    const handler = jest.fn();
    layout.onLayoutChanged(handler);
    layout.addWidget(createMockWidget('w1'), 'left');
    jest.advanceTimersByTime(50);
    expect(handler).toHaveBeenCalledTimes(1);
    layout.removeWidget('w1');
    jest.advanceTimersByTime(50);
    expect(handler).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('should serialize all areas', () => {
    layout.addWidget(createMockWidget('w1'), 'main');
    layout.addWidget(createMockWidget('w2'), 'left');
    layout.areas.left.hide();
    const state = layout.serialize();
    expect(state.main).toBeDefined();
    expect(state.left).toBeDefined();
    expect(state.right).toBeDefined();
    expect(state.bottom).toBeDefined();
    expect(state.top).toBeDefined();
    expect(state.left.visible).toBe(false);
  });

  it('should deserialize all areas', () => {
    const state = {
      main: { id: 'main' as ShellArea, visible: true, size: 300, activeWidgetId: undefined, widgetOrder: [] },
      left: { id: 'left' as ShellArea, visible: false, size: 200, activeWidgetId: undefined, widgetOrder: [] },
      right: { id: 'right' as ShellArea, visible: false, size: 200, activeWidgetId: undefined, widgetOrder: [] },
      bottom: { id: 'bottom' as ShellArea, visible: true, size: 150, activeWidgetId: undefined, widgetOrder: [] },
      top: { id: 'top' as ShellArea, visible: false, size: 50, activeWidgetId: undefined, widgetOrder: [] },
    };
    layout.deserialize(state);
    expect(layout.areas.left.visible).toBe(false);
    expect(layout.areas.main.visible).toBe(true);
  });

  it('should fire onLayoutChanged on deserialize', () => {
    jest.useFakeTimers();
    const handler = jest.fn();
    layout.onLayoutChanged(handler);
    const state = {
      main: { id: 'main' as ShellArea, visible: true, size: 300, activeWidgetId: undefined, widgetOrder: [] },
      left: { id: 'left' as ShellArea, visible: true, size: 200, activeWidgetId: undefined, widgetOrder: [] },
      right: { id: 'right' as ShellArea, visible: true, size: 200, activeWidgetId: undefined, widgetOrder: [] },
      bottom: { id: 'bottom' as ShellArea, visible: true, size: 150, activeWidgetId: undefined, widgetOrder: [] },
      top: { id: 'top' as ShellArea, visible: true, size: 50, activeWidgetId: undefined, widgetOrder: [] },
    };
    layout.deserialize(state);
    jest.advanceTimersByTime(50);
    expect(handler).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('should fire single layoutChanged event for batch widget addition', () => {
    jest.useFakeTimers();
    const addedHandler = jest.fn();
    const layoutHandler = jest.fn();
    layout.onWidgetAdded(addedHandler);
    layout.onLayoutChanged(layoutHandler);
    const widgets = [createMockWidget('w1'), createMockWidget('w2'), createMockWidget('w3')];
    widgets.forEach((w) => layout.addWidget(w, 'main'));
    jest.advanceTimersByTime(50);
    expect(addedHandler).toHaveBeenCalledTimes(3);
    expect(layoutHandler).toHaveBeenCalledTimes(3);
    jest.useRealTimers();
  });

  it('should return disposables for batch added widgets', () => {
    const widgets = [createMockWidget('w1'), createMockWidget('w2')];
    const disposables = widgets.map((w) => layout.addWidget(w, 'left'));
    expect(disposables).toHaveLength(2);
    disposables[0].dispose();
    expect(layout.getWidget('left', 'w1')).toBeUndefined();
    expect(layout.getWidget('left', 'w2')).toBeDefined();
  });
});

describe('WidgetCodeSplitter', () => {
  let splitter: WidgetCodeSplitter;

  beforeEach(() => {
    splitter = new WidgetCodeSplitter();
  });

  it('should batch preload widgets with max 2 concurrent', async () => {
    const factory1 = jest.fn().mockResolvedValue(createMockWidget('w1'));
    const factory2 = jest.fn().mockResolvedValue(createMockWidget('w2'));
    const factory3 = jest.fn().mockResolvedValue(createMockWidget('w3'));
    splitter.register({ id: 'w1', label: 'W1', area: 'main', factory: factory1, preload: true });
    splitter.register({ id: 'w2', label: 'W2', area: 'main', factory: factory2, preload: true });
    splitter.register({ id: 'w3', label: 'W3', area: 'main', factory: factory3, preload: true });
    splitter.batchPreload(['w1', 'w2', 'w3']);
    await new Promise((r) => setTimeout(r, 100));
    expect(splitter.getLoaded()).toContain('w1');
    expect(splitter.getLoaded()).toContain('w2');
    expect(splitter.getLoaded()).toContain('w3');
    expect(splitter.getPreloaded()).toContain('w1');
    expect(splitter.getPreloaded()).toContain('w2');
    expect(splitter.getPreloaded()).toContain('w3');
  }, 20000);

  it('should track preloaded widgets and avoid double preload', async () => {
    const factory = jest.fn().mockResolvedValue(createMockWidget('w1'));
    splitter.register({ id: 'w1', label: 'W1', area: 'main', factory, preload: true });
    splitter.preloadAll();
    expect(splitter.getPreloaded()).toContain('w1');
    splitter.preloadAll();
    await new Promise((r) => setTimeout(r, 100));
    expect(factory).toHaveBeenCalledTimes(1);
  }, 20000);

  it('should return accurate load stats', async () => {
    const factory1 = jest.fn().mockResolvedValue(createMockWidget('w1'));
    const factory2 = jest.fn().mockRejectedValue(new Error('fail'));
    splitter.register({ id: 'w1', label: 'W1', area: 'main', factory: factory1 });
    splitter.register({ id: 'w2', label: 'W2', area: 'main', factory: factory2 });
    const before = splitter.getLoadStats();
    expect(before.total).toBe(2);
    expect(before.loaded).toBe(0);
    expect(before.failed).toBe(0);
    expect(before.pending).toBe(2);
    await splitter.load('w1');
    await expect(splitter.load('w2')).rejects.toThrow('fail');
    const after = splitter.getLoadStats();
    expect(after.loaded).toBe(1);
    expect(after.failed).toBe(1);
    expect(after.pending).toBe(0);
  });
});
