describe('Utils — review/index.ts runReview', () => {
  const review = require('../utils/review/index');

  it('runReview anti-slop encontra issues', () => {
    const result = review.runReview(['anti-slop'], process.cwd() + '/packages/cli/src/commands');
    expect(result).toBeDefined();
    expect(Array.isArray(result.findings)).toBe(true);
    expect(result.summary).toBeDefined();
  });

  it('runReview all executa 4 revisoes', () => {
    const result = review.runReview(['anti-slop', 'regression', 'security', 'performance'], process.cwd());
    expect(result).toBeDefined();
  });
});

describe('Security — barrier.ts', () => {
  it('checkBarriers executa com files', () => {
    const barrier = require('../utils/security/barrier');
    const result = barrier.checkBarriers(process.cwd(), ['.env', 'src/auth.ts']);
    expect(result).toBeDefined();
    expect(Array.isArray(result.blocked)).toBe(true);
  });

  it('checkBarriers com bypass aceita', () => {
    const barrier = require('../utils/security/barrier');
    const result = barrier.checkBarriers(process.cwd(), ['test.ts'], 'revisado manualmente');
    expect(result.bypass).toBe('revisado manualmente');
  });
});

describe('Security — baseline.ts', () => {
  const b = require('../security/baseline');
  it('createBaseline executa', () => {
    const result = b.createBaseline(process.cwd());
    expect(result).toBeDefined();
  });

  it('detectDowngrades executa', () => {
    const base = b.createBaseline(process.cwd());
    const diff = b.detectDowngrades(base, base);
    expect(diff).toBeDefined();
  });
});

describe('Security — detector.ts', () => {
  const d = require('../security/detector');
  it('funcoes exportam', () => {
    expect(typeof d.logDowngradeAttempt).toBe('function');
    expect(typeof d.evaluateFindings).toBe('function');
  });
});

describe('Supply Chain — index.ts', () => {
  const sc = require('../utils/supply-chain/index');
  it('generateSbom gera CycloneDX', () => {
    const sbom = sc.generateSbom(process.cwd());
    expect(sbom.bomFormat).toBe('CycloneDX');
  });

  it('verifyPackage verifica integridade', () => {
    const result = sc.verifyPackage('lodash', process.cwd());
    expect(typeof result.verified).toBe('boolean');
  });

  it('audit com entries vazias', () => {
    const result = sc.audit([]);
    expect(result.changed).toBe(false);
  });
});

describe('Attestations — chain.ts', () => {
  const c = require('../attestations/chain');
  it('createAttestation cria', () => {
    const a = c.createAttestation(process.cwd(), 'test', 'passed');
    expect(a).toBeDefined();
  });

  it('loadChain carrega', () => {
    expect(Array.isArray(c.loadChain(process.cwd()))).toBe(true);
  });

  it('validateChain valida', () => {
    expect(c.validateChain(process.cwd()).valid).toBeDefined();
  });
});

describe('Local AI — models.ts', () => {
  const models = require('../local-ai/models');
  it('isModelTrusted avalia', () => {
    expect(models.isModelTrusted('qwen2:0.5b')).toBe(true);
    expect(models.isModelTrusted('unknown:latest')).toBe(false);
  });
});

describe('Local AI — collaboration.ts', () => {
  const c = require('../local-ai/collaboration');
  it('funcoes exportam', () => {
    expect(typeof c.startCollaboration).toBe('function');
    expect(typeof c.listSessions).toBe('function');
    expect(typeof c.saveSession).toBe('function');
  });
});

describe('Gate — checkpoint.ts', () => {
  const c = require('../utils/gate/checkpoint');
  it('funcoes exportam', () => {
    expect(typeof c.saveGateCheckpoint).toBe('function');
    expect(typeof c.listGateCheckpoints).toBe('function');
  });
});
