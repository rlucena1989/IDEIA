export interface RiskNode { id: string; name: string; type: 'root' | 'intermediate' | 'leaf'; prior: number; posterior?: number }
export interface CausalEdge { from: string; to: string; strength: number; relationship: 'positive' | 'negative' }
export interface BayesianNetwork { nodes: RiskNode[]; edges: CausalEdge[] }
export interface RiskInference { nodeId: string; prior: number; posterior: number; likelihood: number; evidence: string }
export interface RiskReport { overallRisk: number; topRisks: Array<{ name: string; probability: number }>; recommendations: string[] }

export interface RiskNodeDefinition { id?: string; name: string; type?: string; prior?: number; description?: string; factors?: string[]; cpt: Record<string, number>; parents: string[]; values: string[]; [key: string]: unknown }
export interface Factor { id: string; name: string; weight?: number; direction?: string; source?: string; variables: string[]; values: string[]; parents: string[]; cpt: Record<string, number>; probability?: number; [key: string]: unknown }
export interface SCMNode { id: string; name: string; equation: (...args: unknown[]) => unknown; noise: string; parents: string[]; domain?: string; [key: string]: unknown }
export interface GraphEdge { source: string; target: string; weight: number; label?: string; type: string; [key: string]: unknown }
export interface DiscoveredGraph { nodes: string[]; edges: GraphEdge[]; score: number; adjacencyMatrix: number[][] }
export interface IndependenceTestResult { independent: boolean; pValue: number; statistic: number; x?: string; y?: string; conditioningSet?: string[] }
export interface PolicyRiskRequest { policyId?: string; policyName?: string; policyType?: string; parameters?: Record<string, unknown>; environment?: Record<string, unknown>; action?: string; context?: Record<string, unknown>; requestId?: string; agentId?: string; [key: string]: unknown }
export interface PolicyRiskResponse { riskScore?: number; confidence?: number; factors?: Array<{ name: string; contribution: number }>; recommendations?: string[]; decision?: string; causalEffect?: Record<string, unknown>; bottlenecks?: string[]; paths?: string[]; [key: string]: unknown }
export interface CausalEffectVisualization { nodes: Array<{ id: string; label: string; value: number }>; edges: Array<{ source: string; target: string; strength: number }>; interventions: Array<{ node: string; effect: number }>; dagMermaid?: string; [key: string]: unknown }
export interface ParameterLearningResult { success: boolean; learnedParams: Record<string, number>; confidence: number; iterations: number; nodeName?: string }
export interface RiskAuditEntry { timestamp: string; action: string; policyId: string; riskScore: number; userId: string; hash?: string; decision?: string; previousHash?: string; [key: string]: unknown }
export interface RiskQuantification { valueAtRisk?: number; expectedShortfall?: number; probabilityOfDefault?: number; lossDistribution?: number[]; probabilityOfFailure?: number; expectedLoss?: number; conditionalVaR?: number; [key: string]: unknown }
export interface SensitivityReport { parameter: string; baseValue: number; range: [number, number]; impact: 'high' | 'medium' | 'low'; elasticity: number; variableImpacts?: Array<{ variable: string; impact: number }>; [key: string]: unknown }