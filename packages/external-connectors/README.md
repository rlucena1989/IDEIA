# @ideia/external-connectors

AI-Devkit External Connectors — Slack, Jira, webhooks via MCP.

## Installation

```bash
npm install @ideia/external-connectors
```

## Usage

```typescript
import { SlackConnector, JiraConnector } from '@ideia/external-connectors';

const slack = new SlackConnector({ token: process.env.SLACK_TOKEN });
await slack.sendMessage('#dev', 'Deploy completed');

const jira = new JiraConnector({ baseUrl: 'https://jira.example.com' });
await jira.createIssue('Bug', 'Login fails on Safari');
```
