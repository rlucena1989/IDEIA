import { appbuilderCommand, appbuilderNewAction, appbuilderTemplatesAction, appbuilderFeaturesAction } from '../appbuilder';
import { printLine, printResult, finish } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../io');
jest.mock('../../local-ai/appbuilder/generator');

import { getIO } from '../../io';
import { generateApp } from '../../local-ai/appbuilder/generator';

const mockFs = {
  exists: jest.fn(),
  read: jest.fn(),
  write: jest.fn(),
  readDir: jest.fn(),
  mkDir: jest.fn(),
  remove: jest.fn(),
  copy: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getIO as jest.Mock).mockReturnValue({ fs: mockFs, shell: { exec: jest.fn(), execString: jest.fn() }, http: { post: jest.fn(), get: jest.fn() } });
  (generateApp as jest.Mock).mockReturnValue([
    { path: 'src/index.ts', content: 'console.log("hello");', language: 'typescript' },
    { path: 'README.md', content: '# My App', language: 'markdown' },
  ]);
});

describe('appbuilderNewAction', () => {
  it('deve criar blueprint e gerar arquivos', () => {
    appbuilderNewAction('MyApp', {});
    expect(generateApp).toHaveBeenCalled();
    expect(mockFs.mkDir).toHaveBeenCalledTimes(2);
    expect(mockFs.write).toHaveBeenCalledTimes(3);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('MyApp'));
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('deve rejeitar template invalido', () => {
    appbuilderNewAction('MyApp', { template: 'invalid-template' });
    expect(printResult).toHaveBeenCalledWith('Erro', false, expect.stringContaining('invalido'));
    expect(generateApp).not.toHaveBeenCalled();
  });

  it('deve ativar features quando especificadas pelo nome exato', () => {
    appbuilderNewAction('MyApp', { features: 'Authentication (JWT), Health Check' });
    expect(generateApp).toHaveBeenCalledWith(
      expect.objectContaining({
        features: expect.arrayContaining([
          expect.objectContaining({ name: 'Authentication (JWT)', enabled: true }),
          expect.objectContaining({ name: 'Health Check', enabled: true }),
        ]),
      })
    );
  });

  it('deve executar dry-run sem escrever arquivos', () => {
    appbuilderNewAction('MyApp', { dryRun: true });
    expect(mockFs.mkDir).not.toHaveBeenCalled();
    expect(mockFs.write).not.toHaveBeenCalled();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('[dry-run]'));
  });
});

describe('appbuilderTemplatesAction', () => {
  it('deve listar templates', () => {
    appbuilderTemplatesAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Templates'));
  });
});

describe('appbuilderFeaturesAction', () => {
  it('deve listar features', () => {
    appbuilderFeaturesAction();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Features'));
  });
});

describe('appbuilderCommand', () => {
  it('should be defined', () => {
    expect(appbuilderCommand).toBeDefined();
  });

  it('should return a Command object with subcommands', () => {
    const cmd = appbuilderCommand();
    expect(cmd.name()).toBe('appbuilder');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('new');
    expect(names).toContain('templates');
    expect(names).toContain('features');
  });
});
