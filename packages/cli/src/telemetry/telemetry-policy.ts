export interface TelemetryPolicy {
  maxEventsInMemory: number;
  alertErrorThreshold: number;
  alertWarningThreshold: number;
  enableTracing: boolean;
}

export const DEFAULT_TELEMETRY_POLICY: TelemetryPolicy = {
  maxEventsInMemory: 1000,
  alertErrorThreshold: 3,
  alertWarningThreshold: 5,
  enableTracing: true,
};
