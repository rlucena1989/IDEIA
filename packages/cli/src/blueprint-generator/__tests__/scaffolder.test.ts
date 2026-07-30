import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { BlueprintManifest, ScaffoldOptions, ScaffoldResult } from '../types';

const mockTemplateEngine = {
  renderPath: jest.fn<(path: string, ctx: Record<string, unknown>) => string>(),
  render: jest.fn<(tpl: string, ctx: Record<string, unknown>) => string>(),
  evaluateCondition: jest.fn<(cond: string, ctx: Record<string, unknown>) => boolean>(),
  getHelpers: jest.fn(),
};

const mockDependencyResolver = {
  resolve: jest.fn<(deps: Record<string, unknown>) => Promise<{ dependencies: Record<string, string>; devDependencies: Record<string, string>; peerDependencies: Record<string, string>; optionalDependencies: Record<string, string>; errors: { code: string; package: string; message: string }[]; warnings: { code: string; package: string; message: string }[] }>>(),
};

const mockConfigGenerator = {
  generate: jest.fn<(configs: Record<string, unknown>, ctx: Record<string, unknown>) => Promise<{ path: string; content: string }[]>>(),
};

const mockContractGenerator = {
  generate: jest.fn<(modules: unknown[], format: string, opts: Record<string, unknown>) => Promise<{ path: string; content: string }[]>>(),
};

const mockADRGenerator = {
  generate: jest.fn<(manifest: BlueprintManifest, ctx: Record<string, unknown>) => Promise<{ path: string; content: string; title: string; id: string }[]>>(),
};

jest.mock('../template-engine', () => ({
  TemplateEngine: jest.fn(() => mockTemplateEngine),
  buildTemplateContext: jest.fn((vars: Record<string, unknown>, additional?: Record<string, unknown>) => ({
    projectName: 'test-project',
    projectNamePascal: 'TestProject',
    projectNameCamel: 'testProject',
    projectNameKebab: 'test-project',
    projectNameSnake: 'test_project',
    description: additional?.description || '',
    features: additional?.features || [],
    createdAt: new Date().toISOString(),
    ideiaVersion: '1.0.0',
    nodeVersion: process.version,
    ...vars,
    ...additional,
  })),
}));

jest.mock('../dependency-resolver', () => ({
  DependencyResolver: jest.fn(() => mockDependencyResolver),
}));

jest.mock('../config-generator', () => ({
  ConfigGenerator: jest.fn(() => mockConfigGenerator),
}));

jest.mock('../contract-generator', () => ({
  ContractGenerator: jest.fn(() => mockContractGenerator),
}));

jest.mock('../adr-generator', () => ({
  ADRGenerator: jest.fn(() => mockADRGenerator),
}));

import { Scaffolder } from '../scaffolder';

