export interface DomainEntity { id: string; name: string; attributes: Record<string, unknown>; relationships: string[] }
export interface BusinessProcess { id: string; name: string; steps: ProcessStep[]; domain: string; criticality: 'low' | 'medium' | 'high' }
export interface ProcessStep { id: string; action: string; entity: string; condition?: string; timeout: number }
export interface ERPModule { name: string; entities: DomainEntity[]; processes: BusinessProcess[]; integrations: string[] }
export interface IntegrationPattern { from: string; to: string; type: 'sync' | 'async' | 'event'; protocol: string; contract: string }
export interface SystemArchitecture { modules: ERPModule[]; integrations: IntegrationPattern[]; patterns: string[] }
