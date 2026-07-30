import { SelfChatProtocol, createSelfChatProtocol } from '../src/self-chat-protocol';

describe('SelfChatProtocol', () => {
  it('should create instance', () => {
    const chat = new SelfChatProtocol();
    expect(chat).toBeDefined();
    expect(chat.getStats().totalMessages).toBe(0);
  });

  it('should create via factory', () => {
    const chat = createSelfChatProtocol();
    expect(chat).toBeDefined();
  });

  it('should respond to architecture queries', async () => {
    const chat = new SelfChatProtocol();
    const response = await chat.sendMessage('Tell me about the architecture');
    expect(response.message.content).toContain('Clean Architecture');
    expect(response.confidence).toBeGreaterThan(0.5);
    expect(response.message.role).toBe('assistant');
  });

  it('should respond to capabilities queries', async () => {
    const chat = new SelfChatProtocol();
    const response = await chat.sendMessage('What capabilities do you have?');
    expect(response.message.content).toContain('capabilities');
    expect(response.confidence).toBeGreaterThan(0.5);
  });

  it('should respond to contract queries', async () => {
    const chat = new SelfChatProtocol();
    const response = await chat.sendMessage('Tell me about contracts C16 to C23');
    expect(response.message.content).toContain('C16');
    expect(response.message.content).toContain('C23');
    expect(response.confidence).toBeGreaterThan(0.5);
  });

  it('should respond to ADR queries', async () => {
    const chat = new SelfChatProtocol();
    const response = await chat.sendMessage('List recent ADRs');
    expect(response.confidence).toBeGreaterThan(0.5);
  });

  it('should respond to radar queries', async () => {
    const chat = new SelfChatProtocol();
    const response = await chat.sendMessage('What technologies are trending?');
    expect(response.message.content).toContain('radar');
    expect(response.confidence).toBeGreaterThan(0.5);
  });

  it('should respond to SLO queries', async () => {
    const chat = new SelfChatProtocol();
    const response = await chat.sendMessage('How is SLO performance?');
    expect(response.message.content).toContain('SLO');
    expect(response.confidence).toBeGreaterThan(0.5);
  });

  it('should respond to health queries', async () => {
    const chat = new SelfChatProtocol();
    const response = await chat.sendMessage('System health status');
    expect(response.message.content).toContain('Health');
    expect(response.confidence).toBeGreaterThan(0.5);
  });

  it('should respond to schema queries', async () => {
    const chat = new SelfChatProtocol();
    const response = await chat.sendMessage('Show me schemas');
    expect(response.message.content).toContain('Schema');
    expect(response.confidence).toBeGreaterThan(0.5);
  });

  it('should respond to feedback queries', async () => {
    const chat = new SelfChatProtocol();
    const response = await chat.sendMessage('Any feedback or improvements?');
    expect(response.confidence).toBeGreaterThan(0.5);
  });

  it('should respond to isolation queries', async () => {
    const chat = new SelfChatProtocol();
    const response = await chat.sendMessage('How does scope isolation work?');
    expect(response.message.content).toContain('Isolation');
    expect(response.confidence).toBeGreaterThan(0.5);
  });

  it('should respond to gaps queries', async () => {
    const chat = new SelfChatProtocol();
    const response = await chat.sendMessage('What gaps are still open?');
    expect(response.message.content).toContain('gaps');
    expect(response.confidence).toBeGreaterThan(0.5);
  });

  it('should respond to unknown queries', async () => {
    const chat = new SelfChatProtocol();
    const response = await chat.sendMessage('xyzzy');
    expect(response.message.content).toContain('help');
    expect(response.confidence).toBeGreaterThan(0.5);
  });

  it('should track history', async () => {
    const chat = new SelfChatProtocol();
    await chat.sendMessage('architecture');
    await chat.sendMessage('capabilities');
    expect(chat.getHistory()).toHaveLength(4);
    expect(chat.getStats().totalMessages).toBe(4);
  });

  it('should clear history', async () => {
    const chat = new SelfChatProtocol();
    await chat.sendMessage('hello');
    chat.clearHistory();
    expect(chat.getHistory()).toHaveLength(0);
  });

  it('should support configuration', () => {
    const chat = new SelfChatProtocol({ maxHistorySize: 10, enableEventBus: false });
    expect(chat.getConfig().maxHistorySize).toBe(10);
    expect(chat.getConfig().enableEventBus).toBe(false);
    chat.setConfig({ maxHistorySize: 20 });
    expect(chat.getConfig().maxHistorySize).toBe(20);
  });

  it('should track topic coverage in stats', async () => {
    const chat = new SelfChatProtocol();
    await chat.sendMessage('Tell me about architecture');
    await chat.sendMessage('Show me contracts');
    const stats = chat.getStats();
    expect(stats.topicsCovered).toContain('architecture');
    expect(stats.topicsCovered).toContain('contracts');
  });

  it('should respond to packages queries', async () => {
    const chat = new SelfChatProtocol();
    const response = await chat.sendMessage('List packages for contracts');
    expect(response.message.content).toContain('schema-registry');
  });
});
