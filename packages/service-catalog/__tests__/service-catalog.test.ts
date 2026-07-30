import { ServiceCatalog } from '../src/catalog';
import { GoldenPathRegistry } from '../src/golden-paths';
import { ServiceScorecard } from '../src/scorecard';
import { SelfServiceRegistry } from '../src/actions';

describe('ServiceCatalog', () => {
  it('registers and retrieves services', () => { const c = new ServiceCatalog(); c.register({ id: 's1', name: 'API Gateway', description: 'REST API', owner: 'platform', language: 'ts', tags: ['api'], repository: 'github.com/ideia/api', status: 'active', score: 85, grade: 'B' }); expect(c.get('s1')?.name).toBe('API Gateway'); });
  it('searches by name', () => { const c = new ServiceCatalog(); c.register({ id: 's1', name: 'API Gateway', description: 'REST', owner: 'p', language: 'ts', tags: [], repository: 'r', status: 'active', score: 85, grade: 'B' }); expect(c.search('gateway')).toHaveLength(1); });
  it('filters by criteria', () => { const c = new ServiceCatalog(); c.register({ id: 's1', name: 'Svc1', description: '', owner: 'team-a', language: 'ts', tags: [], repository: 'r', status: 'active', score: 80, grade: 'B' }); c.register({ id: 's2', name: 'Svc2', description: '', owner: 'team-b', language: 'py', tags: [], repository: 'r', status: 'active', score: 70, grade: 'C' }); expect(c.filter({ owner: 'team-a' })).toHaveLength(1); });
  it('returns stats', () => { const c = new ServiceCatalog(); c.register({ id: 's1', name: 'Svc1', description: '', owner: 'a', language: 'ts', tags: [], repository: 'r', status: 'active', score: 80, grade: 'B' }); c.register({ id: 's2', name: 'Svc2', description: '', owner: 'b', language: 'py', tags: [], repository: 'r', status: 'planned', score: 0, grade: 'F' }); const s = c.getStats(); expect(s.total).toBe(2); expect(s.active).toBe(1); });
});

describe('GoldenPathRegistry', () => {
  it('registers and lists paths', () => { const g = new GoldenPathRegistry(); g.register({ id: 'gp1', name: 'New API', description: 'Create API', category: 'backend', steps: [{ id: 's1', title: 'Init', command: 'npm init', description: 'Init', optional: false }], estimatedMinutes: 30, tags: ['api'] }); expect(g.list()).toHaveLength(1); });
  it('searches by tag', () => { const g = new GoldenPathRegistry(); g.register({ id: 'gp1', name: 'New API', description: 'Create', category: 'backend', steps: [{ id: 's1', title: 'Init', command: 'init', description: 'Init', optional: false }], estimatedMinutes: 30, tags: ['api'] }); expect(g.search('api')).toHaveLength(1); });
});

describe('ServiceScorecard', () => {
  it('evaluates service score', () => { const c = new ServiceCatalog(); const sc = new ServiceScorecard(c); const e = sc.evaluate('s1', { 'code-quality': 90, 'test-coverage': 80, documentation: 70, security: 85, performance: 75, reliability: 80 }); expect(e.overall).toBeGreaterThan(60); expect(e.grade).toBeDefined(); });
  it('tracks history', () => { const c = new ServiceCatalog(); const sc = new ServiceScorecard(c); sc.evaluate('s1', { 'code-quality': 70, 'test-coverage': 60, documentation: 50, security: 65, performance: 55, reliability: 60 }); sc.evaluate('s1', { 'code-quality': 85, 'test-coverage': 75, documentation: 65, security: 80, performance: 70, reliability: 75 }); expect(sc.getHistory('s1')).toHaveLength(2); expect(sc.getTrend('s1')).toBe('improving'); });
  it('builds leaderboard', () => { const c = new ServiceCatalog(); const sc = new ServiceScorecard(c); sc.evaluate('s1', { 'code-quality': 90, 'test-coverage': 85, documentation: 80, security: 88, performance: 82, reliability: 85 }); sc.evaluate('s2', { 'code-quality': 60, 'test-coverage': 50, documentation: 40, security: 55, performance: 45, reliability: 50 }); const lb = sc.getLeaderboard(); expect(lb[0].serviceId).toBe('s1'); });
});

describe('SelfServiceRegistry', () => {
  it('registers and lists actions', () => { const r = new SelfServiceRegistry(); r.register({ id: 'a1', name: 'Scaffold API', description: 'Create API', type: 'scaffold', params: [{ name: 'name', type: 'string', required: true }] }); expect(r.list()).toHaveLength(1); });
  it('executes with required params', () => { const r = new SelfServiceRegistry(); r.register({ id: 'a1', name: 'Scaffold API', description: 'Create API', type: 'scaffold', params: [{ name: 'name', type: 'string', required: true }] }); const res = r.execute('a1', { name: 'my-api' }); expect(res.success).toBe(true); });
  it('rejects missing required params', () => { const r = new SelfServiceRegistry(); r.register({ id: 'a1', name: 'Scaffold API', description: 'Create API', type: 'scaffold', params: [{ name: 'name', type: 'string', required: true }] }); const res = r.execute('a1', {}); expect(res.success).toBe(false); });
});
