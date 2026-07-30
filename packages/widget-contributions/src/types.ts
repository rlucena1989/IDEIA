import { Contribution, Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
const logger = createLogger('types');

export interface WidgetFactory {
  readonly id: string;
  createWidget(options?: unknown): unknown;
  dispose?(widget: unknown): void;
}

export interface ViewContribution extends Contribution<unknown> {
  readonly viewId: string;
  readonly label: string;
  readonly iconClass?: string;
  readonly order?: number;
  readonly widgetFactory: WidgetFactory;
}

export interface WidgetManager {
  registerFactory(factory: WidgetFactory): Disposable;
  getFactory(id: string): WidgetFactory | undefined;
  createWidget(id: string, options?: unknown): unknown;
  getWidgets(): string[];
  onFactoryRegistered: import('@ideia/core-contributions').Event<WidgetFactory>;
}

export interface WidgetRestorer {
  storeState(id: string, state: unknown): void;
  restoreState<T>(id: string): T | undefined;
  clearState(id: string): void;
}
