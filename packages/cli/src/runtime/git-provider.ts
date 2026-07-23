/** Interface que define a estrutura de pull request. */
export interface PullRequest {
  number: number;
  title: string;
  body: string;
  head: string;
  base: string;
  state: 'open' | 'closed' | 'merged';
  url: string;
  labels: string[];
  createdAt: string;
}

/** Interface que define a estrutura de issue. */
export interface Issue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  assignee?: string;
  createdAt: string;
}

/** Interface que define a estrutura de git provider config. */
export interface GitProviderConfig {
  type: 'github' | 'gitlab';
  token: string;
  owner: string;
  repo: string;
  baseUrl?: string;
}

/** Interface que define a estrutura de review comment. */
export interface ReviewComment {
  body: string;
  path?: string;
  line?: number;
  side?: 'LEFT' | 'RIGHT';
}

// Raw API response types from GitHub/GitLab
interface GithubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string } | string>;
  assignee?: { login: string };
  created_at: string;
  pull_request?: unknown;
}

interface GitlabIssue {
  iid: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  assignee?: { name: string };
  created_at: string;
  createdAt: string;
}

type ApiIssue = GithubIssue | GitlabIssue;

interface GithubPR {
  number: number;
  title: string;
  body: string;
  head: { ref: string };
  base: { ref: string };
  state: string;
  merged: boolean;
  html_url: string;
  labels: Array<{ name: string }>;
  created_at: string;
}

function getConfig(type: 'github' | 'gitlab'): GitProviderConfig {
  const token = process.env[type === 'github' ? 'GITHUB_TOKEN' : 'GITLAB_TOKEN'] || '';
  const repo = process.env.GITHUB_REPOSITORY || '';
  const parts = repo.split('/');
  return { type, token, owner: parts[0] || '', repo: parts[1] || '', baseUrl: type === 'gitlab' ? (process.env.CI_SERVER_URL || 'https://gitlab.com') : undefined };
}

