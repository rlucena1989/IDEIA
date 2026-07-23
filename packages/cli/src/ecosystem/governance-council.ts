import { GovernanceDecision } from './ecosystem-types';

export function decideGovernance(topic: string, votes: Array<{ member: string; approve: boolean }>): GovernanceDecision {
  const approvals = votes.filter(v => v.approve).length;
  const approved = approvals > votes.length / 2;

  return {
    decisionId: `decision-${Date.now()}`,
    topic,
    approved,
    reason: approved ? 'Majority approved.' : 'Majority rejected.',
    decidedAt: new Date().toISOString(),
  };
}
