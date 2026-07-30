import { DefaultLspClientManager } from '../lsp-client';
import { LspConnectionOptions } from '../types';

const defaultOptions: LspConnectionOptions = {
  command: 'typescript-language-server',
  args: ['--stdio'],
  languageIds: ['typescript'],
  workspaceUri: '/workspace',
  transport: 'stdio',
};

describe('DefaultLspClientManager', () => {
  let manager: DefaultLspClientManager;

  beforeEach(() => {
    manager = new DefaultLspClientManager();
  });

  describe('connect', () => {
    it('should create and return an LSP client', async () => {
      const client = await manager.connect('ts-server', defaultOptions);
      expect(client.serverId).toBe('ts-server');
      expect(client.connected).toBe(true);
    });

    it('should reuse an existing connected client', async () => {
      const client1 = await manager.connect('ts-server', defaultOptions);
      const client2 = await manager.connect('ts-server', {
        ...defaultOptions,
        command: 'different-command',
      });
      expect(client1).toBe(client2);
    });

    it('should create a new client after disconnect', async () => {
      const client1 = await manager.connect('ts-server', defaultOptions);
      await manager.disconnect('ts-server');
      const client2 = await manager.connect('ts-server', defaultOptions);
      expect(client1).not.toBe(client2);
    });
  });

  describe('disconnect', () => {
    it('should disconnect an existing client', async () => {
      const client = await manager.connect('ts-server', defaultOptions);
      expect(client.connected).toBe(true);
      await manager.disconnect('ts-server');
      expect(client.connected).toBe(false);
    });

    it('should remove the client from the manager', async () => {
      await manager.connect('ts-server', defaultOptions);
      await manager.disconnect('ts-server');
      expect(manager.getClient('ts-server')).toBeUndefined();
    });

    it('should not throw when disconnecting a non-existent client', async () => {
      await expect(manager.disconnect('non-existent')).resolves.not.toThrow();
    });
  });

  describe('getClient', () => {
    it('should return undefined for unregistered server', () => {
      expect(manager.getClient('unknown')).toBeUndefined();
    });

    it('should return the client after connect', async () => {
      const client = await manager.connect('ts-server', defaultOptions);
      expect(manager.getClient('ts-server')).toBe(client);
    });

    it('should return undefined after disconnect', async () => {
      await manager.connect('ts-server', defaultOptions);
      await manager.disconnect('ts-server');
      expect(manager.getClient('ts-server')).toBeUndefined();
    });
  });

  describe('restart', () => {
    it('should disconnect and reconnect the client', async () => {
      const client = await manager.connect('ts-server', defaultOptions);
      expect(client.connected).toBe(true);
      await manager.restart('ts-server');
      expect(client.connected).toBe(false);
    });
  });

  describe('LspClient operations', () => {
    it('should reject request when not connected', async () => {
      const client = await manager.connect('ts-server', defaultOptions);
      await manager.disconnect('ts-server');
      await expect(client.request('textDocument/completion', {})).rejects.toThrow('Not connected');
    });

    it('should return empty response for request', async () => {
      const client = await manager.connect('ts-server', defaultOptions);
      const result = await client.request('textDocument/completion', {});
      expect(result).toEqual({});
    });

    it('should fire notification events', () => {
      const listener = jest.fn();
      manager.connect('ts-server', defaultOptions).then(client => {
        client.onNotification(listener);
        client.notify('textDocument/didChange', { textDocument: {} });
        expect(listener).toHaveBeenCalledWith({
          method: 'textDocument/didChange',
          params: { textDocument: {} },
        });
      });
    });

    it('should not fire events after dispose', async () => {
      const listener = jest.fn();
      const client = await manager.connect('ts-server', defaultOptions);
      client.onNotification(listener);
      client.dispose();
      client.notify('textDocument/didChange', {});
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle multiple clients independently', async () => {
      const client1 = await manager.connect('server-1', defaultOptions);
      const client2 = await manager.connect('server-2', {
        ...defaultOptions,
        languageIds: ['javascript'],
      });
      expect(client1.serverId).toBe('server-1');
      expect(client2.serverId).toBe('server-2');
      expect(client1).not.toBe(client2);
    });
  });
});
