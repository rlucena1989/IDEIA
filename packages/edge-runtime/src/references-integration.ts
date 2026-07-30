export interface EdgeDeploymentConfig {
  region: string;
  nodeId: string;
  natsUrl: string;
  capabilities: string[];
}

export class EdgeDeploymentReference {
  static createIDEIAEdgeNode(config: EdgeDeploymentConfig): { runtime: Record<string, unknown>; events: string[]; sync: string[] } {
    return {
      runtime: { status: 'initialized', nodeId: config.nodeId, region: config.region, capabilities: config.capabilities, uptime: 0, activeAgents: 0 },
      events: ['edge:connected', 'edge:sync:start', 'edge:sync:complete', 'agent:status:change', 'model:cache:update'],
      sync: ['workspace:changes', 'agent:state', 'model:updates', 'config:changes', 'audit:events'],
    };
  }

  static getOfflineCapabilities(): string[] {
    return [
      'local-llm-inference',
      'code-completion',
      'syntax-highlighting',
      'file-operations',
      'git-operations',
      'task-queue-local',
      'cache-agent-state',
    ];
  }

  static getCloudFallbackTriggers(): string[] {
    return [
      'model-too-large',
      'training-required',
      'cross-project-analysis',
      'heavy-reasoning',
      'knowledge-graph-query',
    ];
  }

  static generateEdgeTopologyYaml(): string {
    return `# IDEIA Edge Topology
regions:
  - name: us-east
    nodes: 5
    fog: us-fog-1
  - name: eu-west
    nodes: 3
    fog: eu-fog-1
sync:
  interval: 30s
  conflictStrategy: last-write-wins
  compression: gzip
offline:
  maxDuration: 48h
  queueSize: 10000
  autoSyncOnReconnect: true`;
  }
}
