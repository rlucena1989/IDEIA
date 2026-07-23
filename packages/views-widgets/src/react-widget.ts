import { IReactWidget, WidgetTitle } from './types';
import { BaseWidget } from './widget-core';

export abstract class ReactWidget extends BaseWidget implements IReactWidget {
  private renderCount = 0;

  constructor(id: string, title: WidgetTitle) {
    super(id, title);
  }

  abstract render(): React.ReactNode;

  forceUpdate(): void {
    this.renderCount++;
    this.onActivatedEmitter.fire(void 0);
  }

  getRenderCount(): number {
    return this.renderCount;
  }
}
