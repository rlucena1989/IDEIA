"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriorityRanker = void 0;
const DEFAULT_CONFIG = {
    maxTokens: 4000,
    systemWeight: 10,
    assistantWeight: 3,
    userWeight: 5,
    toolWeight: 1,
};
class PriorityRanker {
    config;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    rank(messages, context) {
        const scoredMessages = messages.map(m => ({
            item: m,
            score: this.scoreMessage(m),
        }));
        const scoredContext = context.map(c => ({
            item: c,
            score: c.priority,
        }));
        scoredMessages.sort((a, b) => b.score - a.score);
        scoredContext.sort((a, b) => b.score - a.score);
        const selectedMessages = this.selectWithinBudget(scoredMessages, this.config.maxTokens * 0.7);
        const selectedContext = this.selectWithinBudget(scoredContext, this.config.maxTokens * 0.3);
        return {
            messages: selectedMessages.map(s => s.item),
            context: selectedContext.map(s => s.item),
        };
    }
    scoreMessage(m) {
        const weightMap = {
            system: this.config.systemWeight,
            assistant: this.config.assistantWeight,
            user: this.config.userWeight,
            tool: this.config.toolWeight,
        };
        const base = weightMap[m.role] ?? 1;
        const recency = m.id ? this.getRecencyScore(m.id) : 1;
        const lengthPenalty = Math.max(1, 1 - (m.content.length / 10000));
        return base * recency * lengthPenalty;
    }
    getRecencyScore(id) {
        const ts = Number(id.replace(/^summary:/, '').replace(/\D/g, ''));
        if (!Number.isFinite(ts))
            return 1;
        const ageMs = Date.now() - ts;
        return Math.max(0.1, 1 - (ageMs / 3600000));
    }
    selectWithinBudget(scored, budget) {
        const result = [];
        let used = 0;
        for (const s of scored) {
            const cost = Math.ceil(s.item.content.length / 4);
            if (used + cost > budget)
                break;
            result.push(s);
            used += cost;
        }
        return result;
    }
}
exports.PriorityRanker = PriorityRanker;
//# sourceMappingURL=priority-ranker.js.map