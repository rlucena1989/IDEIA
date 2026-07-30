import { injectable } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { IDEIA_ProjectPanelWidget } from './ideia-project-panel';
const logger = createLogger('ideia-project-panel-contribution');

@injectable()
export class IDEIA_ProjectPanelViewContribution extends AbstractViewContribution<IDEIA_ProjectPanelWidget> {
  constructor() {
    super({
      widgetId: IDEIA_ProjectPanelWidget.ID,
      widgetName: IDEIA_ProjectPanelWidget.LABEL,
      defaultWidgetOptions: { area: 'right', rank: 140 },
      toggleCommandId: 'ideia:project-panel',
    });
  }
}
