export function sumKahan(values: number[]): number {
  let sum = 0;
  let compensation = 0;
  for (const v of values) {
    const y = v - compensation;
    const t = sum + y;
    compensation = t - sum - y;
    sum = t;
  }
  return sum;
}

export function sumKahanWithError(values: number[]): { sum: number; error: number } {
  let sum = 0;
  let compensation = 0;
  let maxError = 0;
  for (const v of values) {
    const y = v - compensation;
    const t = sum + y;
    const c = t - sum - y;
    compensation = c;
    sum = t;
    maxError = Math.max(maxError, Math.abs(c));
  }
  return { sum, error: maxError };
}

export function sumNaive(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
