export interface CompressionResult {
  originalChars: number;
  compressedChars: number;
  ratio: number;
  compressed: string;
  method: string;
}

export function compressTrivial(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function compressRemoveComments(input: string): string {
  return input.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

export function compressRemoveWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

export function compressKeepStructure(input: string, maxLines: number): string {
  const lines = input.split('\n');
  if (lines.length <= maxLines) return input;
  const half = Math.floor(maxLines / 2);
  return [...lines.slice(0, half), `// ... ${lines.length - maxLines} lines truncated ...`, ...lines.slice(lines.length - half)].join('\n');
}

export function compressSmart(input: string, targetRatio = 0.5): CompressionResult {
  const original = input;
  let compressed = compressTrivial(input);
  if (compressed.length <= original.length * targetRatio) {
    return { originalChars: original.length, compressedChars: compressed.length, ratio: compressed.length / original.length, compressed, method: 'trivial' };
  }
  compressed = compressRemoveComments(compressed);
  if (compressed.length <= original.length * targetRatio) {
    return { originalChars: original.length, compressedChars: compressed.length, ratio: compressed.length / original.length, compressed, method: 'remove-comments' };
  }
  compressed = compressRemoveWhitespace(compressed);
  const method = compressed.length < original.length ? 'remove-whitespace' : 'none';
  return { originalChars: original.length, compressedChars: compressed.length, ratio: compressed.length / Math.max(original.length, 1), compressed, method };
}

export function compressToTarget(input: string, maxTokens: number): CompressionResult {
  const tokensPerChar = 0.35;
  const maxChars = Math.floor(maxTokens / tokensPerChar);
  if (input.length <= maxChars) return compressSmart(input);
  const truncated = input.slice(0, maxChars);
  const result = compressSmart(truncated);
  return { ...result, method: `truncate+${result.method}` };
}
