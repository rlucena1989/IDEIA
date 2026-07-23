export type TestFramework = 'jest' | 'vitest' | 'mocha' | 'jasmine';
export type SpecFormat = 'gherkin' | 'markdown' | 'yaml';

export interface GherkinScenario {
  name: string;
  tags: string[];
  steps: GherkinStep[];
}

export interface GherkinStep {
  keyword: 'Given' | 'When' | 'Then' | 'And' | 'But';
  text: string;
  argument?: string;
}

export interface GherkinFeature {
  title: string;
  description?: string;
  tags: string[];
  scenarios: GherkinScenario[];
  background?: GherkinStep[];
}

export interface TestStub {
  framework: TestFramework;
  feature: GherkinFeature;
  code: string;
  filePath: string;
}

export interface GeneratedSpec {
  title: string;
  feature: GherkinFeature;
  format: SpecFormat;
  content: string;
}
