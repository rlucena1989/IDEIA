import { normalizeRequest, formatRequestOverview } from '../runtime/request-normalizer';

describe('request-normalizer', () => {
  it('should normalize a natural language request', () => {
    const req = normalizeRequest({ source: 'text', content: 'Quero criar um novo endpoint de login' });
    expect(req.intents).toContain('create');
    expect(req.mode).toBe('natural_language');
    expect(req.entities.length).toBeGreaterThan(0);
    expect(req.priority).toBe(4);
  });

  it('should detect fix intent', () => {
    const req = normalizeRequest({ source: 'text', content: 'Corrigir bug no login quando senha esta incorreta' });
    expect(req.intents).toContain('fix');
    expect(req.priority).toBe(5);
  });

  it('should handle structured commands', () => {
    const req = normalizeRequest({ source: 'structured', content: '/generate crud User' });
    expect(req.mode).toBe('structured_command');
    expect(req.confidence).toBe(0.95);
  });

  it('should detect refactor intent', () => {
    const req = normalizeRequest({ source: 'text', content: 'Refatorar o servico de autenticacao' });
    expect(req.intents).toContain('refactor');
  });

  it('should format overview', () => {
    const req = normalizeRequest({ source: 'text', content: 'Criar novo modulo' });
    const overview = formatRequestOverview(req);
    expect(overview).toContain('Criar');
  });
});
