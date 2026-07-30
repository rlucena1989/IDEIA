import { DefaultViewContainer } from '../view-container';
import { BaseWidget } from '../widget-core';
import { IWidget, WidgetTitle } from '../types';

function createWidget(id: string, label: string): IWidget {
  return new BaseWidget(id, { label, closable: true });
}

describe('DefaultViewContainer', () => {
  const containerId = 'test-container';
  const containerTitle: WidgetTitle = { label: 'Container', closable: false };

  it('should create with id and title', () => {
    const c = new DefaultViewContainer(containerId, containerTitle);
    expect(c.id).toBe(containerId);
    expect(c.title.label).toBe('Container');
    expect(c.getWidgets()).toEqual([]);
    expect(c.getActiveWidget()).toBeUndefined();
  });

  it('should add widget and set it as active', () => {
    const c = new DefaultViewContainer(containerId, containerTitle);
    const w = createWidget('w1', 'Widget 1');
    c.addWidget(w);
    expect(c.getWidgets()).toHaveLength(1);
    expect(c.getActiveWidget()?.id).toBe('w1');
  });

  it('should fire onWidgetAdded when adding a widget', () => {
    const c = new DefaultViewContainer(containerId, containerTitle);
    const listener = jest.fn();
    c.onWidgetAdded(listener);
    const w = createWidget('w2', 'Widget 2');
    c.addWidget(w);
    expect(listener).toHaveBeenCalledWith(w);
  });

  it('should remove widget and fire onWidgetRemoved', () => {
    const c = new DefaultViewContainer(containerId, containerTitle);
    const listener = jest.fn();
    c.onWidgetRemoved(listener);
    const w = createWidget('w3', 'Widget 3');
    c.addWidget(w);
    c.removeWidget('w3');
    expect(c.getWidgets()).toHaveLength(0);
    expect(listener).toHaveBeenCalledWith('w3');
  });

  it('should track active widget', () => {
    const c = new DefaultViewContainer(containerId, containerTitle);
    const w1 = createWidget('w1', 'Widget 1');
    const w2 = createWidget('w2', 'Widget 2');
    c.addWidget(w1);
    c.addWidget(w2);
    c.setActiveWidget('w2');
    expect(c.getActiveWidget()?.id).toBe('w2');
    c.setActiveWidget('w1');
    expect(c.getActiveWidget()?.id).toBe('w1');
  });

  it('should fire onActiveWidgetChanged', () => {
    const c = new DefaultViewContainer(containerId, containerTitle);
    const listener = jest.fn();
    c.onActiveWidgetChanged(listener);
    const w = createWidget('w4', 'Widget 4');
    c.addWidget(w);
    expect(listener).toHaveBeenCalledWith(w);
    c.setActiveWidget('w4');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('should clear active widget when active widget removed', () => {
    const c = new DefaultViewContainer(containerId, containerTitle);
    const w1 = createWidget('w1', 'Widget 1');
    const w2 = createWidget('w2', 'Widget 2');
    c.addWidget(w1);
    c.addWidget(w2);
    c.setActiveWidget('w1');
    c.removeWidget('w1');
    expect(c.getActiveWidget()?.id).toBe('w2');
  });

  it('should return empty array from getWidgets copy', () => {
    const c = new DefaultViewContainer(containerId, containerTitle);
    const w = createWidget('w5', 'Widget 5');
    c.addWidget(w);
    const widgets = c.getWidgets();
    widgets.pop();
    expect(c.getWidgets()).toHaveLength(1);
  });

  it('should support disposable addWidget', () => {
    const c = new DefaultViewContainer(containerId, containerTitle);
    const w = createWidget('w6', 'Widget 6');
    const disposable = c.addWidget(w);
    expect(c.getWidgets()).toHaveLength(1);
    disposable.dispose();
    expect(c.getWidgets()).toHaveLength(0);
  });

  it('should ignore removing non-existent widget', () => {
    const c = new DefaultViewContainer(containerId, containerTitle);
    expect(() => c.removeWidget('nonexistent')).not.toThrow();
  });

  it('should not change active widget when setting non-existent', () => {
    const c = new DefaultViewContainer(containerId, containerTitle);
    const w = createWidget('w7', 'Widget 7');
    c.addWidget(w);
    c.setActiveWidget('nonexistent');
    expect(c.getActiveWidget()?.id).toBe('w7');
  });
});
