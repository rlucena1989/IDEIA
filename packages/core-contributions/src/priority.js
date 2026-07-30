"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIORITY = void 0;
exports.sortByPriority = sortByPriority;
exports.highestPriority = highestPriority;
function sortByPriority(items) {
    return [...items].sort((a, b) => b.priority - a.priority);
}
function highestPriority(items) {
    if (items.length === 0)
        return undefined;
    return items.reduce((best, current) => current.priority > best.priority ? current : best);
}
exports.PRIORITY = {
    LOW: 100,
    NORMAL: 500,
    HIGH: 1000,
    CRITICAL: 2000,
    DEFAULT: 500,
};
//# sourceMappingURL=priority.js.map