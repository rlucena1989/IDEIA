import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
const logger = createLogger('coverage-converter');

export interface IstanbulSummary {
  [filePath: string]: {
    [key: string]: {
      total: number;
      covered: number;
      skipped: number;
      pct: number;
    };
  };
}

export interface MergedCoverage {
  total: number;
  lines: number;
  branches: number;
  functions: number;
}

export function loadFinalCoverage(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

export function generateCoverageSummary(finalPath: string, outputPath: string): MergedCoverage | null {
  const data = loadFinalCoverage(finalPath);
  if (!data) return null;

  const summary: IstanbulSummary = {};
  let totalLines = 0, totalBranches = 0, totalFunctions = 0;
  let coveredLines = 0, coveredBranches = 0, coveredFunctions = 0;

  for (const [filePath, fileData] of Object.entries(data)) {
    const fd = fileData as Record<string, unknown>;
    const sMap = fd.s as Record<string, number> | undefined;
    const bMap = fd.b as Record<string, number[] | number> | undefined;
    const fMap = fd.f as Record<string, number> | undefined;

    const sTotal = sMap ? Object.keys(sMap).length : 0;
    const sCovered = sMap ? Object.values(sMap).filter(v => (v as number) > 0).length : 0;
    const fTotal = fMap ? Object.keys(fMap).length : 0;
    const fCovered = fMap ? Object.values(fMap).filter(v => (v as number) > 0).length : 0;

    let bTotal = 0, bCovered = 0;
    if (bMap) {
      for (const val of Object.values(bMap)) {
        if (Array.isArray(val)) {
          bTotal += val.length;
          bCovered += val.filter(v => v > 0).length;
        } else {
          bTotal++;
          if (val > 0) bCovered++;
        }
      }
    }

    totalLines += sTotal; coveredLines += sCovered;
    totalBranches += bTotal; coveredBranches += bCovered;
    totalFunctions += fTotal; coveredFunctions += fCovered;

    summary[filePath] = {
      statements: { total: sTotal, covered: sCovered, skipped: 0, pct: sTotal > 0 ? Math.round(sCovered / sTotal * 10000) / 100 : 0 },
      branches: { total: bTotal, covered: bCovered, skipped: 0, pct: bTotal > 0 ? Math.round(bCovered / bTotal * 10000) / 100 : 0 },
      functions: { total: fTotal, covered: fCovered, skipped: 0, pct: fTotal > 0 ? Math.round(fCovered / fTotal * 10000) / 100 : 0 },
    };
  }

  const linesPct = totalLines > 0 ? Math.round(coveredLines / totalLines * 10000) / 100 : 0;
  const branchesPct = totalBranches > 0 ? Math.round(coveredBranches / totalBranches * 10000) / 100 : 0;
  const functionsPct = totalFunctions > 0 ? Math.round(coveredFunctions / totalFunctions * 10000) / 100 : 0;

  summary.total = {
    statements: { total: totalLines, covered: coveredLines, skipped: 0, pct: linesPct },
    branches: { total: totalBranches, covered: coveredBranches, skipped: 0, pct: branchesPct },
    functions: { total: totalFunctions, covered: coveredFunctions, skipped: 0, pct: functionsPct },
    lines: { total: totalLines, covered: coveredLines, skipped: 0, pct: linesPct },
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));

  return { total: linesPct, lines: linesPct, branches: branchesPct, functions: functionsPct };
}

export function calcComplexityFromCoverage(merged: MergedCoverage): { score: number; label: string } {
  const score = Math.round((merged.lines * 0.4 + merged.branches * 0.35 + merged.functions * 0.25) * 100) / 100;
  const label = score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'adequate' : 'poor';
  return { score, label };
}
