import { Emitter, Disposable, DisposableCollection } from '@ideia/core-contributions';
import { IWidget } from '@ideia/views-widgets';
import { IShellLayout, IShellArea, ShellArea, ShellWidgetOptions, ShellAreaState } from './types';

export class DefaultShellArea implements IShellArea {
  readonly id: ShellArea;
  private _widgets: IWidget[] = [];
  private _visible = true;
  private _size = 300;
  private _activeWidgetId?: string;

  get widgets(): IWidget[] { return [...this._widgets]; }
  get visible(): boolean { return this._visible; }

  constructor(id: ShellArea) {
    this.id = id;
  }

  show(): void { this._visible = true; }
  hide(): void { this._visible = false; }
  toggle(): void { this._visible = !this._visible; }
  setSize(size: number): void { this._size = size; }
  getSize(): number { return this._size; }

  addWidget(widget: IWidget): void {
    this._widgets.push(widget);
    if (!this._activeWidgetId) {
      this._activeWidgetId = widget.id;
    }
  }

  removeWidget(id: string): void {
    this._widgets = this._widgets.filter(w => w.id !== id);
    if (this._activeWidgetId === id) {
      this._activeWidgetId = this._widgets[0]?.id;
    }
  }

  getWidget(id: string): IWidget | undefined {
    return this._widgets.find(w => w.id === id);
  }

  setActiveWidget(id: string): void {
    if (this._widgets.find(w => w.id === id)) {
      this._activeWidgetId = id;
    }
  }

  getActiveWidget(): IWidget | undefined {
    return this._widgets.find(w => w.id === this._activeWidgetId);
  }

  serialize(): ShellAreaState {
    return {
      id: this.id,
      visible: this._visible,
      size: this._size,
      activeWidgetId: this._activeWidgetId,
      widgetOrder: this._widgets.map(w => w.id),
    };
  }

  deserialize(state: ShellAreaState): void {
    this._visible = state.visible;
    this._size = state.size;
    this._activeWidgetId = state.activeWidgetId;
  }
}

export class DefaultShellLayout implements IShellLayout {
  readonly areas: Record<ShellArea, IShellArea>;
  private disposables = new DisposableCollection();

  private onWidgetAddedEmitter = new Emitter<{ area: ShellArea; widget: IWidget }>();
  private onWidgetRemovedEmitter = new Emitter<{ area: ShellArea; widgetId: string }>();
  private onLayoutChangedEmitter = new Emitter<void>();

  get onWidgetAdded() { return this.onWidgetAddedEmitter.event; }
  get onWidgetRemoved() { return this.onWidgetRemovedEmitter.event; }
  get onLayoutChanged() { return this.onLayoutChangedEmitter.event; }

  constructor() {
    this.areas = {
      main: new DefaultShellArea('main'),
      left: new DefaultShellArea('left'),
      right: new DefaultShellArea('right'),
      bottom: new DefaultShellArea('bottom'),
      top: new DefaultShellArea('top'),
    };
  }

  addWidget(widget: IWidget, area: ShellArea, options?: ShellWidgetOptions): Disposable {
    const shellArea = this.areas[area];
    shellArea.addWidget(widget);
    this.onWidgetAddedEmitter.fire({ area, widget });
    this.onLayoutChangedEmitter.fire(void 0);

    return {
      dispose: () => {
        this.removeWidget(widget.id);
      },
    };
  }

  removeWidget(id: string): void {
    for (const [areaKey, area] of Object.entries(this.areas)) {
      const widget = area.getWidget(id);
      if (widget) {
        area.removeWidget(id);
        this.onWidgetRemovedEmitter.fire({ area: areaKey as ShellArea, widgetId: id });
        this.onLayoutChangedEmitter.fire(void 0);
        return;
      }
    }
  }

  getWidget(area: ShellArea, id: string): IWidget | undefined {
    return this.areas[area].getWidget(id);
  }

  getWidgets(area: ShellArea): IWidget[] {
    return this.areas[area].widgets;
  }

  setActiveWidget(area: ShellArea, id: string): void {
    this.areas[area].setActiveWidget(id);
  }

  getActiveWidget(area: ShellArea): IWidget | undefined {
    return this.areas[area].getActiveWidget();
  }

  serialize(): Record<ShellArea, ShellAreaState> {
    const result = {} as Record<ShellArea, ShellAreaState>;
    for (const [key, area] of Object.entries(this.areas)) {
      result[key as ShellArea] = area.serialize();
    }
    return result;
  }

  deserialize(states: Record<ShellArea, ShellAreaState>): void {
    for (const [key, state] of Object.entries(states)) {
      this.areas[key as ShellArea].deserialize(state);
    }
    this.onLayoutChangedEmitter.fire(void 0);
  }
}
