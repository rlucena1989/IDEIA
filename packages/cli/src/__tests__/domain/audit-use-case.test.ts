import { AuditUseCase } from '../../domain/audit-use-case';
import { resetIO, createIO } from '../../io';
import type { MockIOContainer } from '../../io/mock';

describe('AuditUseCase', () => {
  let useCase: AuditUseCase;
  let mockIO: MockIOContainer;

  beforeEach(() => {
    resetIO();
    process.env['GTI_TEST_MODE'] = '1';
    const io = createIO();
    if ('_reset' in io) {
      mockIO = io as unknown as MockIOContainer;
      mockIO._reset();
    }
    useCase = new AuditUseCase();
  });

  afterEach(() => {
    process.env['GTI_TEST_MODE'] = '0';
    resetIO();
  });

  it('should record an audit event', () => {
    const result = useCase.execute('command.execute', 'user', 'init');
    expect(result.ok).toBe(true);
    expect(result.data?.eventType).toBe('command.execute');
    expect(result.data?.actor).toBe('user');
  });

  it('should record audit with ai actor', () => {
    const result = useCase.execute('code.generate', 'ai', 'use-case', { model: 'gpt-4' });
    expect(result.ok).toBe(true);
    expect(result.data?.actor).toBe('ai');
    expect(result.data?.metadata?.model).toBe('gpt-4');
  });

  it('should show audit events', () => {
    useCase.execute('test.event', 'user', 'test');
    const result = useCase.show(10);
    expect(result.ok).toBe(true);
    expect(result.data!.total).toBe(1);
    expect(result.data!.events.length).toBe(1);
  });

  it('should verify chain with single event', () => {
    useCase.execute('test', 'system', 'verify');
    const result = useCase.verifyChain();
    expect(result.valid).toBe(true);
    expect(result.totalEvents).toBe(1);
  });

  it('should prove an existing event', () => {
    const recordResult = useCase.execute('test.prove', 'user', 'prove-me');
    const eventId = recordResult.data!.id;
    const proveResult = useCase.prove(eventId);
    expect(proveResult.ok).toBe(true);
    expect(proveResult.data?.id).toBe(eventId);
  });

  it('should return false for non-existent event proof', () => {
    const result = useCase.prove('non-existent-id');
    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
  });
});
