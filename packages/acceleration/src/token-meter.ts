export function countChars(text: string): number {
  return text.length;
}

export function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length * 0.35);
}

export function estimateTokensFromWords(wordCount: number): number {
  return Math.ceil(wordCount * 1.33);
}

export function measureCost(tokens: number, costPer1kTokens: number): number {
  return (tokens / 1000) * costPer1kTokens;
}

export function formatTokenReport(text: string, costPer1k: number): { chars: number; words: number; tokens: number; costUsd: number } {
  const tokens = estimateTokens(text);
  return {
    chars: countChars(text),
    words: countWords(text),
    tokens,
    costUsd: Math.round(measureCost(tokens, costPer1k) * 100000) / 100000
  };
}
