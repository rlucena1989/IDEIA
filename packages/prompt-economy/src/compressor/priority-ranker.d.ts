import { ChatMessage, ContextItem } from '../types';
export interface PriorityRankerConfig {
    maxTokens: number;
    systemWeight: number;
    assistantWeight: number;
    userWeight: number;
    toolWeight: number;
}
export declare class PriorityRanker {
    private config;
    constructor(config?: Partial<PriorityRankerConfig>);
    rank(messages: ChatMessage[], context: ContextItem[]): {
        messages: ChatMessage[];
        context: ContextItem[];
    };
    private scoreMessage;
    private getRecencyScore;
    private selectWithinBudget;
}
//# sourceMappingURL=priority-ranker.d.ts.map