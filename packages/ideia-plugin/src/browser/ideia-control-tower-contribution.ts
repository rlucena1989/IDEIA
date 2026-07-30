import { injectable } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { IDEIA_ControlTowerWidget } from './ideia-control-tower-widget';
const logger = createLogger('ideia-control-tower-contribution');

@injectable()
export class IDEIA_ControlTowerViewContribution extends AbstractViewContribution<IDEIA_ControlTowerWidget> {
  constructor() {
    super({
      widgetId: IDEIA_ControlTowerWidget.ID,
      widgetName: IDEIA_ControlTowerWidget.LABEL,
      defaultWidgetOptions: { area: 'right', rank: 110 },
      toggleCommandId: 'ideia:control-tower',
    });
  }
}
