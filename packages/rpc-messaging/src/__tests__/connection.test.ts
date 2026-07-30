import { DefaultRpcChannel, DefaultRpcConnection } from '../channel';
import { RpcMessage } from '../types';

describe('DefaultRpcConnection', () => {
  let channel: DefaultRpcChannel;
  let connection: DefaultRpcConnection;
  let sentMsgs: RpcMessage[];

  beforeEach(() => {
    channel = new DefaultRpcChannel('test-chan');
    sentMsgs = [];
    channel.onMessage(msg => sentMsgs.push(msg));
    connection = new DefaultRpcConnection(channel);
  });

  it('should send a request and resolve with the response', async () => {
    const responsePromise = connection.sendRequest('ping', ['hello']);
    const sentMsg = sentMsgs.find(m => m.type === 'request');
    expect(sentMsg).toBeDefined();
    expect(sentMsg!.method).toBe('ping');
    expect(sentMsg!.params).toEqual(['hello']);
    expect(sentMsg!.id).toMatch(/^req-/);
    channel.receive({ id: sentMsg!.id, type: 'response', result: 'pong' });
    await expect(responsePromise).resolves.toBe('pong');
  });

  it('should send a notification', () => {
    connection.sendNotification('notify', [1, 2, 3]);
    const msg = sentMsgs.find(m => m.type === 'notification')!;
    expect(msg).toBeDefined();
    expect(msg.method).toBe('notify');
    expect(msg.params).toEqual([1, 2, 3]);
  });

  it('should fire onRequest when receiving a request', () => {
    const requestHandler = jest.fn();
    connection.onRequest(requestHandler);
    channel.receive({ id: 'req-1', type: 'request', method: 'doSomething', params: ['arg1'] });
    expect(requestHandler).toHaveBeenCalledWith({ method: 'doSomething', params: ['arg1'] });
  });

  it('should reject pending requests on close', async () => {
    const promise = connection.sendRequest('pending', []);
    connection.close();
    await expect(promise).rejects.toThrow('Connection closed');
  });

  it('should reject request on timeout', async () => {
    jest.useFakeTimers();
    const promise = connection.sendRequest('slow', []);
    jest.advanceTimersByTime(30000);
    await expect(promise).rejects.toThrow('Request timeout: slow');
    jest.useRealTimers();
  });

  it('should reject request on error response', async () => {
    const promise = connection.sendRequest('failing', []);
    const sent = sentMsgs.find(m => m.type === 'request')!;
    channel.receive({ id: sent.id, type: 'response', error: { code: -1, message: 'Method not found' } });
    await expect(promise).rejects.toThrow('Method not found');
  });

  it('should close the underlying channel on close', () => {
    connection.close();
    expect(channel.isOpen()).toBe(false);
  });

  it('should handle empty params in request', () => {
    const handler = jest.fn();
    connection.onRequest(handler);
    channel.receive({ id: 'req-1', type: 'request', method: 'empty' });
    expect(handler).toHaveBeenCalledWith({ method: 'empty', params: [] });
  });
});
