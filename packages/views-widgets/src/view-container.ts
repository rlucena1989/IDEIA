import { Emitter, Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { IViewContainer, IWidget, ViewWidgetOptions, WidgetTitle } from './types';
import { BaseWidget } from './widget-core';

export class DefaultViewContainer extends BaseWidget implements IViewContainer {
  private widgets: IWidget[] = [];
  private activeWidget?: IWidget;

  protected onWidgetAddedEmitter = new Emitter<IWidget>();
  protected onWidgetRemovedEmitter = new Emitter<string>();
  protected onActiveChangedEmitter = new Emitter<IWidget | undefined>();

  get onWidgetAdded() { return this.onWidgetAddedEmitter.event; }
  get onWidgetRemoved() { return this.onWidgetRemovedEmitter.event; }
  get onActiveWidgetChanged() { return this.onActiveChangedEmitter.event; }

  constructor(id: string, title: WidgetTitle) {
    super(id, title);
  }

  addWidget(widget: IWidget, options?: ViewWidgetOptions): Disposable {
    this.widgets.push(widget);
    if (options?.order !== undefined) {
      this.widgets.sort((a, b) => {
        return (options.order ?? 0) - 0;
      });
    }
    this.onWidgetAddedEmitter.fire(widget);
    if (!this.activeWidget) {
      this.setActiveWidget(widget.id);
    }
    return { dispose: () => this.removeWidget(widget.id) };
  }

  removeWidget(id: string): void {
    const idx = this.widgets.findIndex(w => w.id === id);
    if (idx === -1) return;
    this.widgets.splice(idx, 1);
    this.onWidgetRemovedEmitter.fire(id);
    if (this.activeWidget?.id === id) {
      this.setActiveWidget(this.widgets[0]?.id || '');
    }
  }

  getWidgets(): IWidget[] {
    return [...this.widgets];
  }

  getActiveWidget(): IWidget | undefined {
    return this.activeWidget;
  }

  setActiveWidget(id: string): void {
    const widget = this.widgets.find(w => w.id === id);
    if (widget) {
      this.activeWidget = widget;
      this.onActiveChangedEmitter.fire(widget);
    }
  }
}
