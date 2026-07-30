import { injectable } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { IDEIA_CockpitWidget } from './ideia-cockpit-widget';
const logger = createLogger('ideia-cockpit-contribution');

@injectable()
export class IDEIA_CockpitViewContribution extends AbstractViewContribution<IDEIA_CockpitWidget> {
  constructor() {
    super({
      widgetId: IDEIA_CockpitWidget.ID,
      widgetName: IDEIA_CockpitWidget.LABEL,
      defaultWidgetOptions: { area: 'right', rank: 90 },
      toggleCommandId: 'ideia:cockpit',
    });
  }
}