describe('Scaffolder', () => {
  let scaffolder: Scaffolder;
  let minimalManifest: BlueprintManifest;
  let defaultOptions: ScaffoldOptions;

  beforeEach(() => {
    jest.clearAllMocks();

    scaffolder = new Scaffolder();

    minimalManifest = {
      name: 'test-app',
      version: '1.0.0',
      description: 'Test application',
    };

    defaultOptions = {
      outputDir: '/tmp/test-output',
    };

    mockDependencyResolver.resolve.mockResolvedValue({
      dependencies: {},
      devDependencies: {},
      peerDependencies: {},
      optionalDependencies: {},
      errors: [],
      warnings: [],
    });

    mockConfigGenerator.generate.mockResolvedValue([]);
    mockContractGenerator.generate.mockResolvedValue([]);
    mockADRGenerator.generate.mockResolvedValue([]);
  });

  it('constructs successfully', () => {
    expect(scaffolder).toBeInstanceOf(Scaffolder);
  });

  describe('scaffold', () => {
    it('returns a ScaffoldResult with projectPath', async () => {
      const result = await scaffolder.scaffold(minimalManifest, defaultOptions);
      expect(result).toHaveProperty('projectPath');
      expect(result.projectPath).toContain('test-output');
    });

    it('returns expected result shape', async () => {
      const result = await scaffolder.scaffold(minimalManifest, defaultOptions);
      const keys: (keyof ScaffoldResult)[] = [
        'projectPath', 'filesCreated', 'filesSkipped',
        'dependenciesInstalled', 'gitInitialized',
        'adrsGenerated', 'contractsGenerated',
        'duration', 'errors', 'warnings',
      ];
      for (const key of keys) {
        expect(result).toHaveProperty(key);
      }
      expect(typeof result.duration).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('calls configGenerator.generate when configs present', async () => {
      const manifest: BlueprintManifest = {
        ...minimalManifest,
        configs: { eslint: { rules: {} } },
      };
      mockConfigGenerator.generate.mockResolvedValue([{ path: '.eslintrc.json', content: '{}' }]);
      await scaffolder.scaffold(manifest, defaultOptions);
      expect(mockConfigGenerator.generate).toHaveBeenCalled();
    });

    it('calls dependencyResolver.resolve when dependencies present', async () => {
      const manifest: BlueprintManifest = {
        ...minimalManifest,
        dependencies: { dependencies: { express: '^4.18.0' } },
      };
      mockDependencyResolver.resolve.mockResolvedValue({
        dependencies: { express: '^4.18.0' },
        devDependencies: {},
        peerDependencies: {},
        optionalDependencies: {},
        errors: [],
        warnings: [],
      });
      await scaffolder.scaffold(manifest, defaultOptions);
      expect(mockDependencyResolver.resolve).toHaveBeenCalled();
    });

    it('calls contractGenerator.generate when contracts present', async () => {
      const manifest: BlueprintManifest = {
        ...minimalManifest,
        contracts: {
          modules: [{ name: 'user', version: '1.0.0', schema: 'z.object({})' }],
          schemaFormat: 'zod',
          generateTests: true,
        },
      };
      mockContractGenerator.generate.mockResolvedValue([{ path: 'contract.ts', content: '' }]);
      await scaffolder.scaffold(manifest, defaultOptions);
      expect(mockContractGenerator.generate).toHaveBeenCalled();
    });

    it('calls adrGenerator.generate by default', async () => {
      const manifest: BlueprintManifest = { ...minimalManifest };
      mockADRGenerator.generate.mockResolvedValue([
        { path: 'docs/adr/ADR-0001.md', content: '', title: 'ADR 1', id: 'ADR-0001' },
      ]);
      await scaffolder.scaffold(manifest, defaultOptions);
      expect(mockADRGenerator.generate).toHaveBeenCalled();
    });

    it('skips adr generation when autoGenerate is false', async () => {
      const manifest: BlueprintManifest = {
        ...minimalManifest,
        adrs: { autoGenerate: false },
      };
      await scaffolder.scaffold(manifest, defaultOptions);
      expect(mockADRGenerator.generate).not.toHaveBeenCalled();
    });

    it('handles dependency resolution errors gracefully', async () => {
      const manifest: BlueprintManifest = {
        ...minimalManifest,
        dependencies: { dependencies: { pkg: '^1.0.0' } },
      };
      mockDependencyResolver.resolve.mockRejectedValue(new Error('Registry failed'));
      const result = await scaffolder.scaffold(manifest, defaultOptions);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Dependency resolution failed');
    });

    it('handles contract generation errors gracefully', async () => {
      const manifest: BlueprintManifest = {
        ...minimalManifest,
        contracts: { modules: [{ name: 'bad', version: '1.0.0', schema: 'bad' }], schemaFormat: 'zod' },
      };
      mockContractGenerator.generate.mockRejectedValue(new Error('Generation failed'));
      const result = await scaffolder.scaffold(manifest, defaultOptions);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Contract generation failed');
    });

    it('handles ADR generation errors gracefully', async () => {
      const manifest: BlueprintManifest = { ...minimalManifest };
      mockADRGenerator.generate.mockRejectedValue(new Error('ADR failed'));
      const result = await scaffolder.scaffold(manifest, defaultOptions);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('ADR generation failed');
    });
  });
});
