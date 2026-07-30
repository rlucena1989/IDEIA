import { DefaultRpcProtocol } from './rpc';
import { RpcMessage } from './types';

describe('DefaultRpcProtocol', () => {
  let protocol: DefaultRpcProtocol;

  beforeEach(() => {
    protocol = new DefaultRpcProtocol();
  });

  it('should resolve sendRequest when response is received', async () => {
    const transport = protocol.getTransport();
    const sentMessage = new Promise<RpcMessage>(resolve => {
      const sub = transport.onMessage(msg => {
        if (msg.type === 'request') {
          resolve(msg);
          sub.dispose();
        }
      });
    });

    const resultPromise = protocol.sendRequest('test.method', ['arg1']);
    const sent = await sentMessage;
    transport.receiveMessage({ id: sent.id, type: 'response', result: 'ok' });
    await expect(resultPromise).resolves.toBe('ok');
  });

  it('should reject sendRequest on timeout', async () => {
    jest.useFakeTimers();
    const promise = protocol.sendRequest('timeout.method', []);
    jest.advanceTimersByTime(30000);
    await expect(promise).rejects.toThrow('RPC timeout: timeout.method');
    jest.useRealTimers();
  });

  it('should dispatch incoming requests to registered handlers', async () => {
    const handler = jest.fn().mockResolvedValue('handled');
    protocol.onRequest('ping', handler);

    const transport = protocol.getTransport();
    const response = await new Promise<RpcMessage>(resolve => {
      const sub = transport.onMessage(msg => {
        if (msg.type === 'response' && msg.id === 'req-1') {
          resolve(msg);
          sub.dispose();
        }
      });
      transport.receiveMessage({ id: 'req-1', type: 'request', method: 'ping', params: ['data'] });
    });

    expect(handler).toHaveBeenCalledWith(['data']);
    expect(response.result).toBe('handled');
  });

  it('should send error response when handler throws', async () => {
    protocol.onRequest('fail', async () => { throw new Error('oops'); });

    const transport = protocol.getTransport();
    const response = await new Promise<RpcMessage>(resolve => {
      const sub = transport.onMessage(msg => {
        if (msg.type === 'response' && msg.id === 'req-2') {
          resolve(msg);
          sub.dispose();
        }
      });
      transport.receiveMessage({ id: 'req-2', type: 'request', method: 'fail', params: [] });
    });

    expect(response.error?.message).toBe('oops');
    expect(response.error?.code).toBe(-1);
  });

  it('should send notifications without expecting response', () => {
    const transport = protocol.getTransport();
    const messages: RpcMessage[] = [];
    const sub = transport.onMessage(msg => { messages.push(msg); });

    protocol.sendNotification('event.occurred', ['x']);
    sub.dispose();
    expect(messages.length).toBe(1);
    expect(messages[0].type).toBe('event');
    expect(messages[0].method).toBe('event.occurred');
  });
});
