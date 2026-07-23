import { NotificationService, createNotificationService } from '../notifications';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create via factory', () => {
    const s = createNotificationService();
    expect(s).toBeInstanceOf(NotificationService);
  });

  it('should start empty', () => {
    expect(service.list()).toHaveLength(0);
    expect(service.count()).toBe(0);
    expect(service.unreadCount()).toBe(0);
  });

  it('should send a notification and store it', async () => {
    const n = await service.send('deploy.started', 'Deploy Started', 'Production deploy initiated', 'info');
    expect(n.id).toMatch(/^notif-/);
    expect(n.event).toBe('deploy.started');
    expect(n.title).toBe('Deploy Started');
    expect(n.severity).toBe('info');
    expect(n.read).toBe(false);
    expect(service.count()).toBe(1);
    expect(service.unreadCount()).toBe(1);
  });

  it('should list notifications filtered by severity', async () => {
    await service.send('deploy.failed', 'Fail', 'Deploy failed', 'error');
    await service.send('system.maintenance', 'Info', 'Maintenance', 'info');
    const errors = service.list('error');
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe('error');
  });

  it('should mark notification as read', async () => {
    const n = await service.send('deploy.started', 'Test', 'Test msg', 'info');
    expect(service.unreadCount()).toBe(1);
    const result = service.markRead(n.id);
    expect(result).toBe(true);
    expect(service.unreadCount()).toBe(0);
    const found = service.list().find(x => x.id === n.id);
    expect(found?.read).toBe(true);
  });

  it('should return false when marking unknown id', () => {
    expect(service.markRead('invalid')).toBe(false);
  });

  it('should mark all as read', async () => {
    await service.send('deploy.started', 'A', 'Msg', 'info');
    await service.send('deploy.failed', 'B', 'Msg', 'error');
    service.markAllRead();
    expect(service.unreadCount()).toBe(0);
  });

  it('should clear all notifications', async () => {
    await service.send('deploy.started', 'A', 'Msg', 'info');
    service.clear();
    expect(service.count()).toBe(0);
  });

  it('should enforce maxHistory limit', async () => {
    const s = new NotificationService();
    for (let i = 0; i < 1005; i++) {
      await s.send('deploy.started', `N${i}`, 'msg', 'info');
    }
    expect(s.count()).toBe(1000);
  });

  it('should limit max history when over capacity', async () => {
    const s = new NotificationService();
    for (let i = 0; i < 1500; i++) {
      await s.send('deploy.started', `N${i}`, 'x', 'info');
    }
    expect(s.count()).toBeLessThanOrEqual(1000);
  });

  it('should notify listeners on send', async () => {
    const listener = jest.fn();
    service.onNotification(listener);
    await service.send('deploy.started', 'Test', 'Msg', 'info');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].title).toBe('Test');
  });

  it('should accept custom config', () => {
    const s = new NotificationService({ webhooks: [{ url: 'https://hook.example.com', events: ['deploy.started'] }] });
    expect(s).toBeInstanceOf(NotificationService);
  });
});
