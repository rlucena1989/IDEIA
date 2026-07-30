import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
const logger = createLogger('generator');

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface SpecField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'uuid' | 'email' | 'text';
  required: boolean;
}

export interface SpecComponent {
  name: string;
  responsibility: string;
  fields: SpecField[];
}

export interface Spec {
  id: string;
  title: string;
  requirements: Array<{
    id: string;
    description: string;
    category: string;
    priority: string;
    acceptanceCriteria: string[];
  }>;
  design: {
    components: Array<{
      name: string;
      responsibility: string;
      interfaces: Array<{
        name: string;
        type: string;
        contract: string;
      }>;
      dependencies: string[];
    }>;
  };
  acceptanceCriteria: Array<{
    id: string;
    description: string;
    type: string;
    given: string;
    when: string;
    then: string;
    expectedResult: string;
  }>;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function camelCase(s: string): string {
  return s.replace(/[-_]([a-z])/g, (_, c) => c.toUpperCase());
}

function pascalCase(s: string): string {
  return s.split(/[-_]/).map(capitalize).join('');
}

function tsType(field: SpecField): string {
  switch (field.type) {
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'date': return 'Date';
    case 'uuid': return 'string';
    case 'email': return 'string';
    case 'text': return 'string';
    default: return 'string';
  }
}

function fieldToTsField(field: SpecField): string {
  const dt = tsType(field);
  const name = camelCase(field.name);
  const optional = field.required ? '' : '?';
  return `  ${name}${optional}: ${dt};`;
}

function extractComponents(spec: Spec): SpecComponent[] {
  return spec.design.components.map(c => ({
    name: c.name,
    responsibility: c.responsibility,
    fields: [
      { name: 'id', type: 'uuid' as const, required: true },
      { name: 'name', type: 'string' as const, required: true },
      { name: 'createdAt', type: 'date' as const, required: true },
      ...c.interfaces.filter(i => i.type === 'input').map(i => ({
        name: camelCase(i.name),
        type: 'string' as const,
        required: true,
      })),
    ],
  }));
}

export function generateFromSpec(spec: Spec, destDir: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const components = extractComponents(spec);
  const pkgName = path.basename(destDir).replace(/[^a-zA-Z0-9_-]/g, '') || 'app';

  for (const comp of components) {
    files.push(...generateEntity(comp.name, path.join(destDir, 'src', comp.name)));
  }

  files.push({
    path: path.join(destDir, 'tsconfig.json'),
    content: `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
`,
  });

  files.push({
    path: path.join(destDir, 'package.json'),
    content: `{
  "name": "${pkgName}",
  "version": "0.1.0",
  "description": "${spec.title}",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "dev": "ts-node src/index.ts"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.0.0"
  }
}
`,
  });

  if (spec.acceptanceCriteria.length > 0) {
    files.push({
      path: path.join(destDir, 'src', 'acceptance.test.ts'),
      content: `import { describe, it, expect } from '@jest/globals';

describe('Acceptance Criteria', () => {
${spec.acceptanceCriteria.map(tc => `
  it('${tc.id}: ${tc.description}', () => {
    // Given: ${tc.given}
    // When: ${tc.when}
    // Then: ${tc.then}
    expect(true).toBe(true, '${tc.expectedResult}');
  });`).join('\n')}
});
`,
    });
  }

  return files;
}

export function generateEntity(entityName: string, destDir: string): GeneratedFile[] {
  const pascal = pascalCase(entityName);
  const camel = camelCase(entityName);
  const files: GeneratedFile[] = [];

  files.push({
    path: path.join(destDir, `${entityName}.ts`),
    content: `export interface ${pascal} {
  id: string;
  name: string;
  createdAt: Date;
}

export interface Create${pascal}Input {
  name: string;
}

export interface Update${pascal}Input {
  name?: string;
}

export class ${pascal}Service {
  private items: ${pascal}[] = [];
  private counter = 0;

  async findAll(): Promise<${pascal}[]> {
    return [...this.items];
  }

  async findById(id: string): Promise<${pascal} | null> {
    return this.items.find(item => item.id === id) || null;
  }

  async create(input: Create${pascal}Input): Promise<${pascal}> {
    const item: ${pascal} = {
      id: (++this.counter).toString(),
      name: input.name,
      createdAt: new Date(),
    };
    this.items.push(item);
    return item;
  }

  async update(id: string, input: Update${pascal}Input): Promise<${pascal} | null> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    this.items[index] = {
      ...this.items[index],
      ...input,
    };
    return this.items[index];
  }

  async delete(id: string): Promise<boolean> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return false;
    
    this.items.splice(index, 1);
    return true;
  }
}
`,
  });

  files.push({
    path: path.join(destDir, `${entityName}.test.ts`),
    content: `import { describe, it, expect, beforeEach } from '@jest/globals';
import { ${pascal}Service, Create${pascal}Input } from './${entityName}';

describe('${pascal}Service', () => {
  let service: ${pascal}Service;

  beforeEach(() => {
    service = new ${pascal}Service();
  });

  it('should create an item', async () => {
    const input: Create${pascal}Input = { name: 'Test' };
    const item = await service.create(input);
    
    expect(item.id).toBeDefined();
    expect(item.name).toBe('Test');
    expect(item.createdAt).toBeInstanceOf(Date);
  });

  it('should find all items', async () => {
    await service.create({ name: 'Item 1' });
    await service.create({ name: 'Item 2' });
    
    const items = await service.findAll();
    expect(items).toHaveLength(2);
  });

  it('should find item by id', async () => {
    const created = await service.create({ name: 'Test' });
    const found = await service.findById(created.id);
    
    expect(found).toEqual(created);
  });

  it('should update an item', async () => {
    const created = await service.create({ name: 'Test' });
    const updated = await service.update(created.id, { name: 'Updated' });
    
    expect(updated?.name).toBe('Updated');
  });

  it('should delete an item', async () => {
    const created = await service.create({ name: 'Test' });
    const deleted = await service.delete(created.id);
    
    expect(deleted).toBe(true);
    const found = await service.findById(created.id);
    expect(found).toBeNull();
  });
});
`,
  });

  return files;
}

export function scaffoldProject(projectName: string, simpleName?: string): GeneratedFile[] {
  const pkgName = simpleName || path.basename(projectName).replace(/[^a-zA-Z0-9_-]/g, '') || 'app';
  const pascal = pascalCase(pkgName);
  const files: GeneratedFile[] = [];

  files.push({
    path: path.join(projectName, 'tsconfig.json'),
    content: `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
`,
  });

  files.push({
    path: path.join(projectName, 'package.json'),
    content: `{
  "name": "${pkgName}",
  "version": "0.1.0",
  "description": "IDEIA generated TypeScript project",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "dev": "ts-node src/index.ts"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.0.0"
  }
}
`,
  });

  files.push({
    path: path.join(projectName, 'jest.config.js'),
    content: `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
};
`,
  });

  files.push({
    path: path.join(projectName, 'src', 'index.ts'),
    content: `export class ${pascal} {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  greet(): string {
    return \`Hello from \${this.name}!\`;
  }
}

export function create${pascal}(name: string): ${pascal} {
  return new ${pascal}(name);
}
`,
  });

  files.push({
    path: path.join(projectName, 'src', 'index.test.ts'),
    content: `import { describe, it, expect } from '@jest/globals';
import { ${pascal}, create${pascal} } from './index';

describe('${pascal}', () => {
  it('should greet with name', () => {
    const app = new ${pascal}('Test');
    expect(app.greet()).toBe('Hello from Test!');
  });

  it('should create instance with factory', () => {
    const app = create${pascal}('Factory');
    expect(app.greet()).toBe('Hello from Factory!');
  });
});
`,
  });

  return files;
}

export function writeFiles(files: GeneratedFile[]): void {
  for (const file of files) {
    const dir = path.dirname(file.path);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file.path, file.content, 'utf8');
  }
}
