export type BenchmarkMetric = 'latency' | 'accuracy' | 'cost' | 'completion_rate' | 'token_efficiency';
export interface BenchmarkScenario { name: string; description: string; task: string; expectedOutput?: string; timeout: number; }
export interface BenchmarkResult { scenario: string; passed: boolean; latencyMs: number; tokensUsed: number; costUsd: number; accuracy: number; error?: string; }
export interface BenchmarkReport { agentName: string; timestamp: string; totalScenarios: number; passed: number; failed: number; avgLatency: number; avgAccuracy: number; totalCost: number; results: BenchmarkResult[]; score: number; }

export interface PerformanceScorecard { overallScore: number; scoreBreakdown: ScoreBreakdown | Record<string, number>; ttft: Record<string, unknown>; tps: Record<string, unknown>; memory: Record<string, unknown>; hotspots: Record<string, unknown>; }
export interface ScoreBreakdown { ttft: number; tps: number; memory: number; hotspot: number; }
export interface RegressionReport { currentScore: number; previousScore: number; delta: number; regressions: DimDelta[]; improved: DimDelta[]; status: string; }
export interface DimDelta { dimension: string; before: number; after: number; delta: number; severity?: string; }
export type ThresholdValue = number | { warn: number; fail: number };
export interface BenchmarkThresholds { maxTtftMs: ThresholdValue; minTps: ThresholdValue; maxMemoryMb: ThresholdValue; maxStartupMs: ThresholdValue; maxBundleKb: ThresholdValue; }
export interface BenchmarkHistory { entries: BenchmarkHistoryEntry[]; runs: BenchmarkReport[]; totalRuns: number; avgScore: number; trend: 'improving' | 'stable' | 'declining'; }
export interface BenchmarkHistoryEntry { timestamp: string; score: number; metrics: Record<string, number>; commitSha?: string; passed?: boolean; report?: BenchmarkReport; thresholds?: BenchmarkThresholds; }
export interface CiBenchmarkResult { name: string; value: number; threshold: number; warnThreshold: number; passed: boolean; warned: boolean; unit: string; score?: number; report?: BenchmarkReport; }
export interface HotspotReport { operation: string; totalDurationMs: number; hotspots: HotspotSample[]; recommendations: string[]; }
export interface HotspotSample { location: string; durationMs: number; calls: number; selfTimeMs: number; share: number; }
export interface MemoryReport { label: string; samples: number; avgHeapUsedMB: number; peakHeapUsedMB: number; avgRssMB: number; peakRssMB: number; avgDeltaMB: number; totalAllocatedMB: number; }
export interface MemorySample { index: number; heapUsedMB: number; heapTotalMB: number; rssMB: number; externalMB: number; arrayBuffersMB: number; deltaMB: number; }
export interface TpsReport { operation: string; samples: number; totalOps: number; totalDurationMs: number; avgTps: number; peakTps: number; p50Tps: number; p95Tps: number; }
export interface TpsSample { index: number; operations: number; durationMs: number; tps: number; }
export interface TtftReport { operation: string; samples: number; avgTtftMs: number; p50TtftMs: number; p95TtftMs: number; p99TtftMs: number; minTtftMs: number; maxTtftMs: number; avgTotalLatencyMs: number; avgTokensPerSec: number; }
export interface TtftSample { index: number; ttftMs: number; totalLatencyMs: number; tokensGenerated: number; }