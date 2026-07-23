export type BenchmarkMetric = 'latency' | 'accuracy' | 'cost' | 'completion_rate' | 'token_efficiency';
export interface BenchmarkScenario { name: string; description: string; task: string; expectedOutput?: string; timeout: number; }
export interface BenchmarkResult { scenario: string; passed: boolean; latencyMs: number; tokensUsed: number; costUsd: number; accuracy: number; error?: string; }
export interface BenchmarkReport { agentName: string; timestamp: string; totalScenarios: number; passed: number; failed: number; avgLatency: number; avgAccuracy: number; totalCost: number; results: BenchmarkResult[]; score: number; }
