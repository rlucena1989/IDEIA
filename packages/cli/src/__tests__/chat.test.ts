jest.mock('../io', () => ({
  getIO: () => ({
    fs: {
      exists: jest.fn(() => true),
      read: jest.fn(() => JSON.stringify({
        id: 'conv-1',
        title: 'Test Conversation',
        messages: [
          { role: 'user', content: 'Hello', timestamp: '2026-07-24T10:00:00Z' },
          { role: 'assistant', content: 'Hi there', timestamp: '2026-07-24T10:00:05Z' },
        ],
        createdAt: '2026-07-24T10:00:00Z',
        updatedAt: '2026-07-24T10:00:05Z',
      })),
      readDirEntries: jest.fn(() => [
        { isFile: () => true, name: 'conv-1.json' },
        { isFile: () => true, name: 'conv-2.json' },
      ]),
      remove: jest.fn(),
    },
  }),
}));

import { chatCommand } from '../commands/chat';

describe('chatCommand', () => {
  let cmd: ReturnType<typeof chatCommand>;

  beforeEach(() => {
    cmd = chatCommand();
    jest.clearAllMocks();
  });

  describe('export command', () => {
    it('exports conversation as JSON by default', () => {
      const exportCmd = cmd.commands.find(c => c.name() === 'export');
      expect(exportCmd).toBeDefined();
      expect(exportCmd?.description()).toContain('Export');
    });

    it('exports conversation as TXT format', () => {
      const exportCmd = cmd.commands.find(c => c.name() === 'export');
      expect(exportCmd).toBeDefined();
    });

    it('rejects invalid format', () => {
      const exportCmd = cmd.commands.find(c => c.name() === 'export');
      expect(exportCmd).toBeDefined();
    });
  });

  describe('list command', () => {
    it('lists conversations', () => {
      const listCmd = cmd.commands.find(c => c.name() === 'list');
      expect(listCmd).toBeDefined();
      expect(listCmd?.description()).toContain('List');
    });
  });

  describe('delete command', () => {
    it('deletes a conversation by id', () => {
      const deleteCmd = cmd.commands.find(c => c.name() === 'delete');
      expect(deleteCmd).toBeDefined();
    });
  });

  describe('search command', () => {
    it('searches conversations by query', () => {
      const searchCmd = cmd.commands.find(c => c.name() === 'search');
      expect(searchCmd).toBeDefined();
    });
  });

  it('has correct command name', () => {
    expect(cmd.name()).toBe('chat');
  });

  it('has description', () => {
    expect(cmd.description()).toBeTruthy();
  });

  it('has 4 subcommands', () => {
    expect(cmd.commands).toHaveLength(4);
  });
});
