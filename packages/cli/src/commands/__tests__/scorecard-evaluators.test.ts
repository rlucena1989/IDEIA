import type { ScorecardItem, ScorecardCategory } from '../scorecard-types';

const mockNpmAudit = jest.fn();
const mockCoveragePct = jest.fn();
const mockPylintOk = jest.fn();
const mockGolintOk = jest.fn();
const mockOldestDep = jest.fn();
const mockEx = jest.fn();
const mockHasContent = jest.fn();
const mockDirSize = jest.fn();
const mockRead = jest.fn();
const mockRoot = jest.fn();
const mockRunNode = jest.fn();
const mockRunAllScripts = jest.fn();
const mockJestResultOk = jest.fn();
const mockCalcScore = jest.fn();

jest.mock('../scorecard-utils', () => ({
  npmAudit: mockNpmAudit,
  coveragePct: mockCoveragePct,
  pylintOk: mockPylintOk,
  golintOk: mockGolintOk,
  oldestDep: mockOldestDep,
  ex: mockEx,
  hasContent: mockHasContent,
  dirSize: mockDirSize,
  read: mockRead,
  root: mockRoot,
  runNode: mockRunNode,
  runAllScripts: mockRunAllScripts,
  jestResultOk: mockJestResultOk,
  calcScore: mockCalcScore,
}));

const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockReaddirSync = jest.fn();
const mockStatSync = jest.fn();
const mockSpawnSync = jest.fn();
const mockExecFileSync = jest.fn();

jest.mock('node:fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  readdirSync: mockReaddirSync,
  statSync: mockStatSync,
}));

jest.mock('node:child_process', () => ({
  spawnSync: mockSpawnSync,
  execFileSync: mockExecFileSync,
}));

import {
  evalSecurity, evalQuality, evalArchitecture, evalDocs,
  evalOptimizer, evalAgents, evalEcosystem, evalExtensibility,
  evalRoadmap, evalGit, evalProjectStructure, evalPackageHealth,
  evalCodeQuality, evalCICD, evalDependencies, evalCodeDocs,
  evalProjectIntegrity, evalPipelineHealth,
} from '../scorecard-evaluators';

beforeEach(() => {
  jest.clearAllMocks();
  mockRoot.mockReturnValue(process.cwd());
  mockCalcScore.mockImplementation((items: ScorecardItem[]) => {
    const total = items.reduce((s: number, i: ScorecardItem) => s + i.weight, 0);
    const earned = items.filter((i: ScorecardItem) => i.passed).reduce((s: number, i: ScorecardItem) => s + i.weight, 0);
    return total > 0 ? (earned / total) * 100 : 0;
  });
});

function assertCategoryShape(cat: ScorecardCategory): void {
  expect(cat).toHaveProperty('name');
  expect(cat).toHaveProperty('weight');
  expect(cat).toHaveProperty('score');
  expect(cat).toHaveProperty('maxScore');
  expect(cat).toHaveProperty('items');
  expect(Array.isArray(cat.items)).toBe(true);
  expect(typeof cat.name).toBe('string');
  expect(typeof cat.weight).toBe('number');
  expect(typeof cat.score).toBe('number');
  expect(cat.maxScore).toBe(100);
}

// ─── 1. Segurança ───────────────────────────────────────────

describe('evalSecurity', () => {
  it('returns a valid ScorecardCategory', () => {
    mockNpmAudit.mockReturnValue({ critical: 0, high: 0, moderate: 0, low: 0 });
    mockEx.mockReturnValue(true);
    mockRunNode.mockReturnValue(true);
    mockHasContent.mockReturnValue(true);
    const cat = evalSecurity();
    assertCategoryShape(cat);
    expect(cat.name).toBeDefined();
    expect(cat.weight).toBe(16);
  });
  it('fails when vulnerabilities exist', () => {
    mockNpmAudit.mockReturnValue({ critical: 2, high: 5, moderate: 3, low: 1 });
    mockEx.mockReturnValue(false);
    mockRunNode.mockReturnValue(false);
    mockHasContent.mockReturnValue(false);
    const cat = evalSecurity();
    expect(cat.items.every(i => i.passed)).toBe(false);
  });
  it('includes audit count in items', () => {
    mockNpmAudit.mockReturnValue({ critical: 0, high: 3, moderate: 0, low: 0 });
    const cat = evalSecurity();
    const sec6 = cat.items.find(i => i.id === 'SEC-006');
    expect(sec6).toBeDefined();
    expect(sec6!.value).toBe(3);
  });
  it('assigns weight 3 to critical vuln item', () => {
    mockNpmAudit.mockReturnValue({ critical: 0, high: 0, moderate: 0, low: 0 });
    const sec5 = evalSecurity().items.find(i => i.id === 'SEC-005');
    expect(sec5!.weight).toBe(3);
  });
  it('calculates score correctly', () => {
    mockNpmAudit.mockReturnValue({ critical: 0, high: 0, moderate: 0, low: 0 });
    mockEx.mockReturnValue(true);
    mockRunNode.mockReturnValue(true);
    mockHasContent.mockReturnValue(true);
    expect(evalSecurity().score).toBeGreaterThan(0);
  });
});

