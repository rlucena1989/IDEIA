import { ChatMessage, ContextItem } from '../types';
export declare class DeduplicateTrimmer {
    trim(messages: ChatMessage[], context: ContextItem[]): {
        messages: ChatMessage[];
        context: ContextItem[];
    };
    private hashContent;
}
//# sourceMappingURL=deduplicate-trimmer.d.ts.map