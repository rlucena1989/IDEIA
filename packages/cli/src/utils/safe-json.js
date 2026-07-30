"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeJsonParse = safeJsonParse;
exports.safeJsonParseWithSchema = safeJsonParseWithSchema;
function safeJsonParse(text, fallback) {
    try {
        return JSON.parse(text);
    }
    catch {
        return fallback;
    }
}
function safeJsonParseWithSchema(text, schema, fallback) {
    try {
        const parsed = JSON.parse(text);
        return schema.parse(parsed);
    }
    catch {
        return fallback;
    }
}
//# sourceMappingURL=safe-json.js.map