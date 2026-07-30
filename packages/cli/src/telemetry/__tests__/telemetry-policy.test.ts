import { DEFAULT_TELEMETRY_POLICY } from '../telemetry-policy';
import type { TelemetryPolicy } from '../telemetry-policy';

describe('DEFAULT_TELEMETRY_POLICY', () => {
  it('has max events in memory of 1000', () => {
    expect(DEFAULT_TELEMETRY_POLICY.maxEventsInMemory).toBe(1000);
  });

  it('has alert error threshold of 3', () => {
    expect(DEFAULT_TELEMETRY_POLICY.alertErrorThreshold).toBe(3);
  });

  it('has alert warning threshold of 5', () => {
    expect(DEFAULT_TELEMETRY_POLICY.alertWarningThreshold).toBe(5);
  });

  it('enables tracing by default', () => {
    expect(DEFAULT_TELEMETRY_POLICY.enableTracing).toBe(true);
  });
});

describe('TelemetryPolicy interface', () => {
  it('constructs a custom policy', () => {
    const policy: TelemetryPolicy = {
      maxEventsInMemory: 500,
      alertErrorThreshold: 10,
      alertWarningThreshold: 20,
      enableTracing: false,
    };
    expect(policy.maxEventsInMemory).toBe(500);
    expect(policy.enableTracing).toBe(false);
  });
});
