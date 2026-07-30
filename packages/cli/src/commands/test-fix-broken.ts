import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.test-fix-broken');
import { Project, SyntaxKind } from 'ts-morph';
import fs from 'node:fs';
import _path from 'node:path';
import { execFileSync } from 'node:child_process';

/**
 * Testa fix broken command.
 * @returns O resultado da operaÃ§Ã£o.
 */
export function testFixBrokenCommand(): Command {
  const cmd = new Command('test-fix-broken')
    .description('Corrige padrÃµes comuns de falha em testes');

  cmd
    .command('fix')
    .description('Detecta e corrige padrÃµes de falha em arquivos de teste')
    .option('--dry-run', 'Apenas mostra o que seria corrigido')
    .action(async (options: { dryRun?: boolean }) => {
      const root = process.cwd();
      const testFiles: string[] = [];

      try {
        const listOutput = execFileSync('npx jest --listTests 2>&1', { cwd: root, encoding: 'utf8', timeout: 30000 });
        testFiles.push(...listOutput.split('\n').filter(Boolean));
      } catch { /* jest list failed */ }

      if (testFiles.length === 0) {
        logger.info('No test files found via jest --listTests.');
        return;
      }

      logger.info('Test files encontrados: ${testFiles.length}\n');

      let fixed = 0;
      const patterns = [
        {
          name: 'const requireMock â†’ var (TDZ fix)',
          detect: (src: string) => !!src.match(/const\s+\w+\s*=\s*jest\.requireMock\(/),
          fix: (src: string) => src.replace(/const\s+(\w+\s*=\s*jest\.requireMock)/g, 'var $1'),
        },
        {
          name: 'missing mockYamlParse variable',
          detect: (src: string) => src.includes('mockYamlParse.mock') && !src.includes('var mockYamlParse') && !src.includes('const mockYamlParse'),
          fix: (src: string) => {
            const insertPos = src.indexOf("jest.mock('yaml'") >= 0 ? src.indexOf("jest.mock('yaml'") : -1;
            if (insertPos < 0) return src;
            const afterMock = src.indexOf('\n', src.indexOf("});", insertPos)) + 1;
            return src.slice(0, afterMock) + "const mockYamlParse = jest.requireMock('yaml').parse;\n" + src.slice(afterMock);
          },
        },
        {
          name: 'vitest import should be @jest/globals',
          detect: (src: string) => src.includes("from 'vitest'"),
          fix: (src: string) => src.replace(/from\s+'vitest'/g, "from '@jest/globals'"),
        },
        {
          name: 'type-only exports used as values',
          detect: (src: string) => {
            const typeLines = src.match(/^\s*(it|expect)\([\s\S]{0,200}$/gm) || [];
            return typeLines.some(l => /[A-Z]\w+.*should be defined/.test(l) && /(?:describe|it)\(/.test(l));
          },
          fix: (src: string) => src, // detection only - the fix is in coverage-improve generator
        },
        {
          name: 'mockFs hoisting (jest.mock referencing local var)',
          detect: (src: string) => src.includes("jest.mock('node:fs', () => mockFs)") || src.includes('jest.mock("node:fs", () => mockFs)'),
          fix: (src: string) => src.replace(
            /jest\.mock\(['"]node:fs['"],\s*\(\)\s*=>\s*mockFs\)/g,
            `jest.mock('node:fs', () => {\n  const m: Record<string, jest.Mock> = {};\n  m.existsSync = jest.fn();\n  m.readFileSync = jest.fn();\n  m.writeFileSync = jest.fn();\n  m.readdirSync = jest.fn();\n  return m;\n});\nvar mockFs: Record<string, jest.Mock> = jest.requireMock('node:fs');`
          ),
        },
        {
          name: 'shell: true as Record<string, unknown> in execFileSync options',
          detect: (src: string) => src.includes('shell: true as Record<string, unknown>'),
          fix: (src: string) => src.replace(/shell:\s*true\s+as\s+any/g, 'shell: true as boolean'),
        },
        {
          name: 'const mock before jest.mock (hoisting issue)',
          detect: (src: string) => {
            const lines = src.split('\n');
            let foundMockDecl = false;
            let foundJestMock = false;
            for (const l of lines) {
              if (l.includes('const mock') && l.includes('=')) foundMockDecl = true;
              if (l.includes("jest.mock('") || l.includes('jest.mock("')) foundJestMock = true;
              if (foundMockDecl && foundJestMock) break;
            }
            return foundMockDecl && foundJestMock;
          },
          fix: (src: string) => {
            const lines = src.split('\n');
            const result: string[] = [];
            let mockDeclLines: string[] = [];
            let inMockDecl = false;
            let moved = false;

            for (const line of lines) {
              if (!moved && line.match(/^\s*(const|let)\s+mock\w+\s*=/)) {
                inMockDecl = true;
                mockDeclLines = [line];
                continue;
              }
              if (inMockDecl) {
                if (line.includes('jest.mock(')) {
                  result.push(line);
                  result.push(...mockDeclLines);
                  inMockDecl = false;
                  moved = true;
                  continue;
                }
                if (line.trim().endsWith(';') || line.trim().endsWith('}') || line.trim() === '') {
                  mockDeclLines.push(line);
                  result.push(...mockDeclLines);
                  inMockDecl = false;
                  continue;
                }
                mockDeclLines.push(line);
                continue;
              }
              result.push(line);
            }
            if (inMockDecl) result.push(...mockDeclLines);
            return result.join('\n');
          },
        },
      ];

      for (const file of testFiles) {
        if (!fs.existsSync(file)) continue;
        const original = fs.readFileSync(file, 'utf8');
        let modified = original;
        let fileFixed = false;

        for (const pattern of patterns) {
          if (pattern.detect(modified)) {
            const newContent = pattern.fix(modified);
            if (newContent !== modified) {
              if (options.dryRun) {
                logger.info('  [DRY-RUN] ${pattern.name}: ${file}');
              }
              modified = newContent;
              fileFixed = true;
            }
          }
        }

        if (fileFixed) {
          if (!options.dryRun) {
            fs.writeFileSync(file, modified, 'utf8');
            logger.info('  [FIXED] ${file}');
            fixed++;
          }
        }
      }

      logger.info('\nArquivos corrigidos: ${fixed}');
    });

  return cmd;
}
