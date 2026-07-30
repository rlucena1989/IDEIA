jest.mock('@ideia/core-contributions', () => {
  class Emitter<T> {
    private listeners: Array<(event: T) => void> = [];
    get event() {
      return (listener: (event: T) => void) => {
        this.listeners.push(listener);
        return { dispose: () => { this.listeners = this.listeners.filter(l => l !== listener); } };
      };
    }
    fire(event: T): void { this.listeners.forEach(l => l(event)); }
    dispose(): void { this.listeners = []; }
  }
  return { Emitter };
});

import { DefaultNotificationManager } from './notification-manager';

describe('DefaultNotificationManager', () => {
  let manager: DefaultNotificationManager;

  beforeEach(() => {
    manager = new DefaultNotificationManager();
  });

  it('should add a notification and return its id', () => {
    const id = manager.add({ title: 'Build', message: 'Failed', severity: 'error' });
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
    expect(manager.getUnreadCount()).toBe(1);
  });

  it('should dismiss a notification by id', () => {
    const id = manager.add({ title: 'Test', message: 'Done', severity: 'info' });
    manager.dismiss(id);
    expect(manager.getUnreadCount()).toBe(0);
  });

  it('should dismiss all notifications', () => {
    manager.add({ title: 'A', message: '', severity: 'warn' });
    manager.add({ title: 'B', message: '', severity: 'error' });
    manager.dismissAll();
    expect(manager.getUnreadCount()).toBe(0);
  });

  it('should fire onNotificationAdded when adding', () => {
    const added = jest.fn();
    manager.onNotificationAdded(added);
    manager.add({ title: 'T', message: 'M', severity: 'info' });
    expect(added).toHaveBeenCalledTimes(1);
    expect(added.mock.calls[0][0].title).toBe('T');
  });

  it('should fire onNotificationDismissed when dismissing', () => {
    const dismissed = jest.fn();
    manager.onNotificationDismissed(dismissed);
    const id = manager.add({ title: 'T', message: 'M', severity: 'info' });
    manager.dismiss(id);
    expect(dismissed).toHaveBeenCalledWith(id);
  });

  it('should return a copy of notifications', () => {
    manager.add({ title: 'N', message: 'M', severity: 'info' });
    const list = manager.getNotifications();
    expect(list).toHaveLength(1);
    list.push({ id: 'fake', title: '', message: '', severity: 'info', timestamp: 0, dismissed: false });
    expect(manager.getNotifications()).toHaveLength(1);
  });
});
