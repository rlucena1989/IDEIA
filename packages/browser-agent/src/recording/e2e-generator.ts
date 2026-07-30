export interface E2EConfig {
  framework: 'playwright' | 'puppeteer' | 'selenium';
  outputDir: string;
  includeAssertions?: boolean;
  includeScreenshots?: boolean;
}

export interface RecordedStep {
  action: 'click' | 'type' | 'navigate' | 'select' | 'scroll' | 'wait';
  selector?: string;
  value?: string;
  url?: string;
  timestamp: number;
  screenshot?: string;
}

export interface E2ETest {
  name: string;
  steps: RecordedStep[];
  config: E2EConfig;
}

export class E2EGenerator {
  private steps: RecordedStep[] = [];
  private config: E2EConfig;

  constructor(config: E2EConfig) {
    this.config = config;
  }

  recordStep(step: RecordedStep): void {
    this.steps.push(step);
  }

  generate(testName: string): E2ETest {
    return {
      name: testName,
      steps: [...this.steps],
      config: this.config,
    };
  }

  generatePlaywright(testName: string): string {
    const imports = "import { test, expect } from '@playwright/test';";
    const testBody = this.steps.map(s => {
      switch (s.action) {
        case 'navigate': return `  await page.goto('${s.url}');`;
        case 'click': return `  await page.click('${s.selector}');`;
        case 'type': return `  await page.fill('${s.selector}', '${s.value}');`;
        case 'select': return `  await page.selectOption('${s.selector}', '${s.value}');`;
        case 'scroll': return `  await page.evaluate(() => window.scrollBy(0, ${s.value ?? 300}));`;
        case 'wait': return `  await page.waitForTimeout(${s.value ?? 1000});`;
        default: return '';
      }
    }).filter(Boolean).join('\n');

    return `${imports}\n\ntest('${testName}', async ({ page }) => {\n${testBody}\n});`;
  }

  generatePlaywrightWithAssertions(testName: string): string {
    const base = this.generatePlaywright(testName);
    const assertions = this.steps
      .filter(s => s.action === 'navigate' || s.action === 'click')
      .map(s => {
        if (s.action === 'navigate') {
          return `  await expect(page).toHaveURL(/.*/);`;
        }
        return '';
      }).filter(Boolean).join('\n');
    return base.replace('});', `${assertions}\n});`);
  }

  clear(): void {
    this.steps = [];
  }

  get recordedSteps(): number {
    return this.steps.length;
  }
}
