import { createLogger } from '@ideia/logger'
import { ScaffoldContext } from './types'

const logger = createLogger('config-generator')

export class ConfigGenerator {
  generateTsconfig(context: ScaffoldContext): string {
    return JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: true,
        outDir: './dist',
        rootDir: './src',
        declaration: true,
        paths: { '@/*': ['./src/*'] },
      },
      include: ['src'],
    }, null, 2)
  }

  generateEslintConfig(context: ScaffoldContext): string {
    return JSON.stringify({
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unused-vars': 'warn',
      },
    }, null, 2)
  }

  generateDockerCompose(context: ScaffoldContext): string {
    return [
      'version: "3.8"',
      'services:',
      `  ${context.projectName.toLowerCase()}:`,
      '    build: .',
      '    ports:',
      '      - "3000:3000"',
      '    environment:',
      '      - NODE_ENV=development',
    ].join('\n')
  }

  generateGitignore(): string {
    return ['node_modules/', 'dist/', 'coverage/', '.env', '*.log'].join('\n')
  }
}
