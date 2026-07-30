export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export const enum MessageType {
  REQUEST = 0x01,
  RESPONSE = 0x02,
  NOTIFICATION = 0x03,
  CANCEL = 0x04,
}

export const enum Compression {
  NONE = 0,
  GZIP = 1,
  ZSTD = 2,
}

export interface MessageHeader {
  length: number;
  messageType: MessageType;
  compression: Compression;
  streamId: number;
}

export interface RemoteConnection {
  id: string;
  status: ConnectionStatus;
  host: string;
  port: number;
  protocol: string;
  createdAt: number;
  lastActivity: number;
}

export interface ExtensionHostConfig {
  host: string;
  port: number;
  protocol: 'wss' | 'tcp' | 'ssh';
  token: string;
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: 'created' | 'running' | 'stopped' | 'error';
  ports: number[];
  mounts: string[];
  startedAt: number;
}

export interface DevContainerConfig {
  image: string;
  features: string[];
  mounts: { src: string; dest: string; type: string }[];
  env: Record<string, string>;
  lifecycle: { postCreate: string; postStart: string; postAttach: string };
  forwardPorts: number[];
}

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  authMethod: 'key' | 'password' | 'agent';
  privateKey?: string;
  password?: string;
  passphrase?: string;
}

export interface SSHResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export interface PortForward {
  id: string;
  localPort: number;
  remotePort: number;
  protocol: 'tcp' | 'udp';
  status: 'active' | 'stopped' | 'error';
}

export interface TransferResult {
  success: boolean;
  path: string;
  bytesTransferred: number;
  duration: number;
  error?: string;
}

export interface TunnelConfig {
  name: string;
  localHost: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
  protocol: string;
  type: 'local-to-remote' | 'remote-to-local';
}

export interface Tunnel {
  id: string;
  config: TunnelConfig;
  status: 'active' | 'closed' | 'error';
  createdAt: number;
  bytesTransferred: number;
}

export interface WorkspaceConfig {
  name: string;
  image: string;
  ports: number[];
  env: Record<string, string>;
  resources: { cpu: number; memory: number; storage: number };
  timeout: number;
  autoHibernate: boolean;
}

export interface Workspace {
  id: string;
  config: WorkspaceConfig;
  status: 'creating' | 'ready' | 'active' | 'hibernating' | 'destroyed' | 'error';
  createdAt: number;
  lastActivity: number;
}

export interface SessionConfig {
  userId: string;
  workspaceId: string;
  token: string;
  expiry: number;
  authProvider: 'github' | 'gitlab' | 'google' | 'oidc';
}

export interface Session {
  id: string;
  config: SessionConfig;
  status: 'active' | 'expired' | 'revoked';
  createdAt: number;
  lastActivity: number;
  ip: string;
}
