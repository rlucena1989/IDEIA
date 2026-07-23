import { getCliVersion } from '../utils/version';
import fs from 'node:fs';
import path from 'node:path';

describe('AI-Devkit CLI', () => {
  it('getCliVersion deve retornar uma string', () => {
    const version = getCliVersion();
    expect(typeof version).toBe('string');
    expect(version.length).toBeGreaterThan(0);
  });

  it('template directory deve existir', () => {
    const templateDir = path.resolve(__dirname, '../../templates/.ai');
    expect(fs.existsSync(templateDir)).toBe(true);
  });
});
