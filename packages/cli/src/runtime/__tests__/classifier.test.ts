import {
  classify,
  classifyByDescription,
  classifyByFiles,
  extractRouting,
  normalizeText,
  matchKeywords,
  classifyAndExplain,
  ALL_TASK_TYPES,
  TaskType,
  ClassificationRequest,
} from '../classifier';

describe('normalizeText', () => {
  it('should lowercase and strip accents', () => {
    expect(normalizeText('Olá Mundo')).toBe('ola mundo');
  });

  it('should handle empty string', () => {
    expect(normalizeText('')).toBe('');
  });

  it('should handle already clean text', () => {
    expect(normalizeText('bugfix')).toBe('bugfix');
  });

  it('should handle special characters', () => {
    expect(normalizeText('coração çar')).toBe('coracao car');
  });
});

describe('matchKeywords', () => {
  it('should return factors for matching keyword', () => {
    const factors = matchKeywords('fix critical bug', 'bugfix');
    expect(factors.length).toBeGreaterThan(0);
    expect(factors[0].source).toBe('description');
  });

  it('should return empty array for no match', () => {
    const factors = matchKeywords('zzzzyyyy', 'bugfix');
    expect(factors).toEqual([]);
  });

  it('should return empty for unrelated task type', () => {
    const factors = matchKeywords('fix bug', 'documentation');
    expect(factors.length).toBe(0);
  });
});

