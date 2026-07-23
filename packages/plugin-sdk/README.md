# @ideia/plugin-sdk

> Plugin SDK — sistema de plugins com sandbox, lifecycle e permissions.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/plugin-sdk
```

## Usage

```typescript
import { PluginManager, PluginRegistry, createPluginManager, createPluginRegistry, Plugin } from '@ideia/plugin-sdk';

const manager = createPluginManager();
manager.register({ name: 'my-plugin', version: '1.0.0', hooks: ['onActivate'], activate(ctx) { ctx.logger.info('active!'); }, deactivate() {} });
```

## API

- `PluginManager` — high-level plugin lifecycle management (register, unregister, fire hooks)
- `PluginRegistry` — plugin install/uninstall with sandbox and permissions
- `createPluginManager()`, `createPluginRegistry()` — factory functions
- `validateManifest()` — validates plugin manifest structure
- Types: `PluginManifest`, `PluginPermission`, `PluginHook`, `PluginAPI`, `PluginInstance`, `PluginSandbox`, `Plugin`, `PluginContext`

## License

MIT
