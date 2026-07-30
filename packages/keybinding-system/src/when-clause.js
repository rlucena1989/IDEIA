"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhenClauseEvaluator = void 0;
class WhenClauseEvaluator {
    contextKeys = new Map();
    setContext(key, value) {
        this.contextKeys.set(key, value);
    }
    getContext(key) {
        return this.contextKeys.get(key);
    }
    evaluate(expression, activeContexts) {
        const ctx = activeContexts ?? [];
        const tokens = this.tokenize(expression);
        return this.evaluateTokens(tokens, ctx);
    }
    tokenize(expression) {
        const tokens = [];
        let current = '';
        let inString = false;
        for (const ch of expression) {
            if (ch === '"') {
                inString = !inString;
                continue;
            }
            if (inString) {
                current += ch;
                continue;
            }
            if (ch === ' ' || ch === '!') {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
                if (ch === '!')
                    tokens.push('!');
                continue;
            }
            if (ch === '&' || ch === '|') {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
                if (tokens[tokens.length - 1] !== '&&' && tokens[tokens.length - 1] !== '||') {
                    tokens.push(ch === '&' ? '&&' : '||');
                }
                continue;
            }
            current += ch;
        }
        if (current)
            tokens.push(current);
        return tokens;
    }
    evaluateTokens(tokens, activeContexts) {
        if (tokens.length === 0)
            return true;
        let result = true;
        let operator = '&&';
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token === '&&' || token === '||') {
                operator = token;
                continue;
            }
            let negate = false;
            let key = token;
            if (token === '!') {
                negate = true;
                i++;
                key = tokens[i] || '';
            }
            const matches = activeContexts.includes(key);
            const value = negate ? !matches : matches;
            if (operator === '&&') {
                result = result && value;
            }
            else {
                result = result || value;
            }
            if (operator === '&&' && !result)
                return false;
            if (operator === '||' && result)
                return true;
        }
        return result;
    }
}
exports.WhenClauseEvaluator = WhenClauseEvaluator;
//# sourceMappingURL=when-clause.js.map