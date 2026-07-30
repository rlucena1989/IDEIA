import type { Browser, BrowserContext, Page, BrowserType, Cookie } from 'playwright';
import { createLogger } from '@ideia/logger';
const logger = createLogger('browser-controller');

export interface BrowserControllerConfig {
  headless?: boolean;
  viewport?: { width: number; height: number };
  proxy?: { server: string; username?: string; password?: string };
  userAgent?: string;
  locale?: string;
  timezoneId?: string;
  ignoreHTTPSErrors?: boolean;
  executablePath?: string;
  browserType?: 'chromium' | 'firefox' | 'webkit';
  args?: string[];
}

export interface ActiveSession {
  id: string;
  context: BrowserContext;
  page: Page;
  createdAt: number;
  navigate(url: string, waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit', timeout?: number): Promise<void>;
  click(selector: string, timeout?: number, force?: boolean): Promise<void>;
  type(selector: string, text: string, delay?: number): Promise<void>;
  scroll(
    selector?: string,
    x?: number,
    y?: number,
    direction?: 'up' | 'down' | 'left' | 'right',
    amount?: number,
  ): Promise<void>;
  wait(selector: string, state?: 'attached' | 'detached' | 'visible' | 'hidden', timeout?: number): Promise<void>;
  waitForDuration(ms: number): Promise<void>;
  extract(
    selector: string,
    property?: 'text' | 'html' | 'attribute' | 'value',
    attribute?: string,
  ): Promise<unknown>;
  screenshot(): Promise<string>;
  assert(
    assertion: 'url' | 'title' | 'text' | 'visible' | 'exists',
    expected?: string,
    selector?: string,
    timeout?: number,
  ): Promise<boolean>;
  getState(): Promise<{ url: string; title: string; cookies: Cookie[] }>;
  close(): Promise<void>;
}

export class BrowserController {
  private browser: Browser | null = null;
  private config: BrowserControllerConfig;
  private activeSessions: Map<string, ActiveSession> = new Map();

  constructor(config: BrowserControllerConfig = {}) {
    this.config = {
      headless: config.headless ?? true,
      viewport: config.viewport ?? { width: 1280, height: 720 },
      proxy: config.proxy,
      userAgent: config.userAgent,
      locale: config.locale,
      timezoneId: config.timezoneId,
      ignoreHTTPSErrors: config.ignoreHTTPSErrors ?? false,
      executablePath: config.executablePath,
      browserType: config.browserType ?? 'chromium',
      args: config.args ?? [],
    };
  }

  async launch(): Promise<void> {
    if (this.browser) return;
    try {
      const playwright = await import('playwright');
      const bt = this.config.browserType ?? 'chromium';
      const browserType = playwright[bt] as BrowserType;
      this.browser = await browserType.launch({
        headless: this.config.headless,
        proxy: this.config.proxy,
        args: this.config.args,
        executablePath: this.config.executablePath,
        timeout: 30000,
      });
    } catch (err) {
      throw new Error(
        `Failed to launch browser: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async createSession(): Promise<ActiveSession> {
    if (!this.browser) await this.launch();
    const br = this.browser;
    if (!br) throw new Error('Browser failed to launch');
    const context = await br.newContext({
      viewport: this.config.viewport,
      userAgent: this.config.userAgent,
      locale: this.config.locale,
      timezoneId: this.config.timezoneId,
      ignoreHTTPSErrors: this.config.ignoreHTTPSErrors,
    });
    const page = await context.newPage();
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const session = this.buildSession(id, context, page);
    this.activeSessions.set(id, session);
    return session;
  }

  getSession(id: string): ActiveSession | undefined {
    return this.activeSessions.get(id);
  }

  listSessions(): ActiveSession[] {
    return Array.from(this.activeSessions.values());
  }

  async closeSession(id: string): Promise<void> {
    const session = this.activeSessions.get(id);
    if (session) {
      try {
        await session.close();
      } catch { /* ignore close errors */ }
      this.activeSessions.delete(id);
    }
  }

  async close(): Promise<void> {
    for (const [id] of this.activeSessions) {
      await this.closeSession(id).catch(() => {});
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }

  private buildSession(id: string, context: BrowserContext, page: Page): ActiveSession {
    const session: ActiveSession = {
      id,
      context,
      page,
      createdAt: Date.now(),

      navigate: async (url, waitUntil, timeout) => {
        await page.goto(url, { waitUntil: waitUntil ?? 'networkidle', timeout });
      },

      click: async (selector, timeout, force) => {
        await page.click(selector, { timeout, force });
      },

      type: async (selector, text, delay) => {
        await page.type(selector, text, { delay });
      },

      scroll: async (selector, x, y, direction, amount) => {
        if (selector) {
          await page.evaluate((sel: string) => {
            const el = document.querySelector(sel);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, selector);
        } else if (direction) {
          const dx = direction === 'left' ? -(amount ?? 300) : direction === 'right' ? (amount ?? 300) : 0;
          const dy = direction === 'up' ? -(amount ?? 300) : direction === 'down' ? (amount ?? 300) : 0;
          await page.mouse.wheel(dx, dy);
        } else {
          await page.evaluate(({ ox, oy }: { ox?: number; oy?: number }) => window.scrollTo(ox ?? 0, oy ?? 0), { ox: x ?? 0, oy: y ?? 0 });
        }
      },

      wait: async (selector, state, timeout) => {
        await page.waitForSelector(selector, { state: state ?? 'visible', timeout: timeout ?? 5000 });
      },

      waitForDuration: async (ms: number) => {
        await page.waitForTimeout(ms);
      },

      extract: async (selector, property, attribute) => {
        if (property === 'html') {
          return page.evaluate((sel: string) => {
            const el = document.querySelector(sel);
            return el ? el.innerHTML : null;
          }, selector);
        }
        if (property === 'attribute' && attribute) {
          return page.evaluate(
            ({ sel, attr }: { sel: string; attr: string }) => {
              const el = document.querySelector(sel);
              return el ? el.getAttribute(attr) : null;
            },
            { sel: selector, attr: attribute },
          );
        }
        if (property === 'value') {
          return page.evaluate((sel: string) => {
            const el = document.querySelector(sel) as HTMLInputElement | null;
            return el ? el.value : null;
          }, selector);
        }
        return page.textContent(selector) ?? '';
      },

      screenshot: async () => {
        const buffer = await page.screenshot({ type: 'png' });
        return `data:image/png;base64,${buffer.toString('base64')}`;
      },

      assert: async (assertion, expected, selector, timeout) => {
        switch (assertion) {
          case 'url':
            return expected ? page.url().includes(expected) : true;
          case 'title': {
            const title = await page.title();
            return expected ? title.includes(expected) : true;
          }
          case 'text': {
            if (!selector || !expected) return false;
            const text = await page.textContent(selector);
            return text?.includes(expected) ?? false;
          }
          case 'visible': {
            if (!selector) return false;
            const el = await page.waitForSelector(selector, { state: 'visible', timeout: timeout ?? 3000 }).catch(() => null);
            return el !== null;
          }
          case 'exists': {
            if (!selector) return false;
            const el = await page.$(selector);
            return el !== null;
          }
          default:
            return false;
        }
      },

      getState: async () => ({
        url: page.url(),
        title: await page.title(),
        cookies: await context.cookies(),
      }),

      close: async () => {
        await page.close().catch(() => {});
        await context.close().catch(() => {});
      },
    };
    return session;
  }
}
