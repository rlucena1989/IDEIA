// IDEIA Theia App — Backend entry
// Starts the Theia backend server with IDEIA plugin loaded

import { Container } from '@theia/core/shared/inversify';
import { backendApplicationModule } from '@theia/core/lib/node/backend-application-module';
import { messagingModule } from '@theia/core/lib/common/messaging/messaging-module';

import { ideiaBackendModule } from '@ideia/theia-plugin/lib/node/ideia-backend-module';

async function startBackend(): Promise<void> {
  const container = new Container();
  container.load(backendApplicationModule);
  container.load(messagingModule);
  container.load(ideiaBackendModule);

  const { BackendApplication } = await import('@theia/core/lib/node/backend-application');
  const app = container.get<BackendApplication>(BackendApplication);
  await app.start(3030, '127.0.0.1');
}

startBackend().catch(console.error);
