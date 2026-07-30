/**
 * Runner para projetos JVM — Java / Kotlin / Scala (R33).
 *
 * @module runtime/runners/jvm-runner
 */

import { BaseRunner } from './base-runner';
import { createLogger } from '@ideia/logger';
import { LanguageId } from '../adapter-contract';
const logger = createLogger('jvm-runner');

/** Runner JVM (Maven/Gradle). */
export class JVMRunner extends BaseRunner {
  /** Cria o runner JVM. */
  public constructor() {
    super({
      language: LanguageId.Java,
      name: 'JVM Runner',
      aliases: ['java', 'kotlin', 'scala', 'jvm', 'mvn', 'gradle'],
      markers: ['pom.xml', 'build.gradle', 'build.gradle.kts', '*.java', '*.kt', '*.scala'],
      commands: {
        init: { argv: ['mvn', '-q', 'dependency:resolve'], label: 'Resolve dependencies', description: 'Baixa dependências (Maven)', optional: true },
        lint: { argv: ['mvn', '-q', 'checkstyle:check'], label: 'Checkstyle', description: 'Executa checkstyle', optional: true },
        test: { argv: ['mvn', '-q', 'test'], label: 'Test', description: 'Executa testes (Maven)' },
        build: { argv: ['mvn', '-q', 'package', '-DskipTests'], label: 'Package', description: 'Empacota (skip tests)' },
        compile: { argv: ['mvn', '-q', 'compile'], label: 'Compile', description: 'Compila fontes' },
        'quality-gate': { argv: ['mvn', '-q', 'checkstyle:check'], label: 'Quality gate', description: 'Checkstyle como portão', optional: true },
      },
    });
  }
}
