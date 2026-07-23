export interface ContinuityPolicy {
  preserveLastVerdict: boolean;
  autoRestartCycle: boolean;
  maxConsecutiveFailures: number;
}

export const DEFAULT_CONTINUITY_POLICY: ContinuityPolicy = {
  preserveLastVerdict: true,
  autoRestartCycle: true,
  maxConsecutiveFailures: 3,
};
