import { ComplexityLevel, ComplexityCriteria, ClassificationResult } from './types';

export class ComplexityClassifier {
  classify(criteria: ComplexityCriteria): ClassificationResult {
    const reasons: string[] = [];
    let level: ComplexityLevel = 'N0';
    let score = 0;

    if (criteria.fileCount >= 20) { score += 40; reasons.push('20+ arquivos'); }
    else if (criteria.fileCount >= 10) { score += 30; reasons.push('10+ arquivos'); }
    else if (criteria.fileCount >= 5) { score += 20; reasons.push('5+ arquivos'); }
    else if (criteria.fileCount >= 1) { score += 5; }

    if (criteria.riskLevel === 'critical') { score += 40; reasons.push('risco crítico'); }
    else if (criteria.riskLevel === 'high') { score += 25; reasons.push('risco alto'); }
    else if (criteria.riskLevel === 'medium') { score += 10; }

    if (criteria.estimatedSteps >= 15) { score += 30; reasons.push('15+ passos'); }
    else if (criteria.estimatedSteps >= 8) { score += 20; reasons.push('8+ passos'); }
    else if (criteria.estimatedSteps >= 3) { score += 10; }

    if (criteria.requiresHistoricalContext) { score += 15; reasons.push('contexto histórico'); }
    if (criteria.environmentSensitivity === 'production') { score += 15; reasons.push('ambiente produção'); }
    if (criteria.dependencies > 10) { score += 15; reasons.push('10+ dependências'); }
    else if (criteria.dependencies > 5) { score += 8; }
    if (criteria.hasExternalAPI) { score += 10; reasons.push('API externa'); }
    if (criteria.hasDatabase) { score += 5; }
    if (criteria.hasUI) { score += 5; }

    if (score >= 90) level = 'N5';
    else if (score >= 70) level = 'N4';
    else if (score >= 50) level = 'N3';
    else if (score >= 30) level = 'N2';
    else if (score >= 10) level = 'N1';
    else level = 'N0';

    if (criteria.riskLevel === 'critical' && level === 'N2') { level = 'N3'; reasons.push('risco crítico elevou nível'); }
    if (criteria.environmentSensitivity === 'production' && level === 'N1') { level = 'N2'; }

    const confidence = Math.min(1, 0.5 + score / 200);

    const budgetMap: Record<ComplexityLevel, number> = { N0: 500, N1: 2000, N2: 4000, N3: 8000, N4: 15000, N5: 25000 };

    return { level, reasons, confidence, estimatedTokens: budgetMap[level] };
  }
}
