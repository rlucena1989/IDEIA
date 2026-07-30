import { EdgeDeploymentReference, EdgeDeploymentConfig } from '../references-integration';

describe('EdgeDeploymentReference', () => {
  const config: EdgeDeploymentConfig = {
    region: 'us-east',
    nodeId: 'edge-01',
    natsUrl: 'nats://localhost:4222',
    capabilities: ['code-completion', 'syntax-highlighting'],
  };

  it('should createIDEIAEdgeNode return expected structure', () => {
    const result = EdgeDeploymentReference.createIDEIAEdgeNode(config);
    expect(result).toHaveProperty('runtime');
    expect(result).toHaveProperty('events');
    expect(result).toHaveProperty('sync');
    expect(result.runtime.status).toBe('initialized');
    expect(result.runtime.nodeId).toBe('edge-01');
  });

  it('should getOfflineCapabilities include local-llm-inference', () => {
    const caps = EdgeDeploymentReference.getOfflineCapabilities();
    expect(caps).toContain('local-llm-inference');
  });

  it('should getCloudFallbackTriggers include model-too-large', () => {
    const triggers = EdgeDeploymentReference.getCloudFallbackTriggers();
    expect(triggers).toContain('model-too-large');
  });

  it('should generateEdgeTopologyYaml be valid YAML structure', () => {
    const yaml = EdgeDeploymentReference.generateEdgeTopologyYaml();
    expect(yaml).toContain('# IDEIA Edge Topology');
    expect(yaml).toContain('regions:');
    expect(yaml).toContain('us-east');
    expect(yaml).toContain('sync:');
    expect(yaml).toContain('offline:');
  });

  it('should createIDEIAEdgeNode events include edge:connected', () => {
    const result = EdgeDeploymentReference.createIDEIAEdgeNode(config);
    expect(result.events).toContain('edge:connected');
    expect(result.events).toContain('edge:sync:start');
    expect(result.events).toContain('edge:sync:complete');
  });

  it('should sync array include workspace:changes', () => {
    const result = EdgeDeploymentReference.createIDEIAEdgeNode(config);
    expect(result.sync).toContain('workspace:changes');
    expect(result.sync).toContain('agent:state');
    expect(result.sync).toContain('model:updates');
  });

  it('should offline capabilities count >= 6', () => {
    const caps = EdgeDeploymentReference.getOfflineCapabilities();
    expect(caps.length).toBeGreaterThanOrEqual(6);
  });

  it('should fallback triggers count >= 4', () => {
    const triggers = EdgeDeploymentReference.getCloudFallbackTriggers();
    expect(triggers.length).toBeGreaterThanOrEqual(4);
  });
});
