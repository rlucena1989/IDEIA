import { catalogCommand } from '../catalog';
import { printHeader, printLine, printResult } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../utils/version');
jest.mock('../../hardening/output-contract');

const mockServices = [
  { name: 'agent-runtime', type: 'library', status: 'active', description: 'Test', capabilities: ['agent-orchestration'], dependencies: [], tags: ['agent'] },
  { name: 'event-bus', type: 'library', status: 'active', description: 'Test', capabilities: ['pub-sub'], dependencies: [], tags: ['events'] },
  { name: 'cli', type: 'cli', status: 'active', description: 'Test', capabilities: ['command-execution'], dependencies: [], tags: ['cli'] },
];

jest.mock('../../ecosystem/service-catalog', () => {
  const mockCatalog = {
    listServices: jest.fn((type?: string) => type ? mockServices.filter(s => s.type === type) : mockServices),
    getService: jest.fn((name: string) => mockServices.find(s => s.name === name)),
    findCapabilities: jest.fn(() => [
      { name: 'agent-orchestration', serviceId: 'id-1', category: 'orchestration', level: 'core' },
      { name: 'pub-sub', serviceId: 'id-2', category: 'integration', level: 'standard' },
    ]),
    getCapabilitiesForService: jest.fn(() => [{ name: 'agent-orchestration', serviceId: 'id-1', category: 'orchestration', level: 'core' }]),
    getAllTags: jest.fn(() => ['agent', 'cli', 'events']),
    queryByTag: jest.fn((tag: string) => mockServices.filter(s => s.tags.includes(tag))),
    getServiceCount: jest.fn(() => 3),
    getCapabilityCount: jest.fn(() => 2),
    exportCatalog: jest.fn(() => ({ services: mockServices, capabilities: [], tags: ['agent', 'cli'] })),
  };
  return { ServiceCatalog: jest.fn(() => mockCatalog), CapabilityEntry: {}, ServiceEntry: {} };
});

jest.mock('../../ecosystem/capability-discovery', () => {
  return { CapabilityDiscovery: jest.fn(() => ({ discoverAll: jest.fn(() => []), getAvailableTags: jest.fn(() => ['agent']) })) };
});

jest.mock('../../ecosystem/self-awareness', () => {
  return {
    SelfAwareness: jest.fn(() => ({
      describeSystem: jest.fn(() => ({ name: 'IDEIA', version: '2026.07', totalPackages: 3, totalCapabilities: 2, architecture: { layers: [] }, stack: {}, workflows: [], principles: [] })),
      formatAsMarkdown: jest.fn(() => '# IDEIA — System Self-Description'),
    })),
  };
});

import { getCliVersion } from '../../utils/version';
import { createEnvelope } from '../../hardening/output-contract';

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
  (getCliVersion as jest.Mock).mockReturnValue('1.0.0');
  (createEnvelope as jest.Mock).mockImplementation((data: unknown) => data);
});

describe('catalogCommand', () => {
  it('should be defined', () => {
    expect(catalogCommand).toBeDefined();
  });

  it('should return Command with all subcommands', () => {
    const cmd = catalogCommand();
    expect(cmd.name()).toBe('catalog');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('list');
    expect(names).toContain('capabilities');
    expect(names).toContain('tags');
    expect(names).toContain('show');
    expect(names).toContain('query');
    expect(names).toContain('describe');
  });
});

describe('catalogListAction', () => {
  it('should list services with header', async () => {
    const { catalogListAction } = await import('../catalog');
    catalogListAction({});
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Service Catalog'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('agent-runtime'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('event-bus'));
  });

  it('should filter by type', async () => {
    const { catalogListAction } = await import('../catalog');
    catalogListAction({ type: 'cli' });
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('cli'));
  });
});

describe('catalogCapabilitiesAction', () => {
  it('should list capabilities', async () => {
    const { catalogCapabilitiesAction } = await import('../catalog');
    catalogCapabilitiesAction({});
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Capabilities'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('agent-orchestration'));
  });
});

describe('catalogTagsAction', () => {
  it('should list tags', async () => {
    const { catalogTagsAction } = await import('../catalog');
    catalogTagsAction({});
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Tags'));
  });
});

describe('catalogShowAction', () => {
  it('should show service details', async () => {
    const { catalogShowAction } = await import('../catalog');
    catalogShowAction('agent-runtime', {});
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('agent-runtime'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('library'));
  });
});

describe('catalogQueryAction', () => {
  it('should query by tag', async () => {
    const { catalogQueryAction } = await import('../catalog');
    catalogQueryAction('agent', {});
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('agent'));
  });
});

describe('catalogDescribeAction', () => {
  it('should describe system', async () => {
    const { catalogDescribeAction } = await import('../catalog');
    catalogDescribeAction({});
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('IDEIA'));
  });
});
