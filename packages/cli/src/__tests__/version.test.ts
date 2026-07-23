import { getCliVersion } from '../utils/version';

describe('version - getCliVersion', () => {
  it('deve retornar uma string de versão válida', () => {
    const version = getCliVersion();
    expect(typeof version).toBe('string');
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('deve retornar versão do package.json', () => {
    const version = getCliVersion();
    expect(version).toBeDefined();
    expect(version.length).toBeGreaterThan(0);
  });

  it('deve retornar a versão do pacote', () => {
    const version = getCliVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(typeof version).toBe('string');
  });

  it('deve retornar versão consistente em múltiplas chamadas', () => {
    const version1 = getCliVersion();
    const version2 = getCliVersion();
    expect(version1).toBe(version2);
  });
});
