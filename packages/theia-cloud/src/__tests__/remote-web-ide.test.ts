import { RemoteExtensionHost } from '../remote-extension-host';
import { DevContainers } from '../dev-containers';
import { SSHRemote } from '../ssh-remote';
import { TunnelService } from '../tunnel-service';
import { WorkspaceManager } from '../workspace-manager';
import { WebIDESession } from '../web-ide-session';
import type {
  ExtensionHostConfig,
  DevContainerConfig,
  SSHConfig,
  TunnelConfig,
  WorkspaceConfig,
} from '../types-remote';

describe('RemoteExtensionHost', () => {
  let host: RemoteExtensionHost;

  beforeEach(() => {
    host = new RemoteExtensionHost();
  });

  const testConfig: ExtensionHostConfig = {
    host: 'localhost',
    port: 8080,
    protocol: 'tcp',
    token: 'test-token',
    autoReconnect: true,
    maxReconnectAttempts: 5,
    heartbeatInterval: 15000,
  };

  it('connect creates a new connection with connecting status', () => {
    const conn = host.connect(testConfig);
    expect(conn.id).toBeDefined();
    expect(conn.status).toBe('connecting');
    expect(conn.host).toBe('localhost');
    expect(conn.port).toBe(8080);
    expect(conn.protocol).toBe('tcp');
    expect(conn.createdAt).toBeGreaterThan(0);
  });

  it('disconnect returns true for existing connection', () => {
    const conn = host.connect(testConfig);
    const result = host.disconnect(conn.id);
    expect(result).toBe(true);
    expect(host.getStatus(conn.id)).toBe('disconnected');
  });

  it('disconnect returns false for unknown connection', () => {
    const result = host.disconnect('nonexistent');
    expect(result).toBe(false);
  });

  it('reconnect returns true for existing connection', () => {
    const conn = host.connect(testConfig);
    const result = host.reconnect(conn.id);
    expect(result).toBe(true);
  });

  it('reconnect returns false for unknown connection', () => {
    const result = host.reconnect('nonexistent');
    expect(result).toBe(false);
  });

  it('getStatus returns disconnected for unknown connection', () => {
    expect(host.getStatus('unknown')).toBe('disconnected');
  });

  it('getStatus returns connecting for new connection', () => {
    const conn = host.connect(testConfig);
    expect(host.getStatus(conn.id)).toBe('connecting');
  });

  it('listConnections returns all connections', () => {
    host.connect(testConfig);
    host.connect({ ...testConfig, host: 'other-host' });
    expect(host.listConnections().length).toBe(2);
  });
});

describe('DevContainers', () => {
  let dc: DevContainers;

  beforeEach(() => {
    dc = new DevContainers();
  });

  const testConfig: DevContainerConfig = {
    image: 'node:20',
    features: ['git', 'docker'],
    mounts: [{ src: '/local', dest: '/workspace', type: 'bind' }],
    env: { NODE_ENV: 'development' },
    lifecycle: { postCreate: 'npm install', postStart: 'npm run dev', postAttach: '' },
    forwardPorts: [3000, 9229],
  };

  it('buildFromConfig creates container with correct state', async () => {
    const info = await dc.buildFromConfig(testConfig);
    expect(info.id).toBeDefined();
    expect(info.image).toBe('node:20');
    expect(info.status).toBe('created');
    expect(info.ports).toEqual([3000, 9229]);
    expect(info.mounts.length).toBe(1);
  });

  it('start changes status to running', async () => {
    const info = await dc.buildFromConfig(testConfig);
    const result = await dc.start(info.id);
    expect(result).toBe(true);
    const retrieved = dc.getStatus(info.id);
    expect(retrieved!.status).toBe('running');
    expect(retrieved!.startedAt).toBeGreaterThan(0);
  });

  it('start returns false for unknown container', async () => {
    const result = await dc.start('unknown');
    expect(result).toBe(false);
  });

  it('stop changes status to stopped', async () => {
    const info = await dc.buildFromConfig(testConfig);
    await dc.start(info.id);
    const result = await dc.stop(info.id);
    expect(result).toBe(true);
    const retrieved = dc.getStatus(info.id);
    expect(retrieved!.status).toBe('stopped');
  });

  it('getStatus returns undefined for unknown container', () => {
    const result = dc.getStatus('unknown');
    expect(result).toBeUndefined();
  });

  it('list returns all containers', async () => {
    await dc.buildFromConfig(testConfig);
    await dc.buildFromConfig({ ...testConfig, image: 'python:3' });
    expect(dc.list().length).toBe(2);
  });

  it('destroy removes container', async () => {
    const info = await dc.buildFromConfig(testConfig);
    const result = await dc.destroy(info.id);
    expect(result).toBe(true);
    expect(dc.getStatus(info.id)).toBeUndefined();
  });

  it('destroy returns false for unknown container', async () => {
    const result = await dc.destroy('unknown');
    expect(result).toBe(false);
  });
});

