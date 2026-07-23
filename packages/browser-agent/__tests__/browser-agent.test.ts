import { BrowserAgent, HttpEngine, PlaywrightPEngine, type BrowserEngine } from '../src/browser-agent';
import { SessionRecorder } from '../src/session-recorder';

class MockEngine implements BrowserEngine {
  async navigate(_url: string): Promise<void> { return; }
  async click(_selector: string): Promise<void> { return; }
  async type(_selector: string, _text: string): Promise<void> { return; }
  async extract(_selector: string): Promise<string> { return 'extracted'; }
  async screenshot(): Promise<string> { return 'data:image/png;base64,mock'; }
  async getPageContent(): Promise<string> { return '<html><body>Hello</body></html>'; }
  async executeScript(_code: string): Promise<unknown> { return 'result'; }
}

describe('BrowserAgent', () => {
  it('can be constructed with default HttpEngine', () => {
    const agent = new BrowserAgent();
    expect(agent).toBeInstanceOf(BrowserAgent);
  });

  it('can be constructed with a custom engine', () => {
    const engine = new MockEngine();
    const agent = new BrowserAgent(engine);
    expect(agent).toBeInstanceOf(BrowserAgent);
  });

  it('setEngine replaces the engine', () => {
    const agent = new BrowserAgent(new MockEngine());
    agent.setEngine(new MockEngine());
    expect(agent).toBeInstanceOf(BrowserAgent);
  });

  describe('with mock engine', () => {
    let agent: BrowserAgent;

    beforeEach(() => {
      agent = new BrowserAgent(new MockEngine());
    });

    it('navigate resolves without error', async () => {
      await expect(agent.navigate('https://example.com')).resolves.toBeUndefined();
    });

    it('click resolves without error', async () => {
      await expect(agent.click('#button')).resolves.toBeUndefined();
    });

    it('type resolves without error', async () => {
      await expect(agent.type('#input', 'hello')).resolves.toBeUndefined();
    });

    it('getPageContent returns a string', async () => {
      const content = await agent.getPageContent();
      expect(typeof content).toBe('string');
      expect(content).toBe('<html><body>Hello</body></html>');
    });

    it('extract returns a string', async () => {
      const result = await agent.extract('#selector');
      expect(typeof result).toBe('string');
    });

    it('screenshot returns a string', async () => {
      const result = await agent.screenshot();
      expect(typeof result).toBe('string');
    });

    it('executeScript returns result', async () => {
      const result = await agent.executeScript('return 1 + 1');
      expect(result).toBe('result');
    });
  });

  describe('with HttpEngine', () => {
    it('navigate throws when URL is invalid', async () => {
      const agent = new BrowserAgent(new HttpEngine());
      await expect(agent.navigate('')).rejects.toThrow();
    });

    it('click throws not available error', async () => {
      const agent = new BrowserAgent(new HttpEngine());
      await expect(agent.click('#btn')).rejects.toThrow('not available');
    });

    it('type throws not available error', async () => {
      const agent = new BrowserAgent(new HttpEngine());
      await expect(agent.type('#input', 'text')).rejects.toThrow('not available');
    });

    it('screenshot throws not available error', async () => {
      const agent = new BrowserAgent(new HttpEngine());
      await expect(agent.screenshot()).rejects.toThrow('not available');
    });

    it('getPageContent returns default message when no URL cached', async () => {
      const agent = new BrowserAgent(new HttpEngine());
      const content = await agent.getPageContent();
      expect(content).toContain('HttpEngine');
    });

    it('extract returns empty string for unknown tag', async () => {
      const agent = new BrowserAgent(new HttpEngine());
      const result = await agent.extract('unknownTag');
      expect(result).toBe('');
    });
  });

  describe('PlaywrightPEngine', () => {
    it('can be constructed with options', () => {
      const engine = new PlaywrightPEngine({ headless: true });
      expect(engine).toBeInstanceOf(PlaywrightPEngine);
    });

    it('can be constructed without options', () => {
      const engine = new PlaywrightPEngine();
      expect(engine).toBeInstanceOf(PlaywrightPEngine);
    });

    it('throws when navigating without Playwright installed', async () => {
      const engine = new PlaywrightPEngine();
      await expect(engine.navigate('https://example.com')).rejects.toThrow('not installed');
    });
  });
});

describe('SessionRecorder', () => {
  let recorder: SessionRecorder;

  beforeEach(() => {
    recorder = new SessionRecorder();
  });

  it('can start recording', () => {
    recorder.startRecording();
    expect(recorder.isRecording()).toBe(true);
  });

  it('can stop recording and returns a Session', () => {
    recorder.startRecording();
    const session = recorder.stopRecording();
    expect(session).toHaveProperty('id');
    expect(session).toHaveProperty('startTime');
    expect(session).toHaveProperty('endTime');
    expect(session).toHaveProperty('actions');
    expect(recorder.isRecording()).toBe(false);
  });

  it('recordAction adds to actions while recording', () => {
    recorder.startRecording();
    recorder.recordAction({ type: 'navigate', url: 'https://example.com', timestamp: Date.now() });
    const session = recorder.stopRecording();
    expect(session.actions).toHaveLength(1);
    expect(session.actions[0].action.type).toBe('navigate');
  });

  it('recordAction is ignored when not recording', () => {
    recorder.recordAction({ type: 'click', selector: '#btn', timestamp: Date.now() });
    const session = recorder.getSession();
    expect(session.actions).toHaveLength(0);
  });

  it('exportToScript returns a script string', () => {
    recorder.startRecording();
    recorder.recordAction({ type: 'navigate', url: 'https://example.com', timestamp: Date.now() });
    recorder.recordAction({ type: 'click', selector: '#btn', timestamp: Date.now() + 100 });
    recorder.recordAction({ type: 'type', selector: '#input', text: 'hello', timestamp: Date.now() + 200 });
    const session = recorder.stopRecording();
    const script = recorder.exportToScript(session);
    expect(typeof script).toBe('string');
    expect(script).toContain('browser.navigate');
    expect(script).toContain('browser.click');
    expect(script).toContain('browser.type');
  });

  it('replay returns session actions with updated timestamps', () => {
    recorder.startRecording();
    recorder.recordAction({ type: 'navigate', url: 'https://example.com', timestamp: Date.now() });
    const session = recorder.stopRecording();
    const replayed = recorder.replay(session);
    expect(Array.isArray(replayed)).toBe(true);
    expect(replayed).toHaveLength(1);
    expect(replayed[0].action.type).toBe('navigate');
  });

  it('isRecording returns false initially', () => {
    expect(recorder.isRecording()).toBe(false);
  });

  it('getSession returns current session state', () => {
    recorder.startRecording();
    const session = recorder.getSession();
    expect(session).toHaveProperty('id');
    expect(session).toHaveProperty('actions');
  });

  it('stopRecording without start returns session with defaults', () => {
    const session = recorder.stopRecording();
    expect(session).toHaveProperty('id');
    expect(session.actions).toEqual([]);
  });
});
