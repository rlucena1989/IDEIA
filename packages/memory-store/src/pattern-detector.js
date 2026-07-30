"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternDetector = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
function tokenize(text) {
    return text.toLowerCase().split(/\W+/).filter(Boolean);
}
function cosineSimilarity(a, b) {
    const setA = new Set(a);
    const setB = new Set(b);
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const denom = Math.sqrt(setA.size) * Math.sqrt(setB.size);
    return denom === 0 ? 0 : intersection.size / denom;
}
class PatternDetector {
    config;
    patterns = [];
    entries = [];
    dirty = false;
    _knowledgeGraph;
    get knowledgeGraph() {
        return this._knowledgeGraph;
    }
    set knowledgeGraph(kg) {
        this._knowledgeGraph = kg;
    }
    setKnowledgeGraph(kg) {
        this._knowledgeGraph = kg;
    }
    constructor(config = {}) {
        this.config = {
            llmEndpoint: 'http://127.0.0.1:11434',
            llmModel: 'phi-4-mini',
            minOccurrences: 3,
            ...config,
        };
        if (this.config.filePath) {
            this.load();
        }
    }
    record(text, metadata) {
        this.entries.push({
            id: crypto_1.default.randomUUID(),
            text,
            timestamp: new Date().toISOString(),
            metadata,
        });
        this.dirty = true;
    }
    detect() {
        const freq = new Map();
        for (const entry of this.entries) {
            const tokens = tokenize(entry.text);
            if (tokens.length === 0)
                continue;
            const key = tokens.join(' ');
            if (!freq.has(key)) {
                freq.set(key, { count: 0, timestamps: [], texts: [] });
            }
            const f = freq.get(key) ?? null;
            f.count++;
            f.timestamps.push(entry.timestamp);
            if (f.texts.length < 5)
                f.texts.push(entry.text);
        }
        const minOcc = this.config.minOccurrences ?? 3;
        const newPatterns = [];
        for (const [key, f] of freq) {
            if (f.count < minOcc)
                continue;
            const times = f.timestamps.sort();
            const related = this.findRelated(key, freq);
            newPatterns.push({
                id: `pat-${crypto_1.default.createHash('md5').update(key).digest('hex').slice(0, 8)}`,
                name: key.slice(0, 80),
                frequency: f.count,
                confidence: Math.min(f.count / 20, 1),
                firstSeen: times[0] ?? 0,
                lastSeen: times[times.length - 1] ?? 0,
                relatedPatterns: related,
                source: 'statistical',
            });
        }
        this.mergePatterns(newPatterns);
        this.dirty = true;
        if (this.config.filePath)
            this.save();
        return this.patterns;
    }
    async detectAll() {
        this.detect();
        await this.detectWithLLM();
        const result = this.getPatterns();
        this.storePatternsInKg(result);
        return result;
    }
    getPatterns() {
        return [...this.patterns];
    }
    getTrends() {
        const now = Date.now();
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        return this.patterns
            .filter(p => new Date(p.lastSeen).getTime() > now - weekMs)
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 20);
    }
    getPatternHistory(months) {
        let filtered = this.patterns;
        if (months !== undefined) {
            const cutoff = new Date();
            cutoff.setMonth(cutoff.getMonth() - months);
            filtered = this.patterns.filter(p => new Date(p.firstSeen) >= cutoff);
        }
        const grouped = new Map();
        for (const p of filtered) {
            const d = new Date(p.firstSeen);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!grouped.has(key))
                grouped.set(key, []);
            grouped.get(key) ?? {}.push(p);
        }
        return Array.from(grouped.entries())
            .map(([month, patterns]) => ({ month, patterns, count: patterns.length }))
            .sort((a, b) => a.month.localeCompare(b.month));
    }
    storePatternsInKg(patterns) {
        if (!this._knowledgeGraph)
            return;
        const nodeIds = new Map();
        for (const p of patterns) {
            const existing = this._knowledgeGraph.queryNodes('pattern', p.name);
            if (existing.length > 0) {
                nodeIds.set(p.name, existing[0].id);
            }
            else {
                const id = this._knowledgeGraph.addNode({
                    type: 'pattern',
                    name: p.name,
                    properties: {
                        confidence: p.confidence,
                        occurrences: p.frequency,
                        source: p.source || 'statistical',
                        lastDetected: p.lastSeen,
                    },
                });
                nodeIds.set(p.name, id);
            }
        }
        for (const p of patterns) {
            const sourceId = nodeIds.get(p.name);
            if (!sourceId)
                continue;
            for (const relatedName of p.relatedPatterns) {
                const targetId = nodeIds.get(relatedName);
                if (targetId) {
                    this._knowledgeGraph.addEdge({
                        source: sourceId,
                        target: targetId,
                        relation: 'co_occurs',
                    });
                }
            }
        }
    }
    findRelated(key, freqMap) {
        const tokens = key.split(' ');
        const related = [];
        for (const [otherKey] of freqMap) {
            if (otherKey === key)
                continue;
            const otherTokens = otherKey.split(' ');
            if (cosineSimilarity(tokens, otherTokens) > 0.3) {
                related.push(otherKey.slice(0, 80));
            }
        }
        return related.slice(0, 5);
    }
    mergePatterns(newPatterns) {
        const map = new Map();
        for (const p of this.patterns)
            map.set(p.name, p);
        for (const np of newPatterns) {
            const existing = map.get(np.name);
            if (existing) {
                existing.frequency = np.frequency;
                existing.confidence = Math.max(existing.confidence, np.confidence);
                existing.lastSeen = np.lastSeen;
                existing.relatedPatterns = [...new Set([...existing.relatedPatterns, ...np.relatedPatterns])];
            }
            else {
                map.set(np.name, np);
            }
        }
        this.patterns = Array.from(map.values()).sort((a, b) => b.frequency - a.frequency);
    }
    save() {
        if (!this.config.filePath)
            return;
        const store = { patterns: this.patterns, entries: this.entries, version: 1 };
        const dir = path_1.default.dirname(this.config.filePath);
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        fs_1.default.writeFileSync(this.config.filePath, JSON.stringify(store, null, 2), 'utf-8');
        this.dirty = false;
    }
    load() {
        if (!this.config.filePath || !fs_1.default.existsSync(this.config.filePath))
            return;
        try {
            const raw = fs_1.default.readFileSync(this.config.filePath, 'utf-8');
            const store = JSON.parse(raw);
            this.patterns = store.patterns ?? [];
            this.entries = store.entries ?? [];
            this.dirty = false;
        }
        catch (_err) {
            // Log silenciado propositalmente — falha nao bloqueia fluxo
        }
    }
    isDirty() {
        return this.dirty;
    }
    clear() {
        this.patterns = [];
        this.entries = [];
        this.dirty = true;
    }
    async detectWithLLM(history) {
        try {
            const sample = (history ?? this.entries.map(e => e.text)).slice(-20);
            const input = `Analyze these development actions for recurring patterns:\n${sample.map(s => `- ${s}`).join('\n')}`;
            const response = await fetch(`${this.config.llmEndpoint}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.config.llmModel,
                    messages: [
                        { role: 'system', content: 'Extract recurring patterns from development history. Respond JSON: {"patterns":[{"name":"...","frequency":0,"confidence":0.0}]}' },
                        { role: 'user', content: input.slice(0, 3000) },
                    ],
                    stream: false,
                    options: { temperature: 0.1, num_predict: 512 },
                }),
                signal: AbortSignal.timeout(10000),
            });
            if (!response.ok)
                throw new Error('LLM unavailable');
            const data = await response.json();
            const content = data?.message?.content || '';
            const parsed = JSON.parse(content);
            if (!parsed.patterns)
                return [];
            const now = new Date().toISOString();
            const llmPatterns = parsed.patterns.map((p, i) => ({
                id: `llm-pat-${i}`,
                name: p.name || 'Unknown pattern',
                frequency: p.frequency || 1,
                confidence: p.confidence || 0.5,
                firstSeen: now,
                lastSeen: now,
                relatedPatterns: [],
                source: 'llm',
            }));
            this.mergePatterns(llmPatterns);
            if (this.config.filePath)
                this.save();
            return llmPatterns;
        }
        catch {
            return [];
        }
    }
}
exports.PatternDetector = PatternDetector;
//# sourceMappingURL=pattern-detector.js.map