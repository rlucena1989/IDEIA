import {
  levenshteinDistance,
  filenameSimilarity,
  extractWords,
  jaccardSimilarity,
  contentSimilarity,
  extractSignatures,
  functionSimilarity,
  scanForDuplicateFiles,
  scanForDuplicateFunctions,
  runDuplicationScan,
  generateRecommendations,
  formatDuplicationReport,
  FunctionSignature,
  DEFAULT_SCANNER_OPTIONS,
} from '../runtime/duplication';

describe('Duplication Module', () => {
  describe('levenshteinDistance', () => {
    it('deve retornar 0 para strings identicas', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
    });

    it('deve retornar distancia para strings diferentes', () => {
      expect(levenshteinDistance('hello', 'hallo')).toBe(1);
      expect(levenshteinDistance('abc', 'abcd')).toBe(1);
    });

    it('deve lidar com strings vazias', () => {
      expect(levenshteinDistance('', 'abc')).toBe(3);
      expect(levenshteinDistance('abc', '')).toBe(3);
      expect(levenshteinDistance('', '')).toBe(0);
    });

    it('deve calcular distancia completa', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    });
  });

  describe('filenameSimilarity', () => {
    it('deve retornar 1 para nomes identicos', () => {
      expect(filenameSimilarity('foo.ts', 'foo.ts')).toBe(1);
    });

    it('deve desconsiderar extensao', () => {
      expect(filenameSimilarity('foo.ts', 'foo.js')).toBe(1);
    });

    it('deve retornar <1 para nomes diferentes', () => {
      expect(filenameSimilarity('foo.ts', 'bar.ts')).toBeLessThan(1);
    });

    it('deve tratar maiusculas/minusculas', () => {
      expect(filenameSimilarity('Foo.ts', 'foo.ts')).toBeGreaterThan(0.9);
    });

    it('deve retornar 1 para strings vazias', () => {
      expect(filenameSimilarity('', '')).toBe(1);
    });
  });

  describe('extractWords', () => {
    it('deve extrair palavras com 3+ caracteres', () => {
      const words = extractWords('hello world and');
      expect(words.has('hello')).toBe(true);
      expect(words.has('world')).toBe(true);
      expect(words.has('and')).toBe(true);
    });

    it('deve ignorar palavras curtas', () => {
      const words = extractWords('a is to');
      expect(words.size).toBe(0);
    });

    it('deve lidar com codigo TS', () => {
      const words = extractWords('export function foo(param: string) { return param; }');
      expect(words.has('export')).toBe(true);
      expect(words.has('function')).toBe(true);
      expect(words.has('param')).toBe(true);
      expect(words.has('string')).toBe(true);
      expect(words.has('return')).toBe(true);
    });

    it('deve retornar Set vazio para string vazia', () => {
      expect(extractWords('').size).toBe(0);
    });
  });

  describe('jaccardSimilarity', () => {
    it('deve retornar 1 para conjuntos identicos', () => {
      const a = new Set(['a', 'b', 'c']);
      expect(jaccardSimilarity(a, a)).toBe(1);
    });

    it('deve retornar 0 para conjuntos disjuntos', () => {
      const a = new Set(['a', 'b']);
      const b = new Set(['c', 'd']);
      expect(jaccardSimilarity(a, b)).toBe(0);
    });

    it('deve calcular Jaccard corretamente', () => {
      const a = new Set(['a', 'b', 'c']);
      const b = new Set(['b', 'c', 'd']);
      expect(jaccardSimilarity(a, b)).toBe(0.5);
    });

    it('deve retornar 0 para conjuntos vazios', () => {
      expect(jaccardSimilarity(new Set(), new Set())).toBe(0);
    });
  });

  describe('contentSimilarity', () => {
    it('deve retornar 1 para conteudo identico', () => {
      expect(contentSimilarity('hello world', 'hello world')).toBe(1);
    });

    it('deve retornar <1 para conteudo diferente', () => {
      const sim = contentSimilarity('hello world', 'goodbye world');
      expect(sim).toBeGreaterThan(0);
      expect(sim).toBeLessThan(1);
    });

    it('deve retornar 0 para conteudo completamente diferente', () => {
      const sim = contentSimilarity('abc def', 'ghi jkl');
      expect(sim).toBe(0);
    });
  });

  describe('extractSignatures', () => {
    it('deve extrair funcoes exportadas', () => {
      const sigs = extractSignatures('export function foo(a: string, b: number) {\n  return a;\n}', 'test.ts');
      expect(sigs.length).toBeGreaterThanOrEqual(1);
      const foo = sigs.find(s => s.name === 'foo');
      expect(foo).toBeDefined();
      expect(foo!.type).toBe('function');
      expect(foo!.params).toContain('a: string');
      expect(foo!.params).toContain('b: number');
      expect(foo!.line).toBe(1);
    });

    it('deve extrair funcoes async', () => {
      const sigs = extractSignatures('export async function fetchData(url: string) {\n  return {};\n}', 'test.ts');
      const fn = sigs.find(s => s.name === 'fetchData');
      expect(fn).toBeDefined();
      expect(fn!.type).toBe('function');
    });

    it('deve extrair arrow functions', () => {
      const sigs = extractSignatures('export const handler = (req: Request, res: Response) => {\n  return;\n}', 'test.ts');
      const fn = sigs.find(s => s.name === 'handler');
      expect(fn).toBeDefined();
      expect(fn!.type).toBe('arrow');
    });

    it('deve extrair classes', () => {
      const sigs = extractSignatures('export class UserService {\n  constructor() {}\n}', 'test.ts');
      const cls = sigs.find(s => s.name === 'UserService');
      expect(cls).toBeDefined();
      expect(cls!.type).toBe('class');
    });

    it('deve extrair hooks React (nomes com use prefixo)', () => {
      const sigs = extractSignatures('export function useAuth() {\n  return {};\n}', 'test.ts');
      const hook = sigs.find(s => s.name === 'useAuth');
      expect(hook).toBeDefined();
      expect(hook!.name).toBe('useAuth');
      expect(hook!.type).toBe('function');
    });
  });

  describe('functionSimilarity', () => {
    const base: FunctionSignature = { name: 'getUser', type: 'function', file: 'a.ts', line: 1, params: ['id: string'] };

    it('deve retornar 1 para funcoes identicas', () => {
      expect(functionSimilarity(base, { ...base })).toBe(1);
    });

    it('deve retornar <1 para funcoes diferentes', () => {
      const other: FunctionSignature = { name: 'getPost', type: 'function', file: 'b.ts', line: 5, params: ['id: string'] };
      expect(functionSimilarity(base, other)).toBeLessThan(1);
    });

    it('deve considerar tipo diferente como penalidade', () => {
      const arrow: FunctionSignature = { name: 'getUser', type: 'arrow', file: 'b.ts', line: 5, params: ['id: string'] };
      expect(functionSimilarity(base, arrow)).toBeLessThan(1);
    });
  });

  describe('scanForDuplicateFiles', () => {
    const files = ['/project/src/foo.ts', '/project/src/foo-copy.ts', '/project/src/bar.ts', '/project/src/baz.ts'];
    const contents = new Map<string, string>([
      ['/project/src/foo.ts', 'export function foo() { return 1; }'],
      ['/project/src/foo-copy.ts', 'export function foo() { return 1; }'],
      ['/project/src/bar.ts', 'export function bar() { return 2; }'],
      ['/project/src/baz.ts', 'export function baz() { return 3; }'],
    ]);

    it('deve detectar arquivos com nomes similares', () => {
      const groups = scanForDuplicateFiles(files, contents, { minFilenameSimilarity: 0.5 });
      expect(groups.length).toBeGreaterThanOrEqual(1);
      const fooGroup = groups.find(g => g.files.some(f => f.includes('foo.ts')));
      expect(fooGroup).toBeDefined();
      expect(fooGroup!.files.length).toBeGreaterThanOrEqual(2);
    });

    it('deve detectar arquivos com conteudo similar', () => {
      const sameContent = new Map<string, string>([
        ['/project/src/alpha.ts', 'const x = 1;\nexport function run() { return x; }'],
        ['/project/src/beta.ts', 'const y = 1;\nexport function run() { return y; }'],
      ]);
      const groups = scanForDuplicateFiles(['/project/src/alpha.ts', '/project/src/beta.ts'], sameContent, { minContentSimilarity: 0.3 });
      expect(groups.length).toBeGreaterThanOrEqual(1);
    });

    it('deve retornar vazio quando nao ha duplicatas', () => {
      const unique = new Map<string, string>([
        ['/project/src/a.ts', 'export const APP_NAME = "MyApp";\nconst VERSION = "1.0";'],
        ['/project/src/b.ts', 'import { execSync } from "child_process";\nexport function runBuild() {\n  return execSync("npm run build");\n}'],
      ]);
      const groups = scanForDuplicateFiles(['/project/src/a.ts', '/project/src/b.ts'], unique, { minContentSimilarity: 0.5 });
      expect(groups.length).toBe(0);
    });
  });

  describe('scanForDuplicateFunctions', () => {
    it('deve detectar funcoes similares em arquivos diferentes', () => {
      const files = ['/project/a.ts', '/project/b.ts'];
      const contents = new Map<string, string>([
        ['/project/a.ts', 'export function getUser(id: string) { return {}; }'],
        ['/project/b.ts', 'export function getUser(userId: string) { return {}; }'],
      ]);
      const result = scanForDuplicateFunctions(files, contents, { minFunctionSimilarity: 0.5 });
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].signatureA.name).toBe('getUser');
    });

    it('deve ignorar funcoes no mesmo arquivo', () => {
      const files = ['/project/a.ts'];
      const contents = new Map<string, string>([
        ['/project/a.ts', 'export function foo() {}\nexport function bar() {}'],
      ]);
      const result = scanForDuplicateFunctions(files, contents);
      expect(result.length).toBe(0);
    });

    it('deve retornar vazio quando nao ha similaridade', () => {
      const files = ['/project/a.ts', '/project/b.ts'];
      const contents = new Map<string, string>([
        ['/project/a.ts', 'export function foo() { return 1; }'],
        ['/project/b.ts', 'export class Bar { constructor() {} }'],
      ]);
      const result = scanForDuplicateFunctions(files, contents, { minFunctionSimilarity: 0.9 });
      expect(result.length).toBe(0);
    });
  });

  describe('generateRecommendations', () => {
    it('deve gerar recomendacoes para grupos de arquivos duplicados', () => {
      const groups = [{
        files: ['/project/a.ts', '/project/b.ts'],
        similarity: 0.9,
        type: 'filename' as const,
        pairs: [{ fileA: '/project/a.ts', fileB: '/project/b.ts', similarity: 0.9, type: 'filename' as const, linesA: 10, linesB: 10 }],
      }];
      const recs = generateRecommendations(groups, []);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0]).toContain('Arquivos duplicados');
    });

    it('deve gerar recomendacoes para funcoes duplicadas', () => {
      const funcs = [{
        signatureA: { name: 'getUser', type: 'function' as const, file: '/project/a.ts', line: 1, params: ['id'] },
        signatureB: { name: 'getUserData', type: 'function' as const, file: '/project/b.ts', line: 2, params: ['id'] },
        similarity: 0.85,
      }];
      const recs = generateRecommendations([], funcs);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0]).toContain('Funcao');
    });

    it('deve retornar mensagem padrao quando nao ha duplicatas', () => {
      const recs = generateRecommendations([], []);
      expect(recs).toContain('Nenhuma duplicacao significativa encontrada.');
    });
  });

  describe('formatDuplicationReport', () => {
    it('deve formatar relatorio completo', () => {
      const report = {
        scannedFiles: 100,
        duplicateFiles: [{
          files: ['/project/a.ts', '/project/b.ts'],
          similarity: 0.9,
          type: 'filename' as const,
          pairs: [],
        }],
        duplicateFunctions: [{
          signatureA: { name: 'foo', type: 'function' as const, file: '/project/a.ts', line: 1, params: ['x'] },
          signatureB: { name: 'bar', type: 'function' as const, file: '/project/b.ts', line: 5, params: ['x'] },
          similarity: 0.85,
        }],
        totalRedundant: 2,
        scanTimeMs: 150,
        recommendations: ['Teste de recomendacao'],
      };
      const output = formatDuplicationReport(report);
      expect(output).toContain('Duplication Report');
      expect(output).toContain('Arquivos escaneados: 100');
      expect(output).toContain('Arquivos Duplicados');
      expect(output).toContain('Funcoes Duplicadas');
      expect(output).toContain('Recomendacoes');
    });

    it('deve formatar relatorio sem duplicatas', () => {
      const report = {
        scannedFiles: 50,
        duplicateFiles: [],
        duplicateFunctions: [],
        totalRedundant: 0,
        scanTimeMs: 50,
        recommendations: ['Nenhuma duplicacao significativa encontrada.'],
      };
      const output = formatDuplicationReport(report);
      expect(output).toContain('Duplication Report');
      expect(output).not.toContain('Arquivos Duplicados');
    });
  });

  describe('runDuplicationScan', () => {
    it('deve escanear e reportar duplicatas', () => {
      const readFileFn = (p: string) => {
        if (p.endsWith('a.ts')) return 'export function foo() { return 1; }';
        if (p.endsWith('a-copy.ts')) return 'export function foo() { return 1; }';
        if (p.endsWith('b.ts')) return 'export function bar() { return 2; }';
        return null;
      };
      const listFilesFn = () => ['/root/a.ts', '/root/a-copy.ts', '/root/b.ts'];

      const report = runDuplicationScan('/root', readFileFn, listFilesFn, DEFAULT_SCANNER_OPTIONS);
      expect(report.scannedFiles).toBe(3);
      expect(report.totalRedundant).toBeGreaterThanOrEqual(0);
      expect(report.scanTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('deve respeitar excludePatterns', () => {
      const readFileFn = () => 'export function foo() { return 1; }';
      const listFilesFn = () => ['/root/node_modules/pkg/a.ts', '/root/src/b.ts'];

      const report = runDuplicationScan('/root', readFileFn, listFilesFn, {
        excludePatterns: ['node_modules'],
      });
      expect(report.scannedFiles).toBe(1);
    });
  });

  describe('DEFAULT_SCANNER_OPTIONS', () => {
    it('deve ter valores padrao definidos', () => {
      expect(DEFAULT_SCANNER_OPTIONS.minFilenameSimilarity).toBe(0.8);
      expect(DEFAULT_SCANNER_OPTIONS.minContentSimilarity).toBe(0.6);
      expect(DEFAULT_SCANNER_OPTIONS.minFunctionSimilarity).toBe(0.7);
      expect(DEFAULT_SCANNER_OPTIONS.maxFileSize).toBe(1024 * 1024);
      expect(DEFAULT_SCANNER_OPTIONS.excludePatterns).toContain('node_modules');
      expect(DEFAULT_SCANNER_OPTIONS.includeExtensions).toContain('.ts');
    });
  });
});
