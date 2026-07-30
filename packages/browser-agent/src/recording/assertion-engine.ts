import type { Page } from 'playwright';
import { createLogger } from '@ideia/logger';
const logger = createLogger('assertion-engine');

export type AssertionType = 'url' | 'title' | 'text' | 'visible' | 'exists';

export interface AssertionResult {
  type: AssertionType;
  passed: boolean;
  expected?: string;
  actual?: string;
  selector?: string;
  duration: number;
  error?: string;
}

export class AssertionEngine {
  async assert(
    page: Page,
    type: AssertionType,
    expected?: string,
    selector?: string,
    timeout?: number,
  ): Promise<AssertionResult> {
    const startTime = Date.now();
    try {
      switch (type) {
        case 'url': {
          const actual = page.url();
          const passed = expected ? actual.includes(expected) : true;
          return { type, passed, expected, actual, duration: Date.now() - startTime };
        }
        case 'title': {
          const actual = await page.title();
          const passed = expected ? actual.includes(expected) : true;
          return { type, passed, expected, actual, duration: Date.now() - startTime };
        }
        case 'text': {
          if (!selector) throw new Error('Selector required for text assertion');
          const actual = await page.textContent(selector);
          const passed = expected ? (actual?.includes(expected) ?? false) : (actual !== null && actual !== '');
          return { type, passed, expected, actual: actual ?? '', selector, duration: Date.now() - startTime };
        }
        case 'visible': {
          if (!selector) throw new Error('Selector required for visibility assertion');
          const el = await page.waitForSelector(selector, { state: 'visible', timeout: timeout ?? 3000 }).catch(() => null);
          const passed = el !== null;
          return { type, passed, selector, duration: Date.now() - startTime };
        }
        case 'exists': {
          if (!selector) throw new Error('Selector required for existence assertion');
          const el = await page.$(selector);
          const passed = el !== null;
          return { type, passed, selector, duration: Date.now() - startTime };
        }
        default:
          throw new Error(`Unknown assertion type: ${type}`);
      }
    } catch (err) {
      return {
        type,
        passed: false,
        expected,
        selector,
        duration: Date.now() - startTime,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async assertAll(
    page: Page,
    assertions: Array<{ type: AssertionType; expected?: string; selector?: string; timeout?: number }>,
  ): Promise<AssertionResult[]> {
    return Promise.all(assertions.map((a) => this.assert(page, a.type, a.expected, a.selector, a.timeout)));
  }
}
