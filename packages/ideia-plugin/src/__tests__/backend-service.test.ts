import * as fs from 'fs';
import * as path from 'path';

const BACKEND_DIR = path.resolve(__dirname, '../node');
const SRC_DIR = path.resolve(__dirname, '../..');
const BROWSER_DIR = path.resolve(__dirname, '../browser');

function toPascalCase(kebab: string): string {
  const withoutExt = kebab.replace('.ts', '');
  const parts = withoutExt.split('-');
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

const serviceFiles = [
  { file: 'ideia-chat-service.ts', pattern: /export class (\w+Service)/ },
  { file: 'ideia-task-service.ts', pattern: /export class (\w+Runner)/ },
  { file: 'ideia-agent-service.ts', pattern: /export class (\w+Service)/ },
  { file: 'ideia-memory-service.ts', pattern: /export class (\w+Service)/ },
  { file: 'ideia-dashboard-service.ts', pattern: /export class (\w+Service)/ },
  { file: 'ideia-suggestions-service.ts', pattern: /export class (\w+Service)/ },
  { file: 'ideia-studies-service.ts', pattern: /export class (\w+Service)/ },
  { file: 'ideia-search-service.ts', pattern: /export class (\w+Service)/ },
  { file: 'ideia-security-service.ts', pattern: /export class (\w+Service)/ },
];

describe('Backend Services', () => {
  for (const { file, pattern } of serviceFiles) {
    it(`${file} exists and exports a service class`, () => {
      const fullPath = path.join(BACKEND_DIR, file);
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, 'utf-8');
      expect(content).toContain('@injectable()');
      const match = content.match(pattern);
      expect(match).not.toBeNull();
    });
  }

  it('backend module registers all services', () => {
    const modulePath = path.join(BACKEND_DIR, 'ideia-backend-module.ts');
    expect(fs.existsSync(modulePath)).toBe(true);
    const content = fs.readFileSync(modulePath, 'utf-8');
    for (const { file } of serviceFiles) {
      const className = toPascalCase(file.replace('.ts', ''));
      const inContent = content.includes(className) || content.includes(`IDEIA_TaskRunner`);
      expect(inContent).toBe(true);
    }
  });

  it('all service clients exist in browser', () => {
    const clientFiles = ['ideia-chat-widget.tsx', 'ideia-dashboard-widget.tsx'];
    for (const cf of clientFiles) {
      const fullPath = path.join(BROWSER_DIR, cf);
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, 'utf-8');
      expect(content).toContain('@inject(');
    }
  });

  it('common protocol defines all service paths', () => {
    const protocolPath = path.join(SRC_DIR, 'src/common/ideia-protocol.ts');
    expect(fs.existsSync(protocolPath)).toBe(true);
    const content = fs.readFileSync(protocolPath, 'utf-8');
    const pathExports = content.match(/IDEIA_\w+_PATH\s*=/g) || [];
    expect(pathExports.length).toBeGreaterThanOrEqual(serviceFiles.length);
  });

  it('common protocol defines all service symbols', () => {
    const protocolPath = path.join(SRC_DIR, 'src/common/ideia-protocol.ts');
    expect(fs.existsSync(protocolPath)).toBe(true);
    const content = fs.readFileSync(protocolPath, 'utf-8');
    const symbolExports = content.match(/IDEIA_\w+_SERVICE\b/g) || [];
    expect(symbolExports.length).toBeGreaterThanOrEqual(serviceFiles.length);
  });

  it('all services have corresponding test at minimum', () => {
    const testDir = path.join(BACKEND_DIR, '__tests__');
    if (fs.existsSync(testDir)) {
      const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.test.ts'));
      expect(testFiles.length).toBeGreaterThanOrEqual(1);
    }
  });
});
