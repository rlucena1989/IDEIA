import { injectable } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { IDEIA_MetricsView } from './ideia-metrics-view';
const logger = createLogger('ideia-metrics-contribution');

@injectable()
export class IDEIA_MetricsViewContribution extends AbstractViewContribution<IDEIA_MetricsView> {
  constructor() {
    super({
      widgetId: IDEIA_MetricsView.ID,
      widgetName: IDEIA_MetricsView.LABEL,
      defaultWidgetOptions: { area: 'right', rank: 92 },
      toggleCommandId: 'ideia:metrics',
    });
  }
}
