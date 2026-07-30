import { RightToBeForgotten, createRightToBeForgotten, type DataStore } from '../src/right-to-forget';

describe('RightToBeForgotten', () => {
  const makeStore = (name: string): DataStore => ({
    name,
    deleteByUserId: jest.fn().mockResolvedValue(5),
    deleteByField: jest.fn().mockResolvedValue(3),
    findDataByUserId: jest.fn().mockResolvedValue([{ id: '1', store: name, data: { email: 'test@test.com' } }]),
  });

  it('registers a data store', () => {
    const rtf = new RightToBeForgotten();
    rtf.registerStore(makeStore('users'));
    expect(rtf.listStores()).toContain('users');
  });

  it('unregisters a data store', () => {
    const rtf = new RightToBeForgotten();
    rtf.registerStore(makeStore('users'));
    expect(rtf.unregisterStore('users')).toBe(true);
    expect(rtf.listStores()).not.toContain('users');
  });

  it('forget removes data from all stores', async () => {
    const rtf = new RightToBeForgotten();
    rtf.registerStore(makeStore('users'));
    rtf.registerStore(makeStore('logs'));
    const result = await rtf.forget('user-123', 'GDPR request');
    expect(result.status).toBe('completed');
    expect(result.totalRecordsDeleted).toBe(10);
  });

  it('forget returns partially_completed when some stores fail', async () => {
    const rtf = new RightToBeForgotten();
    const failingStore: DataStore = {
      name: 'failing',
      deleteByUserId: jest.fn().mockRejectedValue(new Error('DB down')),
      deleteByField: jest.fn().mockRejectedValue(new Error('DB down')),
      findDataByUserId: jest.fn().mockResolvedValue([]),
    };
    rtf.registerStore(failingStore);
    rtf.registerStore(makeStore('users'));
    const result = await rtf.forget('user-123', 'test');
    expect(result.status).toBe('partially_completed');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('forgetByField removes by field/value', async () => {
    const rtf = new RightToBeForgotten();
    rtf.registerStore(makeStore('users'));
    const result = await rtf.forgetByField('email', 'test@test.com', 'consent withdrawn');
    expect(result.status).toBe('completed');
    expect(result.totalRecordsDeleted).toBe(3);
  });

  it('findByUserId returns data from all stores', async () => {
    const rtf = new RightToBeForgotten();
    rtf.registerStore(makeStore('users'));
    rtf.registerStore(makeStore('analytics'));
    const found = await rtf.findByUserId('user-123');
    expect(found.length).toBe(2);
  });

  it('getRequest returns a previously submitted request', async () => {
    const rtf = new RightToBeForgotten();
    rtf.registerStore(makeStore('users'));
    const result = await rtf.forget('user-1', 'test');
    const request = rtf.getRequest(result.requestId);
    expect(request).toBeDefined();
    expect(request!.userId).toBe('user-1');
  });

  it('getRequestsByUser returns requests for a specific user', async () => {
    const rtf = new RightToBeForgotten();
    rtf.registerStore(makeStore('users'));
    await rtf.forget('user-1', 'test');
    await rtf.forget('user-2', 'test');
    await rtf.forget('user-1', 'second request');
    const requests = rtf.getRequestsByUser('user-1');
    expect(requests.length).toBe(2);
  });

  it('getHistory returns all requests', async () => {
    const rtf = new RightToBeForgotten();
    rtf.registerStore(makeStore('users'));
    await rtf.forget('user-1', 'test');
    await rtf.forget('user-2', 'test');
    expect(rtf.getHistory().length).toBe(2);
  });

  it('createRightToBeForgotten factory works', () => {
    const rtf = createRightToBeForgotten();
    expect(rtf).toBeInstanceOf(RightToBeForgotten);
  });
});
