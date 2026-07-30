import { ComplianceControlRegistry, createDefaultRegistry } from '../src/control-registry';
import { EvidenceCollector } from '../src/evidence-collector';
import { ComplianceScoreCalculator } from '../src/score-calculator';
import { ComplianceFramework, ControlStatus } from '../src/types';

describe('ComplianceControlRegistry', () => {
  let registry: ComplianceControlRegistry;

  beforeEach(() => {
    registry = new ComplianceControlRegistry();
  });

  it('should register a control', () => {
    const ctrl = registry.registerControl({
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.1',
      description: 'Logical access controls',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security',
    });

    expect(ctrl.id).toBeDefined();
    expect(ctrl.createdAt).toBeInstanceOf(Date);
    expect(ctrl.updatedAt).toBeInstanceOf(Date);
    expect(ctrl.framework).toBe(ComplianceFramework.SOC2);
  });

  it('should list controls by framework', () => {
    registry.registerControl({
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.1',
      description: 'SOC2 control',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security',
    });
    registry.registerControl({
      framework: ComplianceFramework.LGPD,
      criterion: 'Art. 7',
      description: 'LGPD control',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'legal',
    });

    const soc2 = registry.listControls(ComplianceFramework.SOC2);
    expect(soc2).toHaveLength(1);
    expect(soc2[0]?.criterion).toBe('CC6.1');

    const lgpd = registry.listControls(ComplianceFramework.LGPD);
    expect(lgpd).toHaveLength(1);
  });

  it('should get controls by status', () => {
    registry.registerControl({
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.1',
      description: 'Implemented',
      status: ControlStatus.implemented,
      evidence: [],
      owner: 'security',
    });
    registry.registerControl({
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.2',
      description: 'Missing',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'security',
    });

    const implemented = registry.getByStatus(ControlStatus.implemented);
    expect(implemented).toHaveLength(1);
    expect(implemented[0]?.criterion).toBe('CC6.1');
  });

  it('should count controls', () => {
    registry.registerControl({
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.1',
      description: 'One',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'sec',
    });
    registry.registerControl({
      framework: ComplianceFramework.LGPD,
      criterion: 'Art. 7',
      description: 'Two',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'legal',
    });

    expect(registry.count()).toBe(2);
  });

  it('should compute statistics per framework', () => {
    registry.registerControl({
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.1',
      description: 'Implemented',
      status: ControlStatus.implemented,
      evidence: [],
      owner: 'sec',
    });
    registry.registerControl({
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.2',
      description: 'Partial',
      status: ControlStatus.partial,
      evidence: [],
      owner: 'sec',
    });
    registry.registerControl({
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.3',
      description: 'Missing',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'sec',
    });
    registry.registerControl({
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.4',
      description: 'N/A',
      status: ControlStatus.not_applicable,
      evidence: [],
      owner: 'infra',
    });

    const stats = registry.statistics(ComplianceFramework.SOC2);
    expect(stats.total).toBe(4);
    expect(stats.implemented).toBe(1);
    expect(stats.partial).toBe(1);
    expect(stats.missing).toBe(1);
    expect(stats.notApplicable).toBe(1);
  });

  it('should create default registry with pre-populated controls', () => {
    const defaultRegistry = createDefaultRegistry();
    expect(defaultRegistry.count()).toBeGreaterThan(0);

    const soc2 = defaultRegistry.listControls(ComplianceFramework.SOC2);
    expect(soc2.length).toBeGreaterThanOrEqual(15);

    const lgpd = defaultRegistry.listControls(ComplianceFramework.LGPD);
    expect(lgpd.length).toBeGreaterThanOrEqual(15);

    const hipaa = defaultRegistry.listControls(ComplianceFramework.HIPAA);
    expect(hipaa.length).toBeGreaterThanOrEqual(18);
  });
});

describe('EvidenceCollector', () => {
  let collector: EvidenceCollector;

  beforeEach(() => {
    collector = new EvidenceCollector();
  });

  it('should collect evidence', () => {
    const evidence = collector.collect('ctrl-1', 'log', 'Access log entry #123');

    expect(evidence.id).toBeDefined();
    expect(evidence.controlId).toBe('ctrl-1');
    expect(evidence.type).toBe('log');
    expect(evidence.hash).toBeDefined();
  });

  it('should get evidence by control id', () => {
    collector.collect('ctrl-1', 'log', 'Log entry');
    collector.collect('ctrl-1', 'screenshot', 'Dashboard screenshot');
    collector.collect('ctrl-2', 'policy', 'Security policy v2');

    const ctrl1Evidence = collector.getEvidence('ctrl-1');
    expect(ctrl1Evidence).toHaveLength(2);

    const ctrl2Evidence = collector.getEvidence('ctrl-2');
    expect(ctrl2Evidence).toHaveLength(1);
  });

  it('should verify chain integrity', () => {
    collector.collect('ctrl-1', 'log', 'First log');
    collector.collect('ctrl-1', 'config', 'Config file');

    expect(collector.verifyChain()).toBe(true);
  });

  it('should detect tampered chain', () => {
    collector.collect('ctrl-1', 'log', 'First entry');
    collector.collect('ctrl-2', 'screenshot', 'Screenshot');

    const all = collector.listAll();
    const tampered = all[0];
    if (tampered) {
      (tampered as { content: string }).content = 'Tampered content';
    }

    expect(collector.verifyChain()).toBe(false);
  });

  it('should maintain increasing chain length', () => {
    expect(collector.getChainLength()).toBe(0);

    collector.collect('ctrl-1', 'log', 'First');
    expect(collector.getChainLength()).toBe(1);

    collector.collect('ctrl-2', 'config', 'Second');
    expect(collector.getChainLength()).toBe(2);
  });
});

describe('ComplianceScoreCalculator', () => {
  let registry: ComplianceControlRegistry;

  beforeEach(() => {
    registry = new ComplianceControlRegistry();
  });

  it('should calculate SOC2 score', () => {
    registry.registerControl({
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.1',
      description: 'Implemented control',
      status: ControlStatus.implemented,
      evidence: [],
      owner: 'sec',
    });
    registry.registerControl({
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.2',
      description: 'Partial control',
      status: ControlStatus.partial,
      evidence: [],
      owner: 'sec',
    });
    registry.registerControl({
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.3',
      description: 'Missing control',
      status: ControlStatus.missing,
      evidence: [],
      owner: 'sec',
    });
    registry.registerControl({
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.4',
      description: 'Not applicable',
      status: ControlStatus.not_applicable,
      evidence: [],
      owner: 'infra',
    });

    const calculator = new ComplianceScoreCalculator(registry.listControls());
    const score = calculator.calculate(ComplianceFramework.SOC2);

    expect(score.total).toBe(3);
    expect(score.implemented).toBe(1);
    expect(score.partial).toBe(1);
    expect(score.missing).toBe(1);
    expect(score.score).toBe(50);
  });

  it('should calculate LGPD score', () => {
    registry.registerControl({
      framework: ComplianceFramework.LGPD,
      criterion: 'Art. 7',
      description: 'Implemented',
      status: ControlStatus.implemented,
      evidence: [],
      owner: 'legal',
    });
    registry.registerControl({
      framework: ComplianceFramework.LGPD,
      criterion: 'Art. 9',
      description: 'Implemented',
      status: ControlStatus.implemented,
      evidence: [],
      owner: 'legal',
    });

    const calculator = new ComplianceScoreCalculator(registry.listControls());
    const score = calculator.calculate(ComplianceFramework.LGPD);

    expect(score.total).toBe(2);
    expect(score.implemented).toBe(2);
    expect(score.score).toBe(100);
  });

  it('should return correct grade levels', () => {
    const calculator = new ComplianceScoreCalculator([]);

    expect(calculator.getLevel(95)).toBe('A');
    expect(calculator.getLevel(90)).toBe('A');
    expect(calculator.getLevel(89)).toBe('B');
    expect(calculator.getLevel(75)).toBe('B');
    expect(calculator.getLevel(74)).toBe('C');
    expect(calculator.getLevel(60)).toBe('C');
    expect(calculator.getLevel(59)).toBe('D');
    expect(calculator.getLevel(40)).toBe('D');
    expect(calculator.getLevel(39)).toBe('F');
    expect(calculator.getLevel(0)).toBe('F');
  });

  it('should return F for empty framework', () => {
    const calculator = new ComplianceScoreCalculator([]);
    const score = calculator.calculate(ComplianceFramework.SOC2);
    expect(score.score).toBe(0);
    expect(score.level).toBe('F');
  });

  it('should handle mixed frameworks', () => {
    registry.registerControl({
      framework: ComplianceFramework.SOC2,
      criterion: 'CC6.1',
      description: 'SOC2 implemented',
      status: ControlStatus.implemented,
      evidence: [],
      owner: 'sec',
    });
    registry.registerControl({
      framework: ComplianceFramework.GDPR,
      criterion: 'Art. 5',
      description: 'GDPR implemented',
      status: ControlStatus.implemented,
      evidence: [],
      owner: 'legal',
    });

    const calculator = new ComplianceScoreCalculator(registry.listControls());

    const soc2 = calculator.calculate(ComplianceFramework.SOC2);
    expect(soc2.total).toBe(1);
    expect(soc2.score).toBe(100);
    expect(soc2.level).toBe('A');

    const gdpr = calculator.calculate(ComplianceFramework.GDPR);
    expect(gdpr.total).toBe(1);
    expect(gdpr.score).toBe(100);
    expect(gdpr.level).toBe('A');
  });
});
