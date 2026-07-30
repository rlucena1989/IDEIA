export interface BudgetAllocation { category: string; limit: number; spent: number; currency: string; }
export interface CostEntry { id: string; timestamp: string; category: string; amount: number; description: string; agent?: string; }
export interface BudgetReport { totalBudget: number; totalSpent: number; remaining: number; byCategory: Record<string, { limit: number; spent: number; remaining: number }>; overBudget: string[]; }

export interface FinOpsConfig { budgetLimit?: number; alertThreshold: number; currency: string; categories: string[]; dailyBudget?: number; maxPerRequest?: number; monthlyBudget?: number; modelRates?: Record<string, { inputPer1K: number; outputPer1K: number }> }
export interface CostAlert { id: string; category: string; amount: number; threshold: number; message: string; timestamp: string; type?: string; severity?: string; cost?: number }
export interface CostRecommendation { type: string; description: string; potentialSavings: number; priority: 'low' | 'medium' | 'high'; estimatedSavings?: number; confidence?: number }
export interface ModelCost { model: string; inputTokens: number; outputTokens: number; costPerToken: number; totalCost: number; taskId?: string; timestamp?: string }
export interface FinOpsReport { totalCost?: number; budgetUtilization?: number; alerts: CostAlert[]; recommendations: CostRecommendation[]; modelCosts?: ModelCost[]; period: string; dailyCost?: number; monthlyCost?: number; byModel?: Record<string, { calls: number; totalTokens: number; cost: number }>; budgetPercentage?: number; byTask?: Record<string, { calls: number; cost: number }>; budgetRemaining?: number }
