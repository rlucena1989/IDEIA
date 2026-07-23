import fs from 'node:fs';
import { ScorecardAnalysis } from './types';

export function analyzeScorecard(): ScorecardAnalysis {
  const latestPath = '.ai/reports/scorecard/latest.json';

  if (!fs.existsSync(latestPath)) {
    return { score: 50, trend: 'flat', status: 'warning' };
  }

  try {
    const data = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
    const score = data.overallScore ?? 50;
    return {
      score,
      trend: data.forecast?.trend === 'up' ? 'up' : data.forecast?.trend === 'down' ? 'down' : 'flat',
      status: score >= 80 ? 'good' : score >= 60 ? 'warning' : 'critical'
    };
  } catch {
    return { score: 50, trend: 'flat', status: 'warning' };
  }
}
