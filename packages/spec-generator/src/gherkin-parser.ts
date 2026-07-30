import { GherkinFeature, GherkinScenario, GherkinStep } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('gherkin-parser');

export class GherkinParser {
  parse(content: string): GherkinFeature {
    const lines = content.split('\n');
    const feature: GherkinFeature = { title: '', tags: [], scenarios: [] };
    let currentScenario: GherkinScenario | null = null;
    let inBackground = false;

    let pendingTags: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line || line.startsWith('#')) continue;

      if (line.startsWith('@')) {
        const tags = line.split(/\s+/).filter(t => t.startsWith('@'));
        pendingTags.push(...tags);
        continue;
      }

      if (line.startsWith('Feature:')) {
        feature.tags.push(...pendingTags);
        pendingTags = [];
        feature.title = line.slice(8).trim();
        if (i + 1 < lines.length && lines[i + 1].trim() && !lines[i + 1].trim().startsWith('#')) {
          feature.description = lines[i + 1].trim();
        }
        continue;
      }

      if (line.startsWith('Background:')) {
        inBackground = true;
        feature.background = [];
        continue;
      }

      if (line.startsWith('Scenario:')) {
        inBackground = false;
        if (currentScenario) feature.scenarios.push(currentScenario);
        currentScenario = { name: line.slice(9).trim(), tags: [...pendingTags], steps: [] };
        pendingTags = [];
        continue;
      }

      if (line.startsWith('Scenario Outline:') || line.startsWith('Scenario Template:')) {
        inBackground = false;
        if (currentScenario) feature.scenarios.push(currentScenario);
        currentScenario = { name: line.split(':').slice(1).join(':').trim(), tags: [...pendingTags], steps: [] };
        pendingTags = [];
        continue;
      }

      const step = this.parseStep(line);
      if (step) {
        if (inBackground && feature.background) {
          feature.background.push(step);
        } else if (currentScenario) {
          currentScenario.steps.push(step);
        }
      }

      if (line.startsWith('Examples:')) {
        const examples = this.parseExamples(lines, i + 1);
        if (currentScenario) {
          const tableStep: GherkinStep = { keyword: 'Given', text: 'examples:', argument: examples };
          currentScenario.steps.push(tableStep);
        }
      }
    }

    if (currentScenario) {
      currentScenario.tags.push(...pendingTags);
      feature.scenarios.push(currentScenario);
    } else {
      feature.tags.push(...pendingTags);
    }
    return feature;
  }

  generate(feature: GherkinFeature): string {
    const lines: string[] = [];

    if (feature.tags.length > 0) {
      lines.push(feature.tags.join(' '));
    }

    lines.push(`Feature: ${feature.title}`);
    if (feature.description) {
      lines.push(`  ${feature.description}`);
    }

    if (feature.background && feature.background.length > 0) {
      lines.push('');
      lines.push('  Background:');
      for (const step of feature.background) {
        lines.push(`    ${step.keyword} ${step.text}`);
      }
    }

    for (const scenario of feature.scenarios) {
      lines.push('');
      if (scenario.tags.length > 0) {
        lines.push(`  ${scenario.tags.join(' ')}`);
      }
      lines.push(`  Scenario: ${scenario.name}`);
      for (const step of scenario.steps) {
        if (step.argument) {
          lines.push(`    ${step.keyword} ${step.text}`);
          lines.push(step.argument);
        } else {
          lines.push(`    ${step.keyword} ${step.text}`);
        }
      }
    }

    return lines.join('\n');
  }

  private parseStep(line: string): GherkinStep | null {
    const keywords = ['Given ', 'When ', 'Then ', 'And ', 'But '];
    for (const kw of keywords) {
      if (line.startsWith(kw)) {
        return { keyword: kw.trim() as GherkinStep['keyword'], text: line.slice(kw.length).trim() };
      }
    }
    if (line.startsWith('* ')) {
      return { keyword: 'Given', text: line.slice(2).trim() };
    }
    if (line.startsWith('"') || line.startsWith('|')) {
      return null;
    }
    return null;
  }

  private parseExamples(lines: string[], startIndex: number): string {
    const tableLines: string[] = [];
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|')) {
        tableLines.push(`      ${line}`);
      } else if (line === '') {
        continue;
      } else {
        break;
      }
    }
    return tableLines.join('\n');
  }
}

export function createGherkinParser(): GherkinParser {
  return new GherkinParser();
}
