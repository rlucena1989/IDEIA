# ESTUDO S49 — Theia Preferences & Settings Integration

> **Arquitetura completa do sistema de preferencias do Eclipse Theia: schema, providers, proxy pattern, scopes, files, UI, bindings, migracao e integracao com a plataforma IDEIA**
> Data: 2026-07-22

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao inicial — Preferencias e configuracao no Theia |

---

## Sumario

1. [Introducao](#1-introducao)
2. [Preference Architecture](#2-preference-architecture)
3. [Preference Providers](#3-preference-providers)
4. [Preference Schema](#4-preference-schema)
5. [Preference Proxy](#5-preference-proxy)
6. [Preference Scopes](#6-preference-scopes)
7. [Preference Files](#7-preference-files)
8. [Settings UI](#8-settings-ui)
9. [Preference Bindings](#9-preference-bindings)
10. [Dynamic Preferences](#10-dynamic-preferences)
11. [Environment & Platform Preferences](#11-environment--platform-preferences)
12. [IDEIA-specific Preferences](#12-ideia-specific-preferences)
13. [Preference Migration](#13-preference-migration)
14. [Code Examples](#14-code-examples)
15. [Conexoes](#15-conexoes)
16. [Plano de Implementacao](#16-plano-de-implementacao)

---

## 1. Introducao

O sistema de preferencias do Eclipse Theia e um servico hierarquico de configuracao que difere significativamente do modelo do VS Code. Enquanto o VS Code expoe `workspace.getConfiguration()` como API principal, o Theia implementa um sistema baseado em injecao de dependencia com providers em cadeia, schema registry tipado e um padrao de proxy que permite acesso tipado as preferencias.

### 1.1 Theia vs VS Code Preference System

| Aspecto | Theia | VS Code |
|---------|-------|---------|
| Acesso primario | PreferenceService + PreferenceProxy | workspace.getConfiguration() |
| Tipagem | Proxy tipado (`proxy.myPrefs.editor.tabSize`) | Chave string (`config.get<number>('editor.tabSize')`) |
| Schema | PreferenceContribution (ContainerModule) | contributes.configuration (package.json) |
| Providers | Cadeia de PreferenceProvider (DI) | Service locator com ConfigurationTarget |
| Eventos | onPreferenceChanged | onDidChangeConfiguration |
| Validacao | JSON Schema no schema registry | JSON Schema no contribution |
| Defaults | PreferenceContribution.default | contributes.configuration.default |
| Sobrescrita | rebind de PreferenceProvider | N/A (ordem fixa) |

### 1.2 Theia Preference Proxy Pattern

O padrao de proxy e a innovacao central do Theia: em vez de buscar valores por string key, o desenvolvedor cria um objeto proxy que mapeia cada propriedade a uma preferencia:

```
VS Code:
  const tabSize = config.get<number>('editor.tabSize', 4);

Theia (Proxy):
  const prefs = proxy.preferences;
  const tabSize = prefs['editor.tabSize'];  // ou via interface tipada
```

A implementacao concreta usa `createPreferenceProxy` que retorna um `Proxy` JavaScript cujo handler intercepta `get` e `set` e delega ao `PreferenceService`.

### 1.3 Preference Scopes and Precedence

As preferencias sao organizadas em escopos com precedencia bem definida:

```
+----------------------------------------------------------------------+
|                      PREFERENCE PRECEDENCE                            |
|                                                                       |
|  ORDEM (maior precedencia vence):                                     |
|                                                                       |
|   10. Environment Variables (THEIA_*)                                 |
|    9. Folder-level settings  (.vscode/settings.json pasta local)      |
|    8. Workspace-level settings  (.code-workspace, root settings)      |
|    7. User-level settings  (~/.theia/settings.json)                   |
|    6. Application-level settings (aplicacao Theia)                    |
|    5. Default values (dos schemas registrados)                        |
|    4. Hardcoded fallback (valor minimo funcional)                     |
|                                                                       |
|  A resolucao percorre de baixo para cima, aplicando override          |
|  a cada nivel que define a chave.                                     |
+----------------------------------------------------------------------+
```

### 1.4 Packages Envolvidos

| Package | Funcao |
|---------|--------|
| `@theia/core` | PreferenceService, PreferenceProvider, createPreferenceProxy |
| `@theia/core/lib/common/preferences` | Interfaces PreferenceSchema, PreferenceProperty |
| `@theia/core/lib/browser/preferences` | PreferenceService frontend, preference widget |
| `@theia/preferences` | Settings editor widget, preferences tree |
| `@theia/variable-resolver` | Resolucao de variaveis em valores de preferencia |
| `@theia/editor/lib/browser/editor-preferences` | Editor-specific preferences schema |
| `@theia/terminal/lib/browser/terminal-preferences` | Terminal-specific preferences schema |

---

## 2. Preference Architecture

### 2.1 PreferenceService

O `PreferenceService` e o servico central que expoe a API de leitura, escrita e observacao de preferencias. Ele e injetavel via DI e singleton no frontend:

```typescript
// @theia/core/lib/browser/preferences/preference-service.ts
@injectable()
export class PreferenceService implements IPreferenceService {

  @inject(PreferenceProvider)
  protected readonly preferenceProvider: PreferenceProvider;

  @inject(PreferenceProvider)
  @named(PreferenceScope.User)
  protected readonly userPreferenceProvider: PreferenceProvider;

  @inject(PreferenceProvider)
  @named(PreferenceScope.Workspace)
  protected readonly workspacePreferenceProvider: PreferenceProvider;

  @inject(PreferenceProvider)
  @named(PreferenceScope.Folder)
  protected readonly folderPreferenceProvider: PreferenceProvider;

  protected readonly onPreferenceChangedEmitter = new Emitter<PreferenceChangeEvent>();
  readonly onPreferenceChanged: Event<PreferenceChangeEvent>;

  get<T>(preferenceName: string, defaultValue?: T, resourceUri?: string): T | undefined;
  set(preferenceName: string, value: unknown, scope: PreferenceScope, resourceUri?: string): Promise<void>;
  has(preferenceName: string): boolean;
  inspect<T>(preferenceName: string, resourceUri?: string): PreferenceInspection<T> | undefined;
}
```

### 2.2 Preference Retrieval Methods

O `PreferenceService` oferece acesso tipado direto para os tipos primarios:

```typescript
export class PreferenceService implements IPreferenceService {

  get<T>(preferenceName: string, defaultValue?: T, resourceUri?: string): T | undefined {
    const value = this.preferenceProvider.get<T>(preferenceName, resourceUri);
    return value !== undefined ? value : defaultValue;
  }

  getBoolean(preferenceName: string, defaultValue?: boolean, resourceUri?: string): boolean | undefined {
    const value = this.get<boolean>(preferenceName, resourceUri);
    return typeof value === 'boolean' ? value : defaultValue;
  }

  getString(preferenceName: string, defaultValue?: string, resourceUri?: string): string | undefined {
    const value = this.get<string>(preferenceName, resourceUri);
    return typeof value === 'string' ? value : defaultValue;
  }

  getNumber(preferenceName: string, defaultValue?: number, resourceUri?: string): number | undefined {
    const value = this.get<number>(preferenceName, resourceUri);
    return typeof value === 'number' ? value : defaultValue;
  }
}
```

### 2.3 Preference Change Events

Mudancas de preferencia sao propagadas via eventos tipados:

```typescript
export interface PreferenceChangeEvent {
  readonly preferenceName: string;
  readonly newValue?: unknown;
  readonly oldValue?: unknown;
  readonly scope: PreferenceScope;
  readonly resourceUri?: string;
}

export interface PreferenceChangesEvent {
  readonly changes: PreferenceChangeEvent[];
}

export interface IPreferenceService {
  readonly onPreferenceChanged: Event<PreferenceChangeEvent>;
  readonly onPreferencesChanged: Event<PreferenceChangesEvent>;
}
```

### 2.4 Preference Validation

A validacao ocorre no schema registry quando um valor e escrito:

```typescript
export class PreferenceValidationService {

  @inject(PreferenceSchemaRegistry)
  protected readonly schemaRegistry: PreferenceSchemaRegistry;

  validate(preferenceName: string, value: unknown): PreferenceValidationResult {
    const schema = this.schemaRegistry.getSchema(preferenceName);
    if (!schema) {
      return { valid: true };  // Sem schema, sem validacao
    }
    return this.validateAgainstSchema(schema, value);
  }

  protected validateAgainstSchema(
    property: PreferenceProperty,
    value: unknown
  ): PreferenceValidationResult {
    if (value === undefined || value === null) {
      return { valid: true };
    }

    if (property.type && typeof value !== property.type) {
      return { valid: false, error: `Expected ${property.type}, got ${typeof value}` };
    }

    if (property.enum && !property.enum.includes(value)) {
      return { valid: false, error: `Value must be one of: ${property.enum.join(', ')}` };
    }

    if (property.type === 'number' || property.type === 'integer') {
      const num = value as number;
      if (property.minimum !== undefined && num < property.minimum) {
        return { valid: false, error: `Minimum value is ${property.minimum}` };
      }
      if (property.maximum !== undefined && num > property.maximum) {
        return { valid: false, error: `Maximum value is ${property.maximum}` };
      }
    }

    if (property.type === 'string') {
      const str = value as string;
      if (property.pattern && !new RegExp(property.pattern).test(str)) {
        return { valid: false, error: `Value must match pattern: ${property.pattern}` };
      }
      if (property.minLength !== undefined && str.length < property.minLength) {
        return { valid: false, error: `Minimum length is ${property.minLength}` };
      }
      if (property.maxLength !== undefined && str.length > property.maxLength) {
        return { valid: false, error: `Maximum length is ${property.maxLength}` };
      }
    }

    return { valid: true };
  }
}
```

### 2.5 Preference Fallback Chain

A resolucao segue uma cadeia de providers encadeados:

```
PreferenceService.get('editor.fontSize')
  |
  +-> PreferenceProvider (composite)
  |     |
  |     +-> Default PreferenceProvider (schema defaults)
  |     |     retorna 14 se 'editor.fontSize' estiver no schema
  |     |
  |     +-> User PreferenceProvider (~/.theia/settings.json)
  |     |     retorna 16 se usuario definiu
  |     |     senao retorna undefined (fallthrough)
  |     |
  |     +-> Workspace PreferenceProvider (.code-workspace)
  |     |     retorna 18 se workspace definiu
  |     |     senao retorna undefined (fallthrough)
  |     |
  |     +-> Folder PreferenceProvider (.vscode/settings.json)
  |           retorna 12 se pasta definiu
  |           senao retorna undefined (fallthrough)
  |
  +-> Valor final: 16 (User overrides Default, Workspace sobe para 18)
```

---

## 3. Preference Providers

### 3.1 PreferenceProvider Interface

```typescript
// @theia/core/lib/common/preferences/preference-provider.ts
export interface PreferenceProvider extends Disposable {

  get<T>(preferenceName: string, resourceUri?: string): T | undefined;

  set<T>(preferenceName: string, value: T, resourceUri?: string): Promise<void>;

  readonly onPreferencesChanged: Event<PreferenceChangesEvent>;
}
```

### 3.2 Provider Chain

O Theia implementa a cadeia de providers atraves de um composite que encadeia as fontes:

```typescript
export class PreferenceProviderChain implements PreferenceProvider {
  protected providers: PreferenceProvider[];

  constructor(providers: PreferenceProvider[]) {
    this.providers = providers;
    this.setupPropagation();
  }

  protected setupPropagation(): void {
    for (const provider of this.providers) {
      provider.onPreferencesChanged(event => {
        this.onPreferencesChangedEmitter.fire(event);
      });
    }
  }

  get<T>(preferenceName: string, resourceUri?: string): T | undefined {
    for (const provider of this.providers) {
      const value = provider.get<T>(preferenceName, resourceUri);
      if (value !== undefined) {
        return value;
      }
    }
    return undefined;
  }

  async set<T>(preferenceName: string, value: T, resourceUri?: string): Promise<void> {
    // Delega ao provider mais especifico que aceita escrita
    for (const provider of this.providers) {
      if (this.canSet(provider, preferenceName, resourceUri)) {
        await provider.set(preferenceName, value, resourceUri);
        return;
      }
    }
    throw new Error('No provider available for writing preference: ' + preferenceName);
  }

  protected canSet(provider: PreferenceProvider, preferenceName: string, resourceUri?: string): boolean {
    // Providers de escopo User/Workspace podem escrever
    // Providers de escopo Default sao read-only
    return provider instanceof UserPreferenceProvider
      || provider instanceof WorkspacePreferenceProvider
      || provider instanceof FolderPreferenceProvider;
  }

  protected readonly onPreferencesChangedEmitter = new Emitter<PreferenceChangesEvent>();
  readonly onPreferencesChanged: Event<PreferenceChangesEvent> = (cb) =>
    this.onPreferencesChangedEmitter.on(cb);

  dispose(): void {
    for (const provider of this.providers) {
      provider.dispose();
    }
  }
}
```

### 3.3 Provider Registration

Providers sao registrados via DI com scopes nomeados:

```typescript
export function bindPreferenceProviders(bind: interfaces.Bind): void {

  // Default provider (schema defaults)
  bind(PreferenceProvider)
    .to(DefaultPreferenceProvider)
    .inSingletonScope()
    .whenTargetNamed(PreferenceScope.Default);

  // User provider (~/.theia/settings.json)
  bind(PreferenceProvider)
    .to(UserPreferenceProvider)
    .inSingletonScope()
    .whenTargetNamed(PreferenceScope.User);

  // Workspace provider (.code-workspace)
  bind(PreferenceProvider)
    .to(WorkspacePreferenceProvider)
    .inSingletonScope()
    .whenTargetNamed(PreferenceScope.Workspace);

  // Folder provider (.vscode/settings.json)
  bind(PreferenceProvider)
    .to(FolderPreferenceProvider)
    .inSingletonScope()
    .whenTargetNamed(PreferenceScope.Folder);

  // Composite chain
  bind(PreferenceProvider)
    .toDynamicValue(ctx => {
      const providers = [
        ctx.container.getNamed(PreferenceProvider, PreferenceScope.Default),
        ctx.container.getNamed(PreferenceProvider, PreferenceScope.User),
        ctx.container.getNamed(PreferenceProvider, PreferenceScope.Workspace),
        ctx.container.getNamed(PreferenceProvider, PreferenceScope.Folder),
      ];
      return new PreferenceProviderChain(providers);
    })
    .inSingletonScope();
}
```

### 3.4 Provider Priority

A prioridade e determinada pela ordem no array da chain. O DefaultPreferenceProvider tem a menor prioridade:

| Provider | Prioridade | Escopo | Persistencia | Read | Write |
|----------|-----------|--------|--------------|------|-------|
| DefaultPreferenceProvider | 0 (base) | Default | Memoria (schema) | Sim | Nao |
| UserPreferenceProvider | 1 | User | settings.json (~/.theia/) | Sim | Sim |
| WorkspacePreferenceProvider | 2 | Workspace | .code-workspace | Sim | Sim |
| FolderPreferenceProvider | 3 | Folder | .vscode/settings.json | Sim | Sim |
| EnvPreferenceProvider | 4 | Environment | Variaveis de ambiente | Sim | Nao |

### 3.5 Custom Preference Providers for IDEIA

A IDEIA pode registrar providers customizados para suas necessidades especificas:

```typescript
// Provider para preferencias de agentes (via NATS KV store)
@injectable()
export class AgentPreferenceProvider implements PreferenceProvider {

  @inject(IAgentConfigStore)
  protected readonly agentConfigStore: IAgentConfigStore;

  protected readonly onPreferencesChangedEmitter = new Emitter<PreferenceChangesEvent>();
  readonly onPreferencesChanged: Event<PreferenceChangesEvent> = (cb) =>
    this.onPreferencesChangedEmitter.on(cb);

  get<T>(preferenceName: string, resourceUri?: string): T | undefined {
    if (!preferenceName.startsWith('agent.')) {
      return undefined;
    }
    return this.agentConfigStore.get<T>(preferenceName);
  }

  async set<T>(preferenceName: string, value: T, resourceUri?: string): Promise<void> {
    if (!preferenceName.startsWith('agent.')) {
      return;
    }
    await this.agentConfigStore.set(preferenceName, value);
    this.onPreferencesChangedEmitter.fire({
      changes: [{ preferenceName, newValue: value, scope: PreferenceScope.User }]
    });
  }

  dispose(): void {
    this.onPreferencesChangedEmitter.dispose();
  }
}

// Provider para preferencias de projetos (via .ideia/settings.json)
@injectable()
export class IdeiaProjectPreferenceProvider extends FolderPreferenceProvider {
  protected get configPath(): string {
    return '.ideia/settings.json';
  }
}

// Registro no modulo IDEIA
bind(PreferenceProvider)
  .to(AgentPreferenceProvider)
  .inSingletonScope()
  .whenTargetNamed('agent');

bind(PreferenceProvider)
  .to(IdeiaProjectPreferenceProvider)
  .inSingletonScope()
  .whenTargetNamed('ideia-project');
```

---

## 4. Preference Schema

### 4.1 PreferenceSchema

O schema define a estrutura, tipo e metadata de cada preferencia:

```typescript
// @theia/core/lib/common/preferences/preference-schema.ts
export interface PreferenceSchema {
  type: 'object';
  properties: Record<string, PreferenceProperty>;
  additionalProperties?: boolean;
  scope?: PreferenceScope;
}

export interface PreferenceProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';
  default?: unknown;
  enum?: unknown[];
  enumDescriptions?: string[];
  enumItemLabels?: string[];
  scope?: PreferenceScope;
  description?: string;
  markdownDescription?: string;
  markdownDeprecationMessage?: string;
  deprecationMessage?: string;
  tags?: string[];
  order?: number;
  pattern?: string;
  patternErrorMessage?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  items?: PreferenceProperty;
  properties?: Record<string, PreferenceProperty>;
  additionalProperties?: PreferenceProperty;
  required?: string[];
  defaultSnippets?: {
    label: string;
    description?: string;
    body: unknown;
    markdownDescription?: string;
  }[];
}
```

### 4.2 Preference Contribution

Preferencias sao contribuidas via `PreferenceContribution`:

```typescript
// @theia/core/lib/common/preferences/preference-contribution.ts
export interface PreferenceContribution {
  readonly schema: PreferenceSchema;
}

// Exemplo de contribuicao
@injectable()
export class EditorPreferenceContribution implements PreferenceContribution {

  readonly schema: PreferenceSchema = {
    type: 'object',
    properties: {
      'editor.fontSize': {
        type: 'number',
        default: 14,
        description: 'Controls the font size in pixels',
        scope: PreferenceScope.Resource,
        minimum: 8,
        maximum: 100,
        order: 1,
      },
      'editor.tabSize': {
        type: 'number',
        default: 4,
        description: 'The number of spaces a tab is equal to',
        scope: PreferenceScope.Resource,
        minimum: 1,
        maximum: 8,
        order: 2,
      },
      'editor.wordWrap': {
        type: 'string',
        enum: ['off', 'on', 'wordWrapColumn', 'bounded'],
        default: 'off',
        description: 'Controls how lines should wrap',
        scope: PreferenceScope.Resource,
        order: 3,
      },
      'editor.minimap.enabled': {
        type: 'boolean',
        default: true,
        description: 'Controls whether the minimap is shown',
        scope: PreferenceScope.Resource,
        order: 10,
      },
    },
  };
}
```

### 4.3 Schema Registration

O schema e registrado no `PreferenceSchemaRegistry` via DI:

```typescript
// Registro no modulo frontend
export default new ContainerModule((bind, unbind, isBound, rebind) => {
  bind(PreferenceContribution).to(EditorPreferenceContribution);
});

// Internamente, PreferenceSchemaRegistry coleta todos os PreferenceContribution
@injectable()
export class PreferenceSchemaRegistry {

  @multiInject(PreferenceContribution)
  protected readonly contributions: PreferenceContribution[];

  protected schemas = new Map<string, PreferenceProperty>();

  @postConstruct()
  init(): void {
    for (const contribution of this.contributions) {
      this.registerSchema(contribution.schema);
    }
  }

  registerSchema(schema: PreferenceSchema): void {
    for (const [key, property] of Object.entries(schema.properties)) {
      this.schemas.set(key, property);
    }
  }

  getSchema(preferenceName: string): PreferenceProperty | undefined {
    return this.schemas.get(preferenceName);
  }

  getAllSchemas(): IterableIterator<[string, PreferenceProperty]> {
    return this.schemas.entries();
  }

  getPreferencesByScope(scope: PreferenceScope): [string, PreferenceProperty][] {
    const result: [string, PreferenceProperty][] = [];
    for (const [key, property] of this.schemas) {
      if (property.scope === scope || (property.scope === undefined && scope === PreferenceScope.Default)) {
        result.push([key, property]);
      }
    }
    return result;
  }
}
```

### 4.4 JSON Schema for Preferences

Cada preferencia tem uma representacao JSON Schema completa:

```json
{
  "editor.fontSize": {
    "type": "number",
    "default": 14,
    "description": "Controls the font size in pixels",
    "scope": "resource",
    "minimum": 8,
    "maximum": 100,
    "order": 1,
    "tags": ["editor", "font"]
  },
  "editor.minimap.enabled": {
    "type": "boolean",
    "default": true,
    "description": "Controls whether the minimap is shown",
    "scope": "resource",
    "order": 10
  },
  "files.autoSave": {
    "type": "string",
    "enum": ["off", "afterDelay", "onFocusChange", "onWindowChange"],
    "default": "off",
    "description": "Controls auto save of dirty files",
    "scope": "application",
    "order": 1
  }
}
```

### 4.5 Schema Extension

Extensoes podem estender schemas existentes registrando novas propriedades com mesmo prefixo:

```typescript
// IDEIA estende o schema do editor com novas propriedades
@injectable()
export class IdeiaEditorPreferenceContribution implements PreferenceContribution {

  readonly schema: PreferenceSchema = {
    type: 'object',
    properties: {
      'editor.agentSuggestions': {
        type: 'boolean',
        default: true,
        description: 'Enable AI agent inline suggestions in the editor',
        scope: PreferenceScope.Resource,
        tags: ['ideia', 'agent'],
      },
      'editor.agentAutocomplete': {
        type: 'boolean',
        default: false,
        description: 'Enable AI agent autocomplete (ghost text)',
        scope: PreferenceScope.Resource,
        tags: ['ideia', 'agent'],
      },
      'editor.inlineChat.enabled': {
        type: 'boolean',
        default: true,
        description: 'Enable inline AI chat in the editor',
        scope: PreferenceScope.Resource,
        tags: ['ideia', 'agent'],
      },
    },
  };
}
```

### 4.6 Schema Validation

O schema e validado contra o JSON Schema specification:

```typescript
export class PreferenceSchemaValidator {

  validate(schema: PreferenceSchema): SchemaValidationResult {
    const errors: SchemaValidationError[] = [];

    for (const [key, property] of Object.entries(schema.properties)) {
      if (!property.type) {
        errors.push({ path: key, message: 'Property type is required' });
      }
      if (property.type === 'integer' && (property.minimum !== undefined || property.maximum !== undefined)) {
        if (!Number.isInteger(property.minimum) || !Number.isInteger(property.maximum)) {
          errors.push({ path: key, message: 'Integer bounds must be integers' });
        }
      }
      if (property.enum && property.enum.length === 0) {
        errors.push({ path: key, message: 'Enum must have at least one value' });
      }
      if (property.type === 'array' && property.items && property.items.type === 'undefined') {
        errors.push({ path: key, message: 'Array items must have a type' });
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
```

---

## 5. Preference Proxy

### 5.1 PreferenceProxy Pattern

O padrao `PreferenceProxy` e a forma tipada de acessar preferencias no Theia. Usando um `Proxy` JavaScript, o desenvolvedor acessa preferencias como se fossem propriedades de objeto:

```typescript
// @theia/core/lib/browser/preferences/preference-proxy.ts
export function createPreferenceProxy<T extends object>(
  preferenceService: IPreferenceService,
  schema: PreferenceSchema,
  options?: PreferenceProxyOptions
): T {
  const proxy = new Proxy({} as T, {
    get: (target, name: string | symbol, receiver) => {
      if (typeof name === 'symbol' || name === 'toJSON') {
        return Reflect.get(target, name, receiver);
      }
      return preferenceService.get(name);
    },
    set: (target, name: string | symbol, value: unknown) => {
      if (typeof name === 'symbol') {
        return false;
      }
      const scope = options?.defaultScope ?? PreferenceScope.User;
      preferenceService.set(name as string, value, scope);
      return true;
    },
    has: (target, name: string | symbol) => {
      if (typeof name === 'symbol') {
        return Reflect.has(target, name);
      }
      return preferenceService.has(name as string);
    },
    ownKeys: () => {
      return Object.keys(schema.properties);
    },
    getOwnPropertyDescriptor: (target, name: string | symbol) => {
      if (typeof name === 'symbol') {
        return undefined;
      }
      if (schema.properties[name as string]) {
        return {
          enumerable: true,
          configurable: true,
          writable: true,
        };
      }
      return undefined;
    },
  });

  return proxy;
}
```

### 5.2 Proxy Handler Deep Dive

O handler intercepta get/set/has/ownKeys para delegar ao PreferenceService:

```typescript
function createProxyHandler<T extends object>(
  preferenceService: IPreferenceService,
  schema: PreferenceSchema,
  options?: PreferenceProxyOptions
): ProxyHandler<T> {

  const defaultScope = options?.defaultScope ?? PreferenceScope.User;

  return {
    get: (target, name: string | symbol, receiver) => {
      if (typeof name === 'symbol' || name === 'toJSON' || name === 'constructor') {
        return Reflect.get(target, name, receiver);
      }

      const strName = name as string;

      // Suporte a acesso aninhado: proxy.editor.fontSize
      if (strName.includes('.')) {
        return preferenceService.get(strName);
      }

      // Suporte a secao: proxy.editor retorna sub-proxy
      const section = schema.properties[strName];
      if (section && section.type === 'object' && section.properties) {
        return createPreferenceProxy(preferenceService, {
          type: 'object',
          properties: section.properties,
        }, options);
      }

      if (preferenceService.has(strName)) {
        return preferenceService.get(strName);
      }

      return Reflect.get(target, name, receiver);
    },

    set: (target, name: string | symbol, value: unknown) => {
      if (typeof name === 'symbol') {
        return false;
      }
      const strName = name as string;
      if (preferenceService.has(strName)) {
        preferenceService.set(strName, value, defaultScope);
        return true;
      }
      // Armazena em target para nao lancar erro
      (target as any)[strName] = value;
      return true;
    },

    has: (target, name: string | symbol) => {
      if (typeof name === 'symbol') {
        return Reflect.has(target, name);
      }
      return preferenceService.has(name as string);
    },

    ownKeys: () => {
      return Object.keys(schema.properties);
    },

    getOwnPropertyDescriptor: (target, name: string | symbol) => {
      if (typeof name === 'symbol') {
        return undefined;
      }
      if (preferenceService.has(name as string)) {
        return {
          enumerable: true,
          configurable: true,
          writable: true,
        };
      }
      return undefined;
    },
  };
}
```

### 5.3 Typed Preference Access

O uso do proxy torna o acesso tipado e seguro:

```typescript
// Definicao da interface de preferencias
export interface EditorPreferences {
  'editor.fontSize': number;
  'editor.tabSize': number;
  'editor.wordWrap': 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  'editor.minimap.enabled': boolean;
}

// Criacao do proxy
const editorPrefs = createPreferenceProxy<EditorPreferences>(
  preferenceService,
  editorPreferenceSchema
);

// Uso tipado
const fontSize: number = editorPrefs['editor.fontSize'];
editorPrefs['editor.tabSize'] = 4;  // Dispara set no PreferenceService

// Ou com acesso via secao
export interface EditorSection {
  fontSize: number;
  tabSize: number;
  wordWrap: string;
  minimap: {
    enabled: boolean;
  };
}

const editor = proxy.editor as EditorSection;
console.log(editor.fontSize);   // 14 (tipado como number)
console.log(editor.tabSize);    // 4
editor.minimap.enabled = false; // set('editor.minimap.enabled', false)
```

### 5.4 Performance Considerations

O proxy tem custo de performance minimo:

| Operacao | Proxy | Direct API | Diferenca |
|----------|-------|-----------|-----------|
| get (resolvido em cache) | <0.01ms | <0.01ms | Identico |
| get (primeira vez) | ~0.1ms | ~0.1ms | Identico |
| set | ~0.5ms (async) | ~0.5ms (async) | Identico |
| has | <0.01ms | <0.01ms | Identico |
| ownKeys | ~0.1ms | N/A | Overhead do schema |

O proxy adiciona overhead apenas na primeira chamada de `get` (criacao do handler). Chamadas subsequentes sao resolvidas diretamente pelo `PreferenceService`.

### 5.5 Lazy Evaluation

O proxy avalia valores sob demanda, nao no momento da criacao:

```typescript
// Criacao do proxy e O(1) — nao ha resolucao de valores
const proxy = createPreferenceProxy(service, schema);

// Cada acesso resolve o valor no momento
const value1 = proxy['editor.fontSize'];  // PreferenceService.get('editor.fontSize') chamado agora
const value2 = proxy['editor.tabSize'];   // PreferenceService.get('editor.tabSize') chamado agora

// Valores mudam em tempo real sem recriar o proxy
await preferenceService.set('editor.fontSize', 18);
const newValue = proxy['editor.fontSize']; // 18 (reflete mudanca)
```

---

## 6. Preference Scopes

### 6.1 PreferenceScope Enum

```typescript
// @theia/core/lib/common/preferences/preference-scope.ts
export enum PreferenceScope {
  Default = 0,
  User = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
  Application = 4,
}
```

### 6.2 Scope Precedence Resolution

A resolucao usa uma matriz de precedencia:

| Scope | Valor | Precedencia | Persistencia | Abrangencia |
|-------|-------|-------------|--------------|-------------|
| Default | 0 | Mais baixa | Memoria (schemas) | Global |
| User | 1 | Baixa | ~/.theia/settings.json | Usuario |
| Workspace | 2 | Media | .code-workspace | Projeto |
| WorkspaceFolder | 3 | Alta | .vscode/settings.json | Pasta |
| Application | 4 | Mais alta | settings.json da app | Aplicacao |

Algoritmo de resolucao:

```typescript
export function resolvePreference<T>(
  providers: Map<PreferenceScope, PreferenceProvider>,
  preferenceName: string,
  resourceUri?: string
): T | undefined {
  const order: PreferenceScope[] = [
    PreferenceScope.Default,
    PreferenceScope.User,
    PreferenceScope.Workspace,
    PreferenceScope.WorkspaceFolder,
    PreferenceScope.Application,
  ];

  let value: T | undefined;

  for (const scope of order) {
    const provider = providers.get(scope);
    if (provider) {
      const scopeValue = provider.get<T>(preferenceName, resourceUri);
      if (scopeValue !== undefined) {
        value = scopeValue;
      }
    }
  }

  return value;
}
```

### 6.3 Scope-Specific Storage

Cada escopo tem seu storage especifico:

```typescript
@injectable()
export class UserPreferenceProvider extends AbstractPreferenceProvider {

  @inject(PreferenceConfigurations)
  protected readonly config: PreferenceConfigurations;

  protected readonly onPreferencesChangedEmitter = new Emitter<PreferenceChangesEvent>();
  readonly onPreferencesChanged: Event<PreferenceChangesEvent> = (cb) =>
    this.onPreferencesChangedEmitter.on(cb);

  protected readonly preferences: Map<string, unknown> = new Map();

  @postConstruct()
  protected async init(): Promise<void> {
    await this.load();
    this.watch();
  }

  protected async load(): Promise<void> {
    const content = await this.fs.readFile(this.configPath);
    if (content) {
      const data = JSON.parse(content.toString());
      for (const [key, value] of Object.entries(data)) {
        this.preferences.set(key, value);
      }
    }
  }

  protected watch(): void {
    // FileSystemWatcher no arquivo de configuracao
  }

  get<T>(preferenceName: string, resourceUri?: string): T | undefined {
    return this.preferences.get(preferenceName) as T | undefined;
  }

  async set<T>(preferenceName: string, value: T, resourceUri?: string): Promise<void> {
    this.preferences.set(preferenceName, value);
    await this.save();
    this.onPreferencesChangedEmitter.fire({
      changes: [{ preferenceName, newValue: value, scope: PreferenceScope.User }],
    });
  }

  protected get configPath(): string {
    return path.join(this.config.configDirUri.path, 'settings.json');
  }

  protected async save(): Promise<void> {
    const obj: Record<string, unknown> = {};
    for (const [key, value] of this.preferences) {
      obj[key] = value;
    }
    await this.fs.writeFile(this.configPath, Buffer.from(JSON.stringify(obj, null, 2)));
  }

  @inject(FileService)
  protected readonly fs: FileService;
}
```

### 6.4 Scope Override

Um escopo de maior precedencia sobrescreve escopos inferiores:

```typescript
// Exemplo: workspace define tabSize=2, mas usuario define tabSize=4
// Resultado: user vence (precedencia maior)

// Inspect mostra todos os niveis
const inspected = preferenceService.inspect<number>('editor.tabSize');
// inspected.defaultValue = 4 (schema)
// inspected.userValue = 4 (sobrescreve workspace)
// inspected.workspaceValue = 2
// inspected.workspaceFolderValue = undefined

// Valor efetivo
const value = preferenceService.get<number>('editor.tabSize');
// value = 4 (resolvido)
```

### 6.5 Scope Visibility

Nem toda preferencia e visivel em todos os escopos:

```typescript
export function getScopeDisplayName(scope: PreferenceScope): string {
  switch (scope) {
    case PreferenceScope.Default: return 'Default';
    case PreferenceScope.User: return 'User';
    case PreferenceScope.Workspace: return 'Workspace';
    case PreferenceScope.WorkspaceFolder: return 'Folder';
    case PreferenceScope.Application: return 'Application';
  }
}

// Preferencias com scope=Application so sao editaveis globalmente
// Preferencias com scope=Resource podem ser definidas por pasta
export function isScopeEditable(
  property: PreferenceProperty,
  targetScope: PreferenceScope
): boolean {
  const propertyScope = property.scope ?? PreferenceScope.Default;

  // Application scope: so global
  if (propertyScope === PreferenceScope.Application) {
    return targetScope === PreferenceScope.User;
  }

  // Resource scope: qualquer escopo
  if (propertyScope === PreferenceScope.WorkspaceFolder) {
    return true;
  }

  // Default scope: qualquer escopo
  return true;
}
```

---

## 7. Preference Files

### 7.1 settings.json Location

O Theia procura arquivos de configuracao em locais padrao:

| Escopo | Caminho | Exemplo |
|--------|---------|---------|
| User | `~/.theia/settings.json` | `C:\Users\user\.theia\settings.json` |
| Workspace | `{workspace}/.theia/settings.json` | `~/projeto/.theia/settings.json` |
| Workspace | `{workspace}.code-workspace` | `~/projeto.code-workspace` |
| Folder | `{folder}/.vscode/settings.json` | `~/projeto/src/.vscode/settings.json` |
| Application | `{appdir}/settings.json` | `./settings.json` (junto ao binario) |

### 7.2 Preference File Format

```json
{
  "editor.fontSize": 16,
  "editor.tabSize": 2,
  "editor.wordWrap": "on",
  "editor.minimap.enabled": false,
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000,
  "workbench.colorTheme": "IDEIA Dark",
  "workbench.iconTheme": "ideia-icons",
  "terminal.integrated.fontSize": 13,
  "[typescript]": {
    "editor.tabSize": 4,
    "editor.insertSpaces": true
  },
  "[python]": {
    "editor.tabSize": 4,
    "editor.insertSpaces": true
  }
}
```

### 7.3 Comments in settings.json

Theia suporta comentarios no JSON de configuracao:

```json
{
  // Editor settings
  "editor.fontSize": 16,
  "editor.tabSize": 2,

  // IDEIA specific
  "agent.enabled": true,
  "agent.autonomyLevel": "supervised"
}
```

### 7.4 Preference File Validation

O arquivo e validado contra os schemas registrados:

```typescript
export class PreferenceFileValidator {

  @inject(PreferenceSchemaRegistry)
  protected readonly schemaRegistry: PreferenceSchemaRegistry;

  validate(raw: string): PreferenceFileValidationResult {
    const warnings: PreferenceValidationWarning[] = [];
    const errors: PreferenceValidationError[] = [];

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return { valid: false, errors: [{ type: 'parse', message: e.message }], warnings: [] };
    }

    if (typeof data !== 'object' || data === null) {
      return { valid: false, errors: [{ type: 'structure', message: 'Root must be an object' }], warnings: [] };
    }

    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('[') && key.endsWith(']')) {
        // Language-specific section: validar internas recursivamente
        continue;
      }

      const schema = this.schemaRegistry.getSchema(key);
      if (!schema) {
        warnings.push({ type: 'unknown', key, message: `Unknown preference: ${key}` });
        continue;
      }

      const validation = this.schemaRegistry.validate(key, value);
      if (!validation.valid) {
        errors.push({ type: 'validation', key, message: validation.error! });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
```

### 7.5 Preference File Watcher

O Theia observa mudancas nos arquivos de configuracao em tempo real:

```typescript
export class PreferenceFileWatcher {

  @inject(FileService)
  protected readonly fileService: FileService;

  @inject(PreferenceProvider)
  protected readonly preferenceProvider: PreferenceProvider;

  protected watchers: Disposable[] = [];

  watch(paths: string[]): void {
    for (const configPath of paths) {
      const watcher = this.fileService.watch(configPath, {
        recursive: false,
        excludes: [],
      });

      watcher.onDidChange(changes => {
        for (const change of changes) {
          if (change.type === FileChangeType.UPDATED || change.type === FileChangeType.CREATED) {
            this.handleFileChange(configPath);
          }
        }
      });

      this.watchers.push(watcher);
    }
  }

  protected async handleFileChange(configPath: string): Promise<void> {
    try {
      const content = await this.fileService.readFile(configPath);
      const data = JSON.parse(content.toString());
      const changes: PreferenceChangeEvent[] = [];

      for (const [key, value] of Object.entries(data)) {
        changes.push({
          preferenceName: key,
          newValue: value,
          scope: this.resolveScope(configPath),
        });
      }

      // Notificar providers
      (this.preferenceProvider as any).onPreferencesChangedEmitter?.fire({ changes });
    } catch (e) {
      console.error('Error processing preference file change:', e);
    }
  }

  protected resolveScope(configPath: string): PreferenceScope {
    if (configPath.includes('.theia')) return PreferenceScope.User;
    if (configPath.endsWith('.code-workspace')) return PreferenceScope.Workspace;
    if (configPath.includes('.vscode')) return PreferenceScope.WorkspaceFolder;
    return PreferenceScope.Application;
  }

  dispose(): void {
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
  }
}
```

### 7.6 Atomic Preference File Writes

Escritas no arquivo de configuracao sao atomicas para evitar corrupcao:

```typescript
export class AtomicPreferenceWriter {

  @inject(FileService)
  protected readonly fileService: FileService;

  async write(configPath: string, data: Record<string, unknown>): Promise<void> {
    const tmpPath = configPath + '.tmp';
    const backupPath = configPath + '.backup';

    try {
      // Backup do arquivo existente
      if (await this.fileService.exists(configPath)) {
        await this.fileService.copy(configPath, backupPath, { overwrite: true });
      }

      // Escrita em arquivo temporario
      const content = JSON.stringify(data, null, 2);
      await this.fileService.writeFile(tmpPath, content);

      // Renomeacao atomica (substitui o original)
      await this.fileService.move(tmpPath, configPath, { overwrite: true });

      // Remove backup em caso de sucesso
      if (await this.fileService.exists(backupPath)) {
        await this.fileService.delete(backupPath);
      }
    } catch (e) {
      // Restaura backup em caso de falha
      if (await this.fileService.exists(backupPath)) {
        await this.fileService.move(backupPath, configPath, { overwrite: true });
      }
      if (await this.fileService.exists(tmpPath)) {
        await this.fileService.delete(tmpPath);
      }
      throw e;
    }
  }
}
```

---

## 8. Settings UI

### 8.1 SettingsWidget

O Theia fornece um `SettingsWidget` baseado no `SettingsEditorWidget`:

```typescript
// @theia/preferences/src/browser/settings-widget.ts
@injectable()
export class SettingsWidget extends ReactWidget {

  static ID = 'settings.editor.widget';
  static LABEL = 'Settings';

  @inject(PreferenceService)
  protected readonly preferenceService: IPreferenceService;

  @inject(PreferenceSchemaRegistry)
  protected readonly schemaRegistry: PreferenceSchemaRegistry;

  protected query: string = '';
  protected selectedScope: PreferenceScope = PreferenceScope.User;

  render(): React.ReactNode {
    const grouped = this.groupByCategory();

    return (
      <div className='settings-editor'>
        <div className='settings-header'>
          <input
            type='text'
            placeholder='Search settings...'
            onChange={this.handleSearch}
          />
          <select
            value={this.selectedScope}
            onChange={this.handleScopeChange}
          >
            <option value={PreferenceScope.User}>User</option>
            <option value={PreferenceScope.Workspace}>Workspace</option>
            <option value={PreferenceScope.WorkspaceFolder}>Folder</option>
          </select>
        </div>
        <div className='settings-body'>
          {Object.entries(grouped).map(([category, properties]) => (
            <SettingsCategory
              key={category}
              title={category}
              properties={properties}
              filter={this.query}
              scope={this.selectedScope}
            />
          ))}
        </div>
      </div>
    );
  }

  protected groupByCategory(): Record<string, PreferenceProperty[]> {
    const groups: Record<string, PreferenceProperty[]> = {};
    for (const [key, property] of this.schemaRegistry.getAllSchemas()) {
      const category = key.split('.')[0];
      if (!groups[category]) groups[category] = [];
      groups[category].push({ ...property, key });
    }
    // Sort por order dentro de cada categoria
    for (const category of Object.keys(groups)) {
      groups[category].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    }
    return groups;
  }

  protected handleSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.query = e.target.value;
    this.update();
  };

  protected handleScopeChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    this.selectedScope = Number(e.target.value) as PreferenceScope;
    this.update();
  };
}
```

### 8.2 Preferences Tree

As preferencias sao agrupadas em uma arvore categorizada:

```typescript
export class PreferenceTreeModel {

  protected groups: PreferenceGroup[] = [];

  constructor(
    @inject(PreferenceSchemaRegistry)
    protected readonly schemaRegistry: PreferenceSchemaRegistry
  ) {
    this.buildTree();
  }

  protected buildTree(): void {
    const categoryMap = new Map<string, PreferenceGroup>();

    for (const [key, property] of this.schemaRegistry.getAllSchemas()) {
      const category = this.getCategory(key);
      const subCategory = this.getSubCategory(key);

      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          id: category,
          label: this.formatLabel(category),
          children: [],
        });
      }

      const group = categoryMap.get(category)!;
      let subGroup = group.children.find(c => c.id === subCategory);

      if (!subGroup) {
        subGroup = {
          id: subCategory,
          label: this.formatLabel(subCategory),
          properties: [],
        };
        group.children.push(subGroup);
      }

      subGroup.properties.push({ key, ...property });
    }

    this.groups = Array.from(categoryMap.values());
  }

  protected getCategory(key: string): string {
    return key.split('.')[0];
  }

  protected getSubCategory(key: string): string {
    const parts = key.split('.');
    return parts.length > 2 ? parts.slice(1, -1).join('.') : 'general';
  }

  protected formatLabel(id: string): string {
    return id.charAt(0).toUpperCase() + id.slice(1).replace(/([A-Z])/g, ' $1');
  }

  search(query: string): PreferenceGroup[] {
    if (!query) return this.groups;
    const lower = query.toLowerCase();
    return this.groups
      .map(group => ({
        ...group,
        children: group.children
          .map(child => ({
            ...child,
            properties: child.properties.filter(p =>
              p.key!.toLowerCase().includes(lower) ||
              (p.description && p.description.toLowerCase().includes(lower))
            ),
          }))
          .filter(child => child.properties.length > 0),
      }))
      .filter(group => group.children.length > 0);
  }

  getGroups(): PreferenceGroup[] {
    return this.groups;
  }
}

export interface PreferenceGroup {
  id: string;
  label: string;
  children: PreferenceSubGroup[];
}

export interface PreferenceSubGroup {
  id: string;
  label: string;
  properties: (PreferenceProperty & { key?: string })[];
}
```

### 8.3 Settings Modification in UI

```typescript
export class SettingsEditorController {

  @inject(PreferenceService)
  protected readonly preferenceService: IPreferenceService;

  async setPreference(
    key: string,
    value: unknown,
    scope: PreferenceScope,
    resourceUri?: string
  ): Promise<void> {
    const validation = await this.preferenceService.validate(key, value);
    if (!validation.valid) {
      throw new SettingsValidationError(validation.error!);
    }
    await this.preferenceService.set(key, value, scope, resourceUri);
  }

  async resetPreference(key: string, scope: PreferenceScope, resourceUri?: string): Promise<void> {
    await this.preferenceService.set(key, undefined, scope, resourceUri);
  }

  inspect(key: string, resourceUri?: string): PreferenceInspection | undefined {
    return this.preferenceService.inspect(key, resourceUri);
  }
}
```

### 8.4 Settings Reset to Default

O usuario pode restaurar uma preferencia ao valor padrao:

```typescript
export class SettingsResetHandler {

  @inject(PreferenceService)
  protected readonly preferenceService: IPreferenceService;

  async resetToDefault(key: string, scope: PreferenceScope): Promise<void> {
    // Remover o valor do escopo faz o fallback para o padrao
    await this.preferenceService.set(key, undefined, scope);

    // Se estava sobrescrito em multiplos escopos, limpar todos
    const inspected = this.preferenceService.inspect(key);
    if (inspected) {
      if (inspected.userValue !== undefined && scope === PreferenceScope.User) {
        await this.preferenceService.set(key, undefined, PreferenceScope.User);
      }
      if (inspected.workspaceValue !== undefined && scope === PreferenceScope.Workspace) {
        await this.preferenceService.set(key, undefined, PreferenceScope.Workspace);
      }
    }
  }
}
```

### 8.5 Settings Scope Indicator

A UI mostra de qual escopo vem o valor atual:

```typescript
export interface PreferenceSourceIndicator {
  readonly key: string;
  readonly value: unknown;
  readonly effectiveScope: PreferenceScope;
  readonly overridden: boolean;
}

export class PreferenceSourceResolver {

  @inject(PreferenceService)
  protected readonly preferenceService: IPreferenceService;

  resolve(key: string, resourceUri?: string): PreferenceSourceIndicator {
    const inspected = this.preferenceService.inspect(key, resourceUri);
    if (!inspected) {
      return { key, value: undefined, effectiveScope: PreferenceScope.Default, overridden: false };
    }

    let effectiveScope = PreferenceScope.Default;
    let value = inspected.defaultValue;

    if (inspected.userValue !== undefined) {
      effectiveScope = PreferenceScope.User;
      value = inspected.userValue;
    }
    if (inspected.workspaceValue !== undefined) {
      effectiveScope = PreferenceScope.Workspace;
      value = inspected.workspaceValue;
    }
    if (inspected.workspaceFolderValue !== undefined) {
      effectiveScope = PreferenceScope.WorkspaceFolder;
      value = inspected.workspaceFolderValue;
    }

    const overridden = inspected.userValue !== undefined
      || inspected.workspaceValue !== undefined
      || inspected.workspaceFolderValue !== undefined;

    return { key, value, effectiveScope, overridden };
  }
}
```

### 8.6 Settings File Link

A UI do settings editor prove um link direto para o arquivo JSON:

```typescript
export class SettingsFileLinkProvider {

  @inject(PreferenceConfigurations)
  protected readonly configs: PreferenceConfigurations;

  getFileUri(scope: PreferenceScope): URI {
    switch (scope) {
      case PreferenceScope.User:
        return new URI(this.configs.getUserConfigPath());
      case PreferenceScope.Workspace:
        return new URI(this.configs.getWorkspaceConfigPath());
      case PreferenceScope.WorkspaceFolder:
        return new URI(this.configs.getFolderConfigPath());
    }
  }

  async openInEditor(scope: PreferenceScope): Promise<void> {
    const uri = this.getFileUri(scope);
    await this.editorManager.open(uri);
  }

  @inject(EditorManager)
  protected readonly editorManager: EditorManager;
}
```

---

## 9. Preference Bindings

### 9.1 PreferenceBinding

Bindings conectam preferencias a comportamentos concretos:

```typescript
export interface PreferenceBinding {
  readonly preferenceName: string;
  readonly affect: () => void;

  bind(): Disposable;
}

export class PreferenceBindingImpl implements PreferenceBinding {

  @inject(PreferenceService)
  protected readonly preferenceService: IPreferenceService;

  constructor(
    readonly preferenceName: string,
    private readonly callback: (value: unknown) => void
  ) {}

  bind(): Disposable {
    this.callback(this.preferenceService.get(this.preferenceName));
    return this.preferenceService.onPreferenceChanged(event => {
      if (event.preferenceName === this.preferenceName) {
        this.callback(event.newValue);
      }
    });
  }
}
```

### 9.2 Editor Preference Binding

Preferencias do editor sao vinculadas ao Monaco Editor:

```typescript
export class EditorPreferenceBinding {

  @inject(EditorManager)
  protected readonly editorManager: EditorManager;

  bindEditorPreferences(editor: EditorWidget): void {
    const disposables = new DisposableCollection();

    // Bind tabSize
    disposables.push(this.bindPreference(
      'editor.tabSize',
      this.preferenceService,
      (value) => {
        editor.editor.updateOptions({ tabSize: value as number });
      }
    ));

    // Bind wordWrap
    disposables.push(this.bindPreference(
      'editor.wordWrap',
      this.preferenceService,
      (value) => {
        editor.editor.updateOptions({ wordWrap: value as string });
      }
    ));

    // Bind minimap
    disposables.push(this.bindPreference(
      'editor.minimap.enabled',
      this.preferenceService,
      (value) => {
        editor.editor.updateOptions({ minimap: { enabled: value as boolean } });
      }
    ));

    // Bind font size
    disposables.push(this.bindPreference(
      'editor.fontSize',
      this.preferenceService,
      (value) => {
        editor.editor.updateOptions({ fontSize: value as number });
      }
    ));

    editor.toDispose.push(disposables);
  }

  protected bindPreference(
    key: string,
    service: IPreferenceService,
    handler: (value: unknown) => void
  ): Disposable {
    handler(service.get(key));
    return service.onPreferenceChanged(event => {
      if (event.preferenceName === key) {
        handler(event.newValue);
      }
    });
  }

  @inject(PreferenceService)
  protected readonly preferenceService: IPreferenceService;
}
```

### 9.3 View Preference Binding

Preferencias de view controlam layout e visibilidade:

```typescript
export class ViewPreferenceBinding {

  @inject(ApplicationShell)
  protected readonly shell: ApplicationShell;

  @inject(PreferenceService)
  protected readonly preferenceService: IPreferenceService;

  bindViewPreferences(): void {
    // Sidebar visibility
    this.bind('workbench.sideBar.visible', (visible) => {
      if (visible) {
        this.shell.leftPanel.show();
      } else {
        this.shell.leftPanel.hide();
      }
    });

    // Panel position
    this.bind('workbench.panel.position', (position) => {
      this.shell.bottomPanel.position = position as 'bottom' | 'right';
    });
  }

  protected bind(key: string, handler: (value: unknown) => void): Disposable {
    handler(this.preferenceService.get(key));
    return this.preferenceService.onPreferenceChanged(event => {
      if (event.preferenceName === key) {
        handler(event.newValue);
      }
    });
  }
}
```

### 9.4 Terminal Preference Binding

Preferencias do terminal controlam a experiencia do terminal integrado:

```typescript
export class TerminalPreferenceBinding {

  @inject(TerminalService)
  protected readonly terminalService: TerminalService;

  @inject(PreferenceService)
  protected readonly preferenceService: IPreferenceService;

  bindTerminalPreferences(): void {
    this.bind('terminal.integrated.fontSize', (size) => {
      this.terminalService.updateOptions({ fontSize: size as number });
    });

    this.bind('terminal.integrated.fontFamily', (family) => {
      this.terminalService.updateOptions({ fontFamily: family as string });
    });

    this.bind('terminal.integrated.cursorBlinking', (blink) => {
      this.terminalService.updateOptions({ cursorBlinking: blink as boolean });
    });
  }

  protected bind(key: string, handler: (value: unknown) => void): Disposable {
    handler(this.preferenceService.get(key));
    return this.preferenceService.onPreferenceChanged(event => {
      if (event.preferenceName === key) {
        handler(event.newValue);
      }
    });
  }

  @inject(PreferenceService)
  protected readonly preferenceService: IPreferenceService;
}
```

### 9.5 Custom Preference Binding Registration

Extensoes podem registrar bindings customizados:

```typescript
export interface PreferenceBindingContribution {
  registerBindings(registry: PreferenceBindingRegistry): void;
}

@injectable()
export class PreferenceBindingRegistry {

  protected bindings: PreferenceBinding[] = [];

  registerBinding(binding: PreferenceBinding): Disposable {
    this.bindings.push(binding);
    const disposable = binding.bind();
    return Disposable.create(() => {
      const idx = this.bindings.indexOf(binding);
      if (idx >= 0) this.bindings.splice(idx, 1);
      disposable.dispose();
    });
  }

  dispose(): void {
    for (const binding of this.bindings) {
      binding.bind().dispose();
    }
    this.bindings = [];
  }
}

// Exemplo: IDEIA agent preference binding
@injectable()
export class IdeiaAgentPreferenceBinding implements PreferenceBindingContribution {

  @inject(IAgentService)
  protected readonly agentService: IAgentService;

  @inject(PreferenceService)
  protected readonly preferenceService: IPreferenceService;

  registerBindings(registry: PreferenceBindingRegistry): void {
    registry.registerBinding({
      preferenceName: 'agent.enabled',
      affect: () => {
        const enabled = this.preferenceService.get<boolean>('agent.enabled', true);
        if (enabled) {
          this.agentService.enable();
        } else {
          this.agentService.disable();
        }
      },
      bind: () => {
        this.affect();
        return this.preferenceService.onPreferenceChanged(event => {
          if (event.preferenceName === 'agent.enabled') {
            this.affect();
          }
        });
      },
    });
  }
}
```

---

## 10. Dynamic Preferences

### 10.1 Runtime Preference Changes

Preferencias podem ser alteradas em runtime sem restart:

```typescript
export class DynamicPreferenceManager {

  @inject(PreferenceService)
  protected readonly preferenceService: IPreferenceService;

  async changePreference(key: string, value: unknown, scope: PreferenceScope): Promise<void> {
    // Validacao
    const validation = await this.preferenceService.validate(key, value);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Persistencia
    await this.preferenceService.set(key, value, scope);

    // Notificacao automatica via onPreferenceChanged
    // Todos os bindings registrados serao notificados
  }
}
```

### 10.2 Preference Change Propagation

A propagacao segue um modelo pub-sub com escopos:

```
PreferenceService.set('editor.fontSize', 16, User)
  |
  +-> Validation (schema check)
  |
  +-> Persistence (write to settings.json)
  |
  +-> UserPreferenceProvider.onPreferencesChanged
  |
  +-> PreferenceChain: propagacao para composite
  |
  +-> PreferenceService.onPreferenceChanged
  |
  +-> PreferenceProxy (se usado, reflete na proxima leitura)
  |
  +-> EditorPreferenceBinding
  |     +-> editor.updateOptions({ fontSize: 16 })
  |
  +-> SettingsWidget (atualiza UI)
  |     +-> Input mostra novo valor
  |
  +-> Outros bindings registrados
        +-> ...
```

### 10.3 UI Components Reacting to Preference Changes

Components React usam hooks para reagir a mudancas:

```typescript
export function usePreference<T>(key: string, defaultValue?: T): T | undefined {
  const preferenceService = useInject<IPreferenceService>(PreferenceService);
  const [value, setValue] = React.useState<T | undefined>(
    () => preferenceService.get<T>(key, defaultValue)
  );

  React.useEffect(() => {
    const disposable = preferenceService.onPreferenceChanged(event => {
      if (event.preferenceName === key) {
        setValue(event.newValue as T);
      }
    });
    return () => disposable.dispose();
  }, [key, preferenceService]);

  return value;
}

// Uso no componente
function EditorSettingsPanel(): React.ReactElement {
  const fontSize = usePreference<number>('editor.fontSize', 14);
  const tabSize = usePreference<number>('editor.tabSize', 4);

  return (
    <div>
      <label>Font Size: {fontSize}</label>
      <label>Tab Size: {tabSize}</label>
    </div>
  );
}
```

### 10.4 Debounced Preference Updates

Para evitar atualizacoes frequentes (ex: dragging slider), usa-se debounce:

```typescript
export class DebouncedPreferenceUpdater {

  protected debouncers = new Map<string, {
    timeout: NodeJS.Timeout;
    pendingValue: unknown;
  }>();

  constructor(
    @inject(PreferenceService)
    protected readonly preferenceService: IPreferenceService,
    protected readonly debounceTime: number = 300
  ) {}

  update(key: string, value: unknown, scope: PreferenceScope): void {
    const existing = this.debouncers.get(key);
    if (existing) {
      clearTimeout(existing.timeout);
      existing.pendingValue = value;
    } else {
      this.debouncers.set(key, {
        timeout: setTimeout(() => this.flush(key), this.debounceTime),
        pendingValue: value,
      });
    }
  }

  protected async flush(key: string): Promise<void> {
    const entry = this.debouncers.get(key);
    if (!entry) return;

    this.debouncers.delete(key);
    await this.preferenceService.set(key, entry.pendingValue, PreferenceScope.User);
  }

  flushAll(): void {
    for (const [key] of this.debouncers) {
      this.flush(key);
    }
  }

  dispose(): void {
    for (const [, entry] of this.debouncers) {
      clearTimeout(entry.timeout);
    }
    this.debouncers.clear();
  }
}
```

### 10.5 Preference-Dependent Behavior

Servicos podem alterar comportamento baseado em preferencias:

```typescript
@injectable()
export class PreferenceDependentService {

  protected currentTheme: string;

  @postConstruct()
  init(): void {
    // Leitura inicial
    this.currentTheme = this.preferenceService.get<string>('workbench.colorTheme', 'ideia-dark');

    // Reacao a mudancas
    this.preferenceService.onPreferenceChanged(event => {
      if (event.preferenceName === 'workbench.colorTheme') {
        this.onThemeChanged(event.newValue as string);
      }
      if (event.preferenceName === 'agent.enabled') {
        this.onAgentEnabledChanged(event.newValue as boolean);
      }
    });
  }

  protected onThemeChanged(themeId: string): void {
    this.currentTheme = themeId;
    this.themeService.loadAndApplyTheme(themeId);
  }

  protected onAgentEnabledChanged(enabled: boolean): void {
    if (enabled) {
      this.agentService.start();
    } else {
      this.agentService.stop();
    }
  }

  @inject(PreferenceService)
  protected readonly preferenceService: IPreferenceService;

  @inject(ThemeService)
  protected readonly themeService: ThemeService;

  @inject(IAgentService)
  protected readonly agentService: IAgentService;
}
```

---

## 11. Environment & Platform Preferences

### 11.1 OS-Specific Defaults

O Theia suporta defaults diferentes por sistema operacional:

```typescript
export class PlatformPreferenceDefaults {

  getOSDefaults(): Record<string, unknown> {
    if (os.platform() === 'win32') {
      return {
        'terminal.integrated.shell.windows': 'powershell.exe',
        'editor.fontFamily': 'Consolas, "Courier New", monospace',
      };
    }
    if (os.platform() === 'darwin') {
      return {
        'terminal.integrated.shell.osx': '/bin/zsh',
        'editor.fontFamily': 'Menlo, Monaco, "Courier New", monospace',
      };
    }
    // Linux
    return {
      'terminal.integrated.shell.linux': '/bin/bash',
      'editor.fontFamily': "'Droid Sans Mono', 'monospace', monospace",
    };
  }

  getPlatformDefaults(): Record<string, unknown> {
    const platform = os.platform();
    const arch = os.arch();
    return {
      'editor.fontSize': platform === 'darwin' ? 12 : 14,
      'window.zoomLevel': platform === 'darwin' ? 0 : 0,
      'editor.mouseWheelZoom': platform === 'win32',
    };
  }
}
```

### 11.2 Environment Variable Overrides

Preferencias podem ser sobrescritas por variaveis de ambiente:

```typescript
export class EnvPreferenceProvider implements PreferenceProvider {

  protected readonly envPrefix = 'THEIA_';

  get<T>(preferenceName: string, resourceUri?: string): T | undefined {
    const envName = this.toEnvVarName(preferenceName);
    const value = process.env[envName];
    if (value === undefined) {
      return undefined;
    }
    return this.parseValue(value) as T;
  }

  protected toEnvVarName(preferenceName: string): string {
    return this.envPrefix + preferenceName
      .replace(/\./g, '_')
      .replace(/-/g, '_')
      .toUpperCase();
  }

  protected parseValue(value: string): unknown {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
    return value;
  }

  set<T>(preferenceName: string, value: T, resourceUri?: string): Promise<void> {
    // Environment variables sao read-only via este provider
    return Promise.resolve();
  }

  protected readonly onPreferencesChangedEmitter = new Emitter<PreferenceChangesEvent>();
  readonly onPreferencesChanged: Event<PreferenceChangesEvent> = (cb) =>
    this.onPreferencesChangedEmitter.on(cb);

  dispose(): void {
    this.onPreferencesChangedEmitter.dispose();
  }
}
```

### 11.3 Remote vs Local Preferences

Preferencias podem diferir entre ambientes local e remoto:

```typescript
export class RemotePreferenceProvider extends UserPreferenceProvider {

  @inject(ConnectionService)
  protected readonly connection: ConnectionService;

  protected async load(): Promise<void> {
    if (this.connection.isRemote) {
      // Carrega preferencias do servidor remoto
      const data = await this.connection.request('preferences.getAll');
      for (const [key, value] of Object.entries(data)) {
        this.preferences.set(key, value);
      }
    } else {
      await super.load();
    }
  }

  protected async save(): Promise<void> {
    if (this.connection.isRemote) {
      await this.connection.send('preferences.setAll', Object.fromEntries(this.preferences));
    } else {
      await super.save();
    }
  }
}
```

### 11.4 Cloud Sync of Preferences

Sincronizacao em nuvem via NATS KV Store:

```typescript
export class CloudPreferenceSync {

  @inject(PreferenceService)
  protected readonly preferenceService: IPreferenceService;

  @inject(IEventBus)
  protected readonly eventBus: IEventBus;

  async syncToCloud(): Promise<void> {
    const allPrefs: Record<string, unknown> = {};
    const inspected = this.preferenceService.inspect('*');
    // Coleta todas as preferencias do usuario
    for (const [key, inspection] of Object.entries(inspected ?? {})) {
      if (inspection.userValue !== undefined) {
        allPrefs[key] = inspection.userValue;
      }
    }
    // Publica no NATS KV
    await this.eventBus.publish('preferences.sync', {
      userId: this.userSession.userId,
      preferences: allPrefs,
      timestamp: Date.now(),
    });
  }

  async syncFromCloud(): Promise<void> {
    const data = await this.eventBus.request('preferences.sync.get', {
      userId: this.userSession.userId,
    });
    if (data?.preferences) {
      for (const [key, value] of Object.entries(data.preferences)) {
        await this.preferenceService.set(key, value, PreferenceScope.User);
      }
    }
  }
}
```

---

## 12. IDEIA-specific Preferences

### 12.1 Agent-Related Preferences

```typescript
export const ideiaAgentPreferenceSchema: PreferenceSchema = {
  type: 'object',
  properties: {
    'agent.enabled': {
      type: 'boolean',
      default: true,
      description: 'Enable AI agents in IDEIA',
      scope: PreferenceScope.User,
      tags: ['ideia', 'agent'],
    },
    'agent.autonomyLevel': {
      type: 'string',
      enum: ['assisted', 'supervised', 'semi-autonomous', 'autonomous'],
      default: 'supervised',
      description: 'Maximum autonomy level for AI agents',
      scope: PreferenceScope.User,
      tags: ['ideia', 'agent'],
      enumDescriptions: [
        'Agent requires explicit confirmation for every action',
        'Agent can execute with approval per task',
        'Agent can execute routine tasks automatically',
        'Agent can operate with full autonomy within scope',
      ],
    },
    'agent.defaultModel': {
      type: 'string',
      default: 'ollama/deepseek-coder',
      description: 'Default LLM model for agent operations',
      scope: PreferenceScope.User,
      tags: ['ideia', 'agent'],
    },
    'agent.maxTokens': {
      type: 'integer',
      default: 4096,
      description: 'Maximum tokens per agent response',
      scope: PreferenceScope.User,
      minimum: 256,
      maximum: 32768,
      tags: ['ideia', 'agent'],
    },
    'agent.temperature': {
      type: 'number',
      default: 0.2,
      description: 'LLM temperature for agent responses',
      scope: PreferenceScope.User,
      minimum: 0,
      maximum: 2,
      tags: ['ideia', 'agent'],
    },
    'agent.timeout': {
      type: 'integer',
      default: 120000,
      description: 'Agent task timeout in milliseconds',
      scope: PreferenceScope.User,
      minimum: 10000,
      maximum: 600000,
      tags: ['ideia', 'agent'],
    },
    'agent.contextWindow': {
      type: 'integer',
      default: 8192,
      description: 'Context window size for agent',
      scope: PreferenceScope.User,
      minimum: 2048,
      maximum: 128000,
      tags: ['ideia', 'agent'],
    },
    'agent.maxRetries': {
      type: 'integer',
      default: 3,
      description: 'Maximum retries on agent failure',
      scope: PreferenceScope.User,
      minimum: 0,
      maximum: 10,
      tags: ['ideia', 'agent'],
    },
  },
};
```

### 12.2 AI-Related Preferences

```typescript
export const ideiaAIPreferenceSchema: PreferenceSchema = {
  type: 'object',
  properties: {
    'ai.provider': {
      type: 'string',
      enum: ['ollama', 'openai', 'deepseek', 'anthropic', 'custom'],
      default: 'ollama',
      description: 'AI provider for IDEIA intelligence layer',
      scope: PreferenceScope.User,
      tags: ['ideia', 'ai'],
    },
    'ai.model': {
      type: 'string',
      default: 'deepseek-coder',
      description: 'AI model name for the selected provider',
      scope: PreferenceScope.User,
      tags: ['ideia', 'ai'],
    },
    'ai.maxTokens': {
      type: 'integer',
      default: 2048,
      description: 'Maximum tokens for AI responses',
      scope: PreferenceScope.User,
      minimum: 128,
      maximum: 65536,
      tags: ['ideia', 'ai'],
    },
    'ai.temperature': {
      type: 'number',
      default: 0.3,
      description: 'LLM temperature for AI operations',
      scope: PreferenceScope.User,
      minimum: 0,
      maximum: 2,
      tags: ['ideia', 'ai'],
    },
    'ai.endpoint': {
      type: 'string',
      default: 'http://localhost:11434',
      description: 'Custom API endpoint for AI provider',
      scope: PreferenceScope.User,
      tags: ['ideia', 'ai'],
      pattern: '^https?://',
    },
    'ai.apiKey': {
      type: 'string',
      default: '',
      description: 'API key for cloud AI providers (stored encrypted)',
      scope: PreferenceScope.Application,
      tags: ['ideia', 'ai', 'secret'],
    },
    'ai.requestTimeout': {
      type: 'integer',
      default: 60000,
      description: 'Timeout for AI requests in milliseconds',
      scope: PreferenceScope.User,
      minimum: 5000,
      maximum: 300000,
      tags: ['ideia', 'ai'],
    },
  },
};
```

### 12.3 Project Preferences

```typescript
export const ideiaProjectPreferenceSchema: PreferenceSchema = {
  type: 'object',
  properties: {
    'project.language': {
      type: 'string',
      default: 'typescript',
      description: 'Primary project language',
      scope: PreferenceScope.Workspace,
      tags: ['ideia', 'project'],
    },
    'project.buildCommand': {
      type: 'string',
      default: 'npm run build',
      description: 'Build command for the project',
      scope: PreferenceScope.Workspace,
      tags: ['ideia', 'project'],
    },
    'project.testCommand': {
      type: 'string',
      default: 'npm test',
      description: 'Test command for the project',
      scope: PreferenceScope.Workspace,
      tags: ['ideia', 'project'],
    },
    'project.autoBuild': {
      type: 'boolean',
      default: false,
      description: 'Automatically build project on file changes',
      scope: PreferenceScope.Workspace,
      tags: ['ideia', 'project'],
    },
    'project.autoTest': {
      type: 'boolean',
      default: false,
      description: 'Automatically run tests on file changes',
      scope: PreferenceScope.Workspace,
      tags: ['ideia', 'project'],
    },
  },
};
```

### 12.4 Quality Gate Thresholds

```typescript
export const ideiaQualityGatePreferenceSchema: PreferenceSchema = {
  type: 'object',
  properties: {
    'quality.codeScore': {
      type: 'number',
      default: 80,
      description: 'Minimum code quality score (0-100)',
      scope: PreferenceScope.Workspace,
      minimum: 0,
      maximum: 100,
      tags: ['ideia', 'quality'],
    },
    'quality.securityScore': {
      type: 'number',
      default: 90,
      description: 'Minimum security score (0-100)',
      scope: PreferenceScope.Workspace,
      minimum: 0,
      maximum: 100,
      tags: ['ideia', 'quality'],
    },
    'quality.coverage': {
      type: 'number',
      default: 30,
      description: 'Minimum code coverage percentage',
      scope: PreferenceScope.Workspace,
      minimum: 0,
      maximum: 100,
      tags: ['ideia', 'quality'],
    },
    'quality.coverageTarget': {
      type: 'number',
      default: 80,
      description: 'Target code coverage percentage for v1.0',
      scope: PreferenceScope.Workspace,
      minimum: 0,
      maximum: 100,
      tags: ['ideia', 'quality'],
    },
    'quality.blockCriticalGaps': {
      type: 'boolean',
      default: true,
      description: 'Block release on critical gaps',
      scope: PreferenceScope.Workspace,
      tags: ['ideia', 'quality'],
    },
    'quality.blockOnMajorGaps': {
      type: 'boolean',
      default: true,
      description: 'Block MVP on major gaps',
      scope: PreferenceScope.Workspace,
      tags: ['ideia', 'quality'],
    },
    'quality.mutationScore': {
      type: 'number',
      default: 60,
      description: 'Minimum mutation testing score',
      scope: PreferenceScope.Workspace,
      minimum: 0,
      maximum: 100,
      tags: ['ideia', 'quality'],
    },
  },
};
```

### 12.5 Workspace Trust for Agents

```typescript
export const ideiaTrustPreferenceSchema: PreferenceSchema = {
  type: 'object',
  properties: {
    'workspace.trust.enabled': {
      type: 'boolean',
      default: false,
      description: 'Require workspace trust before enabling agents',
      scope: PreferenceScope.User,
      tags: ['ideia', 'security'],
    },
    'workspace.trust.allowExecute': {
      type: 'boolean',
      default: false,
      description: 'Allow agent to execute commands in workspace',
      scope: PreferenceScope.Workspace,
      tags: ['ideia', 'security'],
    },
    'workspace.trust.allowFileAccess': {
      type: 'boolean',
      default: true,
      description: 'Allow agent to read/write files in workspace',
      scope: PreferenceScope.Workspace,
      tags: ['ideia', 'security'],
    },
    'workspace.trust.allowNetwork': {
      type: 'boolean',
      default: false,
      description: 'Allow agent to make network requests',
      scope: PreferenceScope.Workspace,
      tags: ['ideia', 'security'],
    },
    'workspace.trust.trustedFolders': {
      type: 'array',
      items: { type: 'string' },
      default: [],
      description: 'List of trusted folder paths',
      scope: PreferenceScope.User,
      tags: ['ideia', 'security'],
    },
  },
};
```

### 12.6 IDEIA Preferences Module

Registro centralizado das preferencias IDEIA:

```typescript
export default new ContainerModule((bind, unbind, isBound, rebind) => {
  // Schemas IDEIA
  bind(PreferenceContribution).toConstantValue({
    schema: ideiaAgentPreferenceSchema,
  });
  bind(PreferenceContribution).toConstantValue({
    schema: ideiaAIPreferenceSchema,
  });
  bind(PreferenceContribution).toConstantValue({
    schema: ideiaProjectPreferenceSchema,
  });
  bind(PreferenceContribution).toConstantValue({
    schema: ideiaQualityGatePreferenceSchema,
  });
  bind(PreferenceContribution).toConstantValue({
    schema: ideiaTrustPreferenceSchema,
  });

  // Providers customizados
  bind(PreferenceProvider)
    .to(AgentPreferenceProvider)
    .inSingletonScope()
    .whenTargetNamed('agent');

  bind(PreferenceProvider)
    .to(IdeiaProjectPreferenceProvider)
    .inSingletonScope()
    .whenTargetNamed('ideia-project');

  // Binding contributions
  bind(PreferenceBindingContribution)
    .to(IdeiaAgentPreferenceBinding);

  // Settings widget customizado
  bind(SettingsWidget).toSelf();
  bind(WidgetFactory).toDynamicValue(ctx => ({
    id: SettingsWidget.ID,
    createWidget: () => ctx.container.get(SettingsWidget),
  }));
});
```

---

## 13. Preference Migration

### 13.1 Preference Schema Versioning

O schema de preferencias suporta versionamento para migracao:

```typescript
export interface PreferenceMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(data: Record<string, unknown>): Record<string, unknown>;
}

export class PreferenceMigrationManager {

  protected migrations: PreferenceMigration[] = [];
  protected currentVersionKey = '_preferencesVersion';

  registerMigration(migration: PreferenceMigration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.fromVersion - b.fromVersion);
  }

  async migrateIfNeeded(scope: PreferenceScope): Promise<void> {
    const currentVersion = this.getCurrentVersion(scope);
    const applicable = this.migrations.filter(
      m => m.fromVersion >= currentVersion
    );

    if (applicable.length === 0) return;

    let data = await this.loadRaw(scope);

    for (const migration of applicable) {
      data = migration.migrate(data);
    }

    data[this.currentVersionKey] = applicable[applicable.length - 1].toVersion;
    await this.saveRaw(scope, data);
  }

  protected getCurrentVersion(scope: PreferenceScope): number {
    const data = this.preferenceService.inspect(this.currentVersionKey, scope);
    return (data as any)?.userValue ?? 0;
  }

  @inject(PreferenceService)
  protected readonly preferenceService: IPreferenceService;
}
```

### 13.2 Migration Between Versions

Exemplo de migracao entre versoes de schema:

```typescript
// Migracao v1 -> v2: rename agent.maxTokens -> agent.maxResponseTokens
export const migrationV1toV2: PreferenceMigration = {
  fromVersion: 1,
  toVersion: 2,
  migrate: (data) => {
    if (data['agent.maxTokens'] !== undefined) {
      data['agent.maxResponseTokens'] = data['agent.maxTokens'];
      delete data['agent.maxTokens'];
    }
    if (data['agent.defaultModel'] === 'deepseek-coder') {
      data['agent.defaultModel'] = 'deepseek-v2';
    }
    return data;
  },
};

// Migracao v2 -> v3: flatten quality gate structure
export const migrationV2toV3: PreferenceMigration = {
  fromVersion: 2,
  toVersion: 3,
  migrate: (data) => {
    const qualityGate = data['qualityGate'] as Record<string, unknown> | undefined;
    if (qualityGate) {
      data['quality.codeScore'] = qualityGate['codeScore'] ?? 80;
      data['quality.securityScore'] = qualityGate['securityScore'] ?? 90;
      delete data['qualityGate'];
    }
    return data;
  },
};
```

### 13.3 Backward Compatibility

Valores antigos sao traduzidos automaticamente:

```typescript
export class PreferenceBackwardCompatLayer {

  protected compatMap = new Map<string, string>([
    ['editor.tabSize', 'editor.tabSize'],
    ['editor.insertSpaces', 'editor.insertSpaces'],
    ['typescript.preferences.importModuleSpecifier', 'typescript.preferences.importModuleSpecifier'],
  ]);

  protected removedKeys = new Set<string>([
    'workbench.tree.indent',
    'workbench.activityBar.visible',
  ]);

  resolveKey(key: string): string {
    // Verifica se a chave foi renomeada
    if (this.compatMap.has(key)) {
      return this.compatMap.get(key)!;
    }
    return key;
  }

  isRemoved(key: string): boolean {
    return this.removedKeys.has(key);
  }

  getDeprecationMessage(key: string): string | undefined {
    const messages: Record<string, string> = {
      'workbench.tree.indent': 'Use "editor.tree.indent" instead',
      'workbench.activityBar.visible': 'Use "workbench.sideBar.visible" instead',
    };
    return messages[key];
  }
}
```

### 13.4 Deprecated Preferences

Preferencias depreciadas emitem warnings:

```typescript
export class DeprecatedPreferenceHandler {

  protected deprecated: Map<string, DeprecatedPreferenceInfo> = new Map([
    ['workbench.tree.indent', {
      alternative: 'editor.tree.indent',
      since: '1.0.0',
      error: false,
    }],
    ['workbench.activityBar.visible', {
      alternative: 'workbench.sideBar.visible',
      since: '1.0.0',
      error: false,
    }],
    ['agent.maxTokens', {
      alternative: 'agent.maxResponseTokens',
      since: '2.0.0',
      error: true,  // Erro: bloqueia se usado
    }],
  ]);

  handleGet(preferenceName: string, value: unknown): void {
    const info = this.deprecated.get(preferenceName);
    if (info) {
      console.warn(
        `Preference "${preferenceName}" is deprecated since ${info.since}. ` +
        `Use "${info.alternative}" instead.`
      );
    }
  }

  handleSet(preferenceName: string, value: unknown): void {
    const info = this.deprecated.get(preferenceName);
    if (info?.error) {
      throw new Error(
        `Cannot set deprecated preference "${preferenceName}". ` +
        `Use "${info.alternative}" instead.`
      );
    }
  }
}
```

### 13.5 Preference Removal Strategy

O processo de remocao segue um ciclo de vida:

```
Fase 1 — Deprecacao (v1.0)
  - Adiciona deprecationMessage no schema
  - Ainda funcional, mas com warning
  - Documentado no changelog

Fase 2 — Soft Removal (v2.0)
  - error: true no DeprecatedPreferenceHandler
  - Set bloqueado, get ainda funciona (com warning)
  - Migracao automatica para alternativa

Fase 3 — Hard Removal (v3.0)
  - Remove do schema
  - Remove do compat layer
  - Valor ignorado silenciosamente

Fase 4 — Cleanup (v4.0)
  - Remove codigo de suporte
  - Documento de migracao arquivado
```

---

## 14. Code Examples

### 14.1 PreferenceContribution with Full Schema

```typescript
import { PreferenceContribution, PreferenceSchema } from '@theia/core/lib/common/preferences';

@injectable()
export class IdeiaPreferenceContribution implements PreferenceContribution {

  readonly schema: PreferenceSchema = {
    type: 'object',
    properties: {
      'ideia.agent.enabled': {
        type: 'boolean',
        default: true,
        description: 'Enable AI agent functionality in IDEIA',
        scope: PreferenceScope.User,
        tags: ['ideia'],
      },
      'ideia.agent.autonomyLevel': {
        type: 'string',
        enum: ['assisted', 'supervised', 'semi-autonomous', 'autonomous'],
        default: 'supervised',
        description: 'Maximum autonomy level for AI agents',
        scope: PreferenceScope.User,
        markdownDescription: 'Controls how much autonomy AI agents have:\n' +
          '* **assisted** - Agent requires explicit confirmation for every action\n' +
          '* **supervised** - Agent can execute with approval per task\n' +
          '* **semi-autonomous** - Agent can execute routine tasks automatically\n' +
          '* **autonomous** - Agent can operate with full autonomy within scope',
        tags: ['ideia', 'agent'],
      },
      'ideia.agent.model': {
        type: 'string',
        default: 'ollama/deepseek-coder',
        description: 'AI model for agent operations',
        scope: PreferenceScope.User,
        tags: ['ideia', 'agent'],
      },
      'ideia.agent.contextWindow': {
        type: 'integer',
        default: 8192,
        description: 'Context window size for agent (in tokens)',
        scope: PreferenceScope.User,
        minimum: 2048,
        maximum: 128000,
        tags: ['ideia', 'agent'],
      },
      'ideia.ai.provider': {
        type: 'string',
        enum: ['ollama', 'openai', 'deepseek', 'anthropic', 'custom'],
        default: 'ollama',
        description: 'AI provider for intelligence layer',
        scope: PreferenceScope.User,
        tags: ['ideia', 'ai'],
      },
      'ideia.ai.temperature': {
        type: 'number',
        default: 0.3,
        description: 'LLM temperature for AI responses',
        scope: PreferenceScope.User,
        minimum: 0,
        maximum: 2,
        tags: ['ideia', 'ai'],
      },
      'ideia.project.language': {
        type: 'string',
        default: 'typescript',
        description: 'Primary programming language of the project',
        scope: PreferenceScope.Workspace,
        tags: ['ideia', 'project'],
      },
      'ideia.quality.coverage': {
        type: 'number',
        default: 30,
        description: 'Minimum code coverage percentage',
        scope: PreferenceScope.Workspace,
        minimum: 0,
        maximum: 100,
        tags: ['ideia', 'quality'],
      },
    },
  };
}
```

### 14.2 PreferenceProxy Creation with IDEIA-Specific Preferences

```typescript
import { createPreferenceProxy } from '@theia/core/lib/browser/preferences/preference-proxy';
import { PreferenceService } from '@theia/core/lib/browser/preferences/preference-service';

// Interface tipada para preferencias IDEIA
export interface IdeiaPreferences {
  'ideia.agent.enabled': boolean;
  'ideia.agent.autonomyLevel': 'assisted' | 'supervised' | 'semi-autonomous' | 'autonomous';
  'ideia.agent.model': string;
  'ideia.agent.contextWindow': number;
  'ideia.ai.provider': string;
  'ideia.ai.temperature': number;
  'ideia.project.language': string;
  'ideia.quality.coverage': number;
}

// Criacao do proxy (uma vez, tipado)
@injectable()
export class IdeiaPreferenceAccess {

  @inject(PreferenceService)
  protected readonly preferenceService: PreferenceService;

  protected proxy: IdeiaPreferences;

  @postConstruct()
  init(): void {
    this.proxy = createPreferenceProxy<IdeiaPreferences>(
      this.preferenceService,
      {
        type: 'object',
        properties: {
          'ideia.agent.enabled': { type: 'boolean' },
          'ideia.agent.autonomyLevel': { type: 'string' },
          'ideia.agent.model': { type: 'string' },
          'ideia.agent.contextWindow': { type: 'integer' },
          'ideia.ai.provider': { type: 'string' },
          'ideia.ai.temperature': { type: 'number' },
          'ideia.project.language': { type: 'string' },
          'ideia.quality.coverage': { type: 'number' },
        },
      }
    );
  }

  get agentEnabled(): boolean {
    return this.proxy['ideia.agent.enabled'];
  }

  get autonomyLevel(): string {
    return this.proxy['ideia.agent.autonomyLevel'];
  }

  get contextWindow(): number {
    return this.proxy['ideia.agent.contextWindow'];
  }

  set agentEnabled(value: boolean) {
    this.proxy['ideia.agent.enabled'] = value;
  }
}
```

### 14.3 PreferenceService Usage with Scope

```typescript
import { PreferenceService } from '@theia/core/lib/browser/preferences/preference-service';
import { PreferenceScope } from '@theia/core/lib/common/preferences/preference-scope';

@injectable()
export class IdeiaSettingsManager {

  @inject(PreferenceService)
  protected readonly preferenceService: PreferenceService;

  async configureAgent(settings: AgentSettings): Promise<void> {
    // Escrita em escopo especifico
    await this.preferenceService.set(
      'ideia.agent.enabled',
      settings.enabled,
      PreferenceScope.User
    );

    await this.preferenceService.set(
      'ideia.agent.autonomyLevel',
      settings.autonomyLevel,
      PreferenceScope.User
    );

    // Preferencias de workspace (projeto)
    await this.preferenceService.set(
      'ideia.project.language',
      settings.projectLanguage,
      PreferenceScope.Workspace
    );

    // Preferencias de pasta (subprojeto)
    await this.preferenceService.set(
      'ideia.quality.coverage',
      settings.minCoverage,
      PreferenceScope.WorkspaceFolder,
      settings.subProjectUri
    );
  }

  readAgentConfig(): AgentConfig {
    // Leitura com fallback tipado
    return {
      enabled: this.preferenceService.get<boolean>('ideia.agent.enabled', true),
      autonomyLevel: this.preferenceService.getString(
        'ideia.agent.autonomyLevel', 'supervised'
      ) as AgentAutonomyLevel,
      model: this.preferenceService.getString(
        'ideia.agent.model', 'ollama/deepseek-coder'
      ),
      temperature: this.preferenceService.getNumber('ideia.ai.temperature', 0.3),
    };
  }

  inspectScope(key: string): void {
    const inspected = this.preferenceService.inspect(key);
    if (inspected) {
      console.log({
        default: inspected.defaultValue,
        userValue: inspected.userValue,
        workspaceValue: inspected.workspaceValue,
        workspaceFolderValue: inspected.workspaceFolderValue,
      });
    }
  }

  async resetToDefault(key: string): Promise<void> {
    // Reset limpa o valor de todos os escopos
    await this.preferenceService.set(key, undefined, PreferenceScope.User);
    await this.preferenceService.set(key, undefined, PreferenceScope.Workspace);
    await this.preferenceService.set(key, undefined, PreferenceScope.WorkspaceFolder);
  }

  watchChanges(key: string, callback: (value: unknown) => void): Disposable {
    callback(this.preferenceService.get(key));
    return this.preferenceService.onPreferenceChanged(event => {
      if (event.preferenceName === key) {
        callback(event.newValue);
      }
    });
  }
}
```

### 14.4 Custom Preference Provider

```typescript
import { PreferenceProvider, PreferenceChangesEvent } from '@theia/core/lib/common/preferences';
import { Emitter, Event } from '@theia/core/lib/common/event';
import { injectable, postConstruct } from 'inversify';

@injectable()
export class IdeiaCloudPreferenceProvider implements PreferenceProvider {

  protected readonly onPreferencesChangedEmitter = new Emitter<PreferenceChangesEvent>();
  readonly onPreferencesChanged: Event<PreferenceChangesEvent> = (cb) =>
    this.onPreferencesChangedEmitter.on(cb);

  protected cache = new Map<string, unknown>();
  protected prefixedKeys = new Set<string>();

  async connect(cloudEndpoint: string, apiKey: string): Promise<void> {
    // Conecta ao servico cloud de preferencias
    const remotePrefs = await this.fetchRemotePreferences(cloudEndpoint, apiKey);
    for (const [key, value] of Object.entries(remotePrefs)) {
      if (key.startsWith('ideia.')) {
        this.cache.set(key, value);
        this.prefixedKeys.add(key);
      }
    }
  }

  get<T>(preferenceName: string, resourceUri?: string): T | undefined {
    if (!preferenceName.startsWith('ideia.')) {
      return undefined;
    }
    return this.cache.get(preferenceName) as T | undefined;
  }

  async set<T>(preferenceName: string, value: T, resourceUri?: string): Promise<void> {
    if (!preferenceName.startsWith('ideia.')) {
      return;
    }
    this.cache.set(preferenceName, value);
    await this.syncToCloud(preferenceName, value);
    this.onPreferencesChangedEmitter.fire({
      changes: [{
        preferenceName,
        newValue: value,
        scope: 1, // User
      }],
    });
  }

  protected async fetchRemotePreferences(
    endpoint: string, apiKey: string
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${endpoint}/preferences`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return response.json();
  }

  protected async syncToCloud(key: string, value: unknown): Promise<void> {
    await fetch(`${this.endpoint}/preferences/${key}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value }),
    });
  }

  protected endpoint = '';
  protected apiKey = '';

  dispose(): void {
    this.cache.clear();
    this.onPreferencesChangedEmitter.dispose();
  }
}
```

### 14.5 Settings UI Widget Contribution

```typescript
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { injectable, postConstruct, inject } from 'inversify';
import * as React from 'react';

@injectable()
export class IdeiaSettingsWidget extends ReactWidget {

  static ID = 'ideia:settings-widget';
  static LABEL = 'IDEIA Settings';

  @inject(PreferenceService)
  protected readonly preferenceService: PreferenceService;

  @inject(PreferenceSchemaRegistry)
  protected readonly schemaRegistry: PreferenceSchemaRegistry;

  protected filterText = '';

  @postConstruct()
  init(): void {
    this.id = IdeiaSettingsWidget.ID;
    this.title.label = IdeiaSettingsWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'fa fa-cog';
    this.update();
  }

  render(): React.ReactNode {
    const ideiaPreferences = this.getIdeiaPreferences();

    return (
      <div className='ideia-settings'>
        <h2>IDEIA Settings</h2>
        <input
          type='text'
          placeholder='Search IDEIA settings...'
          onChange={e => { this.filterText = e.target.value; this.update(); }}
        />
        <div className='ideia-settings-list'>
          {ideiaPreferences
            .filter(([key]) => key.includes(this.filterText))
            .map(([key, property]) => (
              <IdeiaPreferenceRow
                key={key}
                preferenceKey={key}
                property={property}
                service={this.preferenceService}
                onChange={() => this.update()}
              />
            ))}
        </div>
      </div>
    );
  }

  protected getIdeiaPreferences(): [string, PreferenceProperty][] {
    const all: [string, PreferenceProperty][] = [];
    for (const [key, property] of this.schemaRegistry.getAllSchemas()) {
      if (key.startsWith('ideia.')) {
        all.push([key, property]);
      }
    }
    return all.sort(([a], [b]) => a.localeCompare(b));
  }
}

interface PreferenceRowProps {
  preferenceKey: string;
  property: PreferenceProperty;
  service: PreferenceService;
  onChange: () => void;
}

function IdeiaPreferenceRow(props: PreferenceRowProps): React.ReactElement {
  const { preferenceKey, property, service, onChange } = props;
  const value = service.get(preferenceKey);
  const defaultValue = property.default;

  const handleChange = (newValue: unknown) => {
    service.set(preferenceKey, newValue, PreferenceScope.User);
    onChange();
  };

  return (
    <div className='ideia-settings-row'>
      <div className='ideia-settings-row-label'>
        <span className='key'>{preferenceKey}</span>
        <span className='description'>{property.description}</span>
      </div>
      <div className='ideia-settings-row-control'>
        {renderControl(property, value, defaultValue, handleChange)}
      </div>
    </div>
  );
}

function renderControl(
  property: PreferenceProperty,
  value: unknown,
  defaultValue: unknown,
  onChange: (v: unknown) => void
): React.ReactNode {
  if (property.type === 'boolean') {
    return (
      <input
        type='checkbox'
        checked={value as boolean ?? defaultValue as boolean}
        onChange={e => onChange(e.target.checked)}
      />
    );
  }
  if (property.enum) {
    return (
      <select
        value={value as string ?? defaultValue as string}
        onChange={e => onChange(e.target.value)}
      >
        {property.enum.map(opt => (
          <option key={String(opt)} value={String(opt)}>{String(opt)}</option>
        ))}
      </select>
    );
  }
  if (property.type === 'number' || property.type === 'integer') {
    return (
      <input
        type='number'
        min={property.minimum}
        max={property.maximum}
        step={property.type === 'integer' ? 1 : 0.1}
        value={value as number ?? defaultValue as number}
        onChange={e => onChange(
          property.type === 'integer' ? parseInt(e.target.value, 10) : parseFloat(e.target.value)
        )}
      />
    );
  }
  return (
    <input
      type='text'
      value={value as string ?? defaultValue as string}
      onChange={e => onChange(e.target.value)}
    />
  );
}

// Registro no modulo
bind(IdeiaSettingsWidget).toSelf();
bind(WidgetFactory).toDynamicValue(ctx => ({
  id: IdeiaSettingsWidget.ID,
  createWidget: () => ctx.container.get(IdeiaSettingsWidget),
}));
bind(CommandContribution).to(IdeiaSettingsCommandContribution);
bind(MenuContribution).to(IdeiaSettingsMenuContribution);
```

### 14.6 Preference Binding for Agent Autonomy Level

```typescript
import { PreferenceService } from '@theia/core/lib/browser/preferences/preference-service';
import { IAgentAutonomyManager } from '../common/agent-protocol';

@injectable()
export class AgentAutonomyPreferenceBinding {

  @inject(PreferenceService)
  protected readonly preferenceService: PreferenceService;

  @inject(IAgentAutonomyManager)
  protected readonly autonomyManager: IAgentAutonomyManager;

  protected currentLevel: string = 'supervised';

  @postConstruct()
  init(): void {
    this.readPreference();
    this.watchPreference();
  }

  protected readPreference(): void {
    this.currentLevel = this.preferenceService.getString(
      'ideia.agent.autonomyLevel', 'supervised'
    )!;
    this.applyAutonomyLevel(this.currentLevel);
  }

  protected watchPreference(): void {
    this.preferenceService.onPreferenceChanged(event => {
      if (event.preferenceName === 'ideia.agent.autonomyLevel') {
        this.currentLevel = event.newValue as string;
        this.applyAutonomyLevel(this.currentLevel);
      }
    });
  }

  protected applyAutonomyLevel(level: string): void {
    switch (level) {
      case 'assisted':
        this.autonomyManager.setAllowedActions({
          executeCommand: false,
          editFile: false,
          createFile: false,
          deleteFile: false,
          runTests: false,
          networkRequest: true,
        });
        break;
      case 'supervised':
        this.autonomyManager.setAllowedActions({
          executeCommand: false,
          editFile: true,
          createFile: true,
          deleteFile: false,
          runTests: true,
          networkRequest: true,
        });
        break;
      case 'semi-autonomous':
        this.autonomyManager.setAllowedActions({
          executeCommand: true,
          editFile: true,
          createFile: true,
          deleteFile: false,
          runTests: true,
          networkRequest: false,
        });
        break;
      case 'autonomous':
        this.autonomyManager.setAllowedActions({
          executeCommand: true,
          editFile: true,
          createFile: true,
          deleteFile: true,
          runTests: true,
          networkRequest: true,
        });
        break;
    }
  }

  getLevel(): string {
    return this.currentLevel;
  }
}
```

---

## 15. Conexoes

### 15.1 S34 — Editor

O sistema de preferencias fornece configuracao para o editor:

```
S49 (Preferences)                    S34 (Editor)
+--------------------------+        +------------------------+
| editor.fontSize         |------->| editor.updateOptions() |
| editor.tabSize          |------->| model.updateOptions()  |
| editor.wordWrap         |------->| editor options         |
| editor.minimap.enabled  |------->| minimap toggle         |
| editor.formatOnSave     |------->| format handler         |
+--------------------------+        +------------------------+
```

| Ponto | Preferencia | Efeito no Editor |
|-------|-------------|------------------|
| Font | `editor.fontSize` | MonacoEditor.updateOptions({ fontSize }) |
| Layout | `editor.tabSize`, `editor.insertSpaces` | Model options |
| Wrap | `editor.wordWrap` | Editor word wrap behavior |
| Minimap | `editor.minimap.enabled` | Minimap visibility |
| Save | `editor.formatOnSave` | Trigger format on save |
| Agent | `editor.agentSuggestions` | Agent inline suggestions |
| Chat | `editor.inlineChat.enabled` | Inline chat panel |

### 15.2 S39 — Settings/Keybindings/Themes

S49 e focado exclusivamente no sistema de preferencias Theia, enquanto S39 cobre Settings, Keybindings e Themes como um todo:

| Aspecto | S49 (Theia Preferences) | S39 (Settings/Keybindings/Theme) |
|---------|------------------------|--------------------------------|
| Escopo | Theia native preference system | Settings + Keybindings + Theme |
| Foco | PreferenceProvider, Proxy, Schema | Settings hierarchy + Keybinding resolution + Theme engine |
| API | `@theia/core` preference APIs | `workspace.getConfiguration()`, `keybindings.json`, themes |
| Providers | Provider chain, proxy | ConfigurationService, KeybindingService, ThemeService |
| Storage | PreferenceProvider per scope | SQLite + JSON files + Cloud sync |
| Binding | PreferenceBinding (reactive) | Config watcher, keybinding events |

### 15.3 S42 — DI

O sistema de preferencias depende do sistema DI do Theia:

```
S42 (DI)                                   S49 (Preferences)
+-----------------------------+           +----------------------------+
| bind(PreferenceContribution)|---------->| registerSchemas()          |
| bind(PreferenceProvider)    |---------->| createProviderChain()      |
| @inject(PreferenceService)  |---------->| use preferenceService      |
| @named(PreferenceScope)     |---------->| scope-specific provider    |
| ContainerModule             |---------->| preference module load     |
+-----------------------------+           +----------------------------+
```

| DI Concept | Uso em S49 |
|------------|-----------|
| `@inject(PreferenceService)` | Injeta o servico de preferencias |
| `@named(PreferenceScope.User)` | Identifica provider por escopo |
| `@multiInject(PreferenceContribution)` | Coleta todos os schemas |
| `bindContributionProvider` | Cria provider de contribuicoes |
| `ContainerModule` | Empacota preferencias de extensao |

### 15.4 S45 — Workspace

Preferencias de workspace e pasta dependem do workspace service:

```
S45 (Workspace)                      S49 (Preferences)
+----------------------------+      +----------------------------+
| WorkspaceService           |----->| workspace config path       |
| getWorkspaceRoot()         |----->| FolderPreferenceProvider    |
| getWorkspaceFile()         |----->| WorkspacePreferenceProvider |
| onWorkspaceChanged         |----->| reload preferences          |
| resource URIs              |----->| scope resolution            |
+----------------------------+      +----------------------------+
```

### 15.5 S11 — Theia Platform

O sistema de preferencias e parte fundamental do Theia Platform:

| S11 Theia Concept | Implementacao em S49 |
|------------------|---------------------|
| Frontend/Backend split | PreferenceService (frontend), FileService (backend) |
| Inversify DI | Provider chain via DI |
| Extension points | PreferenceContribution, PreferenceProvider |
| Widget system | SettingsWidget, preferences tree |
| Monaco integration | Editor preferences binding |
| Events | onPreferenceChanged, onPreferencesChanged |

### 15.6 Cross-Reference Matrix

| Estudo | Conexao | Dependencia |
|--------|---------|-------------|
| S34 (Editor) | Editor preferences (fontSize, tabSize) | Editor depende de S49 para config |
| S39 (Settings) | Hierarchy, UI editor | S39 e visao macro, S49 e implementacao Theia |
| S42 (DI) | Provider registration, injection | S49 depende de S42 para bindings |
| S45 (Workspace) | Config path, scope resolution | S49 depende de S45 para workspace root |
| S11 (Theia) | Preference platform core | S49 implementa S11 preference subsystem |
| S38 (Intelligence) | AI model, provider, temperature | AI config via S49 preferences |
| S37 (Search) | Search exclude, config paths | S49 fornece config paths para search |
| S43 (Views) | View visibility via preferences | S49 controla workbench.* preferences |
| F1 (NATS) | Cloud sync of preferences | S49 fornece dados para sync |

---

## 16. Plano de Implementacao

### Fase 1 — Core Preference System (5 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 1.1 | Implementar PreferenceSchema + PreferenceProperty | 4h |
| 1.2 | Implementar PreferenceSchemaRegistry (register, get, validate) | 6h |
| 1.3 | Implementar PreferenceContribution + binding | 4h |
| 1.4 | Implementar PreferenceProvider interface + base | 4h |
| 1.5 | Implementar DefaultPreferenceProvider | 4h |
| 1.6 | Implementar UserPreferenceProvider (JSON file) | 8h |
| 1.7 | Implementar WorkspacePreferenceProvider | 6h |
| 1.8 | Implementar FolderPreferenceProvider | 6h |
| 1.9 | Implementar PreferenceProviderChain (composite) | 6h |
| 1.10 | Implementar PreferenceService (get, set, inspect) | 8h |
| 1.11 | Implementar onPreferenceChanged events | 4h |
| 1.12 | Testes unitarios | 8h |

**Total Fase 1:** 68h

### Fase 2 — Preference Proxy & Scopes (3 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 2.1 | Implementar createPreferenceProxy (Proxy handler) | 8h |
| 2.2 | Implementar typed preference access pattern | 4h |
| 2.3 | Implementar PreferenceScope enum + resolution | 4h |
| 2.4 | Implementar scope-specific storage | 6h |
| 2.5 | Implementar scope override resolution | 4h |
| 2.6 | Implementar PreferenceInspect (todos os escopos) | 4h |
| 2.7 | Testes de proxy e escopos | 6h |

**Total Fase 2:** 36h

### Fase 3 — Files & Watchers (3 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 3.1 | Implementar PreferenceFileWatcher | 6h |
| 3.2 | Implementar AtomicPreferenceWriter | 4h |
| 3.3 | Implementar PreferenceFileValidator | 6h |
| 3.4 | Implementar comentarios em JSON | 2h |
| 3.5 | Implementar EnvPreferenceProvider | 4h |
| 3.6 | Implementar Platform preference defaults (OS-specific) | 4h |
| 3.7 | Testes de file watcher e validacao | 6h |

**Total Fase 3:** 32h

### Fase 4 — Settings UI & Bindings (4 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 4.1 | Implementar SettingsWidget (React) | 10h |
| 4.2 | Implementar PreferenceTreeModel (category tree) | 6h |
| 4.3 | Implementar search across settings | 4h |
| 4.4 | Implementar scope selector in UI | 3h |
| 4.5 | Implementar settings reset to default | 3h |
| 4.6 | Implementar PreferenceBinding + registry | 6h |
| 4.7 | Implementar EditorPreferenceBinding | 4h |
| 4.8 | Implementar TerminalPreferenceBinding | 3h |
| 4.9 | Implementar ViewPreferenceBinding | 3h |
| 4.10 | Testes de UI e bindings | 8h |

**Total Fase 4:** 50h

### Fase 5 — IDEIA Specific & Migration (4 dias)

| Tarefa | Descricao | Esforco |
|--------|-----------|---------|
| 5.1 | Implementar IDEIA agent preferences schema | 4h |
| 5.2 | Implementar IDEIA AI preferences schema | 3h |
| 5.3 | Implementar IDEIA project preferences | 3h |
| 5.4 | Implementar quality gate thresholds | 3h |
| 5.5 | Implementar workspace trust preferences | 4h |
| 5.6 | Implementar IDEIA PreferenceAccess (proxy) | 4h |
| 5.7 | Implementar AgenteAutonomyPreferenceBinding | 4h |
| 5.8 | Implementar PreferenceMigrationManager | 6h |
| 5.9 | Implementar migracoes v1->v2, v2->v3 | 4h |
| 5.10 | Implementar backward compat layer | 4h |
| 5.11 | Implementar deprecated preference handler | 3h |
| 5.12 | Implementar IDEIA Settings UI widget | 6h |
| 5.13 | Integrar com NATS para cloud sync | 6h |
| 5.14 | Testes de integracao | 8h |

**Total Fase 5:** 62h

### Cronograma

```
Semana 1: Fase 1 — Core Preference System (68h)
Semana 2: Fase 2 — Preference Proxy & Scopes (36h) + inicio Fase 3
Semana 3: Fase 3 — Files & Watchers (32h) + inicio Fase 4
Semana 4: Fase 4 — Settings UI & Bindings (50h)
Semana 5: Fase 5 — IDEIA Specific & Migration (62h)
```

**Esforco total estimado:** ~248h (5 semanas)
**Dependencias:** S42 (DI), S45 (Workspace), S34 (Editor), F1 (NATS)
**Entregavel:** `packages/ideia-preferences/` com PreferenceService, Proxy, Providers, Schema, UI, Bindings, Migration

### Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Proxy handler performance | Baixa | Medio | Benchmark + cache layer |
| File watcher race condition | Media | Alto | Atomic write + backup |
| Schema conflict between extensions | Media | Baixo | Namespace prefix validation |
| Migration corruption | Baixa | Alto | Backup antes de migrar |
| Cloud sync conflict | Baixa | Medio | Last-write-wins + timestamp |
| Encrypted API key storage | Media | Alto | Keytar/OS keychain integration |

### Metricas

| Metrica | Alvo | Medicao |
|---------|------|---------|
| Preference get (cache hit) | <0.5ms | performance.now() |
| Preference get (cache miss) | <5ms | performance.now() |
| Preference set + persist | <50ms | async timing |
| Preference proxy get | <0.5ms | proxy vs direct comparison |
| File watcher latency | <100ms | chokidar event timing |
| Schema load (100 prefs) | <20ms | load time |
| Settings UI render (50 prefs) | <200ms | React profiler |
| Cloud sync (100 prefs) | <2s | network timing |

---

> **Fim do Estudo S49**
> *Proximo: S50 — Theia AI Integration*
> *Relacionado: S34 (Editor), S39 (Settings), S42 (DI), S45 (Workspace), S11 (Theia)*
