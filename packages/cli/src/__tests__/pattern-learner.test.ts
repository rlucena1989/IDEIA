import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {
  scanRepository,
  formatPatternReport,
  suggestForContext,
  savePatterns,
  detectNamingConvention,
  findCommonPrefix,
} from '../runtime/pattern-learner';

function createTempRepo(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pattern-test-'));
  const srcDir = path.join(tmpDir, 'src');
  fs.mkdirSync(path.join(srcDir, 'components'), { recursive: true });
  fs.mkdirSync(path.join(srcDir, '__tests__'), { recursive: true });
  fs.mkdirSync(path.join(srcDir, 'api'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, '.ai/memory'), { recursive: true });

  const comp1 = `import React from 'react';
interface ButtonProps { label: string; onClick: () => void; }
export function Button(props: ButtonProps) {
  const [count, setCount] = React.useState(0);
  return <button onClick={props.onClick}>{props.label} ({count})</button>;
}`;
  fs.writeFileSync(path.join(srcDir, 'components', 'Button.tsx'), comp1);

  const comp2 = `import React from 'react';
interface CardProps { title: string; children: React.ReactNode; }
export function Card(props: CardProps) {
  return <div className="card"><h2>{props.title}</h2><div>{props.children}</div></div>;
}`;
  fs.writeFileSync(path.join(srcDir, 'components', 'Card.tsx'), comp2);

  fs.writeFileSync(path.join(srcDir, 'components', 'Header.tsx'), `export function Header() { return <header>Header</header>; }`);

  const test1 = `import { render } from '@testing-library/react';
import { Button } from '../components/Button';
test('renders button', () => { render(<Button label="test" onClick={() => {}} />); });`;
  fs.writeFileSync(path.join(srcDir, '__tests__', 'Button.test.tsx'), test1);

  fs.writeFileSync(path.join(srcDir, 'api', 'routes.ts'), `
router.get('/users', authMiddleware, async (req, res) => { res.json([]); });
router.post('/users', authMiddleware, validateSchema, async (req, res) => { res.json(req.body); });
router.get('/health', async (req, res) => { res.json({ status: 'ok' }); });
`);

  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
    name: 'test-project',
    devDependencies: { jest: '^29.0.0', '@testing-library/react': '^14.0.0' },
  }));

  return tmpDir;
}

