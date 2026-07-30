import { createNotificationUseCase } from '../notification-use-case';

describe('NotificationUseCase', () => {
  const useCase = createNotificationUseCase();

  beforeEach(() => {
    useCase.clearAll();
  });

  it('send creates notification', () => {
    const result = useCase.send('Test title', 'Test message', 'high', 'test-suite');
    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.title).toBe('Test title');
    expect(result.data!.message).toBe('Test message');
    expect(result.data!.priority).toBe('high');
    expect(result.data!.source).toBe('test-suite');
    expect(result.data!.read).toBe(false);
    expect(result.data!.id).toMatch(/^notif_/);
  });

  it('markAsRead toggles read status', () => {
    const sent = useCase.send('Read me', 'msg', 'low', 'test');
    const id = sent.data!.id;

    const marked = useCase.markAsRead(id);
    expect(marked.ok).toBe(true);
    expect(marked.data!.read).toBe(true);
    expect(marked.data!.readAt).toBeDefined();
  });

  it('listNotifications filters unread', () => {
    useCase.send('N1', 'm1', 'low', 'src1');
    useCase.send('N2', 'm2', 'low', 'src2');

    const all = useCase.listNotifications();
    expect(all.data).toHaveLength(2);

    const unread = useCase.listNotifications(true);
    expect(unread.data).toHaveLength(2);

    useCase.markAsRead(all.data![0].id);
    const afterRead = useCase.listNotifications(true);
    expect(afterRead.data).toHaveLength(1);
  });

  it('getStats returns counts', () => {
    useCase.send('S1', 'm1', 'high', 'src');
    useCase.send('S2', 'm2', 'low', 'src');
    const stats = useCase.getStats();
    expect(stats.ok).toBe(true);
    expect(stats.data!.total).toBe(2);
    expect(stats.data!.unread).toBe(2);
    expect(stats.data!.byPriority.high).toBe(1);
    expect(stats.data!.byPriority.low).toBe(1);
  });

  it('clearAll empties all', () => {
    useCase.send('X', 'y', 'low', 'src');
    useCase.send('A', 'b', 'medium', 'src');
    const before = useCase.getStats();
    expect(before.data!.total).toBe(2);

    const result = useCase.clearAll();
    expect(result.ok).toBe(true);

    const after = useCase.getStats();
    expect(after.data!.total).toBe(0);
  });
});
