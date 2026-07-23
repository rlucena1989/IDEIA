import { OperationalAgent } from './agent-types';
import { AgentTaskResult } from './agent-types';

export interface AgentReport {
  generatedAt: string;
  agents: OperationalAgent[];
  totalAgents: number;
  idleAgents: number;
  busyAgents: number;
  recentResults: AgentTaskResult[];
  summary: string[];
}

export function buildAgentReport(params: {
  agents: OperationalAgent[];
  recentResults: AgentTaskResult[];
}): AgentReport {
  const idleAgents = params.agents.filter(a => a.status === 'idle').length;
  const busyAgents = params.agents.filter(a => a.status === 'busy').length;

  const summary: string[] = [
    `${params.agents.length} agente(s) registrado(s)`,
    `${idleAgents} ocioso(s), ${busyAgents} ocupado(s)`,
    `${params.recentResults.length} resultado(s) recente(s)`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    agents: params.agents,
    totalAgents: params.agents.length,
    idleAgents,
    busyAgents,
    recentResults: params.recentResults,
    summary,
  };
}
