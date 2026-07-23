export function mergeResults(results: unknown[]): unknown {
  if (results.length === 0) return null;
  if (results.length === 1) return results[0];
  const first = results[0];
  if (typeof first === 'number') return (results as number[]).reduce((a, b) => a + (b as number), 0) / results.length;
  if (typeof first === 'string') return results.join('\n');
  if (Array.isArray(first)) return results.flat();
  if (typeof first === 'object' && first !== null) {
    const merged: Record<string, unknown> = {};
    for (const r of results) {
      if (typeof r === 'object' && r !== null) Object.assign(merged, r);
    }
    return merged;
  }
  return results[results.length - 1];
}

export function weightedMerge(results: { value: unknown; weight: number }[]): unknown {
  const numericResults = results.filter(r => typeof r.value === 'number') as { value: number; weight: number }[];
  if (numericResults.length > 0) {
    const totalWeight = numericResults.reduce((a, r) => a + r.weight, 0);
    if (totalWeight === 0) return 0;
    return numericResults.reduce((a, r) => a + r.value * (r.weight / totalWeight), 0);
  }
  return results.sort((a, b) => b.weight - a.weight)[0]?.value ?? null;
}

export function mergeByMajority(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0];
  let bestCount = 0;
  for (const [v, c] of counts) { if (c > bestCount) { best = v; bestCount = c; } }
  return best;
}
