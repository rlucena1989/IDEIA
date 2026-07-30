import { RemoteIDEManager } from '../remote-ide'

describe('RemoteIDEManager', () => {
  let mgr: RemoteIDEManager
  beforeEach(() => { mgr = new RemoteIDEManager() })

  it('should create session', () => {
    const s = mgr.createSession('user1', { image: 'node:20', ports: {}, volumes: [], features: [] })
    expect(s.userId).toBe('user1')
    expect(s.active).toBe(true)
  })

  it('should create connection', () => {
    const c = mgr.createConnection('ssh', 'dev.server.com')
    expect(c.type).toBe('ssh')
    expect(c.status).toBe('connected')
  })

  it('should create tunnel', () => {
    const t = mgr.createTunnel(3000, 'db.internal', 5432)
    expect(t.localPort).toBe(3000)
    expect(t.remotePort).toBe(5432)
  })

  it('should end session', () => {
    const s = mgr.createSession('u1', { image: 'python:3.12', ports: {}, volumes: [], features: [] })
    mgr.endSession(s.id)
    expect(mgr.getActiveSessions().length).toBe(0)
  })

  it('should enforce max sessions', () => {
    const strict = new RemoteIDEManager({ maxSessions: 1 })
    strict.createSession('u1', { image: 'node:20', ports: {}, volumes: [], features: [] })
    expect(() => strict.createSession('u2', { image: 'node:20', ports: {}, volumes: [], features: [] })).toThrow('Max sessions')
  })
})
