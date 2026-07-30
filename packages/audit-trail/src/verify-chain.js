"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.proveEntry = proveEntry;
exports.getChainRoot = getChainRoot;
exports.verifyChain = verifyChain;
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
function hashEvent(event) {
    const { previousHash, ...rest } = event;
    const data = previousHash
        ? JSON.stringify({ ...rest, previousHash }, Object.keys({ ...rest, previousHash }).sort())
        : JSON.stringify(rest, Object.keys(rest).sort());
    return crypto_1.default.createHash('sha256').update(data).digest('hex');
}
function loadEvents(filePath) {
    if (!fs_1.default.existsSync(filePath))
        return [];
    const content = fs_1.default.readFileSync(filePath, 'utf-8');
    return content.split('\n').filter(l => l.trim().length > 0).map(line => {
        try {
            return JSON.parse(line);
        }
        catch {
            return null;
        }
    }).filter((e) => e !== null);
}
function proveEntry(filePath, eventId) {
    const events = loadEvents(filePath);
    const idx = events.findIndex(e => e.eventId === eventId);
    if (idx === -1)
        return { valid: false, entryIndex: -1 };
    return { valid: true, entryIndex: idx };
}
function getChainRoot(filePath) {
    const events = loadEvents(filePath);
    if (events.length === 0)
        return crypto_1.default.createHash('sha256').update('empty').digest('hex');
    return hashEvent(events[events.length - 1]);
}
function verifyChain(filePath) {
    const events = loadEvents(filePath);
    if (events.length === 0) {
        return { valid: true, brokenLinks: [], totalEntries: 0 };
    }
    const brokenLinks = [];
    for (let i = 1; i < events.length; i++) {
        const expectedPrevHash = hashEvent(events[i - 1]);
        if (events[i].previousHash !== expectedPrevHash) {
            brokenLinks.push(i);
        }
    }
    return {
        valid: brokenLinks.length === 0,
        brokenLinks,
        totalEntries: events.length,
    };
}
//# sourceMappingURL=verify-chain.js.map