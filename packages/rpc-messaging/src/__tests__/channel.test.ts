import { DefaultRpcChannel } from '../channel';
import { RpcMessage } from '../types';

describe('DefaultRpcChannel', () => {
  let channel: DefaultRpcChannel;

  beforeEach(() => {
    channel = new DefaultRpcChannel('test-channel');
  });

  it('should have the given id', () => {
    expect(channel.id).toBe('test-channel');
  });

  it('should be open after creation', () => {
    expect(channel.isOpen()).toBe(true);
  });

  it('should fire onMessage when sending', () => {
    const handler = jest.fn();
    channel.onMessage(handler);
    const msg: RpcMessage = { id: '1', type: 'notification', method: 'test' };
    channel.send(msg);
    expect(handler).toHaveBeenCalledWith(msg);
  });

  it('should fire onMessage when receiving', () => {
    const handler = jest.fn();
    channel.onMessage(handler);
    const msg: RpcMessage = { id: '2', type: 'request', method: 'ping' };
    channel.receive(msg);
    expect(handler).toHaveBeenCalledWith(msg);
  });

  it('should not send messages when closed', () => {
    const handler = jest.fn();
    channel.onMessage(handler);
    channel.close();
    channel.send({ id: '3', type: 'notification', method: 'test' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should not receive messages when closed', () => {
    const handler = jest.fn();
    channel.onMessage(handler);
    channel.close();
    channel.receive({ id: '4', type: 'request', method: 'test' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should be closed after close()', () => {
    channel.close();
    expect(channel.isOpen()).toBe(false);
  });

  it('should support multiple listeners', () => {
    const h1 = jest.fn();
    const h2 = jest.fn();
    channel.onMessage(h1);
    channel.onMessage(h2);
    channel.send({ id: '5', type: 'notification', method: 'test' });
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('should pass the exact RpcMessage to listeners', () => {
    const handler = jest.fn();
    channel.onMessage(handler);
    const msg: RpcMessage = { id: '6', type: 'response', result: { data: 42 }, method: 'compute' };
    channel.send(msg);
    expect(handler.mock.calls[0][0]).toEqual(msg);
  });
});
