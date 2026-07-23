declare module 'playwright' {
  export const chromium: {
    launch(options?: { headless?: boolean }): Promise<{
      newContext(): Promise<{
        newPage(): Promise<{
          goto(url: string, options?: { waitUntil?: string }): Promise<void>;
          click(selector: string): Promise<void>;
          fill(selector: string, text: string): Promise<void>;
          textContent(selector: string): Promise<string | null>;
          content(): Promise<string>;
          screenshot(options?: { type?: string }): Promise<Buffer>;
          evaluate(code: string): Promise<unknown>;
          close(): Promise<void>;
        }>;
      }>;
      close(): Promise<void>;
    }>;
  };
}
