import fs from 'node:fs';
import { PrecisionReport } from './types';

function computeHistoricalPrecision(): { confidence: number; variance: number } {
  try {
    const reportsDir = '.ai-devkit/reports';
    if (!fs.existsSync(reportsDir)) {
      return { confidence: 0.8, variance: 0.15 };
    }

    const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) {
      return { confidence: 0.8, variance: 0.15 };
    }

    const qualities: number[] = [];
    const durations: number[] = [];

    for (const file of files) {
      try {
        const report = JSON.parse(fs.readFileSync(`${reportsDir}/${file}`, 'utf8'));
        if (typeof report.quality?.score === 'number') qualities.push(report.quality.score);
        if (typeof report.totalDurationMs === 'number') durations.push(report.totalDurationMs);
      } catch {
        // skip invalid
      }
    }

    if (qualities.length < 2) {
      return { confidence: 0.7, variance: 0.2 };
    }

    // Use rolling window of last 5 reports for stability
    const recentQualities = qualities.slice(-5);
    const _recentDurations = durations.slice(-5);

    // Mean quality of recent reports
    const meanQ = recentQualities.reduce((a, b) => a + b, 0) / recentQualities.length;

    // Variance of quality scores (recent)
    const varQ = recentQualities.reduce((sum, q) => sum + (q - meanQ) ** 2, 0) / recentQualities.length;

    // Confidence: higher mean + lower variance = higher confidence
    const normalizedVariance = Math.min(varQ / 100, 1);
    const confidence = Math.max(0.1, Math.min(0.99, meanQ / 100 - normalizedVariance * 0.3));

    // Variance score
    const variance = Math.round(normalizedVariance * 100) / 100;

    return { confidence: Math.round(confidence * 100) / 100, variance };
  } catch {
    return { confidence: 0.7, variance: 0.2 };
  }
}

export function analyzePrecision(): PrecisionReport {
  const { confidence, variance } = computeHistoricalPrecision();
  return {
    confidence,
    variance,
    stable: confidence >= 0.8 && variance <= 0.2
  };
}
