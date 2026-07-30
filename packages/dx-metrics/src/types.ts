export interface DevExMetric { name: string; value: number; unit: string; timestamp: string; tags: Record<string, string> }

export interface DevExScorecard {
  category: string; weight: number; score: number; maxScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F'; trend: 'improving' | 'stable' | 'declining'
}

export interface DevExAlert { id: string; metric: string; threshold: number; actual: number; severity: 'warning' | 'critical'; timestamp: string; message: string }

export interface DORAMetrics { deployFrequency: number; leadTimeHours: number; changeFailureRate: number; recoveryTimeMinutes: number }
