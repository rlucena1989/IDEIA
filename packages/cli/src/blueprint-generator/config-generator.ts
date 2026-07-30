import type { GeneratedConfig, TemplateContext } from './types';
import { createLogger } from '@ideia/logger';
import { TemplateEngine } from './template-engine';

export class ConfigGenerator {
  private engine: TemplateEngine;

  constructor() {
    this.engine = new TemplateEngine();
  }

  async generate(
    configs: Record<string, unknown>,
    context: TemplateContext,
  ): Promise<GeneratedConfig[]> {
    const results: GeneratedConfig[] = [];
    const ctx = configs as Record<string, unknown>;

    if (ctx.tsconfig) {
      results.push(this.generateTsconfig(ctx.tsconfig as Record<string, unknown>, context));
    }
    if (ctx.eslint) {
      results.push(this.generateEslint(ctx.eslint as Record<string, unknown>, context));
    }
    if (ctx.prettier) {
      results.push(this.generatePrettier(ctx.prettier as Record<string, unknown>));
    }
    if (ctx.jest) {
      results.push(this.generateJest(ctx.jest as Record<string, unknown>, context));
    }
    if (ctx.vitest) {
      results.push(this.generateVitest(ctx.vitest as Record<string, unknown>, context));
    }
    if (ctx.dockerCompose) {
      results.push(this.generateDockerCompose(ctx.dockerCompose as Record<string, unknown>, context));
    }
    if (ctx.dockerfile) {
      results.push(this.generateDockerfile(ctx.dockerfile as Record<string, unknown>, context));
    }
    if (ctx.envExample) {
      results.push(this.generateEnvExample(ctx.envExample as Record<string, unknown>));
    }
    if (ctx.editorconfig) {
      results.push(this.generateEditorconfig());
    }
    if (ctx.gitignore !== false) {
      results.push(this.generateGitignore());
    }

    return results;
  }

  private generateTsconfig(options: Record<string, unknown>, context: TemplateContext): GeneratedConfig {
    const compilerOptions: Record<string, unknown> = {
      target: 'ES2022',
      module: 'commonjs',
      lib: ['ES2022'],
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      ...((options.compilerOptions as Record<string, unknown>) || {}),
    };

    if (context.features?.includes('monorepo')) {
      (compilerOptions as Record<string, unknown>).paths = {
        '@/*': ['./packages/*/src'],
      };
    }

    if (context.features?.includes('paths')) {
      (compilerOptions as Record<string, unknown>).paths = {
        '@/*': ['./src/*'],
      };
    }

    const tsconfig: Record<string, unknown> = {
      compilerOptions,
      include: options.include || ['src/**/*'],
      exclude: options.exclude || ['node_modules', 'dist', '**/*.test.ts'],
    };

    return {
      path: 'tsconfig.json',
      content: JSON.stringify(tsconfig, null, 2),
    };
  }

  private generateEslint(options: Record<string, unknown>, _context: TemplateContext): GeneratedConfig {
    const config: Record<string, unknown> = {
      root: true,
      env: { node: true, es2022: true },
      parser: options.parser || '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      plugins: options.plugins || ['@typescript-eslint'],
      extends: options.extends || [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        ...((options.rules as Record<string, unknown>) || {}),
      },
      ignorePatterns: options.ignorePatterns || ['dist', 'node_modules', '*.js'],
    };

    return {
      path: '.eslintrc.json',
      content: JSON.stringify(config, null, 2),
    };
  }

  private generatePrettier(options: Record<string, unknown>): GeneratedConfig {
    const config: Record<string, unknown> = {
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'all',
      printWidth: 100,
      endOfLine: 'lf',
      arrowParens: 'always',
      ...options,
    };

    return {
      path: '.prettierrc',
      content: JSON.stringify(config, null, 2),
    };
  }

  private generateJest(options: Record<string, unknown>, _context: TemplateContext): GeneratedConfig {
    const config: Record<string, unknown> = {
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      testMatch: ['**/*.test.ts', '**/*.spec.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/**/index.ts',
      ],
      coverageThreshold: {
        global: {
          branches: 30,
          functions: 30,
          lines: 30,
          statements: 30,
        },
      },
      ...options,
    };

    return {
      path: 'jest.config.ts',
      content: `export default ${JSON.stringify(config, null, 2)};\n`,
    };
  }

