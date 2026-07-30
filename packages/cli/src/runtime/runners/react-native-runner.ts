import { BaseRunner } from './base-runner';
import { createLogger } from '@ideia/logger';
import { LanguageId } from '../adapter-contract';
const logger = createLogger('react-native-runner');

/** Classe responsável por processa native runner. */
export class ReactNativeRunner extends BaseRunner {
  public constructor() {
    super({
      language: LanguageId.ReactNative,
      name: 'React Native Runner',
      aliases: ['react-native', 'rn', 'expo'],
      markers: [],
      commands: {
        init: { argv: ['npm', 'install'], label: 'Install', description: 'Instala dependências' },
        lint: { argv: ['npx', 'eslint', '.'], label: 'Lint', description: 'Executa lint', optional: true },
        test: { argv: ['npm', 'test'], label: 'Test', description: 'Executa testes', optional: true },
        build: { argv: ['npx', 'react-native', 'build-android'], label: 'Build Android', description: 'Compila APK', optional: true },
        'quality-gate': { argv: ['npx', 'tsc', '--noEmit'], label: 'TypeCheck', description: 'Verifica TypeScript', optional: true },
      },
    });
  }
}
