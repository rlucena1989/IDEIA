import { ContainerModule } from '@theia/core/shared/inversify';
import { bindViewContribution } from '@theia/core/lib/browser';
import { WidgetFactory } from '@theia/core/lib/browser/widget-manager';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { PreferenceContribution } from '@theia/core/lib/common/preferences/preference-schema';
import { StylingParticipant } from '@theia/core/lib/browser/styling-service';
import { ColorContribution } from '@theia/core/lib/browser/color-application-contribution';

import { IDEIA_ChatWidget } from './ideia-chat-widget';
import { IDEIA_ChatContribution } from './ideia-chat-contribution';
import { IDEIA_DiffWidget } from './ideia-diff-widget';
import { IDEIA_ApprovalWidget } from './ideia-approval-widget';
import { IDEIA_DashboardWidget } from './ideia-dashboard-widget';
import { IDEIA_FileWidget } from './ideia-file-widget';
import { IDEIA_StudiesWidget } from './ideia-studies-widget';
import { IDEIA_SuggestionsWidget } from './ideia-suggestions-widget';
import { IDEIA_SecurityWidget } from './ideia-security-widget';
import { IDEIA_SearchOverlay } from './ideia-search-overlay';
import { IDEIA_DashboardViewContribution, IDEIA_ApprovalViewContribution, IDEIA_DiffViewContribution, IDEIA_StudiesViewContribution, IDEIA_SuggestionsViewContribution, IDEIA_SecurityViewContribution } from './ideia-views-contribution';
import { IDEIA_MarkerContribution } from './ideia-marker-contribution';
import { IDEIA_OutputContribution } from './ideia-output-contribution';
import { IDEIA_StatusBarContribution } from './ideia-statusbar-contribution';
import { IDEIA_ProgressContribution } from './ideia-progress-contribution';
import { IDEIA_CHAT_SERVICE, IDEIA_TASK_SERVICE, IDEIA_AGENT_SERVICE, IDEIA_MEMORY_SERVICE, IDEIA_DASHBOARD_SERVICE, IDEIA_SUGGESTIONS_SERVICE, IDEIA_STUDIES_SERVICE, IDEIA_SEARCH_SERVICE, IDEIA_SECURITY_SERVICE } from '../common/ideia-protocol';
import {
  IDEIA_ChatClient,
  IDEIA_TaskClient,
  IDEIA_AgentClient,
  IDEIA_MemoryClient,
  IDEIA_DashboardClient,
  IDEIA_SuggestionsClient,
  IDEIA_StudiesClient,
  IDEIA_SearchClient,
  IDEIA_SecurityClient,
} from './ideia-service-client';
import { IdeiaCustomTitleWidget } from './ideia-title-bar-widget';
import { IdeiaStylingParticipant } from './ideia-styles';
import { IDEIA_PreferenceSchema } from './ideia-preferences-contribution';
import { IDEIA_LifecycleContribution } from './ideia-lifecycle-contribution';
import { IDEIA_ColorContribution } from './ideia-theme-registration';

