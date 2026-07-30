import { injectable } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { IDEIA_ProjOptWidget } from './ideia-projopt-widget';
const logger = createLogger('ideia-projopt-contribution');

@injectable()
export class IDEIA_ProjOptViewContribution extends AbstractViewContribution<IDEIA_ProjOptWidget> {
  constructor() {
    super({
      widgetId: IDEIA_ProjOptWidget.ID,
      widgetName: IDEIA_ProjOptWidget.LABEL,
      defaultWidgetOptions: { area: 'right', rank: 120 },
      toggleCommandId: 'ideia:projopt',
    });
  }
}
