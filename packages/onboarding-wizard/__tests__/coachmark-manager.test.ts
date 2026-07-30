import { CoachmarkManager, MemoryCoachmarkStorage } from '../src/coachmark-manager';

describe('CoachmarkManager', () => {
  let manager: CoachmarkManager;

  beforeEach(() => {
    manager = new CoachmarkManager(new MemoryCoachmarkStorage());
  });

  describe('show', () => {
    it('adds a coachmark to pending', () => {
      manager.show({
        id: 'first-chat',
        target: '#ideia-chat',
        title: 'IDEIA Chat',
        description: 'Describe your idea',
        placement: 'top',
        feature: 'chat',
      });
      const pending = manager.getPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('first-chat');
    });

    it('does not add duplicate completed coachmarks', () => {
      manager.show({
        id: 'first-chat',
        target: '#ideia-chat',
        title: 'IDEIA Chat',
        description: 'Test',
        placement: 'top',
        feature: 'chat',
      });
      manager.dismiss('first-chat');
      manager.show({
        id: 'first-chat',
        target: '#ideia-chat',
        title: 'IDEIA Chat',
        description: 'Test',
        placement: 'top',
        feature: 'chat',
      });
      expect(manager.getPending()).toHaveLength(0);
    });
  });

  describe('dismiss', () => {
    it('marks coachmark as completed', () => {
      manager.show({
        id: 'test',
        target: '#test',
        title: 'Test',
        description: 'Test',
        placement: 'bottom',
        feature: 'test',
      });
      manager.dismiss('test');
      expect(manager.isCompleted('test')).toBe(true);
    });

    it('returns false for unknown id', () => {
      expect(manager.dismiss('unknown')).toBe(false);
    });
  });

  describe('isCompleted', () => {
    it('returns false for unknown coachmark', () => {
      expect(manager.isCompleted('unknown')).toBe(false);
    });

    it('returns false for pending coachmark', () => {
      manager.show({
        id: 'test',
        target: '#test',
        title: 'Test',
        description: 'Test',
        placement: 'left',
        feature: 'test',
      });
      expect(manager.isCompleted('test')).toBe(false);
    });
  });

  describe('reset', () => {
    it('clears all coachmarks', () => {
      manager.show({
        id: 'a', target: '#a', title: 'A', description: '',
        placement: 'top', feature: 'test',
      });
      manager.show({
        id: 'b', target: '#b', title: 'B', description: '',
        placement: 'top', feature: 'test',
      });
      manager.reset();
      expect(manager.getAll()).toHaveLength(0);
      expect(manager.getPending()).toHaveLength(0);
    });
  });

  describe('resetFeature', () => {
    it('resets all coachmarks for a feature', () => {
      manager.show({
        id: 'chat-1', target: '#chat', title: 'Chat', description: '',
        placement: 'top', feature: 'chat',
      });
      manager.show({
        id: 'chat-2', target: '#chat', title: 'Chat', description: '',
        placement: 'top', feature: 'chat',
      });
      manager.show({
        id: 'dash-1', target: '#dash', title: 'Dash', description: '',
        placement: 'top', feature: 'dashboard',
      });
      manager.dismiss('chat-1');
      manager.resetFeature('chat');
      expect(manager.isCompleted('chat-1')).toBe(false);
      expect(manager.isCompleted('dash-1')).toBe(false);
    });
  });

  describe('getPending', () => {
    it('returns only uncompleted coachmarks', () => {
      manager.show({
        id: 'a', target: '#a', title: 'A', description: '',
        placement: 'top', feature: 'f1',
      });
      manager.show({
        id: 'b', target: '#b', title: 'B', description: '',
        placement: 'top', feature: 'f2',
      });
      manager.dismiss('a');
      const pending = manager.getPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('b');
    });
  });

  describe('setOnShow', () => {
    it('calls callback when coachmark is shown', () => {
      const callback = jest.fn();
      manager.setOnShow(callback);
      manager.show({
        id: 'test', target: '#test', title: 'Test', description: '',
        placement: 'right', feature: 'test',
      });
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ id: 'test' }));
    });
  });
});
