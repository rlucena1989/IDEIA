"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.A2AProtocol = void 0;
exports.createA2AProtocol = createA2AProtocol;
class A2AProtocol {
    agents = new Map();
    messages = [];
    tasks = new Map();
    handlers = new Map();
    registerAgent(card) {
        this.agents.set(card.agentId, card);
        this.handlers.set(card.agentId, async (msg) => ({
            id: `rsp-${Date.now()}`, from: card.agentId, to: msg.from,
            type: 'response', skill: msg.skill, payload: { received: true },
            timestamp: new Date().toISOString(), correlationId: msg.id,
        }));
    }
    unregisterAgent(agentId) {
        this.handlers.delete(agentId);
        return this.agents.delete(agentId);
    }
    setHandler(agentId, handler) {
        this.handlers.set(agentId, handler);
    }
    getAgent(agentId) { return this.agents.get(agentId); }
    listAgents() { return Array.from(this.agents.values()); }
    async sendMessage(msg) {
        this.messages.push(msg);
        const handler = this.handlers.get(msg.to);
        if (!handler) {
            return { id: `err-${Date.now()}`, from: 'system', to: msg.from, type: 'error', skill: msg.skill, payload: { error: `Agent not found: ${msg.to}` }, timestamp: new Date().toISOString(), correlationId: msg.id };
        }
        try {
            const response = await handler(msg);
            this.messages.push(response);
            return response;
        }
        catch (err) {
            const errorMsg = { id: `err-${Date.now()}`, from: msg.to, to: msg.from, type: 'error', skill: msg.skill, payload: { error: String(err) }, timestamp: new Date().toISOString(), correlationId: msg.id };
            this.messages.push(errorMsg);
            return errorMsg;
        }
    }
    async discoverCapabilities(agentId) {
        const msg = {
            id: `discover-${Date.now()}`, from: 'discoverer', to: agentId,
            type: 'request', skill: 'a2a.discover', payload: {},
            timestamp: new Date().toISOString(),
        };
        const response = await this.sendMessage(msg);
        if (response.type === 'response' && response.payload.capabilities) {
            return response.payload.capabilities;
        }
        return this.getAgent(agentId) ?? null;
    }
    createTask(agentId, skill, input) {
        const task = {
            id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            agentId, skill, input, status: 'pending',
            createdAt: new Date().toISOString(),
        };
        this.tasks.set(task.id, task);
        this.executeTask(task);
        return task;
    }
    async executeTask(task) {
        task.status = 'running';
        const msg = {
            id: `exec-${Date.now()}`, from: 'orchestrator', to: task.agentId,
            type: 'request', skill: task.skill, payload: task.input,
            timestamp: new Date().toISOString(),
        };
        const response = await this.sendMessage(msg);
        task.status = response.type === 'error' ? 'failed' : 'completed';
        task.output = response.payload;
        task.error = response.payload.error;
        task.completedAt = new Date().toISOString();
    }
    getTask(id) { return this.tasks.get(id); }
    listTasks(agentId) {
        if (agentId)
            return Array.from(this.tasks.values()).filter(t => t.agentId === agentId);
        return Array.from(this.tasks.values());
    }
    getMessages() { return [...this.messages]; }
    updateAgentStatus(agentId, status) {
        const agent = this.agents.get(agentId);
        if (agent)
            agent.status = status;
    }
}
exports.A2AProtocol = A2AProtocol;
function createA2AProtocol() {
    return new A2AProtocol();
}
//# sourceMappingURL=a2a.js.map