export default new ContainerModule(bind => {
  bindViewContribution(bind, IDEIA_ChatContribution);
  bindViewContribution(bind, IDEIA_DashboardViewContribution);
  bindViewContribution(bind, IDEIA_ApprovalViewContribution);
  bindViewContribution(bind, IDEIA_DiffViewContribution);
  bindViewContribution(bind, IDEIA_StudiesViewContribution);
  bindViewContribution(bind, IDEIA_SuggestionsViewContribution);
  bindViewContribution(bind, IDEIA_SecurityViewContribution);

  bind(IDEIA_ChatWidget).toSelf().inSingletonScope();
  bind(WidgetFactory).toDynamicValue(ctx => ({
    id: IDEIA_ChatWidget.ID,
    createWidget: () => ctx.container.get(IDEIA_ChatWidget),
  }));

  bind(IDEIA_DiffWidget).toSelf().inTransientScope();
  bind(WidgetFactory).toDynamicValue(ctx => ({
    id: IDEIA_DiffWidget.ID,
    createWidget: () => ctx.container.get(IDEIA_DiffWidget),
  }));

  bind(IDEIA_ApprovalWidget).toSelf().inSingletonScope();
  bind(WidgetFactory).toDynamicValue(ctx => ({
    id: IDEIA_ApprovalWidget.ID,
    createWidget: () => ctx.container.get(IDEIA_ApprovalWidget),
  }));

  bind(IDEIA_DashboardWidget).toSelf().inSingletonScope();
  bind(WidgetFactory).toDynamicValue(ctx => ({
    id: IDEIA_DashboardWidget.ID,
    createWidget: () => ctx.container.get(IDEIA_DashboardWidget),
  }));

  bind(IDEIA_FileWidget).toSelf().inSingletonScope();
  bind(WidgetFactory).toDynamicValue(ctx => ({
    id: IDEIA_FileWidget.ID,
    createWidget: () => ctx.container.get(IDEIA_FileWidget),
  }));

  bind(IDEIA_StudiesWidget).toSelf().inSingletonScope();
  bind(WidgetFactory).toDynamicValue(ctx => ({
    id: IDEIA_StudiesWidget.ID,
    createWidget: () => ctx.container.get(IDEIA_StudiesWidget),
  }));

  bind(IDEIA_SuggestionsWidget).toSelf().inSingletonScope();
  bind(WidgetFactory).toDynamicValue(ctx => ({
    id: IDEIA_SuggestionsWidget.ID,
    createWidget: () => ctx.container.get(IDEIA_SuggestionsWidget),
  }));

  bind(IDEIA_SecurityWidget).toSelf().inSingletonScope();
  bind(WidgetFactory).toDynamicValue(ctx => ({
    id: IDEIA_SecurityWidget.ID,
    createWidget: () => ctx.container.get(IDEIA_SecurityWidget),
  }));

  bind(IDEIA_SearchOverlay).toSelf().inSingletonScope();

  bind(IDEIA_CHAT_SERVICE).to(IDEIA_ChatClient).inSingletonScope();
  bind(IDEIA_TASK_SERVICE).to(IDEIA_TaskClient).inSingletonScope();
  bind(IDEIA_AGENT_SERVICE).to(IDEIA_AgentClient).inSingletonScope();
  bind(IDEIA_MEMORY_SERVICE).to(IDEIA_MemoryClient).inSingletonScope();
  bind(IDEIA_DASHBOARD_SERVICE).to(IDEIA_DashboardClient).inSingletonScope();
  bind(IDEIA_SUGGESTIONS_SERVICE).to(IDEIA_SuggestionsClient).inSingletonScope();
  bind(IDEIA_STUDIES_SERVICE).to(IDEIA_StudiesClient).inSingletonScope();
  bind(IDEIA_SEARCH_SERVICE).to(IDEIA_SearchClient).inSingletonScope();
  bind(IDEIA_SECURITY_SERVICE).to(IDEIA_SecurityClient).inSingletonScope();

  bind(IDEIA_MarkerContribution).toSelf().inSingletonScope();
  bind(IDEIA_OutputContribution).toSelf().inSingletonScope();
  bind(FrontendApplicationContribution).to(IDEIA_StatusBarContribution).inSingletonScope();
  bind(IDEIA_ProgressContribution).toSelf().inSingletonScope();

  bind(PreferenceContribution).toConstantValue(IDEIA_PreferenceSchema);

  bind(FrontendApplicationContribution).to(IDEIA_LifecycleContribution).inSingletonScope();
  bind(ColorContribution).to(IDEIA_ColorContribution).inSingletonScope();

  bind(IdeiaCustomTitleWidget).toSelf().inSingletonScope();
  bind(FrontendApplicationContribution).to(IdeiaCustomTitleWidget).inSingletonScope();

  bind(StylingParticipant).to(IdeiaStylingParticipant).inSingletonScope();
});