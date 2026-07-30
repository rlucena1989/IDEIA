import { QualityUseCase } from '../../domain/quality-use-case';
import { resetIO, createIO } from '../../io';
import type { MockIOContainer } from '../../io/mock';

describe('QualityUseCase', () => {
  let useCase: QualityUseCase;
  let mockIO: MockIOContainer;

  beforeEach(() => {
    resetIO();
    process.env['GTI_TEST_MODE'] = '1';
    const io = createIO();
    if ('_reset' in io) {
      mockIO = io as unknown as MockIOContainer;
      mockIO._reset();
    }
    useCase = new QualityUseCase();
  });

  afterEach(() => {
    process.env['GTI_TEST_MODE'] = '0';
    resetIO();
  });

  it('should be defined', () => {
    expect(QualityUseCase).toBeDefined();
  });

  it('should run commit gate', () => {
    const result = useCase.runGate('commit');
    expect(result.ok).toBe(true);
    expect(result.data?.gate).toBe('commit');
    expect(result.data!.checks.length).toBeGreaterThan(0);
  });

  it('should run pr gate', () => {
    const result = useCase.runGate('pr');
    expect(result.ok).toBe(true);
    expect(result.data?.gate).toBe('pr');
  });

  it('should run release gate', () => {
    const result = useCase.runGate('release');
    expect(result.ok).toBe(true);
    expect(result.data?.gate).toBe('release');
  });

  it('should run sprint gate', () => {
    const result = useCase.runGate('sprint');
    expect(result.ok).toBe(true);
    expect(result.data?.gate).toBe('sprint');
  });

  it('should fail for unknown gate', () => {
    const result = useCase.runGate('unknown' as unknown);
    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
  });

  it('should check pipeline for multiple gates', () => {
    const result = useCase.checkPipeline(['commit', 'pr']);
    expect(result.ok).toBe(true);
    expect(result.data!.gates.length).toBe(2);
  });

  it('should calculate quality score', () => {
    const result = useCase.score();
    expect(result.ok).toBe(true);
    expect(result.data?.average).toBeGreaterThanOrEqual(0);
    expect(result.data?.average).toBeLessThanOrEqual(100);
    expect(Object.keys(result.data!.scores).length).toBeGreaterThan(0);
  });
});
