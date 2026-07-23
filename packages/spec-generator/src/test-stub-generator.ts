import { GherkinFeature, GherkinScenario, TestFramework } from './types';

export class TestStubGenerator {
  generate(feature: GherkinFeature, framework: TestFramework = 'jest'): string {
    const describeName = feature.title.replace(/['"]/g, "\\'");
    const lines: string[] = [];

    if (framework === 'jest' || framework === 'vitest') {
      lines.push(this.generateHeader(framework));
      lines.push('');
      lines.push(`describe('${describeName}', () => {`);

      for (const scenario of feature.scenarios) {
        lines.push(this.generateTestBlock(scenario, framework, 2));
      }

      lines.push('});');
    } else if (framework === 'mocha') {
      lines.push(this.generateHeader(framework));
      lines.push('');
      lines.push(`describe('${describeName}', function() {`);

      for (const scenario of feature.scenarios) {
        lines.push(this.generateTestBlock(scenario, framework, 2));
      }

      lines.push('});');
    }

    return lines.join('\n') + '\n';
  }

  generateFromRequirement(title: string, description: string | undefined, acceptanceCriteria: string[], framework: TestFramework = 'jest'): string {
    const feature: GherkinFeature = {
      title,
      description,
      tags: [],
      scenarios: acceptanceCriteria.map((criteria, i) => ({
        name: `Scenario ${i + 1}: ${criteria.slice(0, 60)}`,
        tags: [],
        steps: [
          { keyword: 'Given', text: 'the system is ready' },
          { keyword: 'When', text: `acceptance criteria "${criteria}" is evaluated` },
          { keyword: 'Then', text: 'it should be satisfied' },
        ],
      })),
    };

    return this.generate(feature, framework);
  }

  private generateHeader(framework: TestFramework): string {
    if (framework === 'vitest') {
      return "import { describe, it, expect } from 'vitest';";
    }
    return '';
  }

  private generateTestBlock(scenario: GherkinScenario, framework: TestFramework, indent: number): string {
    const ind = '  '.repeat(indent);
    const name = scenario.name.replace(/['"]/g, "\\'");
    const fn = framework === 'mocha' ? 'function()' : '() =>';
    const lines: string[] = [];

    lines.push(`${ind}it('${name}', ${fn} {`);

    for (const step of scenario.steps) {
      const testCode = this.stepToCode(step);
      lines.push(`${ind}  ${testCode}`);
    }

    lines.push(`${ind}});`);
    return lines.join('\n');
  }

  private stepToCode(step: { keyword: string; text: string }): string {
    const text = step.text.replace(/['"]/g, "\\'");

    switch (step.keyword) {
      case 'Given':
        return `// Given ${text}`;
      case 'When':
        return `// When ${text}`;
      case 'Then':
        if (text.toLowerCase().includes('should') || text.toLowerCase().includes('must')) {
          return `expect(true).toBe(true); // TODO: ${text}`;
        }
        return `// Then ${text}`;
      default:
        return `// ${step.keyword} ${text}`;
    }
  }
}

export function createTestStubGenerator(): TestStubGenerator {
  return new TestStubGenerator();
}
