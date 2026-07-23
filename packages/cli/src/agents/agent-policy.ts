export interface AgentPolicy {
  policyId: string;
  maxTasksPerAgent: number;
  allowBlockedAgents: boolean;
  allowOfflineAgents: boolean;
}

export const DEFAULT_AGENT_POLICY: AgentPolicy = {
  policyId: 'policy-agent-default',
  maxTasksPerAgent: 3,
  allowBlockedAgents: false,
  allowOfflineAgents: false,
};
