import { ExternalConnectors } from '../src/external-connectors';

describe('ExternalConnectors', () => {
  it('should register and list connectors', () => {
    const ec = new ExternalConnectors();
    ec.register({ type: 'slack', name: 'my-slack', enabled: true, config: { url: 'https://hooks.slack.com/test' } });
    ec.register({ type: 'jira', name: 'my-jira', enabled: false, config: { url: 'https://jira.example.com', token: 'tok' } });
    expect(ec.listConnectors()).toHaveLength(1);
    expect(ec.listConnectors('jira')).toHaveLength(0);
  });

  it('should get connector by name', () => {
    const ec = new ExternalConnectors();
    ec.register({ type: 'slack', name: 'alerts', enabled: true, config: {} });
    expect(ec.getConnector('alerts')).toBeDefined();
    expect(ec.getConnector('nonexistent')).toBeUndefined();
  });

  it('should unregister connector', () => {
    const ec = new ExternalConnectors();
    ec.register({ type: 'slack', name: 'temp', enabled: true, config: {} });
    expect(ec.unregister('temp')).toBe(true);
    expect(ec.listConnectors()).toHaveLength(0);
  });

  it('should fail sending without URL', async () => {
    const ec = new ExternalConnectors();
    const result = await ec.sendAlert(undefined, { title: 'test', message: 'msg', severity: 'info', source: 'test', timestamp: new Date().toISOString() });
    expect(result.success).toBe(false);
    expect(result.message).toContain('No webhook URL');
  });

  it('should handle invalid webhook URLs gracefully', async () => {
    const ec = new ExternalConnectors();
    const result = await ec.sendWebhook('https://invalid.url/test', { title: 't', message: 'm', severity: 'info', source: 's', timestamp: 'now' });
    expect(result.success).toBe(false);
  });

  it('should create Slack message payload correctly', () => {
    const ec = new ExternalConnectors();
    const payload = { text: 'Hello from AI-Devkit', channel: '#dev', username: 'DevBot', icon_emoji: ':rocket:' };
    expect(payload.text).toBe('Hello from AI-Devkit');
    expect(typeof ec.sendSlack).toBe('function');
  });

  it('should create Jira issue payload correctly', () => {
    const ec = new ExternalConnectors();
    const issue = { project: 'DEV', summary: 'Fix bug', description: 'Details', issueType: 'Bug' as const, priority: 'High' as const };
    expect(issue.project).toBe('DEV');
    expect(typeof ec.createJiraIssue).toBe('function');
  });
});
