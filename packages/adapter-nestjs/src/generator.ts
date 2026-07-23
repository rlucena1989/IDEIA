import * as fs from 'fs';
import * as path from 'path';

export interface GeneratedFile {
  path: string;
  content: string;
}

export function generateNestModule(moduleName: string, destDir: string): GeneratedFile[] {
  const cap = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
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
    content: `import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ${cap}Service } from './${moduleName}.service';
import { Create${cap}Dto } from './dto/create-${moduleName}.dto';

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
}
`,
  });

  files.push({
    path: path.join(destDir, `${moduleName}.service.ts`),
    content: `import { Injectable } from '@nestjs/common';
import { Create${cap}Dto } from './dto/create-${moduleName}.dto';

export interface ${cap}Entity {
  id: string;
  name: string;
  createdAt: Date;
}

@Injectable()
export class ${cap}Service {
  private items: ${cap}Entity[] = [];

  create(dto: Create${cap}Dto): ${cap}Entity {
    const entity: ${cap}Entity = {
      id: Math.random().toString(36).slice(2),
      name: dto.name,
      createdAt: new Date(),
    };
    this.items.push(entity);
    return entity;
  }

  findAll(): ${cap}Entity[] {
    return this.items;
  }

  findOne(id: string): ${cap}Entity | undefined {
    return this.items.find(item => item.id === id);
  }
}
`,
  });

  files.push({
    path: path.join(destDir, 'dto', `create-${moduleName}.dto.ts`),
    content: `export class Create${cap}Dto {
  name: string;
}
`,
  });

  return files;
}

export function generateMainApp(): string {
  return `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(3000);
}
bootstrap();
`;
}

export function generateAppModule(modules: string[]): string {
  const imports = modules
    .map(m => {
      const cap = m.charAt(0).toUpperCase() + m.slice(1);
      return `    ${cap}Module`;
    })
    .join(',\n');

  return `import { Module } from '@nestjs/common';
${modules.map(m => {
  const cap = m.charAt(0).toUpperCase() + m.slice(1);
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
