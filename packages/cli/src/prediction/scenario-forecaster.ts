export interface ForecastHorizon {
  horizonId: string;
  label: 'short' | 'medium' | 'long';
  confidence: number;
  uncertaintyRate: number;
  summary: string;
}

export function forecastHorizon(historySize: number, _trendStrength: number): ForecastHorizon[] {
  const baseConfidence = Math.min(0.95, 0.5 + historySize * 0.05);

  return [
    {
      horizonId: `horizon-${Date.now()}-short`,
      label: 'short',
      confidence: baseConfidence,
      uncertaintyRate: 0.1,
      summary: `Short-term forecast with ${(baseConfidence * 100).toFixed(0)}% confidence.`,
    },
    {
      horizonId: `horizon-${Date.now()}-medium`,
      label: 'medium',
      confidence: baseConfidence * 0.75,
      uncertaintyRate: 0.3,
      summary: `Medium-term forecast with ${((baseConfidence * 0.75) * 100).toFixed(0)}% confidence.`,
    },
    {
      horizonId: `horizon-${Date.now()}-long`,
      label: 'long',
      confidence: baseConfidence * 0.5,
      uncertaintyRate: 0.5,
      summary: `Long-term forecast with ${((baseConfidence * 0.5) * 100).toFixed(0)}% confidence.`,
    },
  ];
}
