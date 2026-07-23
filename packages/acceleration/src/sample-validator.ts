export interface SampleValidationResult {
  passed: boolean;
  sampleResult: number;
  fullResult?: number;
  confidence: number;
  errorMargin: number;
  sampleSize: number;
  fullSize: number;
}

export function validateBySample<T>(
  data: T[],
  sampleSize: number,
  compute: (batch: T[]) => number,
  threshold: number,
  fullCompute?: (batch: T[]) => number
): SampleValidationResult {
  if (data.length === 0) {
    return { passed: true, sampleResult: 0, confidence: 1, errorMargin: 0, sampleSize: 0, fullSize: 0 };
  }

  const size = Math.min(sampleSize, data.length);
  const step = Math.max(1, Math.floor(data.length / size));
  const sampled: T[] = [];
  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i]);
    if (sampled.length >= size) break;
  }

  const sampleResult = compute(sampled);
  const fullResult = fullCompute ? compute(data) : undefined;
  const ratio = sampled.length / data.length;
  const errorMargin = ratio < 0.5 ? 0.15 / ratio : 0.05;
  const confidence = Math.min(1, ratio * 2);

  const passed = fullResult !== undefined
    ? Math.abs(sampleResult - fullResult) / Math.max(1, Math.abs(fullResult)) <= threshold
    : true;

  return {
    passed,
    sampleResult,
    fullResult,
    confidence: Math.round(confidence * 100) / 100,
    errorMargin: Math.round(errorMargin * 100) / 100,
    sampleSize: sampled.length,
    fullSize: data.length,
  };
}

export function validateMeanBySample(
  data: number[],
  sampleSize: number,
  threshold = 0.05
): SampleValidationResult {
  const meanFn = (batch: number[]) =>
    batch.reduce((a, b) => a + b, 0) / batch.length;
  return validateBySample(data, sampleSize, meanFn, threshold, meanFn);
}

export function validateSumBySample(
  data: number[],
  sampleSize: number,
  threshold = 0.05
): SampleValidationResult {
  const sumFn = (batch: number[]) => batch.reduce((a, b) => a + b, 0);
  return validateBySample(data, sampleSize, sumFn, threshold, sumFn);
}
