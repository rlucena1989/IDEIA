import { BaseRunner } from './base-runner';
import { LanguageId } from '../adapter-contract';

/** Classe responsável por processa runner. */
export class FlutterRunner extends BaseRunner {
  public constructor() {
    super({
      language: LanguageId.Flutter,
      name: 'Flutter Runner',
      aliases: ['flutter', 'dart'],
      markers: ['pubspec.yaml'],
      commands: {
        init: { argv: ['flutter', 'pub', 'get'], label: 'Get packages', description: 'Baixa dependências' },
        lint: { argv: ['flutter', 'analyze'], label: 'Analyze', description: 'Análise estática Dart' },
        test: { argv: ['flutter', 'test'], label: 'Test', description: 'Executa testes' },
        build: { argv: ['flutter', 'build', 'apk'], label: 'Build APK', description: 'Compila APK release', optional: true },
        compile: { argv: ['dart', 'compile', 'exe'], label: 'Compile', description: 'Compila binário nativo', optional: true },
        'quality-gate': { argv: ['flutter', 'analyze', '--fatal-infos'], label: 'Quality Gate', description: 'Análise estática rigorosa' },
      },
    });
  }
}
