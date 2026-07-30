import { BlueprintDefinition, TemplateContext, GeneratedConfig } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('config-generator');

export class ConfigGenerator {
  async generate(configs: NonNullable<BlueprintDefinition['configs']>, context: TemplateContext): Promise<GeneratedConfig[]> {
    const results: GeneratedConfig[] = []

    if (configs.tsconfig) {
      results.push(await this._generateTsconfig(configs.tsconfig, context))
    }
    if (configs.eslint) {
      results.push(this._generateEslint(configs.eslint, context))
    }
    if (configs.prettier) {
      results.push(this._generatePrettier(configs.prettier))
    }
    if (configs.jest) {
      results.push(this._generateJest(configs.jest, context))
    }

    results.push({ path: '.gitignore', content: 'node_modules\ndist\n.env\n*.log\n' })
    results.push({ path: '.editorconfig', content: 'root = true\n\n[*]\nindent_style = space\nindent_size = 2\nend_of_line = lf\ncharset = utf-8\ntrim_trailing_whitespace = true\ninsert_final_newline = true\n' })

    return results
  }

  private async _generateTsconfig(_options: Record<string, unknown>, _context: TemplateContext): Promise<GeneratedConfig> {
    return {
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'ES2022', module: 'commonjs', lib: ['ES2022'],
          outDir: './dist', rootDir: './src', strict: true,
          esModuleInterop: true, skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          resolveJsonModule: true, declaration: true,
          declarationMap: true, sourceMap: true,
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist'],
      }, null, 2),
    }
  }

  private _generateEslint(_options: Record<string, unknown>, _context: TemplateContext): GeneratedConfig {
    return {
      path: '.eslintrc.json',
      content: JSON.stringify({
        root: true, env: { node: true, es2022: true },
        parser: '@typescript-eslint/parser',
        plugins: ['@typescript-eslint'],
        extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
        rules: { '@typescript-eslint/no-explicit-any': 'error' },
        ignorePatterns: ['dist', 'node_modules'],
      }, null, 2),
    }
  }

  private _generatePrettier(_options: Record<string, unknown>): GeneratedConfig {
    return {
      path: '.prettierrc',
      content: JSON.stringify({ semi: true, singleQuote: true, tabWidth: 2, trailingComma: 'all', printWidth: 100 }, null, 2),
    }
  }

  private _generateJest(_options: Record<string, unknown>, _context: TemplateContext): GeneratedConfig {
    return {
      path: 'jest.config.js',
      content: "module.exports = { preset: 'ts-jest', testEnvironment: 'node', roots: ['<rootDir>/src'], testMatch: ['**/*.test.ts'] };\n",
    }
  }
}
