"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_EQUIVALENCE_CONFIG = void 0;
exports.detectEquivalence = detectEquivalence;
exports.DEFAULT_EQUIVALENCE_CONFIG = {
    structuralThreshold: 0.7,
    semanticThreshold: 0.5,
    overallThreshold: 0.65,
};
const IGNORED_TOKENS = new Set([' ', '\n', '\t', '\r', ';', ',', '(', ')', '{', '}', '[', ']', ':', '.']);
const KEYWORDS = new Set([
    'if', 'else', 'for', 'while', 'return', 'class', 'function',
    'async', 'await', 'try', 'catch', 'import', 'export',
    'const', 'let', 'var', 'new', 'type', 'interface', 'enum',
    'extends', 'implements', 'throw',
]);
function tokenize(code) {
    return code
        .split(/(\s+|(?=[{}()[\];,:.])(?<! )|(?<=[{}()[\];,:.])(?! ))/)
        .filter(t => t.trim().length > 0 && !IGNORED_TOKENS.has(t));
}
function normalizeIdentifiers(tokens) {
    let counter = 0;
    const map = new Map();
    return tokens.map(t => {
        if (/^[a-z_]\w*$/i.test(t) && !KEYWORDS.has(t)) {
            if (!map.has(t))
                map.set(t, `ID${counter++}`);
            return map.get(t);
        }
        return t;
    });
}
function jaccardSimilarity(a, b) {
    const intersection = new Set([...a].filter(x => b.has(x)));
    const union = new Set([...a, ...b]);
    return union.size === 0 ? 1 : intersection.size / union.size;
}
function ngramSimilarity(tokensA, tokensB, n = 3) {
    const ngramsA = new Set();
    const ngramsB = new Set();
    for (let i = 0; i <= tokensA.length - n; i++)
        ngramsA.add(tokensA.slice(i, i + n).join('|'));
    for (let i = 0; i <= tokensB.length - n; i++)
        ngramsB.add(tokensB.slice(i, i + n).join('|'));
    return jaccardSimilarity(ngramsA, ngramsB);
}
function keywordSet(tokens) {
    return new Set(tokens.filter(t => KEYWORDS.has(t)));
}
function detectEquivalence(sourceA, sourceB, config) {
    const cfg = { ...exports.DEFAULT_EQUIVALENCE_CONFIG, ...config };
    const tokensA = tokenize(sourceA);
    const tokensB = tokenize(sourceB);
    const normA = normalizeIdentifiers(tokensA);
    const normB = normalizeIdentifiers(tokensB);
    const structuralSimilarity = ngramSimilarity(normA, normB, 3) * 0.6 + ngramSimilarity(normA, normB, 2) * 0.4;
    const kwA = keywordSet(tokensA);
    const kwB = keywordSet(tokensB);
    const semanticSimilarity = jaccardSimilarity(kwA, kwB);
    const overallSimilarity = structuralSimilarity * 0.7 + semanticSimilarity * 0.3;
    const equivalent = overallSimilarity >= cfg.overallThreshold;
    const differences = [];
    if (!equivalent) {
        if (structuralSimilarity < cfg.structuralThreshold) {
            differences.push(`Similaridade estrutural (${(structuralSimilarity * 100).toFixed(0)}%) abaixo do threshold ${(cfg.structuralThreshold * 100).toFixed(0)}%`);
        }
        if (semanticSimilarity < cfg.semanticThreshold) {
            differences.push(`Similaridade semantica (${(semanticSimilarity * 100).toFixed(0)}%) abaixo do threshold ${(cfg.semanticThreshold * 100).toFixed(0)}%`);
        }
    }
    const confidence = equivalent ? Math.min(1, overallSimilarity * 1.1) : overallSimilarity;
    return {
        sourceA: sourceA.substring(0, 50),
        sourceB: sourceB.substring(0, 50),
        structuralSimilarity: Math.round(structuralSimilarity * 1000) / 1000,
        semanticSimilarity: Math.round(semanticSimilarity * 1000) / 1000,
        overallSimilarity: Math.round(overallSimilarity * 1000) / 1000,
        equivalent,
        differences,
        confidence: Math.round(confidence * 1000) / 1000,
    };
}
//# sourceMappingURL=semantic-diff.js.map