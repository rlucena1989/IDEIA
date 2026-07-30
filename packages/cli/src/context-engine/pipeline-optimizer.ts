export class PromptOptimizer {
  optimize(prompt: string): { optimized: string; tokenCount: number; originalTokens: number; savings: number } {
    const originalTokens = this._estimateTokens(prompt);
    const optimized = prompt
      .replace(/\b(por favor|please|poderia|could you|você pode|can you)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s\n]+|[\s\n]+$/g, '')
      .replace(/(\r?\n){3,}/g, '\n\n')
      .replace(/\b(quero que você|i want you to|preciso que você|you need to)\b/gi, '');
    const tokenCount = this._estimateTokens(optimized);
    return { optimized: optimized || prompt, tokenCount, originalTokens, savings: originalTokens - tokenCount };
  }

  private _estimateTokens(text: string): number {
    return Math.ceil(text.length / 4) + text.split(/\s+/).length;
  }
}
