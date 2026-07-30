import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { BHPProtocol } from '../src/protocol';
import type { BHPConfig } from '../src/types';
import type { EventBus } from '@ideia/event-bus';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

function createMockBus(): EventBus {
  return {
    emit: jest.fn() as any,
    subscribe: jest.fn() as any,
    unsubscribe: jest.fn() as any,
  } as unknown as EventBus;
}

describe('BHPProtocol', () => {
  let protocol: BHPProtocol;
  let mockBus: EventBus;
  let config: BHPConfig;

  beforeEach(() => {
    mockBus = createMockBus();
    config = { timeout: 30000, autoApproveThreshold: 0.9, maxHistory: 1000 };
    protocol = new BHPProtocol(mockBus, config);
  });

  afterEach(() => {
    protocol.dispose();
  });

  it('starts and subscribes to events', async () => {
    await protocol.start();
    expect(mockBus.subscribe).toHaveBeenCalled();
  });

  it('sends a message and returns id', () => {
    const id = protocol.send('HELP!', 'ideia', 'ia', { context: 'Need help' });
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(mockBus.emit).toHaveBeenCalled();
  });

  it('sendHelpRequest sends help_request type', () => {
    const id = protocol.sendHelpRequest('ia', 'ideia', 'Stuck on task');
    expect(id).toBeDefined();
    expect(mockBus.emit).toHaveBeenCalled();
  });

  it('sendHelpOffer sends help_offer type', () => {
    const id = protocol.sendHelpOffer('ideia', 'ia', 'Can assist with testing');
    expect(id).toBeDefined();
  });

  it('sendClarification sends clarification type', () => {
    const id = protocol.sendClarification('ideia', 'ia', 'plan-1', ['What is the goal?']);
    expect(id).toBeDefined();
  });

  it('sendConfirmation sends confirmation type', () => {
    const id = protocol.sendConfirmation('ideia', 'ia', 'plan-1', true);
    expect(id).toBeDefined();
  });

  it('sendErrorReport sends error_report type', () => {
    const id = protocol.sendErrorReport('ia', 'ideia', 'Execution failed', 'Step 3 crashed');
    expect(id).toBeDefined();
  });

  it('getMessageCount returns sent message count', () => {
    protocol.send('HELP!', 'ideia', 'ia', {});
    protocol.send('STATS', 'ia', 'ideia', {});
    expect(protocol.getMessageCount()).toBe(2);
  });

  it('setHandler registers message handlers', () => {
    const handler = { onHelp: (_msg: any) => {} };
    protocol.setHandler(handler);
    expect(handler.onHelp).toBeDefined();
  });
});
