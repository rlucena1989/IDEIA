export interface DecomposableTask { id: string; description: string; complexity: number; context: string }
export interface SubTask { id: string; parentId: string; description: string; estimatedEffort: number; dependencies: string[]; completed: boolean }
export interface DecompositionStrategy { name: string; depth: number; branching: number; adaptive: boolean; description: string }
export interface DecompositionResult { taskId: string; strategy: string; subtasks: SubTask[]; quality: number; durationMs: number }
export interface StrategyPerformance { strategyName: string; avgQuality: number; avgDuration: number; useCount: number; successRate: number }
