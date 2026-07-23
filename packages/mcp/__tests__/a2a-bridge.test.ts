import { createA2ABridge, A2ABridge } from '../src/a2a-bridge';

describe('A2ABridge', () => {
  let bridge: A2ABridge;

  beforeEach(() => { bridge = createA2ABridge(); });

  it('starts with no agents', () => {
    expect(bridge.getRegisteredAgents()).toHaveLength(0);
  });

  it('starts with empty history', () => {
    expect(bridge.getHistory()).toHaveLength(0);
  });

  it('registers an agent', () => {
    bridge.registerAgent('agent1', () => {});
    expect(bridge.getRegisteredAgents()).toContain('agent1');
  });

  it('unregisters an agent', () => {
    bridge.registerAgent('agent1', () => {});
    expect(bridge.unregisterAgent('agent1')).toBe(true);
    expect(bridge.getRegisteredAgents()).toHaveLength(0);
  });

  it('unregister returns false for unknown agent', () => {
    expect(bridge.unregisterAgent('unknown')).toBe(false);
  });

  it('sendMessage adds to history', async () => {
    bridge.registerAgent('agent1', () => {});
    await bridge.sendMessage('agent1', { from: 'test', to: 'agent1', type: 'request', skill: 'echo', payload: {} });
    expect(bridge.getHistory()).toHaveLength(1);
  });

  it('broadcast sends to all agents', async () => {
    bridge.registerAgent('a1', () => {});
    bridge.registerAgent('a2', () => {});
    const results = await bridge.broadcast({ from: 'test', type: 'request', skill: 'ping', payload: {} });
    expect(results).toHaveLength(2);
  });

  it('clearHistory empties message history', async () => {
    bridge.registerAgent('agent1', () => {});
    await bridge.sendMessage('agent1', { from: 'test', to: 'agent1', type: 'request', skill: 'echo', payload: {} });
    bridge.clearHistory();
    expect(bridge.getHistory()).toHaveLength(0);
  });

  it('onMessage callback works', () => {
    const messages: any[] = [];
    bridge.onMessage((msg) => { messages.push(msg); });
    bridge.registerAgent('agent1', () => {});
    bridge.sendMessage('agent1', { from: 'test', to: 'agent1', type: 'request', skill: 'echo', payload: {} });
    expect(messages.length).toBe(1);
  });

  it('onMessage returns unsubscribe function', () => {
    const messages: any[] = [];
    const unsubscribe = bridge.onMessage((msg) => { messages.push(msg); });
    unsubscribe();
    bridge.registerAgent('agent1', () => {});
    bridge.sendMessage('agent1', { from: 'test', to: 'agent1', type: 'request', skill: 'echo', payload: {} });
    expect(messages.length).toBe(0);
  });
});
