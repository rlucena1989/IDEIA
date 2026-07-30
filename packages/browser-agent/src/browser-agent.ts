import { get } from 'node:https';
import { createLogger } from '@ideia/logger';

export interface BrowserAction {
  type: 'navigate' | 'click' | 'type' | 'extract' | 'screenshot' | 'executeScript';
  selector?: string;
  text?: string;
  url?: string;
  code?: string;
  timestamp: number;
}

export interface BrowserEngine {
  navigate(url: string): Promise<void>;
  click(selector: string): Promise<void>;
  type(selector: string, text: string): Promise<void>;
  extract(selector: string): Promise<string>;
  screenshot(): Promise<string>;
  getPageContent(): Promise<string>;
  executeScript(code: string): Promise<unknown>;
}

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

export class HttpEngine implements BrowserEngine {
  async navigate(url: string): Promise<void> {
    await httpGet(url);
  }

  async click(_selector: string): Promise<void> {
    throw new Error('HttpEngine.click not available. Use PlaywrightPEngine for interactive browsing.');
  }

  async type(_selector: string, _text: string): Promise<void> {
    throw new Error('HttpEngine.type not available. Use PlaywrightPEngine for interactive browsing.');
  }

  async extract(selector: string): Promise<string> {
    const page = await this.getPageContent();
    const match = page.match(new RegExp(`<${selector}[^>]*>([^<]*)</${selector}>`));
    return match ? match[1] : '';
  }

  async screenshot(): Promise<string> {
    throw new Error('HttpEngine.screenshot not available. Use PlaywrightPEngine for screenshots.');
  }

  async getPageContent(url?: string): Promise<string> {
    if (url) return httpGet(url);
    return '<html><body>HttpEngine: No page loaded. Use navigate() first.</body></html>';
  }

  async executeScript(_code: string): Promise<unknown> {
    throw new Error('HttpEngine.executeScript not available. Use PlaywrightPEngine for JS execution.');
  }
}

export class PlaywrightPEngine implements BrowserEngine {
  private page: any;
  private browser: any;
  private headless: boolean;

  constructor(options?: { headless?: boolean }) {
    this.headless = options?.headless ?? true;
  }

  async ensureBrowser(): Promise<void> {
    if (this.browser) return;
    try {
      const playwright: any = await import('playwright');
      this.browser = await playwright.chromium.launch({ headless: this.headless });
      const context = await this.browser.newContext();
      this.page = await context.newPage();
    } catch {
      throw new Error(
        'Playwright is not installed. Run: npm install playwright && npx playwright install chromium',
      );
    }
  }

  async navigate(url: string): Promise<void> {
    await this.ensureBrowser();
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  async click(selector: string): Promise<void> {
    await this.ensureBrowser();
    await this.page.click(selector);
  }

  async type(selector: string, text: string): Promise<void> {
    await this.ensureBrowser();
    await this.page.fill(selector, text);
  }

  async extract(selector: string): Promise<string> {
    await this.ensureBrowser();
    return this.page.textContent(selector) ?? '';
  }

  async screenshot(): Promise<string> {
    await this.ensureBrowser();
    const buffer = await this.page.screenshot({ type: 'png' });
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  async getPageContent(): Promise<string> {
    await this.ensureBrowser();
    return this.page.content();
  }

  async executeScript(code: string): Promise<unknown> {
    await this.ensureBrowser();
    return this.page.evaluate(code);
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

export class BrowserAgent {
  private engine: BrowserEngine;

  constructor(engine?: BrowserEngine) {
    this.engine = engine ?? new HttpEngine();
  }

  setEngine(engine: BrowserEngine): void {
    this.engine = engine;
  }

  async navigate(url: string): Promise<void> {
    await this.engine.navigate(url);
  }

  async click(selector: string): Promise<void> {
    await this.engine.click(selector);
  }

  async type(selector: string, text: string): Promise<void> {
    await this.engine.type(selector, text);
  }

  async extract(selector: string): Promise<string> {
    return this.engine.extract(selector);
  }

  async screenshot(): Promise<string> {
    return this.engine.screenshot();
  }

  async getPageContent(): Promise<string> {
    return this.engine.getPageContent();
  }

  async executeScript(code: string): Promise<unknown> {
    return this.engine.executeScript(code);
  }
}
