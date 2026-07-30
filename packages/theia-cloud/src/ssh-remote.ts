import { createLogger } from '@ideia/logger';
import type { Logger } from '@ideia/logger';
import type {
  RemoteConnection,
  SSHConfig,
  SSHResult,
  PortForward,
  TransferResult,
} from './types-remote';

export class SSHRemote {
  private connections: Map<string, RemoteConnection> = new Map();
  private forwards: Map<string, PortForward> = new Map();
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? createLogger('theia-cloud:ssh-remote');
  }

  openConnection(config: SSHConfig): RemoteConnection {
    const id = `ssh-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const connection: RemoteConnection = {
      id,
      status: 'connected',
      host: config.host,
      port: config.port,
      protocol: 'tcp',
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    this.connections.set(id, connection);
    this.logger.info('SSH connection opened', { connectionId: id, host: config.host, port: config.port, username: config.username });
    return connection;
  }

  async executeCommand(connectionId: string, command: string): Promise<SSHResult> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return { success: false, stdout: '', stderr: 'Connection not found', exitCode: 1, duration: 0 };
    }
    connection.lastActivity = Date.now();
    const startTime = Date.now();
    this.logger.info('SSH command executed', { connectionId, command });
    const duration = Date.now() - startTime;
    return {
      success: true,
      stdout: `[${connection.host}] $ ${command}\n`,
      stderr: '',
      exitCode: 0,
      duration,
    };
  }

  async forwardPort(connectionId: string, localPort: number, remotePort: number): Promise<PortForward> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`SSH connection ${connectionId} not found`);
    }
    connection.lastActivity = Date.now();
    const forward: PortForward = {
      id: `pf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      localPort,
      remotePort,
      protocol: 'tcp',
      status: 'active',
    };
    this.forwards.set(forward.id, forward);
    this.logger.info('Port forward created', { connectionId, forwardId: forward.id, localPort, remotePort });
    return forward;
  }

  closeForward(forwardId: string): boolean {
    const forward = this.forwards.get(forwardId);
    if (!forward) {
      return false;
    }
    forward.status = 'stopped';
    this.forwards.delete(forwardId);
    this.logger.info('Port forward closed', { forwardId });
    return true;
  }

  async transferFile(connectionId: string, src: string, dest: string): Promise<TransferResult> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return { success: false, path: src, bytesTransferred: 0, duration: 0, error: 'Connection not found' };
    }
    connection.lastActivity = Date.now();
    const startTime = Date.now();
    this.logger.info('File transfer initiated', { connectionId, source: src, destination: dest });
    const duration = Date.now() - startTime;
    return {
      success: true,
      path: dest,
      bytesTransferred: 0,
      duration,
    };
  }

  closeConnection(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }
    for (const [fid, forward] of this.forwards) {
      if (forward.localPort === connection.port || forward.remotePort === connection.port) {
        forward.status = 'stopped';
        this.forwards.delete(fid);
      }
    }
    connection.status = 'disconnected';
    connection.lastActivity = Date.now();
    this.connections.delete(connectionId);
    this.logger.info('SSH connection closed', { connectionId, host: connection.host });
    return true;
  }

  listConnections(): RemoteConnection[] {
    return Array.from(this.connections.values());
  }
}
