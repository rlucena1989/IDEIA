import { ChatMessage, ContextItem } from '../types';
export interface SummarizeTrimmerConfig {
    maxMessageAgeMs: number;
    maxContextItems: number;
    summaryPrompt: string;
}
export declare class SummarizeTrimmer {
    private config;
    constructor(config?: Partial<SummarizeTrimmerConfig>);
    trim(messages: ChatMessage[], context: ContextItem[]): {
        messages: ChatMessage[];
        context: ContextItem[];
    };
    private buildSummaryMessage;
    private parseTimestamp;
}
//# sourceMappingURL=summarize-trimmer.d.ts.map