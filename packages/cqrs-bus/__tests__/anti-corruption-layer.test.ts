import { describe, it, expect, jest } from '@jest/globals';
import { AntiCorruptionLayer, ExternalCommand } from '../src/anti-corruption-layer';

jest.mock('uuid', () => ({
  v4: () => 'mocked-uuid',
}));

describe('AntiCorruptionLayer', () => {
  let acl: AntiCorruptionLayer;

  beforeEach(() => {
    acl = new AntiCorruptionLayer();
  });

  it('translates an external command', () => {
    const external: ExternalCommand = {
      source: 'github', action: 'push',
      payload: { id: 'repo-1', branch: 'main' },
      correlationId: 'corr-123',
    };
    const command = acl.translate(external);
    expect(command.type).toBe('project.sync');
    expect(command.aggregateId).toBe('github:repo-1');
    expect(command.metadata.correlationId).toBe('corr-123');
    expect(command.data._source).toBe('github');
  });

  it('maps unknown source action to external type', () => {
    const external: ExternalCommand = {
      source: 'slack', action: 'message',
      payload: { id: 'msg-1', text: 'hello' },
      correlationId: 'corr-456',
    };
    const command = acl.translate(external);
    expect(command.type).toBe('external.message');
  });

  it('generates uuid when no id in payload', () => {
    const external: ExternalCommand = {
      source: 'vscode', action: 'save',
      payload: { path: '/file.ts' },
      correlationId: 'corr-789',
    };
    const command = acl.translate(external);
    expect(command.aggregateId).toBe('mocked-uuid');
  });

  it('adds translation metadata to data', () => {
    const external: ExternalCommand = {
      source: 'webhook', action: 'generic',
      payload: { event: 'deploy' },
      correlationId: 'corr-101',
    };
    const command = acl.translate(external);
    expect(command.data._source).toBe('webhook');
    expect(command.data._translatedAt).toBeDefined();
  });
});
