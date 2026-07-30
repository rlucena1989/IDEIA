import { ecosystemCommand, ecosystemListAction, ecosystemStatusAction, ecosystemReportAction } from '../ecosystem';
import { printHeader, printLine } from '../../utils/output';
import { buildEcosystemReport } from '../../ecosystem/ecosystem-report';
import { createEnvelope } from '../../hardening/output-contract';
import { getCliVersion } from '../../utils/version';

jest.mock('../../utils/output');
jest.mock('../../utils/version');
jest.mock('../../ecosystem/ecosystem-report');
jest.mock('../../hardening/output-contract');
jest.mock('../../ecosystem/domain-registry', () => ({
  DomainRegistry: jest.fn(() => ({
    list: jest.fn(() => [
      { name: 'dev-team', type: 'team', status: 'healthy', trustLevel: 'high', scope: ['state'] },
      { name: 'prod-org', type: 'organization', status: 'blocked', trustLevel: 'critical', scope: ['state', 'governance'] },
    ]),
    upsert: jest.fn(),
  })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
  (getCliVersion as jest.Mock).mockReturnValue('1.0.0');
  (createEnvelope as jest.Mock).mockImplementation((data: unknown) => data);
  (buildEcosystemReport as jest.Mock).mockReturnValue({
    summary: ['Ecossistema reportado'], totalDomains: 2, healthyCount: 1, blockedCount: 1,
  });
});

describe('ecosystemListAction', () => {
  it('deve listar dominios', () => {
    ecosystemListAction({});
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Ecossistema'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('dev-team'));
  });

  it('deve retornar JSON quando solicitado', () => {
    ecosystemListAction({ json: true });
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('deve popular dominios com seed', () => {
    ecosystemListAction({ seed: true });
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('dev-team'));
  });
});

describe('ecosystemStatusAction', () => {
  it('deve exibir status', () => {
    ecosystemStatusAction({});
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Status'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Saudáveis'));
  });
});

describe('ecosystemReportAction', () => {
  it('deve gerar relatorio', () => {
    ecosystemReportAction({});
    expect(buildEcosystemReport).toHaveBeenCalled();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('reportado'));
  });
});

describe('ecosystemCommand', () => {
  it('should be defined', () => {
    expect(ecosystemCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = ecosystemCommand();
    expect(cmd.name()).toBe('ecosystem');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('list');
    expect(names).toContain('status');
    expect(names).toContain('report');
  });
});
