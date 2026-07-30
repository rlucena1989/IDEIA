export type PermissionTier = 'T1' | 'T2' | 'T3' | 'T4';
export type PackageSource = 'pre-installed' | 'official' | 'community';
export type TransportType = 'stdio' | 'http' | 'websocket';
export type InstallStatus = 'installed' | 'not-installed' | 'updating' | 'error';
export type BundleFormat = 'mcpbundle';

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  permissionTier: PermissionTier;
  category: string;
  timeout?: number;
}

export interface MCPServerDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  tools: MCPToolDefinition[];
  configSchema?: Record<string, unknown>;
  permissions: PermissionTier[];
  source: PackageSource;
  verified: boolean;
  downloads: number;
  rating: number;
  tags: string[];
  repository?: string;
  author?: string;
  homepage?: string;
}

export interface MarketplacePackage {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  tags: string[];
  tools: MCPToolDefinition[];
  configSchema: Record<string, unknown>;
  permissions: PermissionTier[];
  source: PackageSource;
  verified: boolean;
  downloads: number;
  rating: number;
  metadata: Record<string, unknown>;
}

export interface ToolExecutionRequest {
  toolName: string;
  args: Record<string, unknown>;
  timeout?: number;
  retry?: number;
}

export interface ToolExecutionResult {
  success: boolean;
  output: unknown;
  duration: number;
  error?: string;
}

export interface PermissionCheck {
  allowed: boolean;
  tier: PermissionTier;
  approvalRequired: boolean;
  approvalStrategy?: string;
  requiredApprovals?: number;
  approverPool?: string[];
  reason?: string;
}

export interface OfflineBundle {
  formatVersion: string;
  packageName: string;
  version: string;
  createdAt: string;
  files: Array<{ path: string; size: number; sha256: string }>;
  dependencies: Array<{ name: string; version: string; sha256: string }>;
  signature?: { algorithm: string; value: string; keyId: string };
}

export interface RatingReview {
  id: string;
  packageName: string;
  userId: string;
  rating: number;
  review: string;
  timestamp: Date;
  helpful: number;
  verified: boolean;
}

export interface PluginRating {
  total: number;
  dimensions: { schemaQuality: number; documentation: number; testCoverage: number; security: number; popularity: number };
  breakdown: Record<string, { score: number; maxScore: number; checks: Array<{ check: string; passed: boolean; weight: number }> }>;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface MCPClientConnection {
  serverId: string;
  transport: TransportType;
  endpoint: string;
  status: 'connected' | 'disconnected' | 'error';
  connectedAt?: Date;
  lastHeartbeat?: Date;
}
