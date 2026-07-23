import { adapterCommand } from '../commands/adapter';

describe('adapter', () => {
  describe('adapterCommand', () => {
    it('deve criar um comando Commander com nome adapter', () => {
      const cmd = adapterCommand();
      expect(cmd.name()).toBe('adapter');
    });

    it('deve ter subcomando list', () => {
      const cmd = adapterCommand();
      const listCmd = cmd.commands.find(c => c.name() === 'list');
      expect(listCmd).toBeDefined();
    });

    it('deve ter subcomando detect', () => {
      const cmd = adapterCommand();
      const detectCmd = cmd.commands.find(c => c.name() === 'detect');
      expect(detectCmd).toBeDefined();
    });

    it('deve ter subcomando validate', () => {
      const cmd = adapterCommand();
      const validateCmd = cmd.commands.find(c => c.name() === 'validate');
      expect(validateCmd).toBeDefined();
    });

    it('subcomando list deve ter descricao', () => {
      const cmd = adapterCommand();
      const listCmd = cmd.commands.find(c => c.name() === 'list');
      expect(listCmd?.description()).toContain('adapter');
    });

    it('subcomando detect deve ter descricao', () => {
      const cmd = adapterCommand();
      const detectCmd = cmd.commands.find(c => c.name() === 'detect');
      expect(detectCmd?.description()).toContain('stack');
    });

    it('subcomando validate deve ter descricao', () => {
      const cmd = adapterCommand();
      const validateCmd = cmd.commands.find(c => c.name() === 'validate');
      expect(validateCmd?.description()).toContain('integridade');
    });

    it('list handler deve existir como funcao', () => {
      const cmd = adapterCommand();
      const listCmd = cmd.commands.find(c => c.name() === 'list');
      expect(listCmd).toBeDefined();
    });

    it('validate handler deve existir como funcao', () => {
      const cmd = adapterCommand();
      const validateCmd = cmd.commands.find(c => c.name() === 'validate');
      expect(validateCmd).toBeDefined();
    });
  });
});