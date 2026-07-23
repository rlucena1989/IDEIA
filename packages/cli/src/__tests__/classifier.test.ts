import { ALL_TASK_TYPES, TASK_TYPE_LABELS, normalizeText, matchKeywords, classifyByDescription, classifyByFiles, classify, classifyAndExplain, extractRouting, DEFAULT_ROUTING, ClassificationRequest, TaskType } from '../runtime/classifier';

describe('Classifier Module', () => {
  describe('ALL_TASK_TYPES', () => {
    it('deve conter 10 tipos de tarefa', () => {
      expect(ALL_TASK_TYPES.length).toBe(10);
      expect(ALL_TASK_TYPES).toContain('bugfix');
      expect(ALL_TASK_TYPES).toContain('feature');
      expect(ALL_TASK_TYPES).toContain('refactor');
      expect(ALL_TASK_TYPES).toContain('documentation');
      expect(ALL_TASK_TYPES).toContain('design_change');
      expect(ALL_TASK_TYPES).toContain('security_review');
      expect(ALL_TASK_TYPES).toContain('test_only');
      expect(ALL_TASK_TYPES).toContain('dependency_update');
      expect(ALL_TASK_TYPES).toContain('cleanup');
      expect(ALL_TASK_TYPES).toContain('incident_response');
    });
  });

  describe('TASK_TYPE_LABELS', () => {
    it('deve ter label para cada tipo', () => {
      for (const t of ALL_TASK_TYPES) {
        expect(TASK_TYPE_LABELS[t]).toBeDefined();
        expect(TASK_TYPE_LABELS[t].length).toBeGreaterThan(0);
      }
    });
  });

  describe('normalizeText', () => {
    it('deve converter para lowercase', () => {
      expect(normalizeText('Teste ABC')).toBe('teste abc');
    });

    it('deve remover acentos', () => {
      expect(normalizeText('segurança crítica')).toBe('seguranca critica');
    });

    it('deve lidar com string vazia', () => {
      expect(normalizeText('')).toBe('');
    });
  });

  describe('matchKeywords', () => {
    it('deve retornar fatores para keywords encontradas', () => {
      const factors = matchKeywords('this is a bug fix in production', 'bugfix');
      expect(factors.length).toBeGreaterThan(0);
      expect(factors.every(f => f.source === 'description')).toBe(true);
    });

    it('deve retornar vazio para texto sem match', () => {
      const factors = matchKeywords('nothing relevant here', 'bugfix');
      expect(factors.length).toBe(0);
    });
  });

  describe('classifyByDescription', () => {
    it('deve classificar bugfix por descricao', () => {
      const result = classifyByDescription({
        description: 'Corrigir erro no login que causa crash ao autenticar usuario',
        title: 'Bug no login',
      });
      expect(result.taskType).toBe('bugfix');
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.requiresManualReview).toBe(false);
    });

    it('deve classificar feature por descricao', () => {
      const result = classifyByDescription({
        description: 'Adicionar nova funcionalidade de exportacao de relatorios em PDF',
        title: 'Nova feature de exportacao',
      });
      expect(result.taskType).toBe('feature');
      expect(result.confidence).toBeGreaterThan(50);
    });

    it('deve classificar documentacao por descricao', () => {
      const result = classifyByDescription({
        description: 'Escrever documentacao de uso da API REST para novos usuarios',
      });
      expect(result.taskType).toBe('documentation');
    });

    it('deve classificar seguranca por descricao', () => {
      const result = classifyByDescription({
        description: 'Corrigir vulnerabilidade critica de autenticacao e permissoes RBAC',
        title: 'Security audit',
      });
      expect(result.taskType).toBe('security_review');
    });

    it('deve classificar refactor por descricao', () => {
      const result = classifyByDescription({
        description: 'Refatorar modulo de pagamentos para reduzir divida tecnica e melhorar clean code',
      });
      expect(result.taskType).toBe('refactor');
    });

    it('deve classificar teste por descricao', () => {
      const result = classifyByDescription({
        description: 'Adicionar testes unitarios e spec para o modulo de usuarios com jest',
        title: 'Test coverage',
      });
      expect(result.taskType).toBe('test_only');
    });

    it('deve classificar dependency update por descricao', () => {
      const result = classifyByDescription({
        description: 'Atualizar dependencias do npm para versoes mais recentes',
        files: ['package.json', 'yarn.lock'],
      });
      expect(result.taskType).toBe('dependency_update');
    });

    it('deve classificar cleanup por descricao', () => {
      const result = classifyByDescription({
        description: 'Remover codigo morto e arquivos legados do repositorio',
      });
      expect(result.taskType).toBe('cleanup');
    });

    it('deve classificar incident response por descricao', () => {
      const result = classifyByDescription({
        description: 'Incidente critico em producao — servico offline, necessario rollback urgente',
        title: 'P0 incident',
      });
      expect(result.taskType).toBe('incident_response');
    });

    it('deve retornar requiresManualReview para texto vazio', () => {
      const result = classifyByDescription({ description: '' });
      expect(result.requiresManualReview).toBe(true);
      expect(result.confidence).toBe(0);
    });

    it('deve retornar secondaryTypes ordenados', () => {
      const result = classifyByDescription({
        description: 'Corrigir erro de seguranca no modulo de autenticacao',
      });
      expect(result.secondaryTypes.length).toBeGreaterThan(0);
      for (let i = 1; i < result.secondaryTypes.length; i++) {
        expect(result.secondaryTypes[i - 1].confidence).toBeGreaterThanOrEqual(result.secondaryTypes[i].confidence);
      }
    });
  });

  describe('classifyByFiles', () => {
    it('deve classificar test_only para arquivos .spec.ts', () => {
      const result = classifyByFiles(['src/user/user.spec.ts']);
      expect(result).toBe('test_only');
    });

    it('deve classificar test_only para arquivos .test.ts', () => {
      const result = classifyByFiles(['src/user/user.test.ts']);
      expect(result).toBe('test_only');
    });

    it('deve classificar documentation para arquivos .md', () => {
      const result = classifyByFiles(['README.md', 'docs/api.md']);
      expect(result).toBe('documentation');
    });

    it('deve classificar security_review para arquivos security', () => {
      const result = classifyByFiles(['src/security/auth.ts', 'audit.log']);
      expect(result).toBe('security_review');
    });

    it('deve classificar design_change para arquivos .css', () => {
      const result = classifyByFiles(['src/styles/theme.css']);
      expect(result).toBe('design_change');
    });

    it('deve classificar cleanup para arquivos legacy', () => {
      const result = classifyByFiles(['src/legacy/old-module.ts']);
      expect(result).toBe('cleanup');
    });

    it('deve retornar null para array vazio', () => {
      expect(classifyByFiles([])).toBeNull();
    });
  });

  describe('classify (integrado)', () => {
    it('deve combinar descricao e files para classificacao precisa', () => {
      const result = classify({
        description: 'Adicionar nova tela de login com design responsivo',
        files: ['src/components/Login.tsx', 'src/styles/login.css'],
      });
      expect(['feature', 'design_change']).toContain(result.taskType);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.factors.length).toBeGreaterThan(0);
    });

    it('deve usar fallback para descricao vazia com arquivos', () => {
      const result = classify({
        description: '',
        files: ['package.json', 'yarn.lock'],
      });
      expect(['dependency_update', 'feature']).toContain(result.taskType);
    });

    it('deve processar labels corretamente', () => {
      const result = classify({
        description: 'Atualizar dependencias',
        labels: ['security', 'audit'],
      });
      expect(result.taskType).toBe('security_review');
    });

    it('deve retornar factors de ambas as fontes', () => {
      const result = classify({
        description: 'Corrigir bug no modulo de pagamentos',
        files: ['src/hotfix/payment.ts'],
      });
      expect(result.factors.some(f => f.source === 'description')).toBe(true);
    });
  });

  describe('classifyAndExplain', () => {
    it('deve retornar resultado e explicacao', () => {
      const { result, explanation } = classifyAndExplain({
        description: 'Corrigir erro critico de producao',
      });
      expect(result).toBeDefined();
      expect(explanation).toContain(TASK_TYPE_LABELS[result.taskType]);
      expect(explanation).toContain('Pipeline recomendado');
    });

    it('deve incluir fatores na explicacao', () => {
      const { explanation } = classifyAndExplain({
        description: 'Adicionar nova funcionalidade de busca',
        files: ['src/search/index.ts'],
      });
      expect(explanation).toContain('Fatores considerados');
    });

    it('deve incluir aviso de revisao para confianca baixa', () => {
      const { explanation } = classifyAndExplain({
        description: 'fazer alguma coisa',
      });
      if (classify({ description: 'fazer alguma coisa' }).requiresManualReview) {
        expect(explanation).toContain('revisão manual recomendada');
      }
    });
  });

  describe('extractRouting', () => {
    it('deve retornar roteamento para bugfix', () => {
      const routing = extractRouting('bugfix');
      expect(routing.pipeline.length).toBeGreaterThan(0);
      expect(routing.context).toBe('forensic');
      expect(routing.agents).toContain('fixer');
      expect(routing.risk).toBe('medium');
    });

    it('deve retornar roteamento para feature', () => {
      const routing = extractRouting('feature');
      expect(routing.pipeline.length).toBeGreaterThan(0);
      expect(routing.context).toBe('full');
      expect(routing.agents).toContain('planner');
    });

    it('deve retornar roteamento para documentation', () => {
      const routing = extractRouting('documentation');
      expect(routing.context).toBe('minimal');
      expect(routing.risk).toBe('low');
    });

    it('deve retornar roteamento para security_review', () => {
      const routing = extractRouting('security_review');
      expect(routing.risk).toBe('critical');
      expect(routing.agents).toContain('security-auditor');
    });

    it('deve retornar roteamento para todos os tipos', () => {
      for (const t of ALL_TASK_TYPES) {
        const routing = extractRouting(t);
        expect(routing.pipeline.length).toBeGreaterThan(0);
        expect(['low', 'medium', 'high', 'critical']).toContain(routing.risk);
      }
    });
  });

  describe('DEFAULT_ROUTING', () => {
    it('deve conter routing para todos os 10 tipos', () => {
      expect(Object.keys(DEFAULT_ROUTING).length).toBe(10);
      for (const t of ALL_TASK_TYPES) {
        expect(DEFAULT_ROUTING[t]).toBeDefined();
        expect(DEFAULT_ROUTING[t].agents.length).toBeGreaterThan(0);
        expect(DEFAULT_ROUTING[t].pipeline.length).toBeGreaterThan(0);
      }
    });
  });

  describe('classificacao com acentos', () => {
    it('deve funcionar com texto acentuado', () => {
      const result = classifyByDescription({
        description: 'Corrigir segurança na autenticação de usuários',
        title: 'Bug crítico',
      });
      expect(result.taskType).toBe('bugfix');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('deve classificar documentação com acento', () => {
      const result = classifyByDescription({
        description: 'Atualizar documentação da API para incluir novos endpoints',
      });
      expect(result.taskType).toBe('documentation');
    });
  });

  describe('classificacao sem match', () => {
    it('deve retornar requiresManualReview quando sem match claro', () => {
      const result = classifyByDescription({
        description: 'xyz abc def ghi jkl mno pqr stu vwx z',
      });
      expect(result.requiresManualReview).toBe(true);
    });
  });
});
