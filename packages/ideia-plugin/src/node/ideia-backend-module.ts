import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common/messaging';
import { createBus, EventBus } from '@ideia/event-bus';

import {
  IDEIA_CHAT_PATH, IDEIA_TASK_PATH, IDEIA_AGENT_PATH,
  IDEIA_MEMORY_PATH, IDEIA_DASHBOARD_PATH,
  IDEIA_SUGGESTIONS_PATH, IDEIA_STUDIES_PATH, IDEIA_SEARCH_PATH, IDEIA_SECURITY_PATH,
  IDEIA_CHAT_SERVICE, IDEIA_TASK_SERVICE, IDEIA_AGENT_SERVICE,
  IDEIA_MEMORY_SERVICE, IDEIA_DASHBOARD_SERVICE,
  IDEIA_SUGGESTIONS_SERVICE, IDEIA_STUDIES_SERVICE, IDEIA_SEARCH_SERVICE, IDEIA_SECURITY_SERVICE,
} from '../common/ideia-protocol';

import { IDEIA_ChatBackendService } from './ideia-chat-service';
import { IDEIA_TaskRunner } from './ideia-task-service';
import { IDEIA_AgentBackendService } from './ideia-agent-service';
import { IDEIA_MemoryBackendService } from './ideia-memory-service';
import { IDEIA_DashboardBackendService } from './ideia-dashboard-service';
import { IDEIA_SuggestionsBackendService } from './ideia-suggestions-service';
import { IDEIA_StudiesBackendService } from './ideia-studies-service';
import { IDEIA_SearchBackendService } from './ideia-search-service';
import { IDEIA_SecurityBackendService } from './ideia-security-service';

export default new ContainerModule(bind => {
  bind(EventBus).toDynamicValue(async () => createBus({ memory: { maxHistory: 5000 } })).inSingletonScope();

  bind(IDEIA_TaskRunner).toSelf().inSingletonScope();
  bind(IDEIA_TASK_SERVICE).toService(IDEIA_TaskRunner);

  bind(IDEIA_ChatBackendService).toSelf().inSingletonScope();
  bind(IDEIA_CHAT_SERVICE).toService(IDEIA_ChatBackendService);

  bind(IDEIA_AgentBackendService).toSelf().inSingletonScope();
  bind(IDEIA_AGENT_SERVICE).toService(IDEIA_AgentBackendService);

  bind(IDEIA_MemoryBackendService).toSelf().inSingletonScope();
  bind(IDEIA_MEMORY_SERVICE).toService(IDEIA_MemoryBackendService);

  bind(IDEIA_DashboardBackendService).toSelf().inSingletonScope();
  bind(IDEIA_DASHBOARD_SERVICE).toService(IDEIA_DashboardBackendService);

  bind(IDEIA_SuggestionsBackendService).toSelf().inSingletonScope();
  bind(IDEIA_SUGGESTIONS_SERVICE).toService(IDEIA_SuggestionsBackendService);

  bind(IDEIA_StudiesBackendService).toSelf().inSingletonScope();
  bind(IDEIA_STUDIES_SERVICE).toService(IDEIA_StudiesBackendService);

  bind(IDEIA_SearchBackendService).toSelf().inSingletonScope();
  bind(IDEIA_SEARCH_SERVICE).toService(IDEIA_SearchBackendService);

  bind(IDEIA_SecurityBackendService).toSelf().inSingletonScope();
  bind(IDEIA_SECURITY_SERVICE).toService(IDEIA_SecurityBackendService);

  bind(ConnectionHandler).toDynamicValue(ctx =>
    new JsonRpcConnectionHandler(IDEIA_CHAT_PATH, () =>
      ctx.container.get(IDEIA_CHAT_SERVICE)),
  );

  bind(ConnectionHandler).toDynamicValue(ctx =>
    new JsonRpcConnectionHandler(IDEIA_TASK_PATH, () =>
      ctx.container.get(IDEIA_TASK_SERVICE)),
  );

  bind(ConnectionHandler).toDynamicValue(ctx =>
    new JsonRpcConnectionHandler(IDEIA_AGENT_PATH, () =>
      ctx.container.get(IDEIA_AGENT_SERVICE)),
  );

  bind(ConnectionHandler).toDynamicValue(ctx =>
    new JsonRpcConnectionHandler(IDEIA_MEMORY_PATH, () =>
      ctx.container.get(IDEIA_MEMORY_SERVICE)),
  );

  bind(ConnectionHandler).toDynamicValue(ctx =>
    new JsonRpcConnectionHandler(IDEIA_DASHBOARD_PATH, () =>
      ctx.container.get(IDEIA_DASHBOARD_SERVICE)),
  );

  bind(ConnectionHandler).toDynamicValue(ctx =>
    new JsonRpcConnectionHandler(IDEIA_SUGGESTIONS_PATH, () =>
      ctx.container.get(IDEIA_SUGGESTIONS_SERVICE)),
  );

  bind(ConnectionHandler).toDynamicValue(ctx =>
    new JsonRpcConnectionHandler(IDEIA_STUDIES_PATH, () =>
      ctx.container.get(IDEIA_STUDIES_SERVICE)),
  );

  bind(ConnectionHandler).toDynamicValue(ctx =>
    new JsonRpcConnectionHandler(IDEIA_SEARCH_PATH, () =>
      ctx.container.get(IDEIA_SEARCH_SERVICE)),
  );

  bind(ConnectionHandler).toDynamicValue(ctx =>
    new JsonRpcConnectionHandler(IDEIA_SECURITY_PATH, () =>
      ctx.container.get(IDEIA_SECURITY_SERVICE)),
  );
});
