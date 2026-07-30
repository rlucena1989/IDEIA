import { DSRManager } from '../src/dsr-manager';

describe('DSRManager', () => {
  let manager: DSRManager;

  beforeEach(() => {
    manager = new DSRManager();
  });

  test('createRequest creates a DSR request', () => {
    const req = manager.createRequest('user-1', 'access', 'Request all my data');
    expect(req.userId).toBe('user-1');
    expect(req.type).toBe('access');
    expect(req.status).toBe('open');
    expect(req.id).toBeDefined();
  });

  test('createRequest creates different DSR types', () => {
    const access = manager.createRequest('u1', 'access', 'Access');
    expect(access.type).toBe('access');
    const erasure = manager.createRequest('u1', 'erasure', 'Delete');
    expect(erasure.type).toBe('erasure');
    const portability = manager.createRequest('u1', 'portability', 'Export');
    expect(portability.type).toBe('portability');
    const rectification = manager.createRequest('u1', 'rectification', 'Fix');
    expect(rectification.type).toBe('rectification');
    const restriction = manager.createRequest('u1', 'restriction', 'Restrict');
    expect(restriction.type).toBe('restriction');
  });

  test('processRequest changes status to in_progress', () => {
    const req = manager.createRequest('user-2', 'rectification', 'Fix my data');
    const processed = manager.processRequest(req.id);
    expect(processed!.status).toBe('in_progress');
  });

  test('processRequest returns undefined for unknown ID', () => {
    expect(manager.processRequest('nonexistent')).toBeUndefined();
  });

  test('completeRequest changes status to completed', () => {
    const req = manager.createRequest('user-3', 'erasure', 'Delete me');
    manager.processRequest(req.id);
    const completed = manager.completeRequest(req.id, 'Done');
    expect(completed!.status).toBe('completed');
    expect(completed!.completedAt).toBeDefined();
  });

  test('rejectRequest changes status to rejected', () => {
    const req = manager.createRequest('user-4', 'access', 'Give me data');
    const rejected = manager.rejectRequest(req.id, 'Legal exemption');
    expect(rejected!.status).toBe('rejected');
    expect(rejected!.notes).toBe('Legal exemption');
  });

  test('getUserRequests returns all requests for a user', () => {
    manager.createRequest('user-5', 'access', 'Req 1');
    manager.createRequest('user-5', 'erasure', 'Req 2');
    expect(manager.getUserRequests('user-5')).toHaveLength(2);
  });

  test('listOpenRequests returns only open requests', () => {
    const r1 = manager.createRequest('u1', 'access', 'Open');
    const r2 = manager.createRequest('u2', 'erasure', 'To be closed');
    manager.processRequest(r2.id);
    manager.completeRequest(r2.id, 'Notes');
    const open = manager.listOpenRequests();
    expect(open).toHaveLength(1);
    expect(open[0].id).toBe(r1.id);
  });

  test('getStats returns request statistics', () => {
    const r1 = manager.createRequest('u1', 'access', 'A');
    const r2 = manager.createRequest('u2', 'erasure', 'B');
    manager.processRequest(r1.id);
    manager.completeRequest(r1.id, 'Done');
    const stats = manager.getStats();
    expect(stats.total).toBe(2);
    expect(stats.open).toBe(1);
    expect(stats.completed).toBe(1);
    expect(stats.byType.access).toBe(1);
    expect(stats.byType.erasure).toBe(1);
  });
});
