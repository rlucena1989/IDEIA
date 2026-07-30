"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeduplicateTrimmer = void 0;
const crypto_1 = require("crypto");
class DeduplicateTrimmer {
    trim(messages, context) {
        const seenHashes = new Set();
        const dedupedMessages = messages.filter(m => {
            const hash = this.hashContent(m.content);
            if (seenHashes.has(hash))
                return false;
            seenHashes.add(hash);
            return true;
        });
        const dedupedContext = context.filter(c => {
            const hash = this.hashContent(c.content);
            if (seenHashes.has(hash))
                return false;
            seenHashes.add(hash);
            return true;
        });
        return { messages: dedupedMessages, context: dedupedContext };
    }
    hashContent(content) {
        const normalized = content.replace(/\s+/g, ' ').trim().slice(0, 500);
        return (0, crypto_1.createHash)('md5').update(normalized).digest('hex');
    }
}
exports.DeduplicateTrimmer = DeduplicateTrimmer;
//# sourceMappingURL=deduplicate-trimmer.js.map