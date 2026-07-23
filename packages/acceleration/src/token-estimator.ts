export function estimateTokensFromText(text: string): number {
  return Math.ceil(text.length * 0.35);
}

export function estimateTokensFromMessages(messages: { role: string; content: string }[]): number {
  let total = 0;
  for (const msg of messages) {
    total += 4;
    total += msg.content.length * 0.35;
  }
  return Math.ceil(total);
}

export function estimateTokensFromFiles(files: { path: string; content: string }[]): number {
  let total = 0;
  for (const f of files) {
    total += f.path.length * 0.2;
    total += f.content.length * 0.35;
  }
  return Math.ceil(total);
}

export function estimateOutputTokens(complexity: 'simple' | 'moderate' | 'complex'): number {
  const map = { simple: 200, moderate: 500, complex: 1500 };
  return map[complexity] ?? 500;
}