describe('classifyByDescription', () => {
  it('should classify bugfix description', () => {
    const result = classifyByDescription({ description: 'Fix critical payment bug crashing on checkout' });
    expect(result.taskType).toBe('bugfix');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it('should classify feature description', () => {
    const result = classifyByDescription({ description: 'Implement new user dashboard with analytics' });
    expect(result.taskType).toBe('feature');
  });

  it('should classify documentation description', () => {
    const result = classifyByDescription({ description: 'Write API documentation and user guide' });
    expect(result.taskType).toBe('documentation');
  });

  it('should classify security review', () => {
    const result = classifyByDescription({ description: 'Audit authentication for CVE vulnerabilities' });
    expect(result.taskType).toBe('security_review');
  });

  it('should classify refactor', () => {
    const result = classifyByDescription({ description: 'Refactor legacy module to reduce technical debt' });
    expect(result.taskType).toBe('refactor');
  });

  it('should classify test_only', () => {
    const result = classifyByDescription({ description: 'Add unit tests for coverage improvement' });
    expect(result.taskType).toBe('test_only');
  });

  it('should classify dependency_update', () => {
    const result = classifyByDescription({ description: 'Update npm packages to latest version' });
    expect(result.taskType).toBe('dependency_update');
  });

  it('should classify cleanup', () => {
    const result = classifyByDescription({ description: 'Remove dead code and deprecated files' });
    expect(result.taskType).toBe('cleanup');
  });

  it('should classify incident_response', () => {
    const result = classifyByDescription({ description: 'P0 incident production down urgent rollback' });
    expect(result.taskType).toBe('incident_response');
  });

  it('should classify design_change', () => {
    const result = classifyByDescription({ description: 'Redesign UI layout and visual theme' });
    expect(result.taskType).toBe('design_change');
  });

  it('should return feature with requiresManualReview for empty description', () => {
    const result = classifyByDescription({ description: '' });
    expect(result.taskType).toBe('feature');
    expect(result.confidence).toBe(0);
    expect(result.requiresManualReview).toBe(true);
  });

  it('should consider files in classification', () => {
    const result = classifyByDescription({
      description: 'Update something',
      files: ['src/security/auth.ts', 'src/components/button.css'],
    });
    expect(result.factors.some(f => f.source === 'files')).toBe(true);
  });

  it('should consider labels in classification', () => {
    const result = classifyByDescription({
      description: 'some work',
      labels: ['fix', 'crash'],
    });
    expect(result.taskType).toBe('bugfix');
  });

  it('should combine title and description', () => {
    const result = classifyByDescription({
      title: 'Security Issue',
      description: 'CVE in dependency',
    });
    expect(result.taskType).toBe('security_review');
  });

  it('should return secondary types', () => {
    const result = classifyByDescription({ description: 'Fix crash and add tests' });
    expect(result.secondaryTypes.length).toBeGreaterThanOrEqual(0);
  });
});

describe('classifyByFiles', () => {
  it('should return test_only for test files', () => {
    const result = classifyByFiles(['src/__tests__/auth.test.ts']);
    expect(result).toBe('test_only');
  });

  it('should return security_review for security files', () => {
    const result = classifyByFiles(['src/security/policy.ts']);
    expect(result).toBe('security_review');
  });

  it('should return documentation for .md files', () => {
    const result = classifyByFiles(['README.md']);
    expect(result).toBe('documentation');
  });

  it('should return design_change for css files', () => {
    const result = classifyByFiles(['src/styles/theme.scss']);
    expect(result).toBe('design_change');
  });

  it('should return null for empty array', () => {
    const result = classifyByFiles([]);
    expect(result).toBeNull();
  });

  it('should return null for files with no patterns', () => {
    const result = classifyByFiles(['src/main.ts']);
    expect(result).toBeNull();
  });
});

describe('classify', () => {
  it('should return same as classifyByDescription without files', () => {
    const result = classify({ description: 'Fix login bug' });
    expect(result.taskType).toBe('bugfix');
  });

  it('should add file factors when confidence < 70', () => {
    const result = classify({
      description: 'Update some generic code',
      files: ['src/__tests__/test.spec.ts'],
    });
    expect(result.factors.some(f => f.source === 'files')).toBe(true);
  });

  it('should handle request with all fields', () => {
    const result = classify({
      title: 'Fix',
      description: 'bug in payment',
      files: ['src/payment.ts'],
      labels: ['bug'],
    });
    expect(result.taskType).toBe('bugfix');
    expect(result.confidence).toBeGreaterThan(0);
  });
});

describe('extractRouting', () => {
  it('should return routing for bugfix', () => {
    const routing = extractRouting('bugfix');
    expect(routing.pipeline).toBeDefined();
    expect(routing.pipeline.length).toBeGreaterThan(0);
    expect(routing.risk).toBe('medium');
    expect(routing.agents).toContain('fixer');
  });

  it('should return routing for feature', () => {
    const routing = extractRouting('feature');
    expect(routing.risk).toBe('high');
    expect(routing.agents).toContain('planner');
  });

  it('should return routing for security_review', () => {
    const routing = extractRouting('security_review');
    expect(routing.risk).toBe('critical');
    expect(routing.agents).toContain('security-auditor');
  });

  it('should return routing for incident_response', () => {
    const routing = extractRouting('incident_response');
    expect(routing.risk).toBe('critical');
    expect(routing.budget).toBe('bugfix');
  });

  it('should return routing for documentation', () => {
    const routing = extractRouting('documentation');
    expect(routing.risk).toBe('low');
    expect(routing.context).toBe('minimal');
  });

  it('should have routing for every TaskType', () => {
    for (const t of ALL_TASK_TYPES) {
      const routing = extractRouting(t);
      expect(routing).toBeDefined();
      expect(routing.pipeline.length).toBeGreaterThan(0);
    }
  });
});

describe('classifyAndExplain', () => {
  it('should return result with explanation string', () => {
    const output = classifyAndExplain({ description: 'Fix critical bug in production' });
    expect(output.result).toBeDefined();
    expect(output.result.taskType).toBe('bugfix');
    expect(typeof output.explanation).toBe('string');
    expect(output.explanation.length).toBeGreaterThan(0);
  });

  it('should include manual review warning when confidence low', () => {
    const output = classifyAndExplain({ description: '' });
    expect(output.explanation).toContain('revisão manual');
  });

  it('should include pipeline steps in explanation', () => {
    const output = classifyAndExplain({ description: 'Add new feature' });
    expect(output.explanation).toContain('Pipeline recomendado');
  });
});