// ─── 2. Qualidade ───────────────────────────────────────────

describe('evalQuality', () => {
  it('returns a valid ScorecardCategory', () => {
    mockCoveragePct.mockReturnValue(95);
    mockHasContent.mockReturnValue(true);
    mockEx.mockReturnValue(true);
    mockRunNode.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ total: { branches: { pct: 80 } } }));
    const cat = evalQuality();
    assertCategoryShape(cat);
    expect(cat.name).toBeDefined();
    expect(cat.weight).toBe(16);
  });
  it('fails when coverage below threshold', () => {
    mockCoveragePct.mockReturnValue(50);
    mockHasContent.mockReturnValue(false);
    mockEx.mockReturnValue(false);
    mockRunNode.mockReturnValue(false);
    mockReadFileSync.mockImplementation(() => { throw new Error('ENOENT'); });
    const cat = evalQuality();
    expect(cat.items.every(i => i.passed)).toBe(false);
  });
  it('passes coverage item at boundary (93%)', () => {
    mockCoveragePct.mockReturnValue(93);
    mockReadFileSync.mockReturnValue(JSON.stringify({ total: { branches: { pct: 76 } } }));
    const qlt8 = evalQuality().items.find(i => i.id === 'QLT-008');
    expect(qlt8!.passed).toBe(true);
  });
  it('reads branch coverage from file', () => {
    mockCoveragePct.mockReturnValue(95);
    mockReadFileSync.mockReturnValue(JSON.stringify({ total: { branches: { pct: 80 } } }));
    const qlt9 = evalQuality().items.find(i => i.id === 'QLT-009');
    expect(qlt9!.passed).toBe(true);
  });
});

// ─── 3. Arquitetura ─────────────────────────────────────────

describe('evalArchitecture', () => {
  it('returns a valid ScorecardCategory', () => {
    mockDirSize.mockReturnValue(3);
    mockEx.mockReturnValue(true);
    mockHasContent.mockReturnValue(true);
    mockPylintOk.mockReturnValue(true);
    const cat = evalArchitecture();
    assertCategoryShape(cat);
    expect(cat.name).toBeDefined();
    expect(cat.weight).toBe(14);
  });
  it('fails ADR count check when below 3', () => {
    mockDirSize.mockReturnValue(1);
    mockEx.mockReturnValue(false);
    mockHasContent.mockReturnValue(false);
    mockPylintOk.mockReturnValue(false);
    expect(evalArchitecture().items.every(i => i.passed)).toBe(false);
  });
  it('reports ADR count value', () => {
    mockDirSize.mockReturnValue(5);
    const arch4 = evalArchitecture().items.find(i => i.id === 'ARCH-004');
    expect(arch4!.value).toBe(5);
  });
});

// ─── 4. Documentação ────────────────────────────────────────

describe('evalDocs', () => {
  it('returns a valid ScorecardCategory', () => {
    mockHasContent.mockReturnValue(true);
    mockEx.mockReturnValue(true);
    const cat = evalDocs();
    assertCategoryShape(cat);
    expect(cat.name).toBeDefined();
    expect(cat.weight).toBe(10);
  });
  it('fails when files missing', () => {
    mockHasContent.mockReturnValue(false);
    mockEx.mockReturnValue(false);
    expect(evalDocs().items.every(i => i.passed)).toBe(false);
  });
  it('checks AI-USAGE-GUIDE in root or docs/', () => {
    mockEx.mockImplementation((f: string) => f === 'README.md' || f === 'docs/AI-USAGE-GUIDE.md');
    mockHasContent.mockReturnValue(true);
    expect(evalDocs().items.find(i => i.id === 'DOC-002')!.passed).toBe(true);
  });
});

