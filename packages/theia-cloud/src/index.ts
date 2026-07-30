export type {
  ConnectionStatus,
  MessageType,
  Compression,
  MessageHeader,
  RemoteConnection,
  ExtensionHostConfig,
  ContainerInfo,
  DevContainerConfig,
  SSHConfig,
  SSHResult,
  PortForward,
  TransferResult,
  TunnelConfig,
  Tunnel,
  WorkspaceConfig,
  Workspace,
  SessionConfig,
  Session,
} from './types-remote';

export type {
  WorkspaceStatus,
  TenantPlan,
  WorkspaceInstance,
  TenantConfig,
  OAuth2Config,
  OidcConfig,
  SamlConfig,
  SsoConfig,
  AuthProvider,
  SessionManager as SessionManagerInterface,
  ResourceGovernor as ResourceGovernorInterface,
  ContainerOrchestrator,
} from './types';

export { RemoteExtensionHost } from './remote-extension-host';
export { DevContainers } from './dev-containers';
export { SSHRemote } from './ssh-remote';
export { TunnelService } from './tunnel-service';
export { WorkspaceManager } from './workspace-manager';
export { WebIDESession } from './web-ide-session';

export { ResourceGovernor } from './resource-governor';
export { SessionManager } from './session-manager';
