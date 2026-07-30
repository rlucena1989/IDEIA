import { IReactWidget, WidgetTitle } from './types';
import { createLogger } from '@ideia/logger';
import { BaseWidget } from './widget-core';
const logger = createLogger('react-widget');

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
