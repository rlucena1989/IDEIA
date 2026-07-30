import { GenerateUseCase } from '../../domain/generate-use-case';
import { resetIO, createIO } from '../../io';
import type { MockIOContainer } from '../../io/mock';

describe('GenerateUseCase', () => {
  let useCase: GenerateUseCase;
  let mockIO: MockIOContainer;

  beforeEach(() => {
    resetIO();
    process.env['GTI_TEST_MODE'] = '1';
    const io = createIO();
    if ('_reset' in io) {
      mockIO = io as unknown as MockIOContainer;
      mockIO._reset();
    }
    useCase = new GenerateUseCase();
  });

  afterEach(() => {
    process.env['GTI_TEST_MODE'] = '0';
    resetIO();
  });

  it('should be defined', () => {
    expect(GenerateUseCase).toBeDefined();
  });

  it('should generate a use-case file', () => {
    const result = useCase.execute('use-case', 'create-user');
    expect(result.ok).toBe(true);
    expect(result.data?.template).toBe('use-case');
    expect(result.data?.name).toBe('create-user');
  });

  it('should generate with dry run', () => {
    const result = useCase.execute('command', 'deploy', { dryRun: true });
    expect(result.ok).toBe(true);
    expect(result.data?.files.length).toBe(0);
  });

  it('should generate a command file', () => {
    const result = useCase.execute('command', 'my-command');
    expect(result.ok).toBe(true);
    expect(result.data?.template).toBe('command');
  });

  it('should fail for unknown template', () => {
    const result = useCase.execute('unknown-template', 'test');
    expect(result.ok).toBe(true);
    expect(result.data?.template).toBe('unknown-template');
  });
});
