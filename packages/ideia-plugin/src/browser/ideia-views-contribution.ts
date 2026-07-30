import { injectable } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { IDEIA_DashboardWidget } from './ideia-dashboard-widget';
import { IDEIA_ApprovalWidget } from './ideia-approval-widget';
import { IDEIA_DiffWidget } from './ideia-diff-widget';
import { IDEIA_StudiesWidget } from './ideia-studies-widget';
import { IDEIA_SuggestionsWidget } from './ideia-suggestions-widget';
import { IDEIA_SecurityWidget } from './ideia-security-widget';
const logger = createLogger('ideia-views-contribution');

@injectable()
export class IDEIA_DashboardViewContribution extends AbstractViewContribution<IDEIA_DashboardWidget> {
  constructor() {
    super({
      widgetId: IDEIA_DashboardWidget.ID,
      widgetName: IDEIA_DashboardWidget.LABEL,
      defaultWidgetOptions: { area: 'right', rank: 200 },
      toggleCommandId: 'ideia:dashboard',
    });
  }
}

@injectable()
export class IDEIA_ApprovalViewContribution extends AbstractViewContribution<IDEIA_ApprovalWidget> {
  constructor() {
    super({
      widgetId: IDEIA_ApprovalWidget.ID,
      widgetName: IDEIA_ApprovalWidget.LABEL,
      defaultWidgetOptions: { area: 'right', rank: 150 },
      toggleCommandId: 'ideia:approvals',
    });
  }
}

@injectable()
export class IDEIA_DiffViewContribution extends AbstractViewContribution<IDEIA_DiffWidget> {
  constructor() {
    super({
      widgetId: IDEIA_DiffWidget.ID,
      widgetName: IDEIA_DiffWidget.LABEL,
      defaultWidgetOptions: { area: 'main' },
      toggleCommandId: 'ideia:diff',
    });
  }
}

@injectable()
export class IDEIA_StudiesViewContribution extends AbstractViewContribution<IDEIA_StudiesWidget> {
  constructor() {
    super({
      widgetId: IDEIA_StudiesWidget.ID,
      widgetName: IDEIA_StudiesWidget.LABEL,
      defaultWidgetOptions: { area: 'right', rank: 180 },
      toggleCommandId: 'ideia:studies',
    });
  }
}

@injectable()
export class IDEIA_SuggestionsViewContribution extends AbstractViewContribution<IDEIA_SuggestionsWidget> {
  constructor() {
    super({
      widgetId: IDEIA_SuggestionsWidget.ID,
      widgetName: IDEIA_SuggestionsWidget.LABEL,
      defaultWidgetOptions: { area: 'right', rank: 170 },
      toggleCommandId: 'ideia:suggestions',
    });
  }
}

@injectable()
export class IDEIA_SecurityViewContribution extends AbstractViewContribution<IDEIA_SecurityWidget> {
  constructor() {
    super({
      widgetId: IDEIA_SecurityWidget.ID,
      widgetName: IDEIA_SecurityWidget.LABEL,
      defaultWidgetOptions: { area: 'right', rank: 160 },
      toggleCommandId: 'ideia:security',
    });
  }
}
