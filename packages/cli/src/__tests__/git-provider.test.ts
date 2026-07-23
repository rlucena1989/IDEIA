import * as gp from '../runtime/git-provider';

describe('git-provider', () => {
  const originalEnv = { ...process.env };
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    process.env.GITHUB_TOKEN = 'test-token-123';
    process.env.GITHUB_REPOSITORY = 'owner/test-repo';
    process.env.GITLAB_TOKEN = 'gl-test-token';
    originalFetch = global.fetch;
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  describe('listIssues', () => {
    it('deve retornar issues formatadas do GitHub', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
          { number: 1, title: 'Bug', body: 'desc', state: 'open', labels: [{ name: 'bug' }], assignee: { login: 'user1' }, created_at: '2024-01-01' },
        ]),
      });
      const issues = await gp.listIssues('github');
      expect(issues).toHaveLength(1);
      expect(issues[0].number).toBe(1);
      expect(issues[0].labels).toEqual(['bug']);
      expect(issues[0].assignee).toBe('user1');
    });

    it('deve retornar issues formatadas do GitLab', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
          { iid: 5, title: 'Feature', body: 'desc', state: 'closed', labels: ['enhancement'], created_at: '2024-01-01' },
        ]),
      });
      const issues = await gp.listIssues('gitlab');
      expect(issues).toHaveLength(1);
      expect(issues[0].number).toBe(5);
      expect(issues[0].labels).toEqual(['enhancement']);
    });

    it('deve lancar erro quando HTTP falha', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
      await expect(gp.listIssues('github')).rejects.toThrow('Failed to list issues');
    });
  });

  describe('createPR', () => {
    it('deve criar PR e retornar objeto PullRequest', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          number: 42, title: 'Fix', body: 'desc', head: { ref: 'fix-branch' }, base: { ref: 'main' },
          state: 'open', html_url: 'https://github.com/owner/repo/pull/42', created_at: '2024-01-01',
        }),
      });
      const pr = await gp.createPR('github', 'Fix', 'desc', 'fix-branch');
      expect(pr.number).toBe(42);
      expect(pr.head).toBe('fix-branch');
      expect(pr.state).toBe('open');
    });

    it('deve lancar erro quando HTTP falha', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false, status: 422, text: () => Promise.resolve('Validation failed'),
      });
      await expect(gp.createPR('github', 'Bad', 'bad', 'bad')).rejects.toThrow('Failed to create PR');
    });
  });

  describe('getPR', () => {
    it('deve retornar PR aberto', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          number: 1, title: 'PR', body: 'body', head: { ref: 'feature' }, base: { ref: 'main' },
          state: 'open', merged: false, html_url: 'https://github.com/owner/repo/pull/1',
          labels: [{ name: 'enhancement' }], created_at: '2024-01-01',
        }),
      });
      const pr = await gp.getPR('github', 1);
      expect(pr.state).toBe('open');
      expect(pr.labels).toEqual(['enhancement']);
    });

    it('deve retornar merged como estado "merged"', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          number: 2, title: 'Merged PR', body: '', head: { ref: 'b' }, base: { ref: 'main' },
          state: 'closed', merged: true, html_url: '', labels: [], created_at: '2024-01-01',
        }),
      });
      const pr = await gp.getPR('github', 2);
      expect(pr.state).toBe('merged');
    });
  });

  describe('createIssue', () => {
    it('deve criar issue no GitHub', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          number: 10, title: 'Issue', body: 'desc', state: 'open',
          labels: [{ name: 'bug' }], created_at: '2024-01-01',
        }),
      });
      const issue = await gp.createIssue('github', 'Issue', 'desc', ['bug']);
      expect(issue.number).toBe(10);
      expect(issue.labels).toEqual(['bug']);
    });

    it('deve criar issue no GitLab', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          iid: 20, title: 'GL Issue', body: 'desc', state: 'opened',
          labels: ['bug'], created_at: '2024-01-01',
        }),
      });
      const issue = await gp.createIssue('gitlab', 'GL Issue', 'desc', ['bug']);
      expect(issue.number).toBe(20);
    });
  });

  describe('addLabels', () => {
    it('deve adicionar labels no GitHub', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      await expect(gp.addLabels('github', 1, ['bug'])).resolves.toBeUndefined();
    });

    it('deve ignorar addLabels no GitLab (no-op)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      await expect(gp.addLabels('gitlab', 1, ['bug'])).resolves.toBeUndefined();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('commentOnPR', () => {
    it('deve comentar no GitHub', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      await expect(gp.commentOnPR('github', 1, 'Looks good')).resolves.toBeUndefined();
    });

    it('deve lancar erro quando HTTP falha', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
      await expect(gp.commentOnPR('github', 1, 'test')).rejects.toThrow('Failed to comment');
    });
  });

  describe('reviewPR', () => {
    it('deve fazer review com comentarios no GitHub', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      await expect(gp.reviewPR('github', 1, 'Review', [{ body: 'Fix this', path: 'src/index.ts', line: 10 }])).resolves.toBeUndefined();
    });

    it('deve fazer review apenas com comentario no GitHub', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      await expect(gp.reviewPR('github', 1, 'LGTM')).resolves.toBeUndefined();
    });
  });

  describe('helpers', () => {
    it('deve usar URLs corretas para GitHub', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      await gp.addLabels('github', 1, ['bug']);
      const githubUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(githubUrl).toContain('api.github.com');
    });
  });
});