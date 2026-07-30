import { rulesCommand } from '../rules';

jest.mock('../../io', () => ({ getIO: jest.fn().mockReturnValue({ fs: { exists: jest.fn(), mkDir: jest.fn(), write: jest.fn() } }) }));
jest.mock('../../utils/output', () => ({ printLine: jest.fn(), printResult: jest.fn() }));
jest.mock('../../rules/pack', () => ({
  listAvailablePacks: jest.fn(),
  findPack: jest.fn(),
  listInstalledPacks: jest.fn(),
  installPack: jest.fn(),
  uninstallPack: jest.fn(),
  searchPacks: jest.fn(),
}));

function pack() { return require('../../rules/pack'); }
function output() { return require('../../utils/output'); }
function io() { return require('../../io').getIO(); }

describe('rules', () => {
  let consoleSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    exitSpy.mockRestore();
  });

  function makeCmd() { return rulesCommand(); }
  function sub(name: string) { return makeCmd().commands.find(c => c.name() === name)!; }

  it('rulesCommand should be defined', () => { expect(rulesCommand).toBeDefined(); });

  it('list --all shows available packs', () => {
    pack().listAvailablePacks.mockReturnValue([{ name: 'typescript', version: '1.0.0', description: 'TS rules', tags: ['ts'], rules: [] }]);
    sub('list').parse(['--all'], { from: 'user' });
    expect(output().printLine).toHaveBeenCalledWith(expect.stringContaining('typescript'));
  });

  it('list shows installed packs', () => {
    pack().listInstalledPacks.mockReturnValue([{ manifest: { name: 'eslint', version: '1.0.0', rules: [] }, dir: '.ai/rule-packs/eslint' }]);
    sub('list').parse([], { from: 'user' });
    expect(output().printLine).toHaveBeenCalledWith(expect.stringContaining('eslint'));
  });

  it('list shows no installed message', () => {
    pack().listInstalledPacks.mockReturnValue([]);
    sub('list').parse([], { from: 'user' });
    expect(output().printLine).toHaveBeenCalledWith(expect.stringContaining('Nenhum pacote de regras instalado'));
  });

  it('install installs found pack', () => {
    pack().findPack.mockReturnValue({ name: 'typescript', rules: [] });
    pack().installPack.mockReturnValue(true);
    sub('install').parse(['typescript'], { from: 'user' });
    expect(output().printResult).toHaveBeenCalledWith(expect.stringContaining('instalado'), true);
  });

  it('install fails when pack not found', () => {
    pack().findPack.mockReturnValue(null);
    sub('install').parse(['unknown'], { from: 'user' });
    expect(output().printResult).toHaveBeenCalledWith(expect.stringContaining('nao encontrado'), false);
  });

  it('uninstall removes pack', () => {
    pack().uninstallPack.mockReturnValue(true);
    sub('uninstall').parse(['typescript'], { from: 'user' });
    expect(output().printResult).toHaveBeenCalledWith(expect.stringContaining('removido'), true);
  });

  it('uninstall fails for unknown pack', () => {
    pack().uninstallPack.mockReturnValue(false);
    sub('uninstall').parse(['unknown'], { from: 'user' });
    expect(output().printResult).toHaveBeenCalledWith(expect.stringContaining('nao encontrado'), false);
  });

  it('search finds results', () => {
    pack().searchPacks.mockReturnValue([{ name: 'typescript', version: '1.0.0', description: 'TS rules', tags: ['ts'] }]);
    sub('search').parse(['typescript'], { from: 'user' });
    expect(output().printLine).toHaveBeenCalledWith(expect.stringContaining('typescript'));
  });

  it('search shows no results', () => {
    pack().searchPacks.mockReturnValue([]);
    sub('search').parse(['nonexistent'], { from: 'user' });
    expect(output().printLine).toHaveBeenCalledWith(expect.stringContaining('Nenhum pacote encontrado'));
  });

  it('create creates new pack', () => {
    io().fs.exists.mockReturnValue(false);
    sub('create').parse(['my-pack'], { from: 'user' });
    expect(output().printResult).toHaveBeenCalledWith(expect.stringContaining('criado'), true);
  });

  it('create shows already exists', () => {
    io().fs.exists.mockReturnValue(true);
    sub('create').parse(['existing'], { from: 'user' });
    expect(output().printResult).toHaveBeenCalledWith(expect.stringContaining('ja existe'), false);
  });

  it('validate installed packs', () => {
    pack().listInstalledPacks.mockReturnValue([{ manifest: { name: 'valid', version: '1.0.0', rules: [{ id: 'V-001', title: 'Rule' }] }, dir: '' }]);
    sub('validate').parse([], { from: 'user' });
    expect(output().printLine).toHaveBeenCalledWith(expect.stringContaining('VALIDO'));
  });

  it('validate no packs', () => {
    pack().listInstalledPacks.mockReturnValue([]);
    sub('validate').parse([], { from: 'user' });
    expect(output().printLine).toHaveBeenCalledWith(expect.stringContaining('Nenhum pacote para validar'));
  });

  it('validate by name not found', () => {
    pack().findPack.mockReturnValue(null);
    sub('validate').parse(['unknown'], { from: 'user' });
    expect(output().printResult).toHaveBeenCalledWith(expect.stringContaining('nao encontrado'), false);
  });

  it('validate invalid pack', () => {
    pack().listInstalledPacks.mockReturnValue([{ manifest: { name: '', version: '', rules: [] }, dir: '' }]);
    sub('validate').parse([], { from: 'user' });
    expect(output().printResult).toHaveBeenCalledWith(expect.stringContaining('INVALIDO'), false);
  });

  it('publish prepares pack', () => {
    pack().findPack.mockReturnValue({ name: 'typescript', version: '1.0.0', rules: [], tags: ['ts'] });
    sub('publish').parse(['typescript'], { from: 'user' });
    expect(output().printResult).toHaveBeenCalledWith(expect.stringContaining('preparado'), true);
  });

  it('publish pack not found', () => {
    pack().findPack.mockReturnValue(null);
    sub('publish').parse(['unknown'], { from: 'user' });
    expect(output().printResult).toHaveBeenCalledWith(expect.stringContaining('nao encontrado'), false);
  });
});
