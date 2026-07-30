import { IntegrationOrchestrator } from '../integration-orch'

describe('IntegrationOrchestrator', () => {
  let orch: IntegrationOrchestrator
  beforeEach(() => { orch = new IntegrationOrchestrator() })

  it('should register systems', () => {
    orch.registerSystem({ id: 'github', name: 'GitHub API', type: 'api', protocol: 'https', endpoint: 'https://api.github.com' })
    const health = orch.checkHealth('github')
    expect(health.connected).toBe(true)
  })

  it('should register adapters and flows', () => {
    orch.registerAdapter({ id: 'a1', systemId: 'github', direction: 'outbound', transform: 'json', status: 'active' })
    orch.registerFlow({ id: 'f1', name: 'Sync Issues', source: 'github', target: 'jira', steps: [{ id: 's1', action: 'fetch', adapter: 'a1', timeout: 5000, retries: 3 }] })
    expect(() => orch.executeFlow('f1')).not.toThrow()
  })

  it('should execute flow steps', async () => {
    orch.registerAdapter({ id: 'a1', systemId: 'sys1', direction: 'outbound', transform: 'json', status: 'active' })
    orch.registerFlow({ id: 'f1', name: 'test', source: 's1', target: 's2', steps: [{ id: 's1', action: 'transform', adapter: 'a1', timeout: 1000, retries: 2 }] })
    const result = await orch.executeFlow('f1')
    expect(result).toBe(true)
  })
})
