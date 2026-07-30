import fs from 'fs';
import path from 'path';
import os from 'os';

export interface TestProject {
  rootDir: string;
  projectDir: string;
  cleanup: () => void;
}

export function createTestProject(prefix: string = 'ideia-test-'): TestProject {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const projectDir = path.join(tmpDir, 'test-project');
  fs.mkdirSync(projectDir, { recursive: true });

  const cleanup = (): void => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Silently fail cleanup
    }
  };

  return { rootDir: tmpDir, projectDir, cleanup };
}

export function createProjectStructure(projectDir: string): void {
  const dirs = [
    'src',
    'src/domain',
    'src/commands',
    'src/types',
    'src/utils',
    'tests',
    'docs',
    '.ai',
  ];
  for (const dir of dirs) {
    fs.mkdirSync(path.join(projectDir, dir), { recursive: true });
  }
}

export function createPackageJson(projectDir: string, name: string = 'test-project'): void {
  const pkg = {
    name,
    version: '1.0.0',
    private: true,
    scripts: {
      build: 'tsc',
      test: 'jest',
    },
    dependencies: {},
    devDependencies: {
      typescript: '^5.4.0',
      jest: '^29.0.0',
    },
  };
  fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf-8');
}

export function createSourceFile(projectDir: string, filePath: string, content: string): void {
  const fullPath = path.join(projectDir, filePath);
  const dir = path.dirname(fullPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

export function createModule(projectDir: string, name: string, exports: string[]): void {
  const content = [
    `// ${name} module`,
    ...exports.map(e => `export function ${e}(): string { return '${e}'; }`),
    '',
  ].join('\n');
  createSourceFile(projectDir, path.join('src', `${name}.ts`), content);
}

export function createTestFile(projectDir: string, name: string, testCount: number): void {
  const tests = Array.from({ length: testCount }, (_, i) => `
  it('test ${i + 1}', () => {
    expect(true).toBe(true);
  });`).join('\n');

  const content = `
import { describe, it, expect } from '@jest/globals';

describe('${name}', () => {${tests}
});
`.trim();

  createSourceFile(projectDir, path.join('tests', `${name}.test.ts`), content);
}

export function verifyProjectStructure(projectDir: string): string[] {
  const requiredFiles = [
    'package.json',
    'src',
    'tests',
  ];
  const results: string[] = [];
  for (const file of requiredFiles) {
    const fullPath = path.join(projectDir, file);
    if (!fs.existsSync(fullPath)) {
      results.push(`Missing: ${file}`);
    }
  }
  return results;
}
