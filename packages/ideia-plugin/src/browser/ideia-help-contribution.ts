import { injectable } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { IDEIA_HelpWidget } from './ideia-help-widget';
const logger = createLogger('ideia-help-contribution');

@injectable()
export class IDEIA_HelpViewContribution extends AbstractViewContribution<IDEIA_HelpWidget> {
  constructor() {
    super({
      widgetId: IDEIA_HelpWidget.ID,
      widgetName: IDEIA_HelpWidget.LABEL,
      defaultWidgetOptions: { area: 'right', rank: 95 },
      toggleCommandId: 'ideia:help',
    });
  }
}
