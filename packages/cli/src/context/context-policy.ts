export interface ContextPolicy {
  allowBlockedPublication: boolean;
  requireValidationBeforePublish: boolean;
  maxActiveContexts: number;
}

export const DEFAULT_CONTEXT_POLICY: ContextPolicy = {
  allowBlockedPublication: false,
  requireValidationBeforePublish: true,
  maxActiveContexts: 5,
};
