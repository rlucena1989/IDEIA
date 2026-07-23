import { DefaultPreferenceService } from './service';
import { DefaultPreferenceSchemaRegistry } from './schema';
import { DefaultPreferenceProviderChain, DefaultPreferenceProvider } from './providers';
import { PreferenceScope, PreferenceSchema } from './types';

export function createDefaultPreferenceService(): DefaultPreferenceService {
  const schemaRegistry = new DefaultPreferenceSchemaRegistry();
  const defaultProvider = new DefaultPreferenceProvider(PreferenceScope.Default);
  const userProvider = new DefaultPreferenceProvider(PreferenceScope.User);
  const workspaceProvider = new DefaultPreferenceProvider(PreferenceScope.Workspace);
  const folderProvider = new DefaultPreferenceProvider(PreferenceScope.Folder);

  const chain = new DefaultPreferenceProviderChain([
    defaultProvider,
    userProvider,
    workspaceProvider,
    folderProvider,
  ]);

  const service = new DefaultPreferenceService(schemaRegistry, chain);

  const builtinSchema: PreferenceSchema = {
    id: 'builtin',
    title: 'Built-in Preferences',
    properties: [
      { key: 'editor.tabSize', type: 'number', default: 4, minimum: 1, maximum: 16 },
      { key: 'editor.insertSpaces', type: 'boolean', default: true },
      { key: 'editor.fontSize', type: 'number', default: 14, minimum: 8, maximum: 48 },
      { key: 'editor.wordWrap', type: 'string', default: 'off', enum: ['off', 'on', 'wordWrapColumn'] },
      { key: 'editor.lineNumbers', type: 'string', default: 'on', enum: ['on', 'off', 'relative'] },
      { key: 'editor.minimap', type: 'boolean', default: true },
      { key: 'editor.formatOnSave', type: 'boolean', default: true },
      { key: 'editor.autoSave', type: 'string', default: 'afterDelay', enum: ['off', 'afterDelay', 'onFocusChange', 'onWindowChange'] },
      { key: 'editor.autoSaveDelay', type: 'number', default: 1000, minimum: 500 },
      { key: 'files.autoSave', type: 'string', default: 'afterDelay', enum: ['off', 'afterDelay', 'onFocusChange'] },
      { key: 'workbench.colorTheme', type: 'string', default: 'ideia-dark' },
      { key: 'ideia.autonomyLevel', type: 'number', default: 1, minimum: 0, maximum: 4 },
      { key: 'ideia.qualityGate.enabled', type: 'boolean', default: true },
    ],
  };

  schemaRegistry.register(builtinSchema);

  return service;
}
