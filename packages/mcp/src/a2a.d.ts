export type AgentCardStatus = 'active' | 'idle' | 'busy' | 'error';
export interface AgentCard {
    agentId: string;
    name: string;
    description: string;
    version: string;
    capabilities: string[];
    status: AgentCardStatus;
    skills: AgentSkill[];
}
export interface AgentSkill {
    id: string;
    name: string;
    description: string;
    inputType: string;
    outputType: string;
}
export interface A2AMessage {
    id: string;
    from: string;
    to: string;
    type: 'request' | 'response' | 'error';
    skill: string;
    payload: Record<string, unknown>;
    timestamp: string;
    correlationId?: string;
}
export interface A2ATask {
    id: string;
    agentId: string;
    skill: string;
    input: Record<string, unknown>;
    status: 'pending' | 'running' | 'completed' | 'failed';
    output?: unknown;
    error?: string;
    createdAt: string;
    completedAt?: string;
}
export declare class A2AProtocol {
    private agents;
    private messages;
    private tasks;
    private handlers;
    registerAgent(card: AgentCard): void;
    unregisterAgent(agentId: string): boolean;
    setHandler(agentId: string, handler: (msg: A2AMessage) => Promise<A2AMessage>): void;
    getAgent(agentId: string): AgentCard | undefined;
    listAgents(): AgentCard[];
    sendMessage(msg: A2AMessage): Promise<A2AMessage>;
    discoverCapabilities(agentId: string): Promise<AgentCard | null>;
    createTask(agentId: string, skill: string, input: Record<string, unknown>): A2ATask;
    private executeTask;
    getTask(id: string): A2ATask | undefined;
    listTasks(agentId?: string): A2ATask[];
    getMessages(): A2AMessage[];
    updateAgentStatus(agentId: string, status: AgentCardStatus): void;
}
export declare function createA2AProtocol(): A2AProtocol;
//# sourceMappingURL=a2a.d.ts.map