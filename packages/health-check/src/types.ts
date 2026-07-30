import { z } from 'zod';
import { createLogger } from '@ideia/logger';

export const HealthStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy']);
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const ComponentHealthSchema = z.object({
  name: z.string(),
  status: HealthStatusSchema,
  message: z.string().optional(),
  latency: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type ComponentHealth = z.infer<typeof ComponentHealthSchema>;

export const HealthCheckResultSchema = z.object({
  status: HealthStatusSchema,
  timestamp: z.string(),
  version: z.string(),
  uptime: z.number(),
  checks: z.array(ComponentHealthSchema),
});
export type HealthCheckResult = z.infer<typeof HealthCheckResultSchema>;

export interface HealthChecker {
  name: string;
  check(): Promise<ComponentHealth>;
}

export interface HealthCheckOptions {
  version?: string;
  includeSystem?: boolean;
}


export interface HealthCheckDependency {
  name: string;
  required: boolean;
  check: () => Promise<boolean>;
  dependsOn: string[];
}

export interface HealthReport {
  status: HealthStatus;
  timestamp: string;
  components: ComponentHealth[];
  dependencies: HealthCheckDependency[];
  uptime: number;
  version?: string;
}
