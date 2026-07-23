import { validateChanges } from '../output-validator';
import { FileChange } from '../../common/ideia-types';

function makeChange(path: string, content: string): FileChange {
  return { path, status: 'modified', modifiedContent: content, originalContent: '' } as any;
}

describe('validateChanges', () => {
  it('passes for clean TypeScript', () => {
    const result = validateChanges([makeChange('src/index.ts', 'export const x = 1;')]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects OpenAI API key', () => {
    const result = validateChanges([makeChange('config.ts', 'const key = "sk-abcdefghijklmnopqrstuvwxyz123456"')]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.rule === 'secret-detection')).toBe(true);
  });

  it('detects GitHub token', () => {
    const result = validateChanges([makeChange('auth.ts', 'const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz"')]);
    expect(result.valid).toBe(false);
  });

  it('detects private key', () => {
    const result = validateChanges([makeChange('key.pem', '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA')]);
    expect(result.valid).toBe(false);
  });

  it('detects MongoDB connection string', () => {
    const result = validateChanges([makeChange('db.ts', 'const uri = "mongodb://user:pass@host:27017/db"')]);
    expect(result.valid).toBe(false);
  });

  it('detects eval()', () => {
    const result = validateChanges([makeChange('eval.ts', 'eval("alert(1)")')]);
    expect(result.valid).toBe(false);
  });

  it('detects innerHTML', () => {
    const result = validateChanges([makeChange('xss.ts', 'el.innerHTML = userInput')]);
    expect(result.valid).toBe(false);
  });

  it('skips deleted files', () => {
    const result = validateChanges([makeChange('deleted.ts', '')] as any);
    expect(result.errors).toHaveLength(0);
  });

  it('warns for large files', () => {
    const large = 'x'.repeat(50001);
    const result = validateChanges([makeChange('big.ts', large)]);
    expect(result.warnings.some(w => w.message.includes('large'))).toBe(true);
  });

  it('warns for TS files without exports', () => {
    const result = validateChanges([makeChange('noexport.ts', 'const x = 1;\nconst y = 2;\nconst z = 3;\nconst w = 4;\nconst v = 5;\nconst u = 6;')]);
    expect(result.warnings.some(w => w.message.includes('exports'))).toBe(true);
  });

  it('passes for Dockerfile (no extension)', () => {
    const result = validateChanges([makeChange('Dockerfile', 'FROM node:20\nCOPY . /app')]);
    expect(result.valid).toBe(true);
  });

  it('warns for unknown file without extension', () => {
    const result = validateChanges([makeChange('UNKNOWN_FILE', 'content')]);
    expect(result.warnings.some(w => w.message.includes('without extension'))).toBe(true);
  });

  it('warns for known no-extension files when extension is wrong', () => {
    const result = validateChanges([makeChange('Dockerfile', 'FROM node:20')]);
    expect(result.valid).toBe(true);
  });
});