describe('SSHRemote', () => {
  let ssh: SSHRemote;

  beforeEach(() => {
    ssh = new SSHRemote();
  });

  const testConfig: SSHConfig = {
    host: '192.168.1.100',
    port: 22,
    username: 'developer',
    authMethod: 'key',
    privateKey: '~/.ssh/id_rsa',
  };

  it('openConnection creates a new connection', () => {
    const conn = ssh.openConnection(testConfig);
    expect(conn.id).toBeDefined();
    expect(conn.status).toBe('connected');
    expect(conn.host).toBe('192.168.1.100');
    expect(conn.port).toBe(22);
  });

  it('executeCommand returns SSH result', async () => {
    const conn = ssh.openConnection(testConfig);
    const result = await ssh.executeCommand(conn.id, 'ls -la');
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('ls -la');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('executeCommand returns error for unknown connection', async () => {
    const result = await ssh.executeCommand('unknown', 'ls');
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it('forwardPort creates port forward', async () => {
    const conn = ssh.openConnection(testConfig);
    const forward = await ssh.forwardPort(conn.id, 3000, 3000);
    expect(forward.id).toBeDefined();
    expect(forward.localPort).toBe(3000);
    expect(forward.remotePort).toBe(3000);
    expect(forward.protocol).toBe('tcp');
    expect(forward.status).toBe('active');
  });

  it('forwardPort throws for unknown connection', async () => {
    await expect(ssh.forwardPort('unknown', 3000, 3000)).rejects.toThrow('not found');
  });

  it('closeForward returns true for existing forward', async () => {
    const conn = ssh.openConnection(testConfig);
    const forward = await ssh.forwardPort(conn.id, 3000, 3000);
    const result = ssh.closeForward(forward.id);
    expect(result).toBe(true);
  });

  it('closeForward returns false for unknown forward', () => {
    const result = ssh.closeForward('unknown');
    expect(result).toBe(false);
  });

  it('transferFile returns transfer result', async () => {
    const conn = ssh.openConnection(testConfig);
    const result = await ssh.transferFile(conn.id, '/local/file.txt', '/remote/file.txt');
    expect(result.success).toBe(true);
    expect(result.path).toBe('/remote/file.txt');
    expect(result.bytesTransferred).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it('transferFile returns error for unknown connection', async () => {
    const result = await ssh.transferFile('unknown', '/local/file.txt', '/remote/file.txt');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Connection not found');
  });

  it('closeConnection returns true for existing connection', () => {
    const conn = ssh.openConnection(testConfig);
    const result = ssh.closeConnection(conn.id);
    expect(result).toBe(true);
    expect(ssh.listConnections().length).toBe(0);
  });

  it('closeConnection returns false for unknown connection', () => {
    const result = ssh.closeConnection('unknown');
    expect(result).toBe(false);
  });

  it('listConnections returns all connections', () => {
    ssh.openConnection(testConfig);
    ssh.openConnection({ ...testConfig, host: '10.0.0.1' });
    expect(ssh.listConnections().length).toBe(2);
  });
});

describe('TunnelService', () => {
  let ts: TunnelService;

  beforeEach(() => {
    ts = new TunnelService();
  });

  const testConfig: TunnelConfig = {
    name: 'dev-tunnel',
    localHost: 'localhost',
    localPort: 3000,
    remoteHost: 'remote-server',
    remotePort: 8080,
    protocol: 'tcp',
    type: 'local-to-remote',
  };

  it('createTunnel creates a tunnel', () => {
    const tunnel = ts.createTunnel(testConfig);
    expect(tunnel.id).toBeDefined();
    expect(tunnel.config.name).toBe('dev-tunnel');
    expect(tunnel.status).toBe('active');
    expect(tunnel.createdAt).toBeGreaterThan(0);
    expect(tunnel.bytesTransferred).toBe(0);
  });

  it('closeTunnel returns true for existing tunnel', () => {
    const tunnel = ts.createTunnel(testConfig);
    const result = ts.closeTunnel(tunnel.id);
    expect(result).toBe(true);
    expect(ts.getTunnelStatus(tunnel.id)).toBe('closed');
  });

  it('closeTunnel returns false for unknown tunnel', () => {
    const result = ts.closeTunnel('unknown');
    expect(result).toBe(false);
  });

  it('listTunnels returns all tunnels', () => {
    ts.createTunnel(testConfig);
    ts.createTunnel({ ...testConfig, name: 'tunnel2' });
    expect(ts.listTunnels().length).toBe(2);
  });

  it('listTunnels filters by status', () => {
    const t1 = ts.createTunnel(testConfig);
    ts.closeTunnel(t1.id);
    const active = ts.listTunnels({ status: 'active' });
    expect(active.length).toBe(0);
    const closed = ts.listTunnels({ status: 'closed' });
    expect(closed.length).toBe(1);
  });

  it('listTunnels filters by type', () => {
    ts.createTunnel(testConfig);
    ts.createTunnel({ ...testConfig, type: 'remote-to-local' });
    const local = ts.listTunnels({ type: 'local-to-remote' });
    expect(local.length).toBe(1);
  });

  it('getTunnel returns tunnel by id', () => {
    const tunnel = ts.createTunnel(testConfig);
    const retrieved = ts.getTunnel(tunnel.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(tunnel.id);
  });

  it('getTunnel returns undefined for unknown id', () => {
    const result = ts.getTunnel('unknown');
    expect(result).toBeUndefined();
  });

  it('getTunnelStatus returns correct status', () => {
    const tunnel = ts.createTunnel(testConfig);
    expect(ts.getTunnelStatus(tunnel.id)).toBe('active');
  });

  it('getTunnelStatus returns undefined for unknown tunnel', () => {
    expect(ts.getTunnelStatus('unknown')).toBeUndefined();
  });
});

describe('WorkspaceManager', () => {
  let wm: WorkspaceManager;

  beforeEach(() => {
    wm = new WorkspaceManager();
  });

  const testConfig: WorkspaceConfig = {
    name: 'dev-workspace',
    image: 'theia:latest',
    ports: [3000, 8080],
    env: { NODE_ENV: 'development' },
    resources: { cpu: 2, memory: 4, storage: 20 },
    timeout: 60000,
    autoHibernate: false,
  };

  it('createWorkspace creates a workspace', () => {
    const ws = wm.createWorkspace(testConfig);
    expect(ws.id).toBeDefined();
    expect(ws.config.name).toBe('dev-workspace');
    expect(ws.config.image).toBe('theia:latest');
    expect(ws.config.resources.cpu).toBe(2);
    expect(ws.createdAt).toBeGreaterThan(0);
    expect(ws.lastActivity).toBeGreaterThan(0);
  });

  it('createWorkspace sets status to ready', () => {
    const ws = wm.createWorkspace(testConfig);
    expect(ws.status).toBe('ready');
  });

  it('listWorkspaces returns all workspaces', () => {
    wm.createWorkspace(testConfig);
    wm.createWorkspace({ ...testConfig, name: 'ws2' });
    expect(wm.listWorkspaces().length).toBe(2);
  });

  it('listWorkspaces filters by status', () => {
    const ws = wm.createWorkspace(testConfig);
    wm.hibernateWorkspace(ws.id);
    const ready = wm.listWorkspaces({ status: 'ready' });
    expect(ready.length).toBe(0);
    const hibernating = wm.listWorkspaces({ status: 'hibernating' });
    expect(hibernating.length).toBe(1);
  });

  it('getWorkspace returns workspace by id', () => {
    const ws = wm.createWorkspace(testConfig);
    const retrieved = wm.getWorkspace(ws.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(ws.id);
  });

  it('getWorkspace returns undefined for unknown id', () => {
    expect(wm.getWorkspace('unknown')).toBeUndefined();
  });

  it('hibernateWorkspace changes status', () => {
    const ws = wm.createWorkspace(testConfig);
    const result = wm.hibernateWorkspace(ws.id);
    expect(result).toBe(true);
    expect(wm.getWorkspace(ws.id)!.status).toBe('hibernating');
  });

  it('hibernateWorkspace returns false for unknown id', () => {
    expect(wm.hibernateWorkspace('unknown')).toBe(false);
  });

  it('wakeWorkspace changes status to active', () => {
    const ws = wm.createWorkspace(testConfig);
    wm.hibernateWorkspace(ws.id);
    const result = wm.wakeWorkspace(ws.id);
    expect(result).toBe(true);
    expect(wm.getWorkspace(ws.id)!.status).toBe('active');
  });

  it('wakeWorkspace returns false for unknown id', () => {
    expect(wm.wakeWorkspace('unknown')).toBe(false);
  });

  it('destroyWorkspace removes workspace', () => {
    const ws = wm.createWorkspace(testConfig);
    const result = wm.destroyWorkspace(ws.id);
    expect(result).toBe(true);
    expect(wm.getWorkspace(ws.id)).toBeUndefined();
  });

  it('destroyWorkspace returns false for unknown id', () => {
    expect(wm.destroyWorkspace('unknown')).toBe(false);
  });

  it('auto-hibernate works with timeout', () => {
    jest.useFakeTimers();
    const wmWithHibernate = new WorkspaceManager(undefined, 100);
    const ws = wmWithHibernate.createWorkspace({
      ...testConfig,
      autoHibernate: true,
      timeout: 100,
    });
    expect(ws.status).toBe('ready');
    jest.advanceTimersByTime(150);
    expect(wmWithHibernate.getWorkspace(ws.id)!.status).toBe('hibernating');
    jest.useRealTimers();
  });
});

describe('WebIDESession', () => {
  let wis: WebIDESession;

  beforeEach(() => {
    wis = new WebIDESession();
  });

  it('createSession creates a session with active status', () => {
    const session = wis.createSession('user1', 'ws1');
    expect(session.id).toBeDefined();
    expect(session.config.userId).toBe('user1');
    expect(session.config.workspaceId).toBe('ws1');
    expect(session.config.token).toBeDefined();
    expect(session.status).toBe('active');
    expect(session.createdAt).toBeGreaterThan(0);
  });

  it('createSession generates token using crypto.randomUUID', () => {
    const session = wis.createSession('user1', 'ws1');
    expect(session.config.token.length).toBeGreaterThan(0);
  });

  it('createSession accepts optional config overrides', () => {
    const session = wis.createSession('user1', 'ws1', { authProvider: 'gitlab' });
    expect(session.config.authProvider).toBe('gitlab');
  });

  it('validateSession returns session for valid token', () => {
    const session = wis.createSession('user1', 'ws1');
    const result = wis.validateSession(session.config.token);
    expect(result).toBeDefined();
    expect(result!.id).toBe(session.id);
  });

  it('validateSession returns undefined for invalid token', () => {
    const result = wis.validateSession('invalid-token');
    expect(result).toBeUndefined();
  });

  it('validateSession returns undefined for expired session', () => {
    jest.useFakeTimers();
    const session = wis.createSession('user1', 'ws1', { expiry: Date.now() + 100 });
    jest.advanceTimersByTime(200);
    const result = wis.validateSession(session.config.token);
    expect(result).toBeUndefined();
    jest.useRealTimers();
  });

  it('revokeSession returns true for existing session', () => {
    const session = wis.createSession('user1', 'ws1');
    const result = wis.revokeSession(session.id);
    expect(result).toBe(true);
  });

  it('revokeSession returns false for unknown session', () => {
    const result = wis.revokeSession('unknown');
    expect(result).toBe(false);
  });

  it('revokeSession removes session from active list', () => {
    const session = wis.createSession('user1', 'ws1');
    wis.revokeSession(session.id);
    expect(wis.listActiveSessions().length).toBe(0);
  });

  it('listActiveSessions returns only active sessions', () => {
    wis.createSession('user1', 'ws1');
    const s2 = wis.createSession('user2', 'ws2');
    wis.revokeSession(s2.id);
    const active = wis.listActiveSessions();
    expect(active.length).toBe(1);
    expect(active[0]!.config.userId).toBe('user1');
  });

  it('getSession returns session by id', () => {
    const session = wis.createSession('user1', 'ws1');
    const retrieved = wis.getSession(session.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(session.id);
  });

  it('getSession returns undefined for unknown id', () => {
    expect(wis.getSession('unknown')).toBeUndefined();
  });
});

describe('Full workflow: workspace -> session -> connect', () => {
  it('creates workspace, session, and SSH connection', () => {
    const wm = new WorkspaceManager();
    const wis = new WebIDESession();
    const ssh = new SSHRemote();

    const ws = wm.createWorkspace({
      name: 'project',
      image: 'ubuntu:22.04',
      ports: [22],
      env: {},
      resources: { cpu: 4, memory: 8, storage: 50 },
      timeout: 3600000,
      autoHibernate: true,
    });

    const session = wis.createSession('dev-user', ws.id, { authProvider: 'github' });

    const conn = ssh.openConnection({
      host: 'remote-dev-server',
      port: 22,
      username: 'dev-user',
      authMethod: 'key',
      privateKey: '~/.ssh/id_ed25519',
    });

    expect(ws.status).toBe('ready');
    expect(session.status).toBe('active');
    expect(conn.status).toBe('connected');
    expect(session.config.workspaceId).toBe(ws.id);
  });
});