function headers(config: GitProviderConfig): Record<string, string> {
  return { Authorization: `Bearer ${config.token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
}

function apiUrl(config: GitProviderConfig, path: string): string {
  if (config.type === 'gitlab') return `${config.baseUrl || 'https://gitlab.com'}/api/v4/projects/${encodeURIComponent(`${config.owner}/${config.repo}`)}${path}`;
  return `https://api.github.com/repos/${config.owner}/${config.repo}${path}`;
}

/**
 * Processa issues.
 * @param type - Valor type.
 * @param state - Valor state.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function listIssues(type: 'github' | 'gitlab', state: 'open' | 'closed' = 'open'): Promise<Issue[]> {
  const cfg = getConfig(type);
  const url = type === 'gitlab' ? `${apiUrl(cfg, '/issues')}?state=${state}` : `${apiUrl(cfg, '/issues')}?state=${state}&per_page=50`;
  const res = await fetch(url, { headers: headers(cfg) });
  if (!res.ok) throw new Error(`Failed to list issues: ${res.status}`);
  const data = await res.json();
  const items = data as ApiIssue[];
  return items.map((i) => {
    const issue = i as GithubIssue & Partial<GitlabIssue>;
    return {
      number: issue.iid || issue.number,
      title: issue.title,
      body: issue.body || '',
      state: issue.state,
      labels: (issue.labels || []).map((l) => typeof l === 'string' ? l : (l as { name: string }).name),
      assignee: issue.assignee ? ((issue.assignee as { login?: string }).login || (issue.assignee as { name?: string }).name) : undefined,
      createdAt: issue.created_at || issue.createdAt || '',
    };
  });
}

/**
 * Cria p r.
 * @param type - Valor type.
 * @param title - Valor title.
 * @param body - Valor body.
 * @param head - Valor head.
 * @param base - Valor base.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function createPR(type: 'github' | 'gitlab', title: string, body: string, head: string, base: string = 'main'): Promise<PullRequest> {
  const cfg = getConfig(type);
  const url = apiUrl(cfg, '/pulls');
  const res = await fetch(url, {
    method: 'POST', headers: headers(cfg),
    body: JSON.stringify({ title, body, head, base }),
  });
  if (!res.ok) throw new Error(`Failed to create PR: ${res.status} ${await res.text()}`);
  const d = await res.json() as GithubPR;
  return { number: d.number, title: d.title, body: d.body, head: d.head?.ref || head, base: d.base?.ref || base, state: d.merged ? 'merged' : d.state as 'open' | 'closed', url: d.html_url, labels: [], createdAt: d.created_at };
}

/**
 * Processa on p r.
 * @param type - Valor type.
 * @param prNumber - Valor number.
 * @param body - Valor body.
 */
export async function commentOnPR(type: 'github' | 'gitlab', prNumber: number, body: string): Promise<void> {
  const cfg = getConfig(type);
  const url = type === 'gitlab' ? `${apiUrl(cfg, `/merge_requests/${prNumber}/notes`)}` : `${apiUrl(cfg, `/issues/${prNumber}/comments`)}`;
  const res = await fetch(url, { method: 'POST', headers: headers(cfg), body: JSON.stringify({ body }) });
  if (!res.ok) throw new Error(`Failed to comment: ${res.status}`);
}

/**
 * Processa labels.
 * @param type - Valor type.
 * @param issueNumber - Valor number.
 * @param labels - Valor labels.
 */
export async function addLabels(type: 'github' | 'gitlab', issueNumber: number, labels: string[]): Promise<void> {
  const cfg = getConfig(type);
  if (type === 'github') {
    const url = apiUrl(cfg, `/issues/${issueNumber}/labels`);
    const res = await fetch(url, { method: 'POST', headers: headers(cfg), body: JSON.stringify({ labels }) });
    if (!res.ok) throw new Error(`Failed to add labels: ${res.status}`);
  }
}

/**
 * Obtém p r.
 * @param type - Valor type.
 * @param prNumber - Valor number.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function getPR(type: 'github' | 'gitlab', prNumber: number): Promise<PullRequest> {
  const cfg = getConfig(type);
  const url = apiUrl(cfg, `/pulls/${prNumber}`);
  const res = await fetch(url, { headers: headers(cfg) });
  if (!res.ok) throw new Error(`Failed to get PR: ${res.status}`);
  const d = await res.json() as GithubPR;
  return { number: d.number, title: d.title, body: d.body, head: d.head?.ref || '', base: d.base?.ref || '', state: d.merged ? 'merged' : d.state as 'open' | 'closed', url: d.html_url, labels: (d.labels || []).map((l) => l.name), createdAt: d.created_at };
}

/**
 * Cria issue.
 * @param type - Valor type.
 * @param title - Valor title.
 * @param body - Valor body.
 * @param labels - Valor labels.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function createIssue(type: 'github' | 'gitlab', title: string, body: string, labels: string[] = []): Promise<Issue> {
  const cfg = getConfig(type);
  const url = apiUrl(cfg, '/issues');
  const res = await fetch(url, { method: 'POST', headers: headers(cfg), body: JSON.stringify({ title, body, labels }) });
  if (!res.ok) throw new Error(`Failed to create issue: ${res.status}`);
  const d = await res.json() as ApiIssue;
  const issue = d as GithubIssue & Partial<GitlabIssue>;
  return { number: issue.iid || issue.number, title: issue.title, body: issue.body, state: issue.state, labels: (issue.labels || []).map((l) => typeof l === 'string' ? l : (l as { name: string }).name), createdAt: issue.created_at || issue.createdAt || '' };
}

/**
 * Processa p r.
 * @param type - Valor type.
 * @param prNumber - Valor number.
 * @param body - Valor body.
 * @param comments - Valor comments.
 */
export async function reviewPR(type: 'github' | 'gitlab', prNumber: number, body: string, comments: ReviewComment[] = []): Promise<void> {
  const cfg = getConfig(type);
  if (type === 'github') {
    const url = apiUrl(cfg, `/pulls/${prNumber}/reviews`);
    const event = comments.length > 0 ? 'REQUEST_CHANGES' : 'COMMENT';
    const res = await fetch(url, { method: 'POST', headers: headers(cfg), body: JSON.stringify({ body, event, comments }) });
    if (!res.ok) throw new Error(`Failed to review PR: ${res.status}`);
  }
}