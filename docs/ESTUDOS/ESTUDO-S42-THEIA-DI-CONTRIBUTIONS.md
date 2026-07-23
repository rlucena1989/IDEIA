# ESTUDO S42 — Theia Dependency Injection, Contributions & Extension Points

> **Arquitetura de injecao de dependencia baseada em InversifyJS, sistema de contribuicoes e pontos de extensao na plataforma Theia**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial — Inversify DI, ContributionProvider, Command/Menu/Keybinding, extension points, custom contributions |

---

## Sumario

1. [Introducao](#1-introducao)
2. [InversifyJS Deep Dive](#2-inversifyjs-deep-dive)
3. [Theia DI Container Hierarchy](#3-theia-di-container-hierarchy)
4. [Binding Pattern](#4-binding-pattern)
5. [Module System](#5-module-system)
6. [Contribution Points](#6-contribution-points)
7. [Core Contribution Categories](#7-core-contribution-categories)
8. [Command System](#8-command-system)
9. [Menu System](#9-menu-system)
10. [Keybinding System](#10-keybinding-system)
11. [Extension Points](#11-extension-points)
12. [Custom Contribution Pattern](#12-custom-contribution-pattern)
13. [Async Bindings & Lazy Loading](#13-async-bindings--lazy-loading)
14. [Code Examples](#14-code-examples)
15. [Conexoes](#15-conexoes)
16. [Plano de Implementacao](#16-plano-de-implementacao)

---

## 1. Introducao

### 1.1 Why Dependency Injection Is Central to Theia

Theia is built from the ground up on InversifyJS, an inversion-of-control (IoC) container for TypeScript. Unlike VS Code, which uses a service locator pattern (vscode.ExtensionContext.subscriptions + imperative activation), Theia treats DI as a first-class architectural principle. Every service, widget, command, menu item, keybinding, preference, theme, language feature, and editor contribution in Theia is registered through the DI container.

```
VS Code (Service Locator):
  Extension activates
    -> calls vscode.commands.registerCommand(...)
    -> calls vscode.window.createTreeView(...)
    -> calls vscode.languages.registerCompletionItemProvider(...)
  State lives in imperative registries

Theia (Dependency Injection):
  Module loads
    -> binds CommandContribution to container
    -> binds TreeViewContribution to container
    -> binds LanguageContribution to container
  Container resolves contributions at startup
  Registries query container for all bindings
```

### 1.2 Contrast with Service Locator

| Aspecto | Theia (DI) | VS Code (Service Locator) |
|---------|-----------|--------------------------|
| Registration | Declarative via bind() | Imperative via API calls |
| Lifecycle | Container-managed (singleton/transient) | Extension lifecycle (activate/deactivate) |
| Override | rebind() replaces any binding | Contributions can be disabled, not replaced |
| Testability | Mock bindings in test container | Sinon/stub on globals |
| Tooling | Inversify types at compile time | Dynamic JS API |
| Composition | ContainerModule aggregates bindings | package.json contributes[] |

### 1.3 How DI Enables Extensibility

The extensibility model is straightforward: any package declares one or more ContainerModules that bind interfaces to implementations. The host application loads these modules into its container. When the application needs a set of contributions (e.g. all commands), it asks the container for all bindings of type CommandContribution.

```
Application Container
  |
  +-- ContainerModule A (commands)
  |     bind(CommandContribution).to(MyCommand)
  |
  +-- ContainerModule B (views)
  |     bind(ViewContribution).to(MyView)
  |
  +-- ContainerModule C (editor)
        bind(EditorContribution).to(MyEditor)

At startup:
  registry.getAll(CommandContribution) -> [MyCommand, ...]
```

This is fundamentally different from enumerating extensions in a manifest and calling activation functions. In Theia, the container IS the manifest -- the act of binding IS the declaration of extension.

---

## 2. InversifyJS Deep Dive

### 2.1 Core Concepts

InversifyJS is a lightweight (4KB) IoC container for TypeScript with full reflection support via reflect-metadata.

```
+---------------------------------------------------------------+
|                        InversifyJS                             |
|                                                               |
|  Container -- the central registry                             |
|    |-- bind(ServiceIdentifier).to(Constructor)                |
|    |-- rebind(...) -- replaces existing binding                |
|    |-- unbind(...) -- removes binding                          |
|    |-- get(T) -- resolves one instance                         |
|    |-- getAll(T) -- resolves all bound instances               |
|    |-- isBound(T) -- checks if binding exists                  |
|    |-- snapshot() / restore() -- for testing                   |
|                                                               |
|  Request -- resolution chain                                   |
|    |-- plan -- the resolution tree                             |
|    |-- context -- scoped resolution data                       |
|                                                               |
|  Middleware -- intercept every resolution                      |
|    |-- applyMiddleware(fn)                                     |
|                                                               |
|  Decorators                                                    |
|    |-- @injectable() -- marks class as injectable              |
|    |-- @inject(T) -- declares dependency                       |
|    |-- @multiInject(T) -- declares collection dependency       |
|    |-- @named(s) -- names a binding                            |
|    |-- @tagged(k, v) -- tags a binding                         |
|    |-- @unmanaged() -- bypasses DI for constructor params      |
|    |-- @postConstruct() -- lifecycle hook after construction   |
+---------------------------------------------------------------+
```

### 2.2 Container API

```typescript
import { Container } from 'inversify';

const container = new Container();

// Basic binding
container.bind<MyService>(TYPES.MyService).to(MyServiceImpl);

// Singleton scope
container.bind<ConfigService>(TYPES.Config).to(ConfigService).inSingletonScope();

// Self-binding (class = service identifier)
container.bind(Logger).toSelf().inSingletonScope();

// Constant / value binding
container.bind<string>(TYPES.AppName).toConstantValue('IDEIA');

// Dynamic value (factory function, evaluated at resolution time)
container.bind<number>(TYPES.Timestamp).toDynamicValue(() => Date.now());

// Factory
container.bind<interfaces.Factory<Logger>>(TYPES.LoggerFactory)
  .toFactory<Logger>((context) => {
    return (name: string) => new Logger(name);
  });

// Provider (async factory)
container.bind<interfaces.Provider<Database>>(TYPES.DbProvider)
  .toProvider<Database>((context) => {
    return async () => {
      const db = new Database();
      await db.connect();
      return db;
    };
  });
```

### 2.3 Named and Tagged Bindings

Named bindings allow multiple implementations of the same interface to coexist:

```typescript
container.bind<LanguageServer>(TYPES.LanguageServer)
  .to(TypeScriptLS).whenTargetNamed('typescript');

container.bind<LanguageServer>(TYPES.LanguageServer)
  .to(PythonLS).whenTargetNamed('python');

// Resolution
const tsLS = container.getNamed<LanguageServer>(TYPES.LanguageServer, 'typescript');
```

Tagged bindings add arbitrary metadata:

```typescript
container.bind<Contribution>(TYPES.Contribution)
  .to(MyContribution).whenTargetTagged('priority', 100);

container.bind<Contribution>(TYPES.Contribution)
  .to(OtherContribution).whenTargetTagged('priority', 50);
```

### 2.4 Resolution Tree and Context

Each resolution creates a plan (the dependency graph) and a context:

```
get(ServiceA)
  |
  +-- resolve(ServiceA)
  |     |
  |     +-- inject(ServiceB)
  |     |     |
  |     |     +-- resolve(ServiceB) -- singleton, already cached
  |     |
  |     +-- inject(ServiceC)
  |           |
  |           +-- resolve(ServiceC)
  |                 |
  |                 +-- inject(Logger) -- transient, new instance
  |
  +-- returns ServiceA instance
```

The request object exposes the full resolution chain:

```typescript
interface Request {
  serviceIdentifier: ServiceIdentifier;
  bindings: Binding[];
  childRequests: Request[];
  parentRequest: Request | null;
  target: Target;
}
```

### 2.5 Middleware and Interceptors

Inversify supports middleware that intercepts every resolution:

```typescript
container.applyMiddleware((planAndResolve: PlanAndResolve) => {
  return (next: (args: PlanAndResolveArgs) => unknown) => {
    return (args: PlanAndResolveArgs) => {
      console.log(`Resolving: ${args.serviceIdentifier}`);
      const result = next(args);
      console.log(`Resolved: ${result}`);
      return result;
    };
  };
});
```

Theia uses this sparingly -- mostly for logging and debugging -- but packages like `@theia/core` use middleware for tracking contribution activation order.

### 2.6 Activation and Deactivation Handlers

```typescript
container.onActivation(Logger, (context, instance) => {
  console.log(`Logger activated: ${instance.constructor.name}`);
  return instance;
});

container.onDeactivation(Logger, (instance) => {
  console.log(`Logger deactivated`);
  instance.dispose();
});
```

---

## 3. Theia DI Container Hierarchy

### 3.1 Container Architecture

Theia uses a parent-child container hierarchy to isolate different parts of the application.

```
Root Container (@theia/core)
  |
  +-- Frontend Container (injected into browser/electron-renderer)
  |     |
  |     +-- Child containers for each loaded extension module
  |     |     |
  |     |     +-- Extension A ContainerModule(s)
  |     |     +-- Extension B ContainerModule(s)
  |     |
  |     +-- Electron-specific container (if Electron shell)
  |
  +-- Backend Container (injected into node process)
        |
        +-- Child containers for each backend extension module
              |
              +-- Extension A Backend ContainerModule(s)
              +-- Extension B Backend ContainerModule(s)
```

### 3.2 Frontend Container

The frontend DI container is created by the shell (browser or Electron) and populated with frontend modules. Key services registered in the frontend container:

| Service | Interface | Purpose |
|---------|-----------|---------|
| CommandRegistry | CommandRegistry | Manages all commands |
| MenuModelRegistry | MenuModelRegistry | Builds menu structure |
| KeybindingRegistry | KeybindingRegistry | Manages keyboard shortcuts |
| PreferenceService | PreferenceService | Reads/writes preferences |
| WidgetManager | WidgetManager | Creates and manages widgets |
| ApplicationShell | ApplicationShell | Main layout shell |
| StorageService | StorageService | Persistent local storage |

Construction:

```typescript
// Simplified: how @theia/core creates the frontend container
import { Container } from 'inversify';
import { FrontendApplication } from '@theia/core/lib/browser';

async function createFrontendContainer(): Promise<Container> {
  const container = new Container();
  container.load(await getFrontendModules());
  // FrontendApplication is the entry point
  return container;
}
```

### 3.3 Backend Container

The backend container runs in a Node.js process and manages server-side services:

| Service | Interface | Purpose |
|---------|-----------|---------|
| BackendApplication | BackendApplication | Application lifecycle |
| FileSystem | FileSystem | File I/O |
| ConnectionContainer | ConnectionContainer | Manages frontend-backend connections |
| EnvVariablesServer | EnvVariablesServer | Environment variables |
| ProcessManager | ProcessManager | Spawns child processes |

Construction:

```typescript
// Simplified: backend container creation
import { Container } from 'inversify';
import { BackendApplication } from '@theia/core/lib/node';

async function createBackendContainer(): Promise<Container> {
  const container = new Container();
  container.load(await getBackendModules());
  return container;
}
```

### 3.4 Child Containers

Extensions and plugins receive their own child containers:

```typescript
// Each extension gets a child container from the parent
const extensionContainer = frontendContainer.createChild();
extensionContainer.load(extensionModule);

// Child container inherits parent bindings
// Can override bindings locally
extensionContainer.bind<MyService>(TYPES.MyService).to(MyOverride);
// Parent still has original MyService, child uses MyOverride
```

### 3.5 ContributionProvider Pattern

The ContributionProvider is Theia's mechanism for collecting all implementations of a given interface from the container:

```typescript
// How ContributionProvider works
import { interfaces, Container } from 'inversify';

type ContributionProvider<T> = () => T[];

function createContributionProvider<T>(
  container: Container,
  serviceIdentifier: interfaces.ServiceIdentifier<T>
): ContributionProvider<T> {
  return () => {
    if (container.isBound(serviceIdentifier)) {
      return container.getAll(serviceIdentifier);
    }
    return [];
  };
}

// Theia wraps this with caching and ordering
// See: @theia/core/lib/common/contribution-provider
```

The actual Theia implementation uses a dynamic value that queries the container:

```typescript
// @theia/core contribution-provider.ts (simplified)
container.bind<ContributionProvider<CommandContribution>>(TYPES.ContributionProvider)
  .toDynamicValue((ctx) => {
    return {
      getContributions(): CommandContribution[] {
        const container = ctx.container;
        if (container.isBound(TYPES.CommandContribution)) {
          return container.getAll(TYPES.CommandContribution);
        }
        return [];
      }
    };
  });
```

---

## 4. Binding Pattern

### 4.1 Standard Binding Patterns

| Pattern | Code | Use Case |
|---------|------|----------|
| Interface to class | `bind(I).to(Impl)` | Standard service |
| Self-binding | `bind(Cls).toSelf()` | Class as its own identifier |
| Singleton | `bind(I).to(Impl).inSingletonScope()` | Shared state |
| Transient | `bind(I).to(Impl).inTransientScope()` | New instance per injection |
| Constant value | `bind(I).toConstantValue(obj)` | Config, singletons |
| Dynamic value | `bind(I).toDynamicValue(ctx => ...)` | Factory at resolution |
| Factory | `bind(I).toFactory(ctx => ...)` | Parameterized creation |
| Provider | `bind(I).toProvider(ctx => async () => ...)` | Async creation |
| Auto-bind | `bind(I).to(Impl).inSingletonScope().autoBind()` | Automatic DI |

### 4.2 Theia-Specific Binding Helpers

```typescript
import { bindContributionProvider } from '@theia/core/lib/common/contribution-provider';

// Registers a contribution provider for a given type
// This is equivalent to creating a dynamic value that does getAll()
bindContributionProvider(bind, TYPES.CommandContribution);
// This adds: bind(ContributionProvider<CommandContribution>).toDynamicValue(...)

// After calling bindContributionProvider, you can inject:
// @inject(ContributionProvider<CommandContribution>)
// private readonly commands: ContributionProvider<CommandContribution>;
```

### 4.3 Frontend-Specific Binding Patterns

```typescript
// Frontend only
import { FrontendApplicationContribution } from '@theia/core/lib/browser';

bind(FrontendApplicationContribution).to(MyAppContribution);
// Theia core calls getAll(FrontendApplicationContribution) at startup

// Widget factory
bind(WidgetFactory).toDynamicValue((ctx) => ({
  id: 'my-widget',
  createWidget: () => ctx.container.get(MyWidget)
}));
```

### 4.4 Backend-Specific Binding Patterns

```typescript
// Backend only
import { BackendApplicationContribution } from '@theia/core/lib/node';

bind(BackendApplicationContribution).to(MyBackendContribution);
// Called once at backend startup
```

---

## 5. Module System

### 5.1 ContainerModule

The ContainerModule is the unit of DI packaging. Every Theia extension exports one or more ContainerModules:

```typescript
import { ContainerModule } from 'inversify';
import { bindContributionProvider } from '@theia/core/lib/common/contribution-provider';
import { CommandContribution, MenuContribution, KeybindingContribution } from '@theia/core/lib/common';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
  // Contribution provider registration
  bindContributionProvider(bind, Symbol.for('MyCustomContribution'));

  // Contributions
  bind(CommandContribution).to(MyCommandContribution);
  bind(MenuContribution).to(MyMenuContribution);
  bind(KeybindingContribution).to(MyKeybindingContribution);

  // Services
  bind<MyService>(TYPES.MyService).to(MyServiceImpl).inSingletonScope();

  // Widget
  bind(MyWidget).toSelf();
  bind(WidgetFactory).toDynamicValue((ctx) => ({
    id: MyWidget.ID,
    createWidget: () => ctx.container.get(MyWidget)
  }));
});
```

### 5.2 Module Categories

Theia defines three types of ContainerModules:

| Category | File Convention | Loaded In | Purpose |
|----------|----------------|-----------|---------|
| Frontend | `*-frontend-module.ts` | Frontend container | Widgets, commands, menus, keybindings, preferences |
| Backend | `*-backend-module.ts` | Backend container | Services, file system, processes, connections |
| Common | `*-common-module.ts` | Both containers | Shared types, interfaces, constants |

### 5.3 Frontend Modules

A frontend module typically handles UI contributions:

```typescript
// my-extension-frontend-module.ts
import { ContainerModule } from 'inversify';
import { WidgetFactory, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { CommandContribution, MenuContribution, KeybindingContribution } from '@theia/core/lib/common';

import { MyWidget, MyWidgetContribution } from './my-widget';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
  // Widget registration
  bind(MyWidget).toSelf();
  bind(WidgetFactory).toDynamicValue((ctx) => ({
    id: MyWidget.ID,
    createWidget: () => ctx.container.get(MyWidget)
  }));

  // Commands, menus, keybindings
  bind(CommandContribution).to(MyWidgetContribution);
  bind(MenuContribution).to(MyWidgetContribution);
  bind(KeybindingContribution).to(MyWidgetContribution);

  // Application lifecycle
  bind(FrontendApplicationContribution).to(MyWidgetContribution);
});
```

### 5.4 Backend Modules

Backend modules register server-side services:

```typescript
// my-extension-backend-module.ts
import { ContainerModule } from 'inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common/messaging';

import { MyBackendService, MY_BACKEND_PATH } from './my-backend-service';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
  bind(MyBackendService).toSelf().inSingletonScope();
  bind(BackendApplicationContribution).to(MyBackendService);

  bind(ConnectionHandler).toDynamicValue((ctx) =>
    new JsonRpcConnectionHandler(MY_BACKEND_PATH, () => {
      return ctx.container.get(MyBackendService);
    })
  );
});
```

### 5.5 Module Composition in package.json

Theia extensions declare their frontend and backend modules in `package.json`:

```json
{
  "name": "my-extension",
  "theiaExtensions": [
    {
      "frontend": "lib/my-extension-frontend-module",
      "backend": "lib/my-extension-backend-module"
    }
  ]
}
```

Theia's module loader reads `theiaExtensions` from all installed packages, loads the modules, and injects them into the appropriate containers.

Multiple modules per extension:

```json
{
  "theiaExtensions": [
    {
      "frontend": "lib/frontend-module-1",
      "backend": "lib/backend-module-1"
    },
    {
      "frontend": "lib/frontend-module-2"
    }
  ]
}
```

### 5.6 Module Loading Sequence

```
1. Theia CLI builds application (theia build)
2. Scans node_modules for package.json with theiaExtensions
3. Collects all frontend module paths
4. Collects all backend module paths
5. Generates frontend/index.js:
     import module1 from 'ext1/frontend-module'
     import module2 from 'ext2/frontend-module'
     export default [module1, module2]
6. Generated code loads modules into container:
     const modules = await import('./frontend/index.js');
     container.load(...modules.default);
```

---

## 6. Contribution Points

### 6.1 ContributionProvider Mechanism

The ContributionProvider is the backbone of Theia's extensibility. It provides a way to collect all implementations of a given interface from the DI container.

```
Defined by extension authors:
  bind(CommandContribution).to(MyCommandContribution)
  bind(CommandContribution).to(OtherCommandContribution)

Used by framework:
  @inject(ContributionProvider<CommandContribution>)
  private readonly commands: ContributionProvider<CommandContribution>;

  initialize() {
    const allCommands = this.commands.getContributions();
    for (const cmd of allCommands) {
      cmd.registerCommands(this.registry);
    }
  }
```

### 6.2 ContributionProvider Implementation

```typescript
// @theia/core/lib/common/contribution-provider.ts (conceptual)
export type ContributionProvider<T extends object> = {
  getContributions(): T[];
};

export function bindContributionProvider<T extends object>(
  bind: interfaces.Bind,
  id: interfaces.ServiceIdentifier<T>
): void {
  bind(ContributionProvider<T>)
    .toDynamicValue((ctx) => ({
      getContributions: () => {
        const container = ctx.container;
        if (container.isBound(id)) {
          const contributions = container.getAll(id);
          // Sort by optional priority
          return contributions.sort((a, b) => {
            const pa = Reflect.getOwnMetadata('priority', a.constructor) ?? 0;
            const pb = Reflect.getOwnMetadata('priority', b.constructor) ?? 0;
            return pb - pa;
          });
        }
        return [];
      }
    }))
    .inSingletonScope();
}
```

### 6.3 Multi-Injection Pattern

Theia uses `@multiInject` for cases where the consumer directly wants all instances without the ContributionProvider wrapper:

```typescript
@injectable()
class CommandRegistry {
  constructor(
    @multiInject(CommandContribution)
    private readonly contributions: CommandContribution[]
  ) {}

  initialize() {
    for (const contribution of this.contributions) {
      contribution.registerCommands(this);
    }
  }
}
```

However, the ContributionProvider pattern is preferred because it provides lazy resolution and works consistently with child containers.

### 6.4 Contribution Ordering and Priority

Contributions can declare priority via metadata:

```typescript
// High priority contribution
@injectable()
class CoreCommandContribution implements CommandContribution {
  registerCommands(registry: CommandRegistry): void { ... }
}
// Priority is set via Reflect.metadata at application startup
Reflect.defineMetadata('priority', 1000, CoreCommandContribution);

// Lower priority
@injectable()
class PluginCommandContribution implements CommandContribution {
  registerCommands(registry: CommandRegistry): void { ... }
}
Reflect.defineMetadata('priority', 500, PluginCommandContribution);
```

Theia does not have a built-in priority decorator -- each contribution category defines its own ordering mechanism. For example, menus use `order` strings (like VS Code's `@sort` syntax), and keybindings use a conflict resolution system.

### 6.5 Contribution Enablement

Contributions can be conditionally enabled. Theia supports a `when` clause context that determines whether a contribution is active:

```typescript
interface CommandContribution {
  registerCommands(commands: CommandRegistry): void;
}

// Command with when clause
const command: Command = {
  id: 'my-extension.doSomething',
  label: 'Do Something'
};

// When registering, specify context
registry.registerCommand(command, {
  execute: () => { ... },
  isEnabled: (context: Context) => context.matches('editorFocus && !editorReadonly')
});
```

For full contribution enablement, the `when` clause is evaluated against `ContextService` which tracks UI state.

---

## 7. Core Contribution Categories

### 7.1 Overview

| Category | Interface | Registry | Registration Method |
|----------|-----------|----------|-------------------|
| Commands | CommandContribution | CommandRegistry | registerCommands() |
| Menus | MenuContribution | MenuModelRegistry | registerMenus() |
| Keybindings | KeybindingContribution | KeybindingRegistry | registerKeybindings() |
| Preferences | PreferenceContribution | PreferenceService | registerPreferences() |
| Themes | ThemeContribution | ThemeService | registerThemes() |
| Views | ViewContribution | WidgetManager | registerViews() |
| WidgetFactory | WidgetFactory | WidgetManager | createWidget() |
| Editor | EditorContribution | EditorManager | registerEditorContribution() |
| Language | LanguageContribution | LanguageServerProvider | registerLanguage() |
| Task | TaskProvider | TaskService | registerTaskProvider() |

### 7.2 Contribution Lifecycle

```
Application Start
  |
  +-- Container loads all modules
  |
  +-- For each contribution category:
  |     registry = container.get(Registry)
  |     contributions = container.getAll(ContributionInterface)
  |     for (c of contributions):
  |       c.registerXxx(registry)
  |
  +-- Application ready
  |
  +-- Runtime:
  |     User triggers action
  |     -> Registry looks up handler
  |     -> Executes
  |
  +-- Shutdown:
        Contributions can implement onStop()
```

### 7.3 ContributionProvider Usage Pattern

All core contribution categories follow the same pattern:

```typescript
// 1. Define interface
export interface MyContribution {
  registerSomething(registry: SomeRegistry): void;
}

// 2. Bind contribution type
// In the module that defines the registry:
bindContributionProvider(bind, MyContribution);

// 3. Registry uses contribution provider
@injectable()
class SomeRegistry {
  constructor(
    @inject(ContributionProvider<MyContribution>)
    private readonly contributions: ContributionProvider<MyContribution>
  ) {}

  initialize() {
    for (const c of this.contributions.getContributions()) {
      c.registerSomething(this);
    }
  }
}

// 4. Extension authors implement and bind
bind(MyContribution).to(MyImplementation);
```

---

## 8. Command System

### 8.1 Command Interface

```typescript
// @theia/core/lib/common/command.ts
export interface Command {
  id: string;
  label?: string;
  category?: string;
  iconClass?: string;
  shortcut?: string;
}

// Extended for registered commands
export interface CommandHandler {
  execute(...args: any[]): any;
  isEnabled?(...args: any[]): boolean;
  isVisible?(...args: any[]): boolean;
  isToggled?(...args: any[]): boolean;
}
```

### 8.2 CommandRegistry

The CommandRegistry is the central registry for all commands:

```typescript
@injectable()
export class CommandRegistry {
  // Register a command definition
  registerCommand(command: Command, handler?: CommandHandler): Disposable;

  // Register or update a handler for an existing command
  registerHandler(commandId: string, handler: CommandHandler): Disposable;

  // Execute a command
  executeCommand<T>(commandId: string, ...args: any[]): Promise<T | undefined>;

  // Check command state
  isEnabled(commandId: string, ...args: any[]): boolean;
  isVisible(commandId: string, ...args: any[]): boolean;
  isToggled(commandId: string, ...args: any[]): boolean;
}
```

### 8.3 Command Registration

Commands are registered through CommandContribution:

```typescript
import { Command, CommandContribution, CommandRegistry } from '@theia/core/lib/common';

export const MY_COMMAND: Command = {
  id: 'my-extension.myCommand',
  label: 'My Command',
  category: 'My Extension'
};

@injectable()
export class MyCommandContribution implements CommandContribution {
  registerCommands(registry: CommandRegistry): void {
    registry.registerCommand(MY_COMMAND, {
      execute: () => {
        // Command implementation
        console.log('My command executed');
      },
      isEnabled: () => true,
      isVisible: () => true
    });
  }
}
```

### 8.4 Commands with Arguments

```typescript
export const OPEN_FILE_COMMAND: Command = {
  id: 'my-extension.openFile',
  label: 'Open File'
};

registry.registerCommand(OPEN_FILE_COMMAND, {
  execute: (filePath: string, line?: number) => {
    // Open file at optional line
    editorService.open(filePath, { line });
  }
});

// Execution with args
await commands.executeCommand('my-extension.openFile', '/path/to/file.ts', 42);
```

### 8.5 Toggle Commands

```typescript
export const TOGGLE_PREVIEW_COMMAND: Command = {
  id: 'my-extension.togglePreview',
  label: 'Toggle Preview'
};

registry.registerCommand(TOGGLE_PREVIEW_COMMAND, {
  execute: () => {
    const current = previewService.isVisible();
    if (current) {
      previewService.hide();
    } else {
      previewService.show();
    }
  },
  isToggled: () => previewService.isVisible()
});
```

### 8.6 Command Palette Integration

Commands registered with a `label` automatically appear in the command palette. To exclude a command:

```typescript
registry.registerCommand(SECRET_COMMAND, {
  execute: () => { ... },
  isVisible: () => false  // Hidden from palette
});
```

---

## 9. Menu System

### 9.1 MenuModelRegistry

The MenuModelRegistry builds a tree of menu nodes from contributions:

```typescript
@injectable()
export class MenuModelRegistry {
  // Register a menu path
  registerMenuAction(menuPath: MenuPath, action: MenuAction): Disposable;

  // Register a submenu
  registerSubmenu(menuPath: MenuPath, label: string): Disposable;
}
```

### 9.2 Menu Paths

Menu paths use arrays of strings to define menu location:

```typescript
// Built-in menu paths
import { MAIN_MENU_BAR } from '@theia/core/lib/common/menu';

// Main menu bar structure
MAIN_MENU_BAR  // []
  // File menu
  ['1_file']
    ['1_file/1_new']
    ['1_file/2_open']
    ['1_file/3_save']
    ['1_file/4_close']
    ['1_file/9_settings']

  // Edit menu
  ['2_edit']
    ['2_edit/1_undo']
    ['2_edit/2_cut']
    ['2_edit/3_copy']
    ['2_edit/4_paste']
    ['2_edit/5_find']

  // View menu
  ['3_view']
  // Navigate
  ['4_navigate']
  // Help
  ['9_help']

// Context menu paths
['navigator_context_menu']
['editor_context_menu']
['editor_tab_context_menu']
['panel_context_menu']
['status_bar_context_menu']
```

### 9.3 Menu Contribution

```typescript
import { MenuContribution, MenuModelRegistry, MAIN_MENU_BAR } from '@theia/core/lib/common';
import { CommonMenus } from '@theia/core/lib/browser/common-frontend-contribution';

@injectable()
export class MyMenuContribution implements MenuContribution {
  registerMenus(menus: MenuModelRegistry): void {
    // Add to View menu
    menus.registerMenuAction(CommonMenus.VIEW_VIEWS, {
      commandId: MY_COMMAND.id,
      label: 'My View',
      order: '10'
    });

    // Add to main menu bar under custom submenu
    menus.registerSubmenu(['4_my-menu'], 'My Extension');

    menus.registerMenuAction(['4_my-menu'], {
      commandId: MY_COMMAND.id,
      order: '0'
    });

    // Context menu on navigator
    menus.registerMenuAction(['navigator_context_menu'], {
      commandId: MY_COMMAND.id,
      order: 'z_99'  // Appears at the end
    });
  }
}
```

### 9.4 Menu Sorting

```typescript
// Menus use string-based ordering
// Order values are grouped:
//   0-99   -- Core / system menus
//   100    -- Default extension menus
//   200+   -- Late menus

// Use existing menu constants from CommonMenus:
CommonMenus.FILE         // ['1_file']
CommonMenus.FILE_NEW     // ['1_file/1_new']
CommonMenus.EDIT         // ['2_edit']
CommonMenus.VIEW         // ['3_view']
CommonMenus.VIEW_VIEWS   // ['3_view/1_view']
CommonMenus.NAVIGATE     // ['4_navigate']
CommonMenus.HELP         // ['9_help']
```

### 9.5 Context Menus

```typescript
// Registering context menu contributions
menus.registerMenuAction(['navigator_context_menu'], {
  commandId: 'my-extension.doOnFile',
  label: 'Do on File',
  order: '10',
  when: 'resourceLangId == typescript'
});
```

---

## 10. Keybinding System

### 10.1 Keybinding Interface

```typescript
// @theia/core/lib/common/keybinding.ts
export interface Keybinding {
  command: string;
  keybinding: string;  // e.g. 'ctrl+shift+a', 'alt+cmd+space'
  context?: string;    // Context ID for when clause
  args?: any;          // Arguments passed to command
}
```

### 10.2 KeybindingRegistry

```typescript
@injectable()
export class KeybindingRegistry {
  registerKeybinding(keybinding: Keybinding): Disposable;
  unregisterKeybinding(keybindingOrCommand: Keybinding | string): void;
  getKeybindingsForCommand(commandId: string): Keybinding[];
  resolveKeybinding(keybinding: string): ResolvedKeybinding;
}
```

### 10.3 Keybinding Contribution

```typescript
import { KeybindingContribution, KeybindingRegistry } from '@theia/core/lib/common';

@injectable()
export class MyKeybindingContribution implements KeybindingContribution {
  registerKeybindings(registry: KeybindingRegistry): void {
    registry.registerKeybinding({
      command: MY_COMMAND.id,
      keybinding: 'ctrl+shift+m',
      context: 'editorFocus'
    });

    // With arguments
    registry.registerKeybinding({
      command: 'my-extension.openFile',
      keybinding: 'ctrl+alt+o',
      args: ['/default/path.ts']
    });
  }
}
```

### 10.4 Keybinding Contexts

Theia defines several built-in contexts:

| Context ID | Description |
|-----------|-------------|
| `editorFocus` | Editor has focus |
| `editorTextFocus` | Editor text area has focus |
| `editorTabFocus` | Editor tab has focus |
| `sidebarFocus` | Side panel has focus |
| `panelFocus` | Bottom panel has focus |
| `terminalFocus` | Terminal widget has focus |
| `dialogFocus` | Modal dialog has focus |
| `inputFocus` | Any input element has focus |
| `idle` | No special focus |

Custom contexts can be defined:

```typescript
import { ContextKeyService } from '@theia/core/lib/browser/context-key-service';

@injectable()
class MyContextKeys {
  @postConstruct()
  init(): void {
    this.contextKeyService.createKey('myExtension.active', false);
  }

  constructor(
    @inject(ContextKeyService)
    private readonly contextKeyService: ContextKeyService
  ) {}
}

// Keybinding that uses custom context
registry.registerKeybinding({
  command: MY_COMMAND.id,
  keybinding: 'ctrl+shift+m',
  context: 'myExtension.active'
});
```

### 10.5 Conflict Resolution

When multiple keybindings match the same key combination, Theia uses a precedence system:

```
1. Exact context match > general context
2. Last registered wins (by default)
3. User keybindings override extension keybindings
4. Keyboard layout aware resolution
```

Users can override keybindings:

```json
// ~/.theia/keybindings.json
[
  {
    "command": "my-extension.myCommand",
    "keybinding": "ctrl+alt+shift+m"
  }
]
```

---

## 11. Extension Points

### 11.1 Theia vs VS Code Contribution Points

| Aspect | Theia | VS Code |
|--------|-------|---------|
| Declaration | DI Container bindings | package.json contributes |
| Loading | Module import at startup | Activation events |
| Resolution | Container.getAll() | Extension host API |
| Override | rebind() in modules | Disable extension |
| Isolation | Child containers | Process isolation |

### 11.2 How Theia Maps Contributions to DI Modules

Theia's `theiaExtensions` in package.json is the entry point:

```json
{
  "theiaExtensions": [
    {
      "frontend": "lib/frontend-module",
      "backend": "lib/backend-module"
    }
  ],
  "contributes": {
    "commands": [],
    "menus": {},
    "keybindings": [],
    "languages": [],
    "themes": [],
    "views": {},
    "viewsContainers": {}
  }
}
```

The `contributes` field is parsed by Theia's VS Code extension compatibility layer and translated into DI bindings. Native Theia extensions skip the `contributes` field and use ContainerModules directly.

### 11.3 Contribution Loading Order

```
1. Core (@theia/core) modules loaded first
2. Core extensions (@theia/*, ordered by dependency graph)
3. Application-specific modules
4. VS Code extensions (via @theia/plugin-ext)
```

Within each tier, modules are loaded in topological order based on `dependencies` in package.json.

### 11.4 Extension Isolation

Theia uses child containers for isolation. Each extension's module is loaded into a child container, preventing direct interference:

```typescript
// Each extension gets:
// 1. A child container
// 2. Its bindings are scoped to that child
// 3. Parent bindings are visible
// 4. But extension cannot unbind/rebind parent bindings

// Effect: extension A cannot break extension B
// Effect: extension A can override behavior for its own scope
```

For full isolation (process-level), Theia supports the extension host pattern, where VS Code-compatible extensions run in a separate process with a JSON-RPC bridge.

### 11.5 Package.json Contributes Parsing

```typescript
// @theia/plugin-ext parses contributes sections
interface VSCodeExtensionManifest {
  contributes?: {
    commands?: VSCommand[];
    menus?: { [menuId: string]: VSMenuItem[] };
    keybindings?: VSKeybinding[];
    languages?: VSLanguage[];
    themes?: VSTheme[];
    views?: { [viewContainerId: string]: VSView[] };
    viewsContainers?: VSViewContainer[];
    configuration?: VSConfiguration;
    snippets?: VSSnippet[];
  };
}

// These are converted to Theia contributions by plugin-ext
// The adapter layer:
//   contributes.commands -> bind(CommandContribution).to(VSAdapter)
//   contributes.menus    -> bind(MenuContribution).to(VSAdapter)
//   etc.
```

---

## 12. Custom Contribution Pattern

### 12.1 Creating a Custom Contribution Type

IDEIA can define custom contribution types for its own extension system:

```typescript
// 1. Define contribution interface
export interface AgentContribution {
  readonly agentId: string;
  readonly capabilities: string[];
  contribute(context: AgentContributionContext): void;
}

export interface AgentContributionContext {
  registerSkill(skill: AgentSkill): void;
  registerTool(tool: AgentTool): void;
  getConfig(): Record<string, unknown>;
}

// 2. Define service identifier
export const AgentContribution = Symbol.for('AgentContribution');

// 3. Create contribution provider binding
import { bindContributionProvider } from '@theia/core/lib/common/contribution-provider';

export function bindAgentContributionProvider(bind: interfaces.Bind): void {
  bindContributionProvider(bind, AgentContribution);
}

// 4. Create registry that consumes contributions
@injectable()
export class AgentRegistry {
  constructor(
    @inject(ContributionProvider<AgentContribution>)
    private readonly agents: ContributionProvider<AgentContribution>
  ) {}

  @postConstruct()
  initialize(): void {
    const context = this.createContext();
    for (const agent of this.agents.getContributions()) {
      agent.contribute(context);
    }
  }

  private createContext(): AgentContributionContext {
    return {
      registerSkill: (skill) => this.skills.add(skill),
      registerTool: (tool) => this.tools.set(tool.id, tool),
      getConfig: () => this.config
    };
  }
}

// 5. Extension authors implement
@injectable()
class CodeReviewAgent implements AgentContribution {
  readonly agentId = 'code-review';
  readonly capabilities = ['review', 'lint'];

  contribute(context: AgentContributionContext): void {
    context.registerSkill({
      name: 'review-pull-request',
      execute: async (pr: PRDetails) => { ... }
    });
  }
}

// 6. Extension module binds
export default new ContainerModule((bind) => {
  bindAgentContributionProvider(bind);
  bind(AgentContribution).to(CodeReviewAgent);
});
```

### 12.2 Contribution Registration

Custom contributions follow the same lifecycle as core contributions:

```typescript
// Lifecycle hooks
export interface ContributionLifecycle {
  onRegister?(): void;
  onUnregister?(): void;
  onStart?(): void;
  onStop?(): void;
}

// The registry should call these at appropriate times
class CustomRegistry {
  initialize(): void {
    for (const c of this.contributions.getContributions()) {
      c.onRegister?.();
    }
  }

  start(): void {
    for (const c of this.contributions.getContributions()) {
      c.onStart?.();
    }
  }

  dispose(): void {
    for (const c of this.contributions.getContributions()) {
      c.onStop?.();
      c.onUnregister?.();
    }
  }
}
```

### 12.3 IDEIA-Specific Contributions

The IDEIA platform defines its own contribution types:

| Contribution | Interface | Purpose |
|-------------|-----------|---------|
| Agent | AgentContribution | Register AI agent skills and tools |
| Workflow | WorkflowContribution | Define execution workflows |
| Intelligence | IntelligenceContribution | Pattern detectors, intent classifiers |
| Delivery | DeliveryContribution | Deploy pipelines, quality gates |
| Memory | MemoryContribution | Memory providers, storage backends |
| Security | SecurityContribution | Policy rules, validators |

---

## 13. Async Bindings & Lazy Loading

### 13.1 Dynamic Module Loading

Modules can be loaded dynamically at runtime:

```typescript
import { ContainerModule } from 'inversify';

async function loadExtensionModule(container: Container, modulePath: string): Promise<void> {
  const mod = await import(modulePath);
  const module: ContainerModule = mod.default;
  container.load(module);
}

// Usage: load extension on demand
async function activateExtension(extensionId: string): Promise<void> {
  const config = extensionRegistry.get(extensionId);
  if (!config.frontendModule) return;

  const childContainer = frontendContainer.createChild();
  await loadExtensionModule(childContainer, config.frontendModule);
  // Extension is now active
}
```

### 13.2 Lazy Contribution Activation

Instead of loading all contributions at startup, contributions can be activated lazily:

```typescript
// Lazy contribution provider that only resolves when first accessed
function createLazyContributionProvider<T>(
  container: Container,
  id: interfaces.ServiceIdentifier<T>
): ContributionProvider<T> {
  let resolved: T[] | null = null;

  return {
    getContributions: () => {
      if (resolved === null) {
        resolved = container.isBound(id) ? container.getAll(id) : [];
      }
      return resolved;
    }
  };
}

// Bind as singleton so cache persists
bind(ContributionProvider<T>)
  .toDynamicValue((ctx) => createLazyContributionProvider(ctx.container, id))
  .inSingletonScope();
```

### 13.3 Deferred Binding Resolution

Deferred resolution allows bindings to be satisfied after container creation:

```typescript
// Deferred binding: interface is bound, implementation is provided later
container.bind<DeferredService>(TYPES.Deferred)
  .toDynamicValue((ctx) => {
    // Return a proxy that waits for the real implementation
    return new Proxy({}, {
      get: (target, prop) => {
        // Wait for implementation to be bound
        if (!ctx.container.isBound(TYPES.DeferredImpl)) {
          throw new Error('DeferredService not yet implemented');
        }
        const impl = ctx.container.get(TYPES.DeferredImpl);
        return (impl as any)[prop];
      }
    });
  });

// Later, another module binds the implementation
container.bind<RealService>(TYPES.DeferredImpl).toSelf().inSingletonScope();
// Now deferred service proxy delegates to RealService
```

### 13.4 Async Initialization Pattern

```typescript
@injectable()
class AsyncInitializedService {
  private ready: Promise<void>;

  @postConstruct()
  init(): void {
    this.ready = this.initializeAsync();
  }

  private async initializeAsync(): Promise<void> {
    // Connect to database, load config, etc.
    await this.db.connect();
    await this.cache.warmUp();
  }

  async waitForReady(): Promise<void> {
    await this.ready;
  }
}
```

### 13.5 Load On-Demand with ContainerModule Deferred

```typescript
// Extension that loads heavy modules only when needed
@injectable()
class LazyExtensionLoader {
  constructor(
    @inject(Container) private readonly container: Container
  ) {}

  async loadHeavyFeature(): Promise<void> {
    const mod = await import('./heavy-feature-module');
    this.container.load(mod.default);
  }
}
```

---

## 14. Code Examples

### 14.1 Full Extension Structure

```typescript
// --- my-extension/src/common/index.ts ---
export const MyService = Symbol.for('MyService');

export interface MyService {
  greet(name: string): string;
  getData(): Promise<string[]>;
}

// --- my-extension/src/common/my-module.ts ---
import { ContainerModule } from 'inversify';
import { bindContributionProvider } from '@theia/core/lib/common/contribution-provider';

export const MyContribution = Symbol.for('MyContribution');
export interface MyContribution {
  process(data: string): string;
}

export default new ContainerModule((bind, unbind, isBound, rebind) => {
  bindContributionProvider(bind, MyContribution);
});

// --- my-extension/src/browser/my-service.ts ---
import { injectable, inject } from 'inversify';
import { MyService } from '../common';

@injectable()
export class MyServiceImpl implements MyService {
  greet(name: string): string {
    return `Hello, ${name}!`;
  }

  async getData(): Promise<string[]> {
    return ['item1', 'item2'];
  }
}

// --- my-extension/src/browser/my-commands.ts ---
import { injectable } from 'inversify';
import { CommandContribution, CommandRegistry, Command } from '@theia/core/lib/common';

export const GREET_COMMAND: Command = {
  id: 'my-extension.greet',
  label: 'Greet',
  category: 'My Extension'
};

@injectable()
export class MyCommandContribution implements CommandContribution {
  registerCommands(registry: CommandRegistry): void {
    registry.registerCommand(GREET_COMMAND, {
      execute: () => {
        const name = 'World';
        alert(`Hello, ${name}!`);
      }
    });
  }
}

// --- my-extension/src/browser/my-menus.ts ---
import { injectable } from 'inversify';
import { MenuContribution, MenuModelRegistry } from '@theia/core/lib/common';
import { CommonMenus } from '@theia/core/lib/browser/common-frontend-contribution';
import { GREET_COMMAND } from './my-commands';

@injectable()
export class MyMenuContribution implements MenuContribution {
  registerMenus(menus: MenuModelRegistry): void {
    menus.registerMenuAction(CommonMenus.EDIT_FIND, {
      commandId: GREET_COMMAND.id,
      order: '10'
    });
  }
}

// --- my-extension/src/browser/my-keybindings.ts ---
import { injectable } from 'inversify';
import { KeybindingContribution, KeybindingRegistry } from '@theia/core/lib/common';
import { GREET_COMMAND } from './my-commands';

@injectable()
export class MyKeybindingContribution implements KeybindingContribution {
  registerKeybindings(registry: KeybindingRegistry): void {
    registry.registerKeybinding({
      command: GREET_COMMAND.id,
      keybinding: 'ctrl+shift+g',
      context: 'idle'
    });
  }
}

// --- my-extension/src/browser/my-widget.tsx ---
import * as React from 'react';
import { injectable, postConstruct } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { MyService } from '../common';

@injectable()
export class MyWidget extends ReactWidget {
  static ID = 'my-extension:widget';
  static LABEL = 'My Widget';

  private data: string[] = [];

  constructor(
    @inject(MyService) private readonly myService: MyService
  ) {
    super();
    this.id = MyWidget.ID;
    this.title.label = MyWidget.LABEL;
    this.title.closable = true;
  }

  @postConstruct()
  async init(): Promise<void> {
    this.data = await this.myService.getData();
    this.update();
  }

  render(): React.ReactNode {
    return (
      <div>
        <h2>{this.myService.greet('IDEIA')}</h2>
        <ul>
          {this.data.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }
}

// --- my-extension/src/browser/my-extension-frontend-module.ts ---
import { ContainerModule } from 'inversify';
import {
  WidgetFactory,
  FrontendApplicationContribution
} from '@theia/core/lib/browser';
import { CommandContribution, MenuContribution, KeybindingContribution } from '@theia/core/lib/common';
import { MyService } from '../common';
import { MyServiceImpl } from './my-service';
import { MyCommandContribution } from './my-commands';
import { MyMenuContribution } from './my-menus';
import { MyKeybindingContribution } from './my-keybindings';
import { MyWidget } from './my-widget';
import { MyContribution } from '../common/my-module';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
  // Services
  bind<MyService>(MyService).to(MyServiceImpl).inSingletonScope();

  // Widget
  bind(MyWidget).toSelf();
  bind(WidgetFactory).toDynamicValue((ctx) => ({
    id: MyWidget.ID,
    createWidget: () => ctx.container.get(MyWidget)
  }));

  // Contributions
  bind(CommandContribution).to(MyCommandContribution);
  bind(MenuContribution).to(MyMenuContribution);
  bind(KeybindingContribution).to(MyKeybindingContribution);

  // Custom contribution (defined in common module)
  bind(MyContribution).to(MyCustomImpl);
});

// --- my-extension/src/backend/my-backend-service.ts ---
import { injectable } from 'inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node';

@injectable()
export class MyBackendContribution implements BackendApplicationContribution {
  onStart(): void {
    console.log('My backend started');
  }

  onStop(): void {
    console.log('My backend stopped');
  }
}

// --- my-extension/src/backend/my-extension-backend-module.ts ---
import { ContainerModule } from 'inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common/messaging';
import { MyBackendContribution } from './my-backend-service';

export const MY_BACKEND_PATH = '/services/my-extension';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
  bind(BackendApplicationContribution).to(MyBackendContribution);

  bind(ConnectionHandler).toDynamicValue((ctx) =>
    new JsonRpcConnectionHandler(MY_BACKEND_PATH, () => {
      return ctx.container.get(MyBackendContribution);
    })
  );
});

// --- my-extension/package.json ---
{
  "name": "my-extension",
  "theiaExtensions": [
    {
      "frontend": "lib/browser/my-extension-frontend-module",
      "backend": "lib/backend/my-extension-backend-module"
    }
  ]
}
```

### 14.2 ContributionProvider Implementation

```typescript
// Full ContributionProvider implementation as used by Theia
import { interfaces, Container } from 'inversify';

export interface ContributionProvider<T extends object> {
  getContributions(): T[];
}

export class DefaultContributionProvider<T extends object>
  implements ContributionProvider<T> {

  private services: T[] | undefined;
  private readonly container: interfaces.Container;

  constructor(
    container: interfaces.Container,
    private readonly serviceIdentifier: interfaces.ServiceIdentifier<T>
  ) {
    this.container = container;
  }

  getContributions(): T[] {
    if (this.services === undefined) {
      const currentServices: T[] = [];
      if (this.container.isBound(this.serviceIdentifier)) {
        currentServices.push(...this.container.getAll(this.serviceIdentifier));
      }
      this.services = currentServices;
    }
    return this.services;
  }
}

export function bindContributionProvider<T extends object>(
  bind: interfaces.Bind,
  id: interfaces.ServiceIdentifier<T>
): void {
  const symbol = Symbol.for(`ContributionProvider<${id.toString()}>`);

  bind(symbol)
    .toDynamicValue((ctx) =>
      new DefaultContributionProvider<T>(ctx.container, id)
    )
    .inSingletonScope();
}
```

### 14.3 Custom Contribution Point

```typescript
// IDEIA-specific: Custom contribution point for tool providers
import { ContainerModule, injectable, inject, interfaces } from 'inversify';
import { bindContributionProvider, ContributionProvider } from '@theia/core/lib/common/contribution-provider';

// 1. Define contribution interface
export interface ToolContribution {
  readonly toolId: string;
  readonly toolName: string;
  execute(params: ToolParams): Promise<ToolResult>;
}

// 2. Define tool types
export interface ToolParams {
  args: Record<string, unknown>;
  context: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// 3. Service identifier
export const ToolContribution = Symbol.for('ToolContribution');

// 4. Registry that uses contributions
@injectable()
export class ToolRegistry {
  private tools = new Map<string, ToolContribution>();

  constructor(
    @inject(ContributionProvider<ToolContribution>)
    private readonly toolContributions: ContributionProvider<ToolContribution>
  ) {}

  @postConstruct()
  initialize(): void {
    for (const tool of this.toolContributions.getContributions()) {
      this.tools.set(tool.toolId, tool);
    }
  }

  async executeTool(toolId: string, params: ToolParams): Promise<ToolResult> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return { success: false, error: `Tool ${toolId} not found` };
    }
    return tool.execute(params);
  }

  getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }
}

// 5. Example tool implementation
@injectable()
export class SearchTool implements ToolContribution {
  readonly toolId = 'search';
  readonly toolName = 'Search Files';

  async execute(params: ToolParams): Promise<ToolResult> {
    const query = params.args['query'] as string;
    if (!query) {
      return { success: false, error: 'Missing query' };
    }
    const results = await this.performSearch(query);
    return { success: true, data: results };
  }

  private async performSearch(query: string): Promise<string[]> {
    // Implementation
    return [`results for: ${query}`];
  }
}

// 6. Module binding helper
export function bindToolContributionProvider(bind: interfaces.Bind): void {
  bindContributionProvider(bind, ToolContribution);
}

// 7. Module
export default new ContainerModule((bind) => {
  bindToolContributionProvider(bind);
  bind(ToolContribution).to(SearchTool);
  bind(ToolRegistry).toSelf().inSingletonScope();
});
```

### 14.4 Async Module Loading

```typescript
// Lazy loading a heavy extension only when needed
import { Container, ContainerModule } from 'inversify';

@injectable()
export class ExtensionManager {
  constructor(
    @inject(Container) private readonly container: Container
  ) {}

  async activateExtension(extensionId: string): Promise<void> {
    const modulePath = this.getModuleForExtension(extensionId);
    const childContainer = this.container.createChild();

    try {
      const { default: module } = await import(modulePath);
      childContainer.load(module);
      this.activeExtensions.set(extensionId, childContainer);
    } catch (err) {
      console.error(`Failed to load extension ${extensionId}:`, err);
    }
  }

  deactivateExtension(extensionId: string): void {
    const childContainer = this.activeExtensions.get(extensionId);
    if (childContainer) {
      childContainer.unbindAll();
      this.activeExtensions.delete(extensionId);
    }
  }

  private getModuleForExtension(extensionId: string): string {
    // Resolve from package.json theiaExtensions
    return `/path/to/${extensionId}/frontend-module`;
  }
}
```

### 14.5 Testing with Mock Container

```typescript
import { Container } from 'inversify';

// Test the ToolRegistry with mock contributions
describe('ToolRegistry', () => {
  let container: Container;
  let registry: ToolRegistry;

  beforeEach(() => {
    container = new Container();
    bindToolContributionProvider(container.bind.bind(container));

    // Mock tool
    const mockTool: ToolContribution = {
      toolId: 'mock',
      toolName: 'Mock Tool',
      execute: jest.fn().mockResolvedValue({ success: true, data: 'mocked' })
    };
    container.bind(ToolContribution).toConstantValue(mockTool);

    container.bind(ToolRegistry).toSelf();
    registry = container.get(ToolRegistry);
  });

  it('should discover registered tools', () => {
    const tools = registry.getAvailableTools();
    expect(tools).toContain('mock');
  });

  it('should execute tool and return result', async () => {
    const result = await registry.executeTool('mock', { args: {}, context: {} });
    expect(result.success).toBe(true);
    expect(result.data).toBe('mocked');
  });
});
```

---

## 15. Conexoes

### 15.1 Conexoes com Outros Estudos

| Estudo | Conexao | Descricao |
|--------|---------|-----------|
| S11 (Theia IDE) | Fundacao | Theia architecture overview, theiaExtensions, build system. DI is the implementation mechanism for all Theia features described in S11. |
| S34 (Editor/Widget) | WidgetFactory | Editor and widget contributions use WidgetFactory binding pattern. EditorContribution extends the contribution model for editor-specific features. |
| S43 (Views) | ViewContribution | Views are registered via the contribution system using bind(ViewContribution). View registration, view container mapping, and view visibility all flow through DI. |
| S44 (Shell) | ApplicationShell | The shell consumes contributions to build the layout. FrontendApplicationContribution hooks into shell lifecycle. View contributions determine sidebar/panel content. |
| S36 (Extension Host) | Plugin System | @theia/plugin-ext translates VS Code contributions into Theia DI bindings. Extension host uses JSON-RPC but registers results in the DI container. |
| S49 (Preferences) | PreferenceContribution | Preferences are contributed via PreferenceContribution, registered in DI, and consumed by PreferenceService. Schema validation happens at contribution time. |
| S40 (Layout) | Layout System | MenuContribution and ViewContribution directly affect layout structure. The activity bar, side bar, and panel are populated by DI-resolved contributions. |
| S39 (Settings) | Settings UI | Settings UI uses PreferenceContribution. Keybindings UI reads from KeybindingRegistry which is populated by KeybindingContribution. |
| S38 (Editor) | Editor Intelligence | Editor features like completion, hover, diagnostics use LanguageContribution and EditorContribution. Each is a DI-resolved contribution provider. |
| S37 (Search/SCM) | Search & SCM | Search providers and SCM providers are contributed via DI. TaskProvider follows the same ContributionProvider pattern for task integrations. |
| S41 (Remote) | Backend Services | Backend modules register ConnectionHandler bindings for JSON-RPC services. Remote extension host uses DI to manage plugin lifecycle. |

### 15.2 DI Flow Diagram

```
                    +--------------------------------------+
                    |         Theia Application             |
                    +--------------------------------------+
                    |                                       |
                    |  Root Container (@theia/core)         |
                    |    - core services                    |
                    |    - CommandRegistry                  |
                    |    - MenuModelRegistry                |
                    |    - KeybindingRegistry               |
                    |    - PreferenceService                |
                    |    - ApplicationShell                 |
                    |                                       |
                    +--------+------------------------------+
                             |
               +-------------+-------------+
               |                           |
    +----------v----------+    +-----------v---------+
    | Frontend Container   |    | Backend Container   |
    | - WidgetFactory      |    | - ConnectionHandler |
    | - ViewContribution   |    | - BackendAppContr   |
    | - FrontendAppContr   |    | - FileSystem        |
    | - CommandContribution|    | - ProcessManager    |
    | - MenuContribution   |    | - LanguageServer    |
    | - KeybindingContri   |    |                     |
    | - PreferenceContri   |    |                     |
    +----------+-----------+    +----------+----------+
               |                           |
    +----------v-----------+    +----------v----------+
    | Child Containers     |    | Child Containers     |
    | (per extension)      |    | (per extension)      |
    | - Extension A mods   |    | - Extension A mods   |
    | - Extension B mods   |    | - Extension B mods   |
    | - VS Code plugins    |    | - VS Code plugins    |
    +----------------------+    +----------------------+
```

### 15.3 Contribution Resolution Chain

```
                +-------------------+
                | Application Start |
                +--------+----------+
                         |
            +------------v------------+
            | Container.load(modules) |
            +------------+------------+
                         |
            +------------v------------+
            | Registry.initialize()   |
            +------------+------------+
                         |
            +------------v------------+
            | getAll(ContributionType) |
            +------------+------------+
                         |
            +------------v------------+
            | ContributionProvider    |
            | .getContributions()     |
            +------------+------------+
                         |
            +------------v------------+
            | container.isBound(type)? |
            |  yes -> getAll(type)    |
            |  no -> return []        |
            +------------+------------+
                         |
            +------------v------------+
            | Sort by priority        |
            +------------+------------+
                         |
            +------------v------------+
            | For each contribution:  |
            |   contrib.registerXxx()|
            +-------------------------+
```

---

## 16. Plano de Implementacao

### 16.1 Fases

| Fase | Tarefa | Esforco | Descricao |
|------|--------|---------|-----------|
| F1 | Core Contribution Models | 8h | Implementar ContributionProvider base, bindContributionProvider helper, DefaultContributionProvider class, tipos genericos |
| F2 | Command System | 6h | Command interface, CommandRegistry com contribution provider, command handler lifecycle, execucao |
| F3 | Menu System | 6h | MenuModelRegistry, menu path system, menu sorting, context menus, submenu registration |
| F4 | Keybinding System | 6h | Keybinding interface, KeybindingRegistry, context matching, conflict resolution, when clause parser |
| F5 | Module System | 8h | ContainerModule template, frontend/backend/common split, module loading from package.json, child container strategy |
| F6 | Widget Contribution | 4h | WidgetFactory binding pattern, ViewContribution interface, widget creation lifecycle, view registration |
| F7 | Custom Contribution | 4h | ToolContribution pattern, AgentContribution pattern, contribution enablement, priority system |
| F8 | Async Loading | 4h | Dynamic module import, lazy contribution activation, deferred resolution, async registry init |
| F9 | Theia Integration | 6h | Alinhamento com @theia/core, compatibilidade com inversify imports padrao, integracao com plugin-ext |
| F10 | Testes | 8h | Test container pattern, mock contributions, test utilities, integration test suite |

### 16.2 Pacotes

| Package | Conteudo | Depende de |
|---------|----------|-----------|
| `packages/core-contributions` | ContributionProvider, types, interfaces | `@theia/core` |
| `packages/command-system` | Command interface, CommandRegistry | `core-contributions` |
| `packages/menu-system` | MenuModelRegistry, menu paths | `command-system` |
| `packages/keybinding-system` | KeybindingRegistry, context service | `command-system` |
| `packages/widget-contributions` | WidgetFactory, ViewContribution | `core-contributions` |
| `packages/custom-contributions` | IDEIA-specific contribution types | `core-contributions` |
| `packages/module-loader` | Module discovery, loading, composition | `core-contributions` |

### 16.3 Marcos

| Marco | Prazo | Entregavel |
|-------|-------|-----------|
| M1 | Semana 1 | ContributionProvider + CommandSystem funcionais com testes |
| M2 | Semana 2 | MenuSystem + KeybindingSystem com integracao |
| M3 | Semana 3 | ModuleLoader + WidgetContribution + CustomContribution |
| M4 | Semana 4 | Async Loading + Theia Integration + Testes completos |

### 16.4 Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Incompatibilidade com @theia/core DI version | Media | Alto | Usar mesma versao do inversify que @theia/core |
| Performance com muitas contribuicoes | Baixa | Medio | Lazy loading, cache nos contribution providers |
| Conflito com plugin-ext | Media | Alto | Testar com plugin-ext ativo, garantir isolamento child container |
| Complexidade de child containers | Baixa | Medio | Documentar padrao claro, testar heranca vs escopo |

---

> **Fim do ESTUDO S42** — Theia Dependency Injection, Contributions & Extension Points
>
> Proximo: ESTUDO S43 — Theia View System & Widget Architecture