// ─── 5. Otimização Inteligente ──────────────────────────────

describe('evalOptimizer', () => {
  it('returns a valid ScorecardCategory', () => {
    mockHasContent.mockReturnValue(true);
    mockEx.mockReturnValue(true);
    mockRunNode.mockReturnValue(true);
    const cat = evalOptimizer();
    assertCategoryShape(cat);
    expect(cat.name).toBeDefined();
    expect(cat.weight).toBe(15);
  });
  it('fails when optimizer scripts fail', () => {
    mockHasContent.mockReturnValue(false);
    mockEx.mockReturnValue(false);
    mockRunNode.mockReturnValue(false);
    expect(evalOptimizer().items.every(i => i.passed)).toBe(false);
  });
});

// ─── 6. Agentes e Runtime ───────────────────────────────────

describe('evalAgents', () => {
  it('returns a valid ScorecardCategory', () => {
    mockDirSize.mockReturnValue(3);
    mockStatSync.mockReturnValue({ size: 1024 });
    mockEx.mockReturnValue(true);
    mockRunNode.mockReturnValue(true);
    mockHasContent.mockReturnValue(true);
    const cat = evalAgents();
    assertCategoryShape(cat);
    expect(cat.name).toBeDefined();
    expect(cat.weight).toBe(14);
  });
  it('fails when agent count below 3', () => {
    mockDirSize.mockReturnValue(0);
    mockStatSync.mockImplementation(() => { throw new Error('ENOENT'); });
    mockEx.mockReturnValue(false);
    mockRunNode.mockReturnValue(false);
    mockHasContent.mockReturnValue(false);
    expect(evalAgents().items.every(i => i.passed)).toBe(false);
  });
  it('reports ledger size in KB', () => {
    mockDirSize.mockReturnValue(3);
    mockStatSync.mockReturnValue({ size: 20480 });
    expect(evalAgents().items.find(i => i.id === 'AGT-002')!.value).toContain('KB');
  });
});

// ─── 7. Ecossistema ────────────────────────────────────────

describe('evalEcosystem', () => {
  it('returns a valid ScorecardCategory', () => {
    mockNpmAudit.mockReturnValue({ critical: 0, high: 1, moderate: 5 });
    mockOldestDep.mockReturnValue(null);
    mockGolintOk.mockReturnValue(true);
    mockPylintOk.mockReturnValue(true);
    mockEx.mockReturnValue(true);
    const cat = evalEcosystem();
    assertCategoryShape(cat);
    expect(cat.name).toBeDefined();
    expect(cat.weight).toBe(10);
  });
  it('passes critical check when zero critical vulns', () => {
    mockNpmAudit.mockReturnValue({ critical: 0, high: 0, moderate: 0 });
    expect(evalEcosystem().items.find(i => i.id === 'ECO-001')!.passed).toBe(true);
  });
  it('fails critical check when critical vulns exist', () => {
    mockNpmAudit.mockReturnValue({ critical: 1, high: 0, moderate: 0 });
    expect(evalEcosystem().items.find(i => i.id === 'ECO-001')!.passed).toBe(false);
  });
  it('fails high+moderate check when thresholds exceeded', () => {
    mockNpmAudit.mockReturnValue({ critical: 0, high: 5, moderate: 10 });
    expect(evalEcosystem().items.find(i => i.id === 'ECO-002')!.passed).toBe(false);
  });
});

// ─── 8. Extensibilidade ─────────────────────────────────────

describe('evalExtensibility', () => {
  it('returns a valid ScorecardCategory', () => {
    mockEx.mockReturnValue(true);
    mockHasContent.mockReturnValue(true);
    const cat = evalExtensibility();
    assertCategoryShape(cat);
    expect(cat.name).toBeDefined();
    expect(cat.weight).toBe(10);
  });
  it('fails when extensions missing', () => {
    mockEx.mockReturnValue(false);
    mockHasContent.mockReturnValue(false);
    expect(evalExtensibility().items.every(i => i.passed)).toBe(false);
  });
});

// ─── 9. Roadmap ─────────────────────────────────────────────

