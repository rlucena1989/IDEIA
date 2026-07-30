import { ComputerUseEngine } from '../engine';
import type { BrowserAction, RecordingSession, ReplayOptions, ComputerUseStats } from '../types';

// ==========================================================================
// ComputerUseEngine Tests
// ==========================================================================

describe('ComputerUseEngine', () => {
  let engine: ComputerUseEngine;

  beforeEach(() => {
    engine = new ComputerUseEngine({ headless: true });
  });

  afterEach(async () => {
    await engine.closeAll();
  });

  test('should launch a browser session', async () => {
    const sessionId = await engine.launch();
    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe('string');
    const session = engine.getSession(sessionId);
    expect(session).toBeDefined();
    expect(session!.status).toBe('ready');
    expect(engine.getActiveSessionId()).toBe(sessionId);
  });

  test('should navigate to a URL', async () => {
    await engine.launch();
    const result = await engine.navigate('https://example.com');
    expect(result.success).toBe(true);
    expect(result.action.type).toBe('navigate');
    expect(result.action.url).toContain('example.com');
  });

  test('should click an element by selector', async () => {
    await engine.launch();
    const result = await engine.click('#submit-button');
    expect(result.success).toBe(true);
    expect(result.action.type).toBe('click');
    expect(result.action.selector).toBe('#submit-button');
  });

  test('should fill an input field', async () => {
    await engine.launch();
    const result = await engine.fill('#email', 'test@example.com');
    expect(result.success).toBe(true);
    expect(result.action.type).toBe('fill');
    expect(result.action.value).toBe('test@example.com');
  });

  test('should extract text from element', async () => {
    await engine.launch();
    const result = await engine.extractText('.content');
    expect(result.success).toBe(true);
    expect(result.action.type).toBe('extract');
  });

  test('should throw error when not launched', async () => {
    // We need to expect the navigate to throw since ensurePage checks for active session
    // But our implementation throws from ensurePage. Let's check the error message differently.
    await expect(engine.navigate('https://example.com')).rejects.toThrow('Browser not launched');
  });

  test('should start and stop recording', async () => {
    await engine.launch();
    const recId = engine.startRecording();
    expect(recId).toBeDefined();
    await engine.navigate('https://example.com');
    await engine.click('#btn');
    const recording = engine.stopRecording();
    expect(recording).not.toBeNull();
    expect(recording!.actions.length).toBeGreaterThan(0);
  });

  test('should get usage statistics', async () => {
    await engine.launch();
    await engine.navigate('https://example.com');
    await engine.click('#btn');
    const stats: ComputerUseStats = engine.getStats();
    expect(stats.totalSessions).toBe(1);
    expect(stats.totalActions).toBeGreaterThanOrEqual(2);
  });

  test('should handle multiple sessions', async () => {
    await engine.launch();
    const id1 = engine.getActiveSessionId();
    await engine.close();
    await engine.launch();
    const id2 = engine.getActiveSessionId();
    expect(id1).not.toBe(id2);
  });

  test('should export recording as json', async () => {
    await engine.launch();
    const recId = engine.startRecording();
    await engine.navigate('https://example.com');
    engine.stopRecording();
    const json = await engine.exportRecording(recId, 'json');
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(recId);
  });
});

describe('RecordingEngine (via ComputerUseEngine)', () => {
  let engine: ComputerUseEngine;

  beforeEach(async () => {
    engine = new ComputerUseEngine({ headless: true });
    await engine.launch();
  });

  afterEach(async () => {
    await engine.closeAll();
  });

  test('should manage multiple recordings', () => {
    const id1 = engine.startRecording();
    const id2 = engine.startRecording();
    expect(id1).not.toBe(id2);
    expect(engine.listRecordings().length).toBe(2);
  });

  test('should export recording as script', async () => {
    const id = engine.startRecording();
    engine.recordAction({ id: '1', type: 'navigate', timestamp: new Date().toISOString(), url: 'https://example.com', duration: 100, metadata: {} });
    engine.recordAction({ id: '2', type: 'click', timestamp: new Date().toISOString(), selector: '#btn', duration: 50, metadata: {} });
    engine.stopRecording();
    const script = await engine.exportRecording(id, 'script');
    expect(script).toContain('async function replay');
    expect(script).toContain('page.goto');
    expect(script).toContain('page.click');
  });

  test('should handle replay state transitions', () => {
    expect(engine.getReplayState()).toBe('stopped');
    // Just test state management
    engine.startRecording();
    expect(engine.getReplayState()).toBe('stopped');
  });
});
