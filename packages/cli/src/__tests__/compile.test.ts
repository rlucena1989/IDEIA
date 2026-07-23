import { getBaseRules, getProjectName, getFramework, getCoverageMin, compileClaude, compileCursor, compileCopilot, compileWindsurf, compileCline, compileGemini, compileContinue, compileZed, compileAmazonQ, compileCodex, compileAider, compileCursorMdc, compileGithubActions, LawsConfig } from '../commands/compile';

describe('compile helpers', () => {
  const mockManifest = { project: { name: 'test-app' }, backend: { framework: 'nestjs' }, quality: { coverage_min: 90 } };
  const laws: LawsConfig = { rules: ['usar TypeScript', 'testes obrigatorios'] };
  const globalRules = ['não usar any'];
  const policies = ['forbidden tokens: eval'];

  const allRules = ['usar TypeScript', 'testes obrigatorios', 'não usar any', 'forbidden tokens: eval'];

  describe('getBaseRules', () => {
    it('deve combinar laws + globalRules + policies', () => {
      expect(getBaseRules(laws, globalRules, policies)).toEqual(allRules);
    });
    it('deve tratar arrays vazios', () => {
      expect(getBaseRules({ rules: [] }, [], [])).toEqual([]);
    });
  });

  describe('getProjectName', () => {
    it('deve extrair nome do projeto', () => { expect(getProjectName(mockManifest)).toBe('test-app'); });
    it('deve retornar fallback quando sem nome', () => { expect(getProjectName({})).toBe('project'); });
  });

  describe('getFramework', () => {
    it('deve extrair framework', () => { expect(getFramework(mockManifest)).toBe('nestjs'); });
    it('deve retornar unknown quando sem framework', () => { expect(getFramework({})).toBe('unknown'); });
  });

  describe('getCoverageMin', () => {
    it('deve extrair coverage_min', () => { expect(getCoverageMin(mockManifest)).toBe(90); });
    it('deve retornar 80 como default', () => { expect(getCoverageMin({})).toBe(80); });
  });

  describe('compileClaude', () => {
    it('deve gerar output com nome do projeto e regras', () => {
      const out = compileClaude(mockManifest, laws, globalRules, policies);
      expect(out).toContain('test-app');
      expect(out).toContain('usar TypeScript');
      expect(out).toContain('não usar any');
    });
  });

  describe('compileCursor', () => {
    it('deve gerar YAML frontmatter com description e globs', () => {
      const out = compileCursor(mockManifest, laws, globalRules, policies);
      expect(out).toContain('description:');
      expect(out).toContain('globs:');
      expect(out).toContain('usar TypeScript');
    });
  });

  describe('compileCopilot', () => {
    it('deve gerar output com nome do projeto', () => {
      const out = compileCopilot(mockManifest, laws, globalRules, policies);
      expect(out).toContain('test-app');
      expect(out).toContain('não usar any');
    });
  });

  describe('compileWindsurf', () => {
    it('deve conter titulo Windsurf Governance Rules', () => {
      const out = compileWindsurf(mockManifest, laws, globalRules, policies);
      expect(out).toContain('Windsurf Governance Rules');
      expect(out).toContain('usar TypeScript');
    });
  });

  describe('compileCline', () => {
    it('deve conter nome do projeto e regras', () => {
      const out = compileCline(mockManifest, laws, globalRules, policies);
      expect(out).toContain('Cline Rules');
      expect(out).toContain('test-app');
      expect(out).toContain('testes obrigatorios');
    });
  });

  describe('compileGemini', () => {
    it('deve conter Gemini Code Assist Instructions', () => {
      const out = compileGemini(mockManifest, laws, globalRules, policies);
      expect(out).toContain('Gemini Code Assist');
      expect(out).toContain('test-app');
    });
  });

  describe('compileContinue', () => {
    it('deve conter Continue Dev Rules', () => {
      const out = compileContinue(mockManifest, laws, globalRules, policies);
      expect(out).toContain('Continue Dev Rules');
      expect(out).toContain('não usar any');
    });
  });

  describe('compileZed', () => {
    it('deve conter Zed Editor Rules', () => {
      const out = compileZed(mockManifest, laws, globalRules, policies);
      expect(out).toContain('Zed Editor Rules');
      expect(out).toContain('forbidden tokens');
    });
  });

  describe('compileAmazonQ', () => {
    it('deve conter Amazon Q Developer Rules', () => {
      const out = compileAmazonQ(mockManifest, laws, globalRules, policies);
      expect(out).toContain('Amazon Q Developer');
      expect(out).toContain('test-app');
    });
  });

  describe('compileCodex', () => {
    it('deve conter OpenAI Codex Instructions', () => {
      const out = compileCodex(mockManifest, laws, globalRules, policies);
      expect(out).toContain('Codex Instructions');
      expect(out).toContain('test-app');
    });
  });

  describe('compileAider', () => {
    it('deve conter Aider AI Instructions', () => {
      const out = compileAider(mockManifest, laws, globalRules, policies);
      expect(out).toContain('Aider AI');
      expect(out).toContain('test-app');
    });
  });

  describe('compileCursorMdc', () => {
    it('deve gerar YAML frontmatter MDC format', () => {
      const out = compileCursorMdc(mockManifest, laws, globalRules, policies);
      expect(out).toContain('description:');
      expect(out).toContain('MDC format');
      expect(out).toContain('usar TypeScript');
    });
  });

  describe('compileGithubActions', () => {
    it('deve conter GitHub Actions AI Instructions', () => {
      const out = compileGithubActions(mockManifest, laws, globalRules, policies);
      expect(out).toContain('GitHub Actions AI');
      expect(out).toContain('test-app');
      expect(out).toContain('não usar any');
    });
  });
});