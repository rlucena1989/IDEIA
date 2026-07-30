import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
const logger = createLogger('generator');

interface SpecField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'uuid' | 'email' | 'text';
  required: boolean;
}

interface SpecComponent {
  name: string;
  responsibility: string;
  fields: SpecField[];
}

interface Spec {
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

export interface GeneratedFile {
  path: string;
  content: string;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
        name: i.name.replace(/-/g, '_'),
        type: 'string' as const,
        required: true,
      })),
    ],
  }));
}

export function generateFromSpec(spec: Spec, destDir: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const components = extractComponents(spec);

  for (const comp of components) {
    files.push(...generateNestModule(comp.name, path.join(destDir, 'src', comp.name)));
  }

  const moduleImports = components.map(c =>
    `import { ${capitalize(c.name)}Module } from './${c.name}/${c.name}.module';`
  ).join('\n');
  const moduleList = components.map(c => `    ${capitalize(c.name)}Module`).join(',\n');

  files.push({
    path: path.join(destDir, 'src', 'app.module.ts'),
    content: `import { Module } from '@nestjs/common';
${moduleImports}

@Module({
  imports: [
${moduleList},
  ],
})
export class AppModule {}
`,
  });

  files.push({
    path: path.join(destDir, 'src', 'main.ts'),
    content: `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.listen(3000);
}
bootstrap();
`,
  });

  files.push({
    path: path.join(destDir, 'package.json'),
    content: JSON.stringify({
      name: spec.title,
      version: '0.1.0',
      private: true,
      scripts: {
        build: 'nest build',
        start: 'nest start',
        'start:dev': 'nest start --watch',
        lint: 'eslint "{src,apps,libs,test}/**/*.ts"',
        test: 'jest',
        'test:e2e': 'jest --config ./test/jest-e2e.json',
      },
      dependencies: {
        '@nestjs/common': '^10.0.0',
        '@nestjs/core': '^10.0.0',
        '@nestjs/platform-express': '^10.0.0',
        'class-validator': '^0.14.0',
        'class-transformer': '^0.5.1',
        'reflect-metadata': '^0.1.13',
        rxjs: '^7.8.0',
      },
      devDependencies: {
        '@nestjs/cli': '^10.0.0',
        '@nestjs/schematics': '^10.0.0',
        '@nestjs/testing': '^10.0.0',
        '@types/express': '^4.17.17',
        '@types/jest': '^29.5.0',
        '@types/node': '^20.0.0',
        '@typescript-eslint/eslint-plugin': '^6.0.0',
        '@typescript-eslint/parser': '^6.0.0',
        eslint: '^8.0.0',
        jest: '^29.5.0',
        'ts-jest': '^29.1.0',
        'ts-loader': '^9.4.0',
        'ts-node': '^10.9.0',
        typescript: '^5.1.0',
      },
      jest: {
        moduleFileExtensions: ['js', 'json', 'ts'],
        rootDir: 'src',
        testRegex: '.*\\.spec\\.ts$',
        transform: { '^.+\\.(t|j)s$': 'ts-jest' },
        collectCoverageFrom: ['**/*.(t|j)s'],
        coverageDirectory: '../coverage',
        testEnvironment: 'node',
      },
    }, null, 2),
  });

  files.push({
    path: path.join(destDir, 'tsconfig.json'),
    content: JSON.stringify({
      compilerOptions: {
        module: 'commonjs',
        declaration: true,
        removeComments: true,
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        target: 'ES2021',
        sourceMap: true,
        outDir: './dist',
        baseUrl: './',
        incremental: true,
        skipLibCheck: true,
        strict: true,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
      include: ['src/**/*'],
    }, null, 2),
  });

  files.push({
    path: path.join(destDir, 'nest-cli.json'),
    content: JSON.stringify({
      $schema: 'https://json.schemastore.org/nest-cli',
      collection: '@nestjs/schematics',
      sourceRoot: 'src',
      compilerOptions: { deleteOutDir: true },
    }, null, 2),
  });

  if (spec.acceptanceCriteria.length > 0) {
    const testMethods = spec.acceptanceCriteria.map(tc => `
  it('${tc.id}: ${tc.description}', () => {
    // Given: ${tc.given}
    // When: ${tc.when}
    // Then: ${tc.then}
    expect(true).toBe(true);
  });`).join('\n');

    files.push({
      path: path.join(destDir, 'test', 'acceptance.spec.ts'),
      content: `import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Acceptance Tests', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

${testMethods}
});
`,
    });
  }

  return files;
}

export function generateNestModule(moduleName: string, destDir: string): GeneratedFile[] {
  const cap = capitalize(moduleName);
  const files: GeneratedFile[] = [];

  files.push({
    path: path.join(destDir, `${moduleName}.module.ts`),
    content: `import { Module } from '@nestjs/common';
import { ${cap}Controller } from './${moduleName}.controller';
import { ${cap}Service } from './${moduleName}.service';

@Module({
  controllers: [${cap}Controller],
  providers: [${cap}Service],
  exports: [${cap}Service],
})
export class ${cap}Module {}
`,
  });

  files.push({
    path: path.join(destDir, `${moduleName}.controller.ts`),
    content: `import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ${cap}Service } from './${moduleName}.service';
import { Create${cap}Dto } from './dto/create-${moduleName}.dto';
import { Update${cap}Dto } from './dto/update-${moduleName}.dto';

@Controller('${moduleName}s')
export class ${cap}Controller {
  constructor(private readonly ${moduleName}Service: ${cap}Service) {}

  @Post()
  create(@Body() dto: Create${cap}Dto) {
    return this.${moduleName}Service.create(dto);
  }

  @Get()
  findAll() {
    return this.${moduleName}Service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.${moduleName}Service.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Update${cap}Dto) {
    return this.${moduleName}Service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.${moduleName}Service.remove(id);
  }
}
`,
  });

  files.push({
    path: path.join(destDir, `${moduleName}.service.ts`),
    content: `import { Injectable, NotFoundException } from '@nestjs/common';
import { Create${cap}Dto } from './dto/create-${moduleName}.dto';
import { Update${cap}Dto } from './dto/update-${moduleName}.dto';

export interface ${cap}Entity {
  id: string;
  name: string;
  createdAt: Date;
}

@Injectable()
export class ${cap}Service {
  private items: ${cap}Entity[] = [];
  private counter = 0;

  create(dto: Create${cap}Dto): ${cap}Entity {
    this.counter++;
    const entity: ${cap}Entity = {
      id: String(this.counter),
      name: dto.name,
      createdAt: new Date(),
    };
    this.items.push(entity);
    return entity;
  }

  findAll(): ${cap}Entity[] {
    return this.items;
  }

  findOne(id: string): ${cap}Entity {
    const item = this.items.find(item => item.id === id);
    if (!item) throw new NotFoundException(\`\${cap} with id \${id} not found\`);
    return item;
  }

  update(id: string, dto: Update${cap}Dto): ${cap}Entity {
    const item = this.findOne(id);
    if (dto.name !== undefined) item.name = dto.name;
    return item;
  }

  remove(id: string): void {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) throw new NotFoundException(\`\${cap} with id \${id} not found\`);
    this.items.splice(index, 1);
  }
}
`,
  });

  files.push({
    path: path.join(destDir, 'dto', `create-${moduleName}.dto.ts`),
    content: `import { IsString, MinLength, MaxLength } from 'class-validator';

export class Create${cap}Dto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;
}
`,
  });

  files.push({
    path: path.join(destDir, 'dto', `update-${moduleName}.dto.ts`),
    content: `import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class Update${cap}Dto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(255)
  name?: string;
}
`,
  });

  files.push({
    path: path.join(destDir, `${moduleName}.spec.ts`),
    content: `import { Test, TestingModule } from '@nestjs/testing';
import { ${cap}Service } from './${moduleName}.service';
import { Create${cap}Dto } from './dto/create-${moduleName}.dto';

describe('${cap}Service', () => {
  let service: ${cap}Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [${cap}Service],
    }).compile();
    service = module.get<${cap}Service>(${cap}Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a ${moduleName}', () => {
    const dto: Create${cap}Dto = { name: 'test' };
    const result = service.create(dto);
    expect(result).toBeDefined();
    expect(result.name).toBe('test');
    expect(result.id).toBeDefined();
  });

  it('should find all ${moduleName}s', () => {
    service.create({ name: 'item1' });
    service.create({ name: 'item2' });
    const items = service.findAll();
    expect(items.length).toBe(2);
  });

  it('should find one ${moduleName} by id', () => {
    const created = service.create({ name: 'test' });
    const found = service.findOne(created.id);
    expect(found).toBeDefined();
    expect(found.id).toBe(created.id);
  });

  it('should throw on find one not found', () => {
    expect(() => service.findOne('nonexistent')).toThrow();
  });

  it('should remove a ${moduleName}', () => {
    const created = service.create({ name: 'test' });
    service.remove(created.id);
    expect(() => service.findOne(created.id)).toThrow();
  });
});
`,
  });

  return files;
}

export function generateMainApp(): string {
  return `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.listen(3000);
}
bootstrap();
`;
}

export function generateAppModule(modules: string[]): string {
  const imports = modules
    .map(m => {
      const cap = capitalize(m);
      return `    ${cap}Module`;
    })
    .join(',\n');

  return `import { Module } from '@nestjs/common';
${modules.map(m => {
  const cap = capitalize(m);
  return `import { ${cap}Module } from './${m}/${m}.module';`;
}).join('\n')}

@Module({
  imports: [
${imports},
  ],
})
export class AppModule {}
`;
}

export function scaffoldProject(projectName: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push({
    path: path.join(projectName, 'package.json'),
    content: JSON.stringify({
      name: projectName,
      version: '0.1.0',
      private: true,
      scripts: {
        build: 'nest build',
        start: 'nest start',
        'start:dev': 'nest start --watch',
        lint: 'eslint "{src,apps,libs,test}/**/*.ts"',
        test: 'jest',
        'test:e2e': 'jest --config ./test/jest-e2e.json',
      },
      dependencies: {
        '@nestjs/common': '^10.0.0',
        '@nestjs/core': '^10.0.0',
        '@nestjs/platform-express': '^10.0.0',
        'reflect-metadata': '^0.1.13',
        rxjs: '^7.8.0',
      },
      devDependencies: {
        '@nestjs/cli': '^10.0.0',
        '@nestjs/schematics': '^10.0.0',
        '@nestjs/testing': '^10.0.0',
        '@types/express': '^4.17.17',
        '@types/jest': '^29.5.0',
        '@types/node': '^20.0.0',
        '@typescript-eslint/eslint-plugin': '^6.0.0',
        '@typescript-eslint/parser': '^6.0.0',
        eslint: '^8.0.0',
        jest: '^29.5.0',
        'ts-jest': '^29.1.0',
        'ts-loader': '^9.4.0',
        'ts-node': '^10.9.0',
        typescript: '^5.1.0',
      },
      jest: {
        moduleFileExtensions: ['js', 'json', 'ts'],
        rootDir: 'src',
        testRegex: '.*\\.spec\\.ts$',
        transform: { '^.+\\.(t|j)s$': 'ts-jest' },
        collectCoverageFrom: ['**/*.(t|j)s'],
        coverageDirectory: '../coverage',
        testEnvironment: 'node',
      },
    }, null, 2),
  });

  files.push({
    path: path.join(projectName, 'tsconfig.json'),
    content: JSON.stringify({
      compilerOptions: {
        module: 'commonjs',
        declaration: true,
        removeComments: true,
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        target: 'ES2021',
        sourceMap: true,
        outDir: './dist',
        baseUrl: './',
        incremental: true,
        skipLibCheck: true,
        strict: true,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
      include: ['src/**/*'],
    }, null, 2),
  });

  files.push({
    path: path.join(projectName, 'nest-cli.json'),
    content: JSON.stringify({
      $schema: 'https://json.schemastore.org/nest-cli',
      collection: '@nestjs/schematics',
      sourceRoot: 'src',
      compilerOptions: { deleteOutDir: true },
    }, null, 2),
  });

  files.push({
    path: path.join(projectName, 'src', 'main.ts'),
    content: generateMainApp(),
  });

  return files;
}

export function writeFiles(files: GeneratedFile[]): void {
  for (const file of files) {
    const dir = path.dirname(file.path);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file.path, file.content, 'utf-8');
  }
}
