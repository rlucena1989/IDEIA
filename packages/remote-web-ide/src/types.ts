export interface RemoteConnection { id: string; type: 'ssh' | 'container' | 'wsl' | 'tunnel'; host: string; status: 'connecting' | 'connected' | 'disconnected'; lastActivity: string }
export interface DevContainer { image: string; ports: Record<string, number>; volumes: string[]; features: string[]; postCreateCommand?: string }
export interface TunnelEndpoint { localPort: number; remoteHost: string; remotePort: number; protocol: 'tcp' | 'http' | 'ws' }
export interface WorkspaceSession { id: string; userId: string; container: DevContainer; startedAt: string; expiresAt: string; active: boolean }
export interface WebIDEConfig { maxSessions: number; defaultTimeout: number; allowedImages: string[]; resourceLimits: { cpu: number; memory: number } }
