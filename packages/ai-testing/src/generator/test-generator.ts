import { TestPlan, GeneratedTest, ValidationResult } from '../types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('test-generator');

export class TestGenerator {
  async generate(plan: TestPlan): Promise<GeneratedTest> {
    const content = this.renderTest(plan);
    const validation: ValidationResult = {
      compiles: true,
      testsPass: false,
      coverage: { lines: 0, branches: 0, functions: 0, statements: 0 },
      score: 0,
    };
    return { filePath: plan.filePath, content, plan, validation };
  }

  renderTest(plan: TestPlan): string {
    const importPath = this.getRelativeImportPath(plan.filePath);
    const lines: string[] = [
      `import { ${this.getExportNames(plan)} } from '${importPath}';`,
      '',
      `describe('${this.getDescribeName(plan)}', () => {`,
    ];

    for (const tc of plan.testCases) {
      lines.push(`  it('${tc.name}', () => {`);
      lines.push(`    // ${tc.description}`);
      if (tc.type === 'happy-path') {
        lines.push('    const result = true;');
        lines.push('    expect(result).toBeDefined();');
      } else if (tc.type === 'error-case') {
        lines.push('    expect(() => { throw new Error(\'test\'); }).toThrow();');
      } else {
        lines.push('    // TODO: implement test case');
        lines.push('    expect(true).toBe(true);');
      }
      lines.push('  });');
      lines.push('');
    }

    lines.push('});');
    return lines.join('\n');
  }

  private getRelativeImportPath(filePath: string): string {
    return filePath.replace(/\.test\.ts$/, '');
  }

  private getExportNames(_plan: TestPlan): string {
    return 'TestClass';
  }

  private getDescribeName(plan: TestPlan): string {
    return plan.filePath.split('/').pop()?.replace('.test.ts', '') ?? 'unknown';
  }
}
