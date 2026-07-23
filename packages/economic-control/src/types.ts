export interface BudgetAllocation { category: string; limit: number; spent: number; currency: string; }
export interface CostEntry { id: string; timestamp: string; category: string; amount: number; description: string; agent?: string; }
export interface BudgetReport { totalBudget: number; totalSpent: number; remaining: number; byCategory: Record<string, { limit: number; spent: number; remaining: number }>; overBudget: string[]; }
