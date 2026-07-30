"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextCompressor = void 0;
const summarize_trimmer_1 = require("./summarize-trimmer");
const deduplicate_trimmer_1 = require("./deduplicate-trimmer");
const priority_ranker_1 = require("./priority-ranker");
class ContextCompressor {
    summarize = new summarize_trimmer_1.SummarizeTrimmer();
    deduplicate = new deduplicate_trimmer_1.DeduplicateTrimmer();
    ranker = new priority_ranker_1.PriorityRanker();
    async compress(input) {
        const originalTokens = this.countTokens(input.messages, input.contextItems);
        let messages = input.messages;
        let context = input.contextItems;
        const removedIds = [];
        if (input.strategy === 'full' || input.strategy === 'summarize') {
            const result = this.summarize.trim(messages, context);
            const removedMsgs = messages.filter(m => !result.messages.includes(m));
            const removedCtx = context.filter(c => !result.context.includes(c));
            removedIds.push(...removedMsgs.map(m => m.id ?? '').filter(Boolean));
            removedIds.push(...removedCtx.map(c => c.id));
            messages = result.messages;
            context = result.context;
        }
        if (input.strategy === 'full' || input.strategy === 'deduplicate') {
            const result = this.deduplicate.trim(messages, context);
            messages = result.messages;
            context = result.context;
        }
        if (input.strategy === 'full' || input.strategy === 'priority_rank') {
            this.ranker.rank(messages, context);
        }
        if (input.strategy === 'full' || input.strategy === 'budget_cut') {
            const result = this.ranker.rank(messages, context);
            messages = result.messages;
            context = result.context;
        }
        const compressedTokens = this.countTokens(messages, context);
        return {
            messages,
            contextItems: context,
            originalTokens,
            compressedTokens,
            savings: originalTokens > 0
                ? Math.round((1 - compressedTokens / originalTokens) * 100)
                : 0,
            removedIds,
        };
    }
    countTokens(messages, context) {
        let total = 0;
        for (const m of messages) {
            const content = m.content ?? '';
            total += Math.ceil(content.length / 4);
        }
        for (const c of context) {
            const content = c.content ?? '';
            total += Math.ceil(content.length / 4);
        }
        return total;
    }
}
exports.ContextCompressor = ContextCompressor;
//# sourceMappingURL=index.js.map