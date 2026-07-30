import { injectable } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { IDEIA_BacklogWidget } from './ideia-backlog-widget';
const logger = createLogger('ideia-backlog-contribution');

@injectable()
export class IDEIA_BacklogViewContribution extends AbstractViewContribution<IDEIA_BacklogWidget> {
  constructor() {
    super({
      widgetId: IDEIA_BacklogWidget.ID,
      widgetName: IDEIA_BacklogWidget.LABEL,
      defaultWidgetOptions: { area: 'right', rank: 91 },
      toggleCommandId: 'ideia:backlog',
    });
  }
}
