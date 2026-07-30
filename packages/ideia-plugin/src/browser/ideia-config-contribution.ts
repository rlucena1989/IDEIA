import { injectable } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { IDEIA_ConfigWidget } from './ideia-config-widget';
const logger = createLogger('ideia-config-contribution');

@injectable()
export class IDEIA_ConfigViewContribution extends AbstractViewContribution<IDEIA_ConfigWidget> {
  constructor() {
    super({
      widgetId: IDEIA_ConfigWidget.ID,
      widgetName: IDEIA_ConfigWidget.LABEL,
      defaultWidgetOptions: { area: 'right', rank: 125 },
      toggleCommandId: 'ideia:config',
    });
  }
}
