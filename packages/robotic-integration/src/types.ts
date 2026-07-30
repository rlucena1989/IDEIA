export interface ExternalSystem { id: string; name: string; type: 'api' | 'db' | 'queue' | 'file'; protocol: string; endpoint: string }
export interface IntegrationAdapter { id: string; systemId: string; direction: 'inbound' | 'outbound' | 'bidirectional'; transform: string; status: 'active' | 'inactive' }
export interface IntegrationFlow { id: string; name: string; source: string; target: string; steps: FlowStep[] }
export interface FlowStep { id: string; action: string; adapter: string; timeout: number; retries: number }
export interface IntegrationHealth { systemId: string; connected: boolean; latencyMs: number; lastSuccess: string; errorRate: number }
