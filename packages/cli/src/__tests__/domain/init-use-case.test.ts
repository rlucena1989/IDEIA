import { InitUseCase } from '../../domain/init-use-case';
import { resetIO, createIO } from '../../io';
import { MockIOContainer } from '../../io/mock';

describe('InitUseCase', () => {
  let useCase: InitUseCase;

  beforeEach(() => {
    resetIO();
    process.env['GTI_TEST_MODE'] = '1';
    const mockIO = createIO() as MockIOContainer;
    mockIO._reset();
    useCase = new InitUseCase();
  });

  afterEach(() => {
    process.env['GTI_TEST_MODE'] = '0';
    resetIO();
  });

  it('should be defined', () => {
    expect(InitUseCase).toBeDefined();
  });

  it('should execute with project name', () => {
    const result = useCase.execute('test-project');
    expect(result.ok).toBe(true);
    expect(result.code).toBe(0);
    expect(result.data?.projectName).toBe('test-project');
    expect(result.data?.filesCreated).toBe(5);
    expect(result.data?.template).toBe('default');
  });

  it('should execute with minimal template', () => {
    const result = useCase.execute('minimal-project', { template: 'minimal' });
    expect(result.ok).toBe(true);
    expect(result.data?.template).toBe('minimal');
  });

  it('should fail with empty project name', () => {
    const result = useCase.execute('');
    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
  });
});
