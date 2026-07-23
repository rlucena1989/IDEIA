export type ADRStatus = 'proposed' | 'accepted' | 'deprecated' | 'superseded';
export interface ArchitecturalDecision { id: string; title: string; status: ADRStatus; context: string; decision: string; consequences: string[]; options: { name: string; pros: string[]; cons: string[] }[]; tags: string[]; createdAt: string; updatedAt: string; supersededBy?: string; }
export interface ADRSummary { total: number; byStatus: Record<string,number>; recent: ArchitecturalDecision[]; }
export interface TradeOffAnalysis { decisionId: string; chosen: string; runnersUp: string[]; riskLevel: 'low'|'medium'|'high'; confidence: number; }