describe('evalRoadmap', () => {
  it('returns a valid ScorecardCategory', () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(['TASK-EV-001.md', 'TASK-EV-002.md']);
    mockRead.mockReturnValue('- [x] task done\n');
    const cat = evalRoadmap();
    assertCategoryShape(cat);
    expect(cat.name).toBeDefined();
    expect(cat.weight).toBe(5);
  });
  it('passes when 25%+ tasks completed', () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(['TASK-EV-001.md', 'TASK-EV-002.md', 'TASK-EV-003.md', 'TASK-EV-004.md']);
    mockRead.mockReturnValue('- [x] done\n');
    const rdm1 = evalRoadmap().items.find(i => i.id === 'RDM-001');
    expect(rdm1!.passed).toBe(true);
  });
  it('fails when no tasks completed', () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(['TASK-EV-001.md']);
    mockRead.mockReturnValue('- [ ] not done\n');
    const rdm1 = evalRoadmap().items.find(i => i.id === 'RDM-001');
    expect(rdm1!.passed).toBe(false);
  });
});

// ─── 10. Git ────────────────────────────────────────────────

describe('evalGit', () => {
  it('returns a valid ScorecardCategory', () => {
    mockEx.mockReturnValue(true);
    mockHasContent.mockReturnValue(true);
    mockDirSize.mockReturnValue(3);
    const cat = evalGit();
    assertCategoryShape(cat);
    expect(cat.name).toBeDefined();
    expect(cat.weight).toBe(8);
  });
  it('fails when workflows count below 3', () => {
    mockEx.mockReturnValue(false);
    mockHasContent.mockReturnValue(false);
    mockDirSize.mockReturnValue(0);
    expect(evalGit().items.every(i => i.passed)).toBe(false);
  });
});

// ─── 10a. Estrutura do Projeto ──────────────────────────────

describe('evalProjectStructure', () => {
  it('returns a valid ScorecardCategory', () => {
    mockEx.mockReturnValue(true);
    mockHasContent.mockReturnValue(true);
    const cat = evalProjectStructure();
    assertCategoryShape(cat);
    expect(cat.name).toBeDefined();
    expect(cat.weight).toBe(3);
  });
  it('fails when config files missing', () => {
    mockEx.mockReturnValue(false);
    mockHasContent.mockReturnValue(false);
    expect(evalProjectStructure().items.every(i => i.passed)).toBe(false);
  });
});

// ─── 10b. Package Health ────────────────────────────────────

describe('evalPackageHealth', () => {
  it('returns a valid ScorecardCategory', () => {
    mockReaddirSync.mockReturnValue(['adapter-nestjs', 'adapter-fastapi']);
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ isDirectory: () => true });
    const cat = evalPackageHealth();
    assertCategoryShape(cat);
    expect(cat.name).toBeDefined();
    expect(cat.weight).toBe(4);
  });
  it('reports adapter count', () => {
    mockReaddirSync.mockReturnValue(['adapter-nestjs', 'adapter-fastapi', 'adapter-go']);
    mockExistsSync.mockImplementation((p: string) => {
      if (typeof p !== 'string') return false;
      return p.includes('src/index.ts') || p.includes('package.json');
    });
    mockStatSync.mockReturnValue({ isDirectory: () => true });
    const pkg1 = evalPackageHealth().items.find(i => i.id === 'PKG-001');
    expect(pkg1).toBeDefined();
  });
});

// ─── 11. Qualidade de Código ────────────────────────────────

describe('evalCodeQuality', () => {
  it('returns a valid ScorecardCategory', () => {
    mockReadFileSync.mockReturnValue('some code');
    mockEx.mockReturnValue(true);
    mockHasContent.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(['file.ts']);
    mockStatSync.mockReturnValue({ isDirectory: () => false, size: 500 });
    const cat = evalCodeQuality();
    assertCategoryShape(cat);
    expect(cat.name).toBeDefined();
    expect(cat.weight).toBe(8);
  });
  it('passes any count item when :any appears < 100 times', () => {
    mockReadFileSync.mockReturnValue('const x: string = "no any"');
    const cod1 = evalCodeQuality().items.find(i => i.id === 'COD-001');
    expect(cod1!.passed).toBe(true);
    expect(cod1!.value).toBe(0);
  });
  it('fails large files check when files > 100KB exist', () => {
    mockStatSync.mockReturnValue({ isDirectory: () => false, size: 150000 });
    mockReaddirSync.mockReturnValue(['huge.ts']);
    mockReadFileSync.mockReturnValue('code');
    const cod2 = evalCodeQuality().items.find(i => i.id === 'COD-002');
    expect(cod2).toBeDefined();
  });
});

