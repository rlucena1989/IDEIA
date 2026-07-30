export type CostSource = 'llm' | 'compute' | 'storage' | 'network' | 'ci-cd' | 'other';
export type Currency = 'USD' | 'BRL' | 'EUR';
export type Environment = 'dev' | 'staging' | 'prod';
export type BudgetPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type AlertSeverity = 'warning' | 'critical' | 'exceeded';
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel = 'low' | 'medium' | 'high';
export type OptimizationType = 'model_routing' | 'cache' | 'compression' | 'rightsizing' | 'spot' | 'other';
export type ReservationTerm = '1-year' | '3-year';
export type PaymentOption = 'no-upfront' | 'partial-upfront' | 'all-upfront';

export interface CostRecord {
  id: string;
  source: CostSource;
  provider: string;
  service: string;
  region: string;
  amount: number;
  currency: Currency;
  timestamp: Date;
  project: string;
  environment: Environment;
  tags: Record<string, string>;
  metadata: Record<string, unknown>;
}

export interface BudgetCategory {
  name: string;
  allocated: number;
  spent: number;
  remaining: number;
  threshold: number;
}

export interface BudgetAlert {
  type: AlertSeverity;
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  acknowledged: boolean;
}

export interface BudgetAllocation {
  id: string;
  project: string;
  period: BudgetPeriod;
  total: number;
  spent: number;
  remaining: number;
  categories: BudgetCategory[];
  alerts: BudgetAlert[];
  startDate: Date;
  endDate: Date;
}

export interface CostForecast {
  period: string;
  predictedCost: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  factors: Array<{ name: string; impact: number }>;
}

export interface CostAnomaly {
  id: string;
  source: string;
  expectedCost: number;
  actualCost: number;
  deviation: number;
  severity: AnomalySeverity;
  detectedAt: Date;
  possibleCauses: string[];
  recommendedAction: string;
}

export interface ResourceMetric {
  resourceId: string;
  resourceType: string;
  provider: string;
  currentSize: string;
  usage: { cpu: number; memory: number; disk: number; network: number };
  costPerHour: number;
  costPerMonth: number;
  recommendations: ResourceRecommendation[];
}

export interface ResourceRecommendation {
  recommendedSize: string;
  estimatedSavings: number;
  confidence: number;
  reason: string;
  risk: RiskLevel;
}

export interface OptimizationRecommendation {
  id: string;
  type: OptimizationType;
  title: string;
  description: string;
  estimatedSavings: number;
  implementation: string;
  risk: RiskLevel;
  effort: string;
}

export interface ReservedInstancePlan {
  id: string;
  provider: string;
  service: string;
  term: ReservationTerm;
  payment: PaymentOption;
  upfrontCost: number;
  monthlyCost: number;
  estimatedSavings: number;
  breakEvenMonths: number;
  confidence: number;
  recommended: boolean;
}

export interface CostAllocationRule {
  id: string;
  name: string;
  source: CostSource;
  provider: string;
  project: string;
  percentage: number;
  conditions: Array<{ field: string; operator: string; value: string }>;
}

export interface ShowbackReport {
  period: string;
  generatedAt: Date;
  projects: Array<{
    project: string;
    totalCost: number;
    bySource: Record<string, number>;
    byProvider: Record<string, number>;
    trend: number;
    budgetUtilization: number;
  }>;
  totalCost: number;
  savings: number;
}

export interface FinOpsAlert {
  id: string;
  type: 'budget_warning' | 'budget_critical' | 'anomaly' | 'forecast' | 'optimization';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}
