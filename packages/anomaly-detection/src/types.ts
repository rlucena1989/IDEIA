export type AnomalyType = 'spike' | 'drop' | 'trend-change' | 'seasonal-deviation' | 'pattern-break'
export type DetectionMethod = 'zscore' | 'mad' | 'iqr' | 'ewma' | 'dbscan'
export type Severity = 'info' | 'warning' | 'critical'

export interface DataPoint {
  timestamp: string
  value: number
  label?: string
}

export interface AnomalyResult {
  id: string
  type: AnomalyType
  method: DetectionMethod
  score: number
  severity: Severity
  expectedValue: number
  actualValue: number
  deviation: number
  timestamp: string
  description: string
}

export interface DetectorConfig {
  method: DetectionMethod
  windowSize: number
  threshold: number
  minDataPoints: number
  sensitivity: number
}

export interface DetectionReport {
  period: string
  totalPoints: number
  anomaliesFound: number
  anomalies: AnomalyResult[]
  falsePositiveRate: number
  recommendations: string[]
}