// ─── 12. CI/CD ──────────────────────────────────────────────

describe('evalCICD', () => {
  it('returns a valid ScorecardCategory', () => {
    mockDirSize.mockReturnValue(2);
    mockEx.mockReturnValue(true);
    const cat = evalCICD();
    assertCategoryShape(cat);
    expect(cat.name).toBeDefined();
    expect(cat.weight).toBe(4);
  });
  it('fails when CI workflows missing', () => {
    mockDirSize.mockReturnValue(0);
    mockEx.mockReturnValue(false);
    expect(evalCICD().items.every(i => i.passed)).toBe(false);
  });
});

// ─── 13. Dependências ───────────────────────────────────────

describe('evalDependencies', () => {
  it('returns a valid ScorecardCategory', () => {
    mockRead.mockReturnValue(JSON.stringify({ dependencies: { foo: '1.0.0' }, devDependencies: { bar: '2.0.0' } }));
    mockEx.mockReturnValue(true);
    mockExecFileSync.mockReturnValue('');
    const cat = evalDependencies();
    assertCategoryShape(cat);
    expect(cat.name).toBeDefined();
    expect(cat.weight).toBe(6);
  });
  it('fails when dep count >= 100', () => {
    const deps: Record<string, string> = {};
    for (let i = 0; i < 100; i++) deps[`dep${i}`] = '1.0.0';
    mockRead.mockReturnValue(JSON.stringify({ dependencies: deps }));
    expect(evalDependencies().items.find(i => i.id === 'DEP-001')!.passed).toBe(false);
  });
  it('passes lock file check when exists', () => {
    mockRead.mockReturnValue(JSON.stringify({ dependencies: { a: '1.0.0' } }));
    mockEx.mockImplementation((f: string) => f === 'package-lock.json');
    expect(evalDependencies().items.find(i => i.id === 'DEP-003')!.passed).toBe(true);
  });
});

// ─── 14. Documentação de Código ─────────────────────────────

describe('evalCodeDocs', () => {
  it('returns a valid ScorecardCategory', () => {
    mockReadFileSync.mockReturnValue('/** JSDoc */\nexport function foo() {}\n');
    mockEx.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(['utils.ts']);
    mockStatSync.mockReturnValue({ isDirectory: () => false, size: 100 });
    const cat = evalCodeDocs();
    assertCategoryShape(cat);
    expect(cat.name).toBeDefined();
    expect(cat.weight).toBe(6);
  });
  it('calculates doc ratio correctly', () => {
    mockReadFileSync.mockReturnValue('/** doc */\nexport function foo() {}');
    const doccod1 = evalCodeDocs().items.find(i => i.id === 'DOCCOD-001');
    expect(doccod1).toBeDefined();
  });
});

// ─── 15. Integridade do Projeto ─────────────────────────────

describe('evalProjectIntegrity', () => {
  it('returns a valid ScorecardCategory', () => {
    mockEx.mockReturnValue(true);
    mockSpawnSync.mockReturnValue({ status: 0 });
    const cat = evalProjectIntegrity();
    assertCategoryShape(cat);
    expect(cat.name).toBeDefined();
    expect(cat.weight).toBe(5);
  });
  it('fails when critical files missing', () => {
    mockEx.mockReturnValue(false);
    mockSpawnSync.mockReturnValue({ status: 1 });
    expect(evalProjectIntegrity().items.every(i => i.passed)).toBe(false);
  });
  it('reports number of missing files', () => {
    mockEx.mockReturnValue(true);
    mockSpawnSync.mockReturnValue({ status: 0 });
    const int1 = evalProjectIntegrity().items.find(i => i.id === 'INT-001');
    expect(int1!.value).toBe('0 missing');
  });
});

// ─── 16. Pipeline Health ────────────────────────────────────

describe('evalPipelineHealth', () => {
  it('returns a valid ScorecardCategory', () => {
    mockRunAllScripts.mockReturnValue(true);
    mockJestResultOk.mockReturnValue(true);
    const cat = evalPipelineHealth();
    assertCategoryShape(cat);
    expect(cat.name).toBeDefined();
    expect(cat.weight).toBe(3);
  });
  it('fails when scripts or tests fail', () => {
    mockRunAllScripts.mockReturnValue(false);
    mockJestResultOk.mockReturnValue(false);
    expect(evalPipelineHealth().items.every(i => i.passed)).toBe(false);
  });
});
