import { createPluginUseCase } from '../plugin-use-case';
import type { PluginManifest } from '../plugin-use-case';

const sampleManifest: PluginManifest = {
  name: 'test-plugin',
  version: '1.0.0',
  description: 'A test plugin',
  entryPoint: './index.js',
  dependencies: [],
};

const anotherManifest: PluginManifest = {
  name: 'another-plugin',
  version: '2.0.0',
  description: 'Another plugin',
  entryPoint: './main.js',
  dependencies: ['test-plugin'],
};

describe('PluginUseCase', () => {
  const useCase = createPluginUseCase();

  beforeEach(() => {
    const plugins = useCase.listPlugins();
    for (const p of plugins.data ?? []) {
      useCase.uninstallPlugin(p.id);
    }
  });

  it('installPlugin registers plugin', () => {
    const result = useCase.installPlugin(sampleManifest);
    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.manifest.name).toBe('test-plugin');
    expect(result.data!.manifest.version).toBe('1.0.0');
    expect(result.data!.enabled).toBe(true);
    expect(result.data!.id).toMatch(/^plugin_/);

    const duplicate = useCase.installPlugin(sampleManifest);
    expect(duplicate.ok).toBe(false);
    expect(duplicate.code).toBe(1);
  });

  it('enablePlugin activates it', () => {
    const installed = useCase.installPlugin(sampleManifest);
    const id = installed.data!.id;

    useCase.disablePlugin(id);
    const result = useCase.enablePlugin(id);
    expect(result.ok).toBe(true);
    expect(result.data!.enabled).toBe(true);
    expect(result.data!.lastActivated).toBeDefined();
  });

  it('disablePlugin deactivates it', () => {
    const installed = useCase.installPlugin(sampleManifest);
    const id = installed.data!.id;

    const result = useCase.disablePlugin(id);
    expect(result.ok).toBe(true);
    expect(result.data!.enabled).toBe(false);
  });

  it('configurePlugin updates config', () => {
    const installed = useCase.installPlugin(sampleManifest);
    const id = installed.data!.id;

    const configured = useCase.configurePlugin(id, { setting1: 'value1', retries: 3 });
    expect(configured.ok).toBe(true);
    expect(configured.data!.config).toEqual({ setting1: 'value1', retries: 3 });

    const merged = useCase.configurePlugin(id, { setting1: 'override' });
    expect(merged.data!.config).toEqual({ setting1: 'override', retries: 3 });
  });

  it('listPlugins returns installed plugins', () => {
    useCase.installPlugin(sampleManifest);
    useCase.installPlugin(anotherManifest);

    const result = useCase.listPlugins();
    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(2);
  });
});