describe('Pattern Learner Module', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempRepo();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('detectNamingConvention', () => {
    it('deve detectar PascalCase', () => {
      expect(detectNamingConvention(['Button.tsx', 'Card.tsx', 'Header.tsx'])).toBe('PascalCase');
    });

    it('deve detectar camelCase', () => {
      expect(detectNamingConvention(['getUser.ts', 'setName.ts', 'fetchData.ts'])).toBe('camelCase');
    });

    it('deve detectar kebab-case', () => {
      expect(detectNamingConvention(['my-component.ts', 'user-card.ts', 'nav-bar.ts'])).toBe('kebab-case');
    });

    it('deve retornar mixed para array vazio', () => {
      expect(detectNamingConvention([])).toBe('mixed');
    });
  });

  describe('findCommonPrefix', () => {
    it('deve encontrar prefixo comum', () => {
      const prefix = findCommonPrefix(['Button.tsx', 'Button.test.tsx', 'Button.stories.tsx']);
      expect(prefix.length).toBeGreaterThan(0);
      expect(['Button', 'Button.']).toContain(prefix);
    });

    it('deve retornar vazio para strings diferentes', () => {
      expect(findCommonPrefix(['Button.tsx', 'Card.tsx'])).toBe('');
    });

    it('deve retornar vazio para menos de 2 nomes', () => {
      expect(findCommonPrefix(['Button.tsx'])).toBe('');
    });
  });

  describe('scanRepository', () => {
    it('deve escanear e retornar estrutura basica', () => {
      const result = scanRepository({ rootDir: tmpDir });
      expect(result.summary.totalFiles).toBeGreaterThan(0);
      expect(result.summary.totalDirs).toBeGreaterThan(0);
      expect(result.directory.length).toBeGreaterThan(0);
    });

    it('deve detectar componentes', () => {
      const result = scanRepository({ rootDir: tmpDir });
      expect(result.components.length).toBeGreaterThanOrEqual(3);
      const button = result.components.find(c => c.name === 'Button');
      expect(button).toBeDefined();
      expect(button!.hasProps).toBe(true);
      expect(button!.hasHooks).toBe(true);
    });

    it('deve detectar convencoes de nomenclatura', () => {
      const result = scanRepository({ rootDir: tmpDir });
      const tsxNaming = result.naming.find(n => n.extension === '.tsx');
      expect(tsxNaming).toBeDefined();
      expect(tsxNaming!.type).toBe('PascalCase');
    });

    it('deve detectar APIs', () => {
      const result = scanRepository({ rootDir: tmpDir });
      expect(result.apis.length).toBeGreaterThanOrEqual(3);
      const usersRoute = result.apis.find(a => a.path === '/users');
      expect(usersRoute).toBeDefined();
      expect(usersRoute!.hasAuth).toBe(true);
    });

    it('deve detectar padroes de teste', () => {
      const result = scanRepository({ rootDir: tmpDir });
      expect(result.tests.length).toBeGreaterThanOrEqual(1);
      expect(result.tests[0].framework).toBe('jest');
    });

    it('deve detectar commits', () => {
      const result = scanRepository({ rootDir: tmpDir, maxCommits: 5 });
      expect(result.commits).toBeDefined();
    });

    it('deve gerar sugestoes', () => {
      const result = scanRepository({ rootDir: tmpDir });
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('formatPatternReport', () => {
    it('deve formatar relatorio completo', () => {
      const patterns = scanRepository({ rootDir: tmpDir });
      const report = formatPatternReport(patterns);
      expect(report).toContain('Padroes Detectados');
      expect(report).toContain('Arquivos:');
      expect(report.length).toBeGreaterThan(50);
    });
  });

  describe('suggestForContext', () => {
    it('deve sugerir para contexto de componente', () => {
      const patterns = scanRepository({ rootDir: tmpDir });
      const suggestions = suggestForContext(patterns, 'criar novo componente');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('Props') || s.includes('componente') || s.includes('hook') || s.includes('convenção') || s.includes('convencao'))).toBe(true);
    });

    it('deve sugerir para contexto de API', () => {
      const patterns = scanRepository({ rootDir: tmpDir });
      const suggestions = suggestForContext(patterns, 'nova rota de API');
      expect(suggestions.some(s => s.includes('auth') || s.includes('autenticação') || s.includes('middleware'))).toBe(true);
    });

    it('deve sugerir para contexto de teste', () => {
      const patterns = scanRepository({ rootDir: tmpDir });
      const suggestions = suggestForContext(patterns, 'adicionar testes');
      expect(suggestions.some(s => s.includes('test') || s.includes('Teste') || s.includes('__tests__'))).toBe(true);
    });

    it('deve retornar vazio para contexto desconhecido', () => {
      const patterns = scanRepository({ rootDir: tmpDir });
      const suggestions = suggestForContext(patterns, 'xyz123unknown');
      expect(suggestions.length).toBe(0);
    });
  });

  describe('savePatterns', () => {
    it('deve salvar padroes em .ai/memory/patterns.yaml', () => {
      const patterns = scanRepository({ rootDir: tmpDir });
      const filePath = savePatterns(patterns, tmpDir);
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('extracted_at');
      expect(content).toContain('summary');
    });
  });

  describe('scanRepository com opcoes', () => {
    it('deve respeitar maxDepth', () => {
      const shallow = scanRepository({ rootDir: tmpDir, maxDepth: 1 });
      const deep = scanRepository({ rootDir: tmpDir, maxDepth: 10 });
      expect(deep.directory.length).toBeGreaterThanOrEqual(shallow.directory.length);
    });

    it('deve respeitar rootDir', () => {
      const result = scanRepository({ rootDir: tmpDir });
      expect(result.summary.totalFiles).toBeGreaterThan(0);
    });
  });
});
