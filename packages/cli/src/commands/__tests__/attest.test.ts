import { attestCommand, attestVerifyAction, attestValidateAction, attestExportAction, attestChainAction, attestRevokeAction } from '../attest';
import { printLine, printResult } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../attestations/chain');

import { createAttestation, loadChain, validateChain, revokeAttestation } from '../../attestations/chain';

const mockAttestation = {
  id: 'att-001',
  check_type: 'quality-gate',
  result: 'pass',
  timestamp: '2024-01-01T00:00:00Z',
  signature: '0xabcdef1234567890abcdef1234567890',
  prev_signature: '0x0000000000000000000000000000000000000000',
  revoked: false,
  revoke_reason: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('attestVerifyAction', () => {
  it('deve criar atestacao com resultado pass', () => {
    (createAttestation as jest.Mock).mockReturnValue(mockAttestation);
    attestVerifyAction('quality-gate', {});
    expect(createAttestation).toHaveBeenCalledWith(expect.any(String), 'quality-gate', 'pass', undefined);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Atestacao gerada'));
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('Atestacao registrada'), true);
  });

  it('deve criar atestacao com resultado fail', () => {
    (createAttestation as jest.Mock).mockReturnValue({ ...mockAttestation, result: 'fail' });
    attestVerifyAction('audit', { result: 'fail', details: 'Violacao encontrada' });
    expect(createAttestation).toHaveBeenCalledWith(expect.any(String), 'audit', 'fail', 'Violacao encontrada');
  });
});

describe('attestValidateAction', () => {
  it('deve exibir mensagem quando nao houver atestacoes', () => {
    (validateChain as jest.Mock).mockReturnValue({ valid: true, errors: [], attestations: 0 });
    attestValidateAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Nenhuma atestacao'));
  });

  it('deve exibir sucesso quando corrente for valida', () => {
    (validateChain as jest.Mock).mockReturnValue({ valid: true, errors: [], attestations: 5 });
    attestValidateAction();
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('VALIDA'), true);
  });

  it('deve exibir erros quando corrente for invalida', () => {
    (validateChain as jest.Mock).mockReturnValue({ valid: false, errors: ['Assinatura quebrada no elo 3'], attestations: 5 });
    attestValidateAction();
    expect(printResult).toHaveBeenCalledWith('Assinatura quebrada no elo 3', false);
  });
});

describe('attestExportAction', () => {
  it('deve exibir mensagem quando nao houver atestacoes', () => {
    (loadChain as jest.Mock).mockReturnValue([]);
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    attestExportAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Nenhuma atestacao'));
    logSpy.mockRestore();
  });

  it('deve exportar atestacoes como JSON', () => {
    (loadChain as jest.Mock).mockReturnValue([mockAttestation]);
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    attestExportAction();
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});

describe('attestChainAction', () => {
  it('deve exibir mensagem quando nao houver atestacoes', () => {
    (loadChain as jest.Mock).mockReturnValue([]);
    attestChainAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Nenhuma atestacao'));
  });

  it('deve exibir corrente de atestacoes', () => {
    (loadChain as jest.Mock).mockReturnValue([mockAttestation]);
    attestChainAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Corrente'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('quality-gate'));
  });

  it('deve exibir atestacao revogada', () => {
    (loadChain as jest.Mock).mockReturnValue([{ ...mockAttestation, revoked: true, revoke_reason: 'Motivo X' }]);
    attestChainAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('REVOGADA'));
  });
});

describe('attestRevokeAction', () => {
  it('deve revogar atestacao com sucesso', () => {
    (revokeAttestation as jest.Mock).mockReturnValue(true);
    attestRevokeAction('att-001', {});
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('revogada'), true);
  });

  it('deve reportar falha se atestacao nao existir', () => {
    (revokeAttestation as jest.Mock).mockReturnValue(false);
    attestRevokeAction('att-999', { reason: 'Testing' });
    expect(printResult).toHaveBeenCalledWith(expect.stringContaining('nao encontrada'), false);
  });
});

describe('attestCommand', () => {
  it('should be defined', () => {
    expect(attestCommand).toBeDefined();
  });

  it('should return a Command object with subcommands', () => {
    const cmd = attestCommand();
    expect(cmd.name()).toBe('attest');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('verify');
    expect(names).toContain('validate');
    expect(names).toContain('export');
    expect(names).toContain('chain');
    expect(names).toContain('revoke');
  });
});