  private generateVitest(options: Record<string, unknown>, _context: TemplateContext): GeneratedConfig {
    const config: Record<string, unknown> = {
      test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html'],
          thresholds: {
            branches: 30,
            functions: 30,
            lines: 30,
            statements: 30,
          },
        },
      },
      resolve: {
        alias: {
          '@': './src',
        },
      },
      ...options,
    };

    return {
      path: 'vitest.config.ts',
      content: `import { defineConfig } from 'vitest/config';\n\nexport default defineConfig(${JSON.stringify(config, null, 2)});\n`,
    };
  }

  private generateDockerCompose(options: Record<string, unknown>, context: TemplateContext): GeneratedConfig {
    const services: Record<string, unknown> = {
      app: {
        build: {
          context: '.',
          dockerfile: 'Dockerfile',
        },
        ports: ['3000:3000'],
        environment: {
          NODE_ENV: 'development',
          ...(((options.app as Record<string, unknown>)?.environment as Record<string, string>) || {}),
        },
        volumes: ['.:/app', '/app/node_modules'],
        depends_on: [] as string[],
      },
    };

    if (context.features?.includes('postgresql') || context.features?.includes('database')) {
      services.postgres = {
        image: 'postgres:16-alpine',
        environment: {
          POSTGRES_USER: 'app',
          POSTGRES_PASSWORD: 'app_password',
          POSTGRES_DB: 'app_db',
        },
        ports: ['5432:5432'],
        volumes: ['pgdata:/var/lib/postgresql/data'],
      };
      (services.app as Record<string, unknown>).depends_on = (services.app as Record<string, unknown>).depends_on as string[] || [];
      ((services.app as Record<string, unknown>).depends_on as string[]).push('postgres');
    }

    if (context.features?.includes('redis')) {
      services.redis = {
        image: 'redis:7-alpine',
        ports: ['6379:6379'],
        volumes: ['redisdata:/data'],
      };
      (services.app as Record<string, unknown>).depends_on = (services.app as Record<string, unknown>).depends_on as string[] || [];
      ((services.app as Record<string, unknown>).depends_on as string[]).push('redis');
    }

    const config: Record<string, unknown> = {
      version: '3.8',
      services: { ...services, ...((options.services as Record<string, unknown>) || {}) },
      volumes: {
        pgdata: { driver: 'local' },
        redisdata: { driver: 'local' },
        ...((options.volumes as Record<string, unknown>) || {}),
      },
    };

    if (options.networks) {
      config.networks = options.networks;
    }

    return {
      path: 'docker-compose.yml',
      content: this.toYamlLike(config),
    };
  }

  private generateDockerfile(_options: Record<string, unknown>, _context: TemplateContext): GeneratedConfig {
    const content = `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system app && adduser --system --ingroup app app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
USER app
EXPOSE 3000
CMD ["node", "dist/index.js"]
`;

    return { path: 'Dockerfile', content };
  }

  private generateEnvExample(_options: Record<string, unknown>): GeneratedConfig {
    const content = `# Application
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://app:app_password@localhost:5432/app_db

# Redis (optional)
REDIS_URL=redis://localhost:6379

# JWT (if using auth)
JWT_SECRET=change-me-to-a-random-secret
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=debug
`;

    return { path: '.env.example', content };
  }

  private generateEditorconfig(): GeneratedConfig {
    const content = `root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
`;

    return { path: '.editorconfig', content };
  }

  private generateGitignore(): GeneratedConfig {
    const content = `node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
.turbo/
*.tsbuildinfo
`;

    return { path: '.gitignore', content };
  }

  private toYamlLike(obj: Record<string, unknown>, indent = 0): string {
    const pad = '  '.repeat(indent);
    const lines: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;
      if (typeof value === 'string') {
        const needsQuote = /[:{},[\]&*?|<>=!%@`#]/.test(value) || value.includes(' ');
        lines.push(`${pad}${key}: ${needsQuote ? `"${value}"` : value}`);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        lines.push(`${pad}${key}: ${value}`);
      } else if (Array.isArray(value)) {
        lines.push(`${pad}${key}:`);
        for (const item of value) {
          if (typeof item === 'string') {
            lines.push(`${pad}  - ${item}`);
          } else if (typeof item === 'object' && item !== null) {
            lines.push(`${pad}  - ${JSON.stringify(item)}`);
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        lines.push(`${pad}${key}:`);
        lines.push(this.toYamlLike(value as Record<string, unknown>, indent + 1));
      }
    }

    return lines.join('\n');
  }
}
