import { detectAmbiguity } from '../runtime/ambiguity-detector';

describe('ambiguity-detector', () => {
  it('should detect vague terms', () => {
    const report = detectAmbiguity('Fazer aquela coisa no sistema');
    expect(report.signals.length).toBeGreaterThan(0);
    expect(['high', 'medium']).toContain(report.overallAmbiguity);
  });

  it('should detect short descriptions', () => {
    const report = detectAmbiguity('Melhorar');
    expect(report.total).toBeGreaterThan(0);
    const short = report.signals.find(s => s.type === 'missing_scope');
    expect(short).toBeDefined();
  });

  it('should accept clear requests', () => {
    const report = detectAmbiguity('Criar um novo endpoint GET /api/users em src/controllers/users.ts');
    expect(report.total).toBe(0);
    expect(report.overallAmbiguity).toBe('low');
  });

  it('should provide enrichment suggestions', () => {
    const report = detectAmbiguity('Fazer coisa');
    expect(report.suggestions.length).toBeGreaterThan(0);
    expect(report.suggestions[0].field).toBeDefined();
  });

  it('should enrich description when ambiguous', () => {
    const report = detectAmbiguity('Coisa');
    expect(report.enrichedDescription).not.toBe('Coisa');
  });
});
