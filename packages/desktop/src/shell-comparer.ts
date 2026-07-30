import { createLogger } from '@ideia/logger';
import {  DesktopShellType, PerformanceProfile, PERFORMANCE_PROFILES,
} from './types';
const logger = createLogger('shell-comparer');

export interface DimensionScore {
  shell: DesktopShellType;
  totalScore: number;
  scores: Record<string, number>;
}

interface ComparisonDimension {
  name: string;
  weight: number;
  scorer: (shell: DesktopShellType) => number;
}

const DIMENSIONS: ComparisonDimension[] = [
  { name: 'binarySize', weight: 3, scorer: (s) => scoreInverse(PERFORMANCE_PROFILES[s].binarySize, 250, 2) },
  { name: 'ramIdle', weight: 5, scorer: (s) => scoreInverse(PERFORMANCE_PROFILES[s].ramIdle, 250, 30) },
  { name: 'ramWorkspace', weight: 5, scorer: (s) => scoreInverse(PERFORMANCE_PROFILES[s].ramWorkspace, 600, 100) },
  { name: 'startupCold', weight: 8, scorer: (s) => scoreInverse(PERFORMANCE_PROFILES[s].startupCold, 3200, 200) },
  { name: 'startupWarm', weight: 3, scorer: (s) => scoreInverse(PERFORMANCE_PROFILES[s].startupWarm, 1000, 50) },
  { name: 'maturity', weight: 35, scorer: scoreMaturity },
  { name: 'ecosystem', weight: 30, scorer: scoreEcosystem },
  { name: 'theiaCompat', weight: 11, scorer: scoreTheiaCompat },
];

function scoreInverse(value: number, max: number, min: number): number {
  if (value <= min) return 100;
  if (value >= max) return 0;
  return Math.round(((max - value) / (max - min)) * 100);
}

function scoreMaturity(shell: DesktopShellType): number {
  switch (shell) {
    case 'electron': return 100;
    case 'tauri': return 70;
    case 'nwjs': return 50;
    case 'neutralino': return 25;
  }
}

function scoreEcosystem(shell: DesktopShellType): number {
  switch (shell) {
    case 'electron': return 100;
    case 'tauri': return 65;
    case 'nwjs': return 35;
    case 'neutralino': return 15;
  }
}

function scoreTheiaCompat(shell: DesktopShellType): number {
  switch (shell) {
    case 'electron': return 100;
    case 'nwjs': return 80;
    case 'tauri': return 0;
    case 'neutralino': return 0;
  }
}

export class ShellComparer {
  compare(shells?: DesktopShellType[]): DimensionScore[] {
    const toCompare: DesktopShellType[] = shells ?? ['electron', 'tauri', 'nwjs', 'neutralino'];
    const results: DimensionScore[] = toCompare.map((shell) => {
      const scores: Record<string, number> = {};
      let totalScore = 0;
      for (const dim of DIMENSIONS) {
        const score = dim.scorer(shell);
        scores[dim.name] = score;
        totalScore += score * dim.weight;
      }
      totalScore = Math.round(totalScore / DIMENSIONS.reduce((s, d) => s + d.weight, 0));
      return { shell, totalScore, scores };
    });
    results.sort((a, b) => b.totalScore - a.totalScore);
    return results;
  }

  getPerformanceProfile(shell: DesktopShellType): PerformanceProfile {
    return { ...PERFORMANCE_PROFILES[shell] };
  }

  getDimensions(): string[] {
    return DIMENSIONS.map((d) => d.name);
  }

  getWeights(): Record<string, number> {
    const w: Record<string, number> = {};
    for (const dim of DIMENSIONS) {
      w[dim.name] = dim.weight;
    }
    return w;
  }
}
