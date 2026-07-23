import { knowledgeCommand, knowledgeQueryAction, knowledgeShowAction, knowledgeListAction, knowledgeAddAction, knowledgeStatsAction, knowledgeExportAction } from '../knowledge';
import { printHeader, printLine } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../utils/version');
jest.mock('../../hardening/output-contract');
jest.mock('../../local-ai/knowledge-base');
jest.mock('../../knowledge/doc-generator');

import { getCuratedEntries, searchEntries, getEntry, exportEntries } from '../../local-ai/knowledge-base';
import { generateMarkdownDocs } from '../../knowledge/doc-generator';
import { createEnvelope } from '../../hardening/output-contract';
import { getCliVersion } from '../../utils/version';

const mockEntry = {
  id: 'clean-arch', title: 'Clean Architecture', category: 'architecture',
  tags: ['ddd', 'hexagonal'], summary: 'Arquitetura limpa',
  content: 'Conteudo completo', principles: ['SRP'], when_to_use: ['Grandes projetos'],
  when_not_to_use: ['Projetos simples'], references: ['Martin, R.'],
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
  (getCliVersion as jest.Mock).mockReturnValue('1.0.0');
  (createEnvelope as jest.Mock).mockImplementation((data: unknown) => data);
  (getCuratedEntries as jest.Mock).mockReturnValue([mockEntry]);
  (searchEntries as jest.Mock).mockReturnValue([mockEntry]);
  (getEntry as jest.Mock).mockReturnValue(mockEntry);
  (exportEntries as jest.Mock).mockImplementation(() => {});
  (generateMarkdownDocs as jest.Mock).mockReturnValue('# Documentacao gerada');
});

describe('knowledgeQueryAction', () => {
  it('deve exibir resultados da busca', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    knowledgeQueryAction('clean');
    expect(searchEntries).toHaveBeenCalledWith('clean');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Clean Architecture'));
    logSpy.mockRestore();
  });

  it('deve exibir mensagem quando nao ha resultados', () => {
    (searchEntries as jest.Mock).mockReturnValue([]);
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    knowledgeQueryAction('unknown');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Nenhum resultado'));
    logSpy.mockRestore();
  });
});

describe('knowledgeShowAction', () => {
  it('deve exibir entrada completa', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    knowledgeShowAction('clean-arch');
    expect(getEntry).toHaveBeenCalledWith('clean-arch');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Clean Architecture'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Principles'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('When to use'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('When NOT to use'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('References'));
    logSpy.mockRestore();
  });

  it('deve exibir mensagem para ID inexistente', () => {
    (getEntry as jest.Mock).mockReturnValue(null);
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    knowledgeShowAction('invalid');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('nao encontrada'));
    logSpy.mockRestore();
  });
});

describe('knowledgeListAction', () => {
  it('deve listar entradas agrupadas por categoria', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    knowledgeListAction({});
    expect(getCuratedEntries).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('ARCHITECTURE'));
    logSpy.mockRestore();
  });

  it('deve filtrar por categoria', () => {
    (getCuratedEntries as jest.Mock).mockReturnValue([mockEntry, { ...mockEntry, id: 'test2', category: 'database' }]);
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    knowledgeListAction({ category: 'database' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('DATABASE'));
    logSpy.mockRestore();
  });
});

describe('knowledgeAddAction', () => {
  it('deve exportar entrada', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    knowledgeAddAction('clean-arch');
    expect(exportEntries).toHaveBeenCalledWith(expect.any(String), 'clean-arch');
    logSpy.mockRestore();
  });
});

describe('knowledgeStatsAction', () => {
  it('deve exibir estatisticas', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    knowledgeStatsAction();
    expect(getCuratedEntries).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Stats'));
    logSpy.mockRestore();
  });
});

describe('knowledgeExportAction', () => {
  it('deve exportar documentacao markdown', () => {
    knowledgeExportAction({});
    expect(generateMarkdownDocs).toHaveBeenCalled();
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Exportação'));
  });

  it('deve retornar JSON quando solicitado', () => {
    knowledgeExportAction({ json: true });
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });
});

describe('knowledgeCommand', () => {
  it('should be defined', () => {
    expect(knowledgeCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = knowledgeCommand();
    expect(cmd.name()).toBe('knowledge');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('query');
    expect(names).toContain('show');
    expect(names).toContain('list');
    expect(names).toContain('add');
    expect(names).toContain('stats');
    expect(names).toContain('export');
  });
});
