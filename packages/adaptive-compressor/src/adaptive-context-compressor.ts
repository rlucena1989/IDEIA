import { createHash, randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import {
  CompressorConfig, CompressionResult, CompressionStep,
  CompressionStrategy, CompressionEstimate, ImportanceMap, TokenBudget,
} from './types';
const logger = createLogger('adaptive-context-compressor');

export class AdaptiveContextCompressor {
  private _config: CompressorConfig = {
    targetRatio: 0.5,
    maxSemanticLoss: 0.1,
    taskType: 'code',
    budget: { softLimit: 4000, hardLimit: 8000, priority: 'quality' },
    preserveCodeBlocks: true,
    preserveUrls: true,
    preserveEmails: true,
  };

  private _strategies: CompressionStrategy[];
  private _priority: 'speed' | 'quality' | 'cost';

  constructor() {
    this._strategies = [];
    this._priority = 'quality';
    this._initStrategies();
  }

  private _initStrategies(): void {
    this._strategies = [
      { name: 'whitespace', expectedRatio: 0.95, expectedLoss: 0, compress: this._whitespaceCompress.bind(this) },
      { name: 'stopwords', expectedRatio: 0.85, expectedLoss: 0, compress: this._stopwordCompress.bind(this) },
      { name: 'abbreviation', expectedRatio: 0.75, expectedLoss: 0.02, compress: this._abbreviationCompress.bind(this) },
      { name: 'sentences', expectedRatio: 0.60, expectedLoss: 0.05, compress: this._sentenceCompress.bind(this) },
      { name: 'summary', expectedRatio: 0.35, expectedLoss: 0.15, compress: this._summaryCompress.bind(this) },
      { name: 'keyword', expectedRatio: 0.15, expectedLoss: 0.25, compress: this._keywordCompress.bind(this) },
      { name: 'neural', expectedRatio: 0.25, expectedLoss: 0.10, compress: this._neuralCompress.bind(this) },
    ];
  }

  async compress(context: string, overrides?: Partial<CompressorConfig>): Promise<CompressionResult> {
    const config = { ...this._config, ...overrides };
    this._priority = config.budget.priority;

    const originalTokens = this._countTokens(context, config);
    const steps: CompressionStep[] = [];
    const warnings: string[] = [];

    const scored = await this._scoreImportance(context, config.taskType);
    const pruned = this._pruneByImportance(context, scored, config.targetRatio);

    const chain = this._selectStrategyChain(config.targetRatio);
    let current = pruned;
    let totalLoss = 0;

    for (const strategy of chain) {
      const inputTokens = this._countTokens(current, config);
      const currentRatio = inputTokens / Math.max(1, originalTokens);
      if (currentRatio <= config.targetRatio) break;

      const { text, loss } = await strategy.compress(current, config);
      const outputTokens = this._countTokens(text, config);
      const stepLoss = this._measureSemanticLoss(current, text);

      steps.push({
        strategy: strategy.name,
        inputTokens,
        outputTokens,
        ratio: outputTokens / Math.max(1, originalTokens),
        loss: stepLoss,
      });

      totalLoss += stepLoss;

      if (stepLoss > config.maxSemanticLoss) {
        warnings.push(`Strategy ${strategy.name} exceeded max loss (${stepLoss.toFixed(2)} > ${config.maxSemanticLoss})`);
        if (config.budget.priority === 'quality') break;
      }

      current = text;
    }

    const compressedTokens = this._countTokens(current, config);
    if (compressedTokens > config.budget.hardLimit) {
      warnings.push(`Compressed context (${compressedTokens}) exceeds hard limit (${config.budget.hardLimit})`);
    }
    if (compressedTokens > config.budget.softLimit) {
      warnings.push(`Compressed context (${compressedTokens}) exceeds soft limit (${config.budget.softLimit})`);
    }

    return {
      text: current,
      originalTokens,
      compressedTokens,
      ratio: compressedTokens / Math.max(1, originalTokens),
      semanticLoss: totalLoss,
      steps,
      warnings,
    };
  }

  async estimate(context: string, targetRatio: number): Promise<CompressionEstimate> {
    const strategies: Array<{ name: string; ratio: number; loss: number }> = [];
    const chain = this._selectStrategyChain(targetRatio);
    let cumulativeRatio = 1;
    let cumulativeLoss = 0;

    for (const s of chain) {
      cumulativeRatio *= s.expectedRatio;
      cumulativeLoss += s.expectedLoss || 0;
      strategies.push({ name: s.name, ratio: cumulativeRatio, loss: cumulativeLoss });
    }

    return {
      strategies,
      totalRatio: cumulativeRatio,
      estimatedLoss: cumulativeLoss,
      recommendedLevel: chain.length,
    };
  }

  private _selectStrategyChain(targetRatio: number): CompressionStrategy[] {
    const chain: CompressionStrategy[] = [];
    let cumulativeRatio = 1;

    for (const strategy of this._strategies) {
      cumulativeRatio *= strategy.expectedRatio;
      chain.push(strategy);
      if (cumulativeRatio <= targetRatio) break;
    }

    return chain;
  }

  private async _scoreImportance(context: string, _taskType: string): Promise<ImportanceMap> {
    const lines = context.split('\n');
    const scored = lines
      .filter(l => l.trim().length > 0)
      .map((line, i) => ({
        text: line,
        score: this._lineScore(line, i, lines.length),
        position: i,
      }));

    const globalScore = scored.length > 0
      ? scored.reduce((s, item) => s + item.score, 0) / scored.length
      : 0;

    return { sections: scored, globalScore };
  }

  private _lineScore(line: string, index: number, total: number): number {
    let score = 0.3;
    const normPos = index / Math.max(1, total);
    if (normPos < 0.15) score += 0.3;
    if (normPos > 0.85) score += 0.2;
    if (/[A-Z][a-z]{2,}/.test(line)) score += 0.2;
    if (/\b\d+\.\d+\b/.test(line)) score += 0.2;
    if (/function|class|import|export|interface/.test(line)) score += 0.3;
    return Math.min(1, score);
  }

  private _pruneByImportance(context: string, scored: ImportanceMap, targetRatio: number): string {
    if (targetRatio >= 0.3 || scored.sections.length === 0) return context;
    const sorted = [...scored.sections].sort((a, b) => b.score - a.score);
    const keepCount = Math.max(1, Math.floor(sorted.length * 0.7));
    const kept = sorted.slice(0, keepCount);
    return kept.map(s => s.text).join('\n');
  }

  private async _whitespaceCompress(text: string, _config: CompressorConfig): Promise<{ text: string; loss: number }> {
    let result = text;
    result = result.replace(/\r\n/g, '\n');
    result = result.replace(/\t/g, '  ');
    result = result.replace(/\n{3,}/g, '\n\n');
    result = result.replace(/[ \t]+$/gm, '');
    result = result.trim();
    return { text: result, loss: 0 };
  }

  private async _stopwordCompress(text: string, config: CompressorConfig): Promise<{ text: string; loss: number }> {
    const stopWords = new Set(['the','a','an','in','on','at','to','for','of','is','are','was','were',
      'be','been','have','has','had','do','does','did','will','would','could','should','may','might',
      'this','that','these','those','it','its','they','them','their','we','us','our','you','your',
      'he','him','his','she','her','and','or','but','if','because','as','until','while','by','with',
      'about','from','up','down','out','off','over','under','again','then','once','here','there',
      'when','where','why','how','all','each','every','both','few','more','most','other','some',
      'such','no','nor','not','only','own','same','so','than','too','very','just','also','now']);

    const lines = text.split('\n');
    const result: string[] = [];
    let inCodeBlock = false;

    for (const line of lines) {
      if (line.trim().startsWith('```')) { inCodeBlock = !inCodeBlock; result.push(line); continue; }
      if (inCodeBlock || config.taskType === 'code') { result.push(line); continue; }
      const words = line.split(/\s+/);
      const filtered = words.filter(w => !stopWords.has(w.toLowerCase()));
      result.push(filtered.join(' '));
    }

    return { text: result.join('\n'), loss: 0 };
  }

  private async _abbreviationCompress(text: string, config: CompressorConfig): Promise<{ text: string; loss: number }> {
    const abbr = new Map<string, string>([
      ['implementation','impl'],['configuration','config'],['documentation','docs'],
      ['application','app'],['functionality','func'],['environment','env'],
      ['development','dev'],['production','prod'],['deployment','deploy'],
      ['initialization','init'],['authentication','auth'],['authorization','authz'],
      ['communication','comm'],['representation','repr'],['specification','spec'],
      ['administrator','admin'],['previous','prev'],['current','curr'],
      ['maximum','max'],['minimum','min'],['standard','std'],['temporary','temp'],
      ['additional','addl'],['information','info'],['reference','ref'],
      ['parameter','param'],['argument','arg'],['variable','var'],
      ['constant','const'],['property','prop'],['attribute','attr'],
      ['identifier','id'],['database','db'],['network','net'],['directory','dir'],
    ]);

    const lines = text.split('\n');
    let inCodeBlock = false;
    let replacements = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('```')) { inCodeBlock = !inCodeBlock; continue; }
      if (inCodeBlock) continue;
      const original = lines[i];
      for (const [long, short] of abbr) {
        const regex = new RegExp(`\\b${long}\\b`, 'gi');
        const m = original.match(regex);
        if (m) replacements += m.length;
        lines[i] = lines[i].replace(regex, short);
      }
    }

    const loss = replacements > 0 ? 0.02 * (1 - 1 / (1 + replacements)) : 0;
    return { text: lines.join('\n'), loss };
  }

  private async _sentenceCompress(text: string, config: CompressorConfig): Promise<{ text: string; loss: number }> {
    const lines = text.split('\n');
    const result: string[] = [];
    let inCodeBlock = false;

    for (const line of lines) {
      if (line.trim().startsWith('```')) { inCodeBlock = !inCodeBlock; result.push(line); continue; }
      if (inCodeBlock) { result.push(line); continue; }
      const trimmed = line.trim();
      if (trimmed.length === 0) { result.push(line); continue; }
      if (this._sentenceValue(trimmed) > this._sentenceThreshold(config)) { result.push(trimmed); }
    }

    return { text: result.join('\n'), loss: 0.05 };
  }

  private _sentenceValue(sentence: string): number {
    let score = 0;
    if (/[A-Z][a-z]+/.test(sentence)) score += 0.2;
    if (/\b\d+\.\d+\b/.test(sentence)) score += 0.3;
    if (/[:]/.test(sentence)) score += 0.1;
    if (/\b(implement|create|define|configure|deploy|migrate|optimize)\b/i.test(sentence)) score += 0.3;
    const wc = sentence.split(/\s+/).length;
    if (wc < 5) score -= 0.1;
    return Math.min(1, Math.max(0, score));
  }

  private _sentenceThreshold(config: CompressorConfig): number {
    return 0.15 + (1 - config.targetRatio) * 0.1;
  }

  private async _summaryCompress(text: string, config: CompressorConfig): Promise<{ text: string; loss: number }> {
    const maxLen = Math.floor(text.length * config.targetRatio);
    const lines = text.split('\n');
    const kept: string[] = [];

    let currentLen = 0;
    for (const line of lines) {
      if (currentLen + line.length > maxLen) break;
      kept.push(line);
      currentLen += line.length;
    }

    if (kept.length === 0) kept.push(text.substring(0, maxLen));
    return { text: kept.join('\n'), loss: 0.15 };
  }

  private async _keywordCompress(text: string, _config: CompressorConfig): Promise<{ text: string; loss: number }> {
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const freq = new Map<string, number>();
    for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);

    const stopWords = new Set(['this','that','with','from','have','been','were','what','which','their']);
    const top = [...freq.entries()]
      .filter(([w]) => !stopWords.has(w))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([w, c]) => `${w}(${c})`);

    const entities = text.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*\b/g) || [];
    const unique = [...new Set(entities)].slice(0, 15);

    const result = [
      `KEYWORDS: ${top.join(', ')}`,
      `ENTITIES: ${unique.join(', ')}`,
    ].join('\n');

    return { text: result, loss: 0.25 };
  }

  private async _neuralCompress(text: string, config: CompressorConfig): Promise<{ text: string; loss: number }> {
    const maxLen = Math.floor(text.length * config.targetRatio * 0.5);
    const truncated = text.length > maxLen * 2 ? text.substring(0, maxLen * 2) : text;
    return { text: truncated, loss: 0.10 };
  }

  private _measureSemanticLoss(original: string, compressed: string): number {
    if (original.length === 0 || compressed.length === 0) return 0.5;
    const origEntities = this._extractEntities(original);
    const compEntities = this._extractEntities(compressed);
    if (origEntities.size === 0) return 0;

    let preserved = 0;
    for (const entity of origEntities) {
      if (compressed.includes(entity)) preserved++;
    }

    const entityLoss = 1 - (preserved / origEntities.size);
    const ratioLoss = 1 - (compressed.length / Math.max(1, original.length));
    return entityLoss * 0.6 + ratioLoss * 0.4;
  }

  private _extractEntities(text: string): Set<string> {
    const entities = new Set<string>();
    const caps = text.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*\b/g);
    if (caps) caps.forEach(e => entities.add(e));
    const tech = text.match(/\b[a-z]+[-_][a-z]+\b/g);
    if (tech) tech.forEach(e => entities.add(e));
    return entities;
  }

  private _countTokens(text: string, config: CompressorConfig): number {
    if (!text) return 0;
    const ratio = config.taskType === 'code' ? 3 : 4;
    return Math.ceil(text.length / ratio);
  }
}
