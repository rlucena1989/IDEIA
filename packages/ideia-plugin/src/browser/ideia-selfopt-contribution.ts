import { injectable } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { IDEIA_SelfOptWidget } from './ideia-selfopt-widget';
const logger = createLogger('ideia-selfopt-contribution');

@injectable()
export class IDEIA_SelfOptViewContribution extends AbstractViewContribution<IDEIA_SelfOptWidget> {
  constructor() {
    super({
      widgetId: IDEIA_SelfOptWidget.ID,
      widgetName: IDEIA_SelfOptWidget.LABEL,
      defaultWidgetOptions: { area: 'right', rank: 130 },
      toggleCommandId: 'ideia:selfopt',
    });
  }
}
