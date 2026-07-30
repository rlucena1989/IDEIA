import { Chunk } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('chunking-strategy');

export class ChunkingStrategy {
  chunk(text: string, maxTokens: number): Chunk[] {
    if (!text) return [{ text: '', tokens: 0, strategy: 'full' }];
    const byParagraph = this._byParagraph(text, maxTokens);
    if (byParagraph.length > 1) return byParagraph.map(c => ({ ...c, strategy: 'paragraph' }));
    const bySentence = this._bySentence(text, maxTokens);
    if (bySentence.length > 1) return bySentence.map(c => ({ ...c, strategy: 'sentence' }));
    return this._byToken(text, maxTokens).map(c => ({ ...c, strategy: 'token' }));
  }

  private _byParagraph(text: string, maxTokens: number): Chunk[] {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    const chunks: Chunk[] = [];
    let current = '';
    for (const p of paragraphs) {
      const combined = current ? current + '\n\n' + p : p;
      if (this.estimateTokens(combined) <= maxTokens) {
        current = combined;
      } else {
        if (current) chunks.push({ text: current, tokens: this.estimateTokens(current), strategy: 'paragraph' });
        current = this.estimateTokens(p) <= maxTokens ? p : '';
      }
    }
    if (current) chunks.push({ text: current, tokens: this.estimateTokens(current), strategy: 'paragraph' });
    return chunks;
  }

  private _bySentence(text: string, maxTokens: number): Chunk[] {
    const sentences = text.match(/[^.!?\n]+[.!?]*(\n|$)/g) || [text];
    const chunks: Chunk[] = [];
    let current = '';
    for (const s of sentences) {
      const trimmed = s.trim();
      if (!trimmed) continue;
      const combined = current ? current + ' ' + trimmed : trimmed;
      if (this.estimateTokens(combined) <= maxTokens) {
        current = combined;
      } else {
        if (current) chunks.push({ text: current, tokens: this.estimateTokens(current), strategy: 'sentence' });
        current = trimmed;
      }
    }
    if (current) chunks.push({ text: current, tokens: this.estimateTokens(current), strategy: 'sentence' });
    return chunks;
  }

  private _byToken(text: string, maxTokens: number): Chunk[] {
    const words = text.split(/\s+/);
    const chunks: Chunk[] = [];
    let current: string[] = [];
    let currentTokens = 0;
    for (const word of words) {
      const wordTokens = Math.ceil(word.length / 4);
      if (currentTokens + wordTokens > maxTokens && current.length > 0) {
        const chunkText = current.join(' ');
        chunks.push({ text: chunkText, tokens: this.estimateTokens(chunkText), strategy: 'token' });
        current = [word];
        currentTokens = wordTokens;
      } else {
        current.push(word);
        currentTokens += wordTokens;
      }
    }
    if (current.length > 0) {
      const chunkText = current.join(' ');
      chunks.push({ text: chunkText, tokens: this.estimateTokens(chunkText), strategy: 'token' });
    }
    return chunks;
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}