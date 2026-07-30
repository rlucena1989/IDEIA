export type WorkspaceStatus = 'creating' | 'running' | 'stopping' | 'stopped' | 'error';

export type TenantPlan = 'free' | 'pro' | 'enterprise';

export interface WorkspaceInstance {
  id: string;
  userId: string;
  orgId: string;
  status: WorkspaceStatus;
  containerImage: string;
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
  createdAt: string;
  lastAccessedAt: string;
}

export interface TenantConfig {
  orgId: string;
  plan: TenantPlan;
  quota: {
    maxWorkspaces: number;
    maxCpu: number;
    maxMemory: number;
    maxDisk: number;
  };
  features: string[];
}

export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}

export interface OidcConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

export interface SamlConfig {
  entryPoint: string;
  issuer: string;
  cert: string;
}

export interface SsoConfig {
  provider: 'oauth2' | 'oidc' | 'saml';
  label: string;
  config: OAuth2Config | OidcConfig | SamlConfig;
}

export interface AuthProvider {
  oauth2?: OAuth2Config;
  oidc?: OidcConfig;
  saml?: SamlConfig;
  sso?: SsoConfig[];
}

export interface SessionManager {
  createSession(userId: string, provider: string): Promise<string>;
  destroySession(token: string): Promise<void>;
  getSession(token: string): Promise<{ userId: string; provider: string; createdAt: string; expiresAt: string } | null>;
  listSessions(userId: string): Promise<string[]>;
}

export interface ResourceGovernor {
  allocateResources(orgId: string, resources: { cpu: number; memory: number; disk: number }): Promise<boolean>;
  releaseResources(orgId: string, resources: { cpu: number; memory: number; disk: number }): Promise<void>;
  getUsage(orgId: string): Promise<{ cpu: number; memory: number; disk: number }>;
  getQuota(orgId: string): Promise<{ maxCpu: number; maxMemory: number; maxDisk: number }>;
}

export interface ContainerOrchestrator {
  deployWorkspace(instance: WorkspaceInstance): Promise<void>;
  stopWorkspace(workspaceId: string): Promise<void>;
  getStatus(workspaceId: string): Promise<WorkspaceStatus>;
  listWorkspaces(orgId: string): Promise<WorkspaceInstance[]>;
}
