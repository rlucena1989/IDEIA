import { z } from 'zod';

export const FeedbackEventSchema = z.object({
  id: z.string(),
  type: z.enum(['test_failure', 'gate_blocked', 'pattern_detected', 'metric_degraded', 'improvement']),
  source: z.string(),
  data: z.record(z.unknown()),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  timestamp: z.number(),
});
export type FeedbackEvent = z.infer<typeof FeedbackEventSchema>;

export const FeedbackActionSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  type: z.enum(['log', 'notify', 'fix', 'escalate', 'ignore']),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  result: z.string().optional(),
  createdAt: z.number(),
});
export type FeedbackAction = z.infer<typeof FeedbackActionSchema>;

export const PatternEntrySchema = z.object({
  id: z.string(),
  pattern: z.string(),
  symptom: z.string(),
  fix: z.string(),
  frequency: z.number(),
  lastDetected: z.number(),
  confidence: z.number().min(0).max(1),
});
export type PatternEntry = z.infer<typeof PatternEntrySchema>;

export const LoopConfigSchema = z.object({
  checkIntervalMs: z.number().positive(),
  autoFix: z.boolean(),
  maxActions: z.number().positive(),
});
export type LoopConfig = z.infer<typeof LoopConfigSchema>;
