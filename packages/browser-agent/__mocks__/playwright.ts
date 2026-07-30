const mockPage = {
  goto: jest.fn().mockResolvedValue(null),
  click: jest.fn().mockResolvedValue(undefined),
  fill: jest.fn().mockResolvedValue(undefined),
  type: jest.fn().mockResolvedValue(undefined),
  textContent: jest.fn().mockResolvedValue('Hello World'),
  content: jest.fn().mockResolvedValue('<html></html>'),
  screenshot: jest.fn().mockResolvedValue(Buffer.from('mock-image')),
  evaluate: jest.fn().mockImplementation(<T>(fn: string | (() => T), ..._args: unknown[]) => {
    if (typeof fn === 'function') return Promise.resolve(fn());
    return Promise.resolve(undefined) as Promise<T>;
  }),
  evaluateHandle: jest.fn().mockResolvedValue({}),
  close: jest.fn().mockResolvedValue(undefined),
  title: jest.fn().mockResolvedValue('Test Page'),
  url: jest.fn().mockReturnValue('https://example.com'),
  isClosed: jest.fn().mockReturnValue(false),
  waitForSelector: jest.fn().mockResolvedValue({
    click: jest.fn(),
    fill: jest.fn(),
    textContent: jest.fn().mockResolvedValue('Hello'),
    isVisible: jest.fn().mockResolvedValue(true),
    isEnabled: jest.fn().mockResolvedValue(true),
    boundingBox: jest.fn().mockResolvedValue({ x: 0, y: 0, width: 100, height: 50 }),
  }),
  waitForLoadState: jest.fn().mockResolvedValue(undefined),
  waitForTimeout: jest.fn().mockResolvedValue(undefined),
  $: jest.fn().mockResolvedValue({
    click: jest.fn(),
    textContent: jest.fn().mockResolvedValue('Hello'),
    isVisible: jest.fn().mockResolvedValue(true),
  }),
  $$: jest.fn().mockResolvedValue([]),
  keyboard: {} as Record<string, unknown>,
  mouse: {
    click: jest.fn().mockResolvedValue(undefined),
    dblclick: jest.fn().mockResolvedValue(undefined),
    wheel: jest.fn().mockResolvedValue(undefined),
  },
};

const mockContext = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  pages: jest.fn().mockReturnValue([mockPage]),
  close: jest.fn().mockResolvedValue(undefined),
  cookies: jest.fn().mockResolvedValue([]),
  clearCookies: jest.fn().mockResolvedValue(undefined),
};

const mockBrowserObj = {
  newContext: jest.fn().mockResolvedValue(mockContext),
  close: jest.fn().mockResolvedValue(undefined),
  isConnected: jest.fn().mockReturnValue(true),
};

export const chromium = {
  launch: jest.fn().mockResolvedValue(mockBrowserObj),
};

export const firefox = {
  launch: jest.fn().mockResolvedValue(mockBrowserObj),
};

export const webkit = {
  launch: jest.fn().mockResolvedValue(mockBrowserObj),
};

export default { chromium, firefox, webkit };
