import { printHeader, printLine, printResult, printSummary } from '../utils/output';

describe('output', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.AI_LLM_MODE;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('printHeader', () => {
    it('deve imprimir titulo com quebra de linha', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      printHeader('Test Title');
      expect(spy).toHaveBeenCalledWith('\nTest Title\n');
      spy.mockRestore();
    });

    it('nao deve imprimir em LLM mode', () => {
      process.env.AI_LLM_MODE = '1';
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      printHeader('Test');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('printLine', () => {
    it('deve imprimir linha', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      printLine('hello');
      expect(spy).toHaveBeenCalledWith('hello');
      spy.mockRestore();
    });

    it('nao deve imprimir em LLM mode', () => {
      process.env.AI_LLM_MODE = '1';
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      printLine('test');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('printResult', () => {
    it('deve mostrar checkmark verde para sucesso', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      printResult('Build', true);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('✅'));
      spy.mockRestore();
    });

    it('deve mostrar X vermelho para falha', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      printResult('Test', false);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('❌'));
      spy.mockRestore();
    });

    it('deve incluir detalhe quando fornecido', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      printResult('Build', false, 'timeout');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('timeout'));
      spy.mockRestore();
    });
  });

  describe('printSummary', () => {
    it('deve mostrar checkmark para score >= 85', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      printSummary(90, 100, 'Quality');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('✅'));
      spy.mockRestore();
    });

    it('deve mostrar warning para score 65-84', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      printSummary(75, 100, 'Quality');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('⚠️'));
      spy.mockRestore();
    });

    it('deve mostrar X para score < 65', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      printSummary(50, 100, 'Quality');
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('❌'));
      spy.mockRestore();
    });
  });
});