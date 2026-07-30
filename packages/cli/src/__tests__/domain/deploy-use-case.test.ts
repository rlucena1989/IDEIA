import { DeployUseCase } from '../../domain/deploy-use-case';
import { resetIO, createIO } from '../../io';
import type { MockIOContainer } from '../../io/mock';

describe('DeployUseCase', () => {
  let useCase: DeployUseCase;
  let mockIO: MockIOContainer;

  beforeEach(() => {
    resetIO();
    process.env['GTI_TEST_MODE'] = '1';
    const io = createIO();
    if ('_reset' in io) {
      mockIO = io as unknown as MockIOContainer;
      mockIO._reset();
    }
    useCase = new DeployUseCase();
  });

  afterEach(() => {
    process.env['GTI_TEST_MODE'] = '0';
    resetIO();
  });

  it('should be defined', () => {
    expect(DeployUseCase).toBeDefined();
  });

  it('should execute a development deploy', () => {
    const result = useCase.execute({
      version: '1.0.0',
      environment: 'development',
    });
    expect(result.ok).toBe(true);
    expect(result.data?.environment).toBe('development');
    expect(result.data?.status).toBe('deployed');
    expect(result.data?.steps.length).toBeGreaterThan(0);
  });

  it('should execute dry run without creating files', () => {
    const result = useCase.execute({
      version: '2.0.0',
      environment: 'canary',
      canaryPercent: 10,
      dryRun: true,
    });
    expect(result.ok).toBe(true);
    expect(result.data?.environment).toBe('canary');
    expect(result.data?.status).toBe('deployed');
  });

  it('should fail with invalid version', () => {
    const result = useCase.execute({
      version: 'latest',
      environment: 'production',
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
  });

  it('should include deploy steps', () => {
    const result = useCase.execute({
      version: '1.2.3',
      environment: 'staging',
      qualityGateCheck: true,
    });
    expect(result.ok).toBe(true);
    expect(result.data!.steps.length).toBeGreaterThanOrEqual(2);
    expect(result.data!.steps.some(s => s.step === 'validate-config')).toBe(true);
  });
});
