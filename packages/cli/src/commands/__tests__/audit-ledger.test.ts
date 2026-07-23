import { auditLedgerCommand, auditLedgerAction } from '../audit-ledger';

jest.mock(
  require('node:path').join(process.cwd(), '.ai/bin/ledger.js'),
  () => ({ verifyLedger: jest.fn().mockReturnValue({ valid: true, message: 'Ledger OK', entries: 42 }) }),
  { virtual: true }
);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
});

describe('auditLedgerAction', () => {
  it('deve verificar ledger com sucesso', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    auditLedgerAction();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Ledger'));
    logSpy.mockRestore();
  });
});

describe('auditLedgerCommand', () => {
  it('should be defined', () => {
    expect(auditLedgerCommand).toBeDefined();
  });

  it('should return Command with correct name', () => {
    const cmd = auditLedgerCommand();
    expect(cmd.name()).toBe('audit-ledger');
  });
});
