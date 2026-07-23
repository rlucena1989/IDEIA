const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'kotlin',
  capabilities: [
    'detect', 'init', 'generateTemplate', 'runLint',
    'runTests', 'runBuild', 'qualityGate'
  ],

  detect: (projectRoot) => {
    return fs.existsSync(path.join(projectRoot, 'build.gradle.kts'));
  },

  init: (projectRoot) => {
    console.log('[Kotlin Adapter] Verificando build.gradle.kts...');
    if (!fs.existsSync(path.join(projectRoot, 'build.gradle.kts'))) {
      console.log('[Kotlin Adapter] Nenhum build.gradle.kts encontrado. Crie um projeto Kotlin manualmente.');
      return false;
    }
    const ktlintDir = path.join(projectRoot, 'config', 'ktlint');
    if (!fs.existsSync(ktlintDir)) {
      fs.mkdirSync(ktlintDir, { recursive: true });
      fs.writeFileSync(path.join(ktlintDir, '.ktlint.yml'),
        'indent_size: 2\nindent_style: space\nmax_line_length: 120\n');
    }
    return true;
  },

  generateTemplate: (pkgName) => {
    const baseDir = path.join(process.cwd(), 'src', 'main', 'kotlin', ...pkgName.split('.'));
    console.log(`[Kotlin Adapter] Gerando estrutura para o pacote: ${pkgName}`);
    ['application/usecase', 'domain/entity', 'domain/repository', 'infrastructure/handler', 'infrastructure/database'].forEach(dir => {
      fs.mkdirSync(path.join(baseDir, dir.replace(/\//g, path.sep)), { recursive: true });
    });
    const entityName = pkgName.split('.').pop().replace(/^[a-z]/, c => c.toUpperCase());
    const pkgPath = pkgName.split('.').join('.');
    fs.writeFileSync(path.join(baseDir, 'domain', 'entity', `${entityName}.kt`),
      `package ${pkgPath}.domain.entity\n\ndata class ${entityName}(\n  val id: String\n)\n`);
    fs.writeFileSync(path.join(baseDir, 'domain', 'repository', `${entityName}Repository.kt`),
      `package ${pkgPath}.domain.repository\n\nimport ${pkgPath}.domain.entity.${entityName}\n\ninterface ${entityName}Repository {\n  suspend fun findById(id: String): ${entityName}?\n}\n`);
    fs.writeFileSync(path.join(baseDir, 'infrastructure', 'handler', `${entityName}Handler.kt`),
      `package ${pkgPath}.infrastructure.handler\n\nimport io.ktor.http.*\nimport io.ktor.server.application.*\nimport io.ktor.server.response.*\n\nsuspend fun ApplicationCall.handle${entityName}() {\n  respondText("[]", ContentType.Application.Json)\n}\n`);
    return baseDir;
  },

  runLint: (projectRoot) => {
    console.log('[Kotlin Adapter] Rodando ktlint...');
    try {
      execSync('gradle ktlintCheck', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runTests: (projectRoot) => {
    console.log('[Kotlin Adapter] Rodando gradle test...');
    try {
      execSync('gradle test', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runBuild: (projectRoot) => {
    console.log('[Kotlin Adapter] Compilando com gradle build...');
    try {
      execSync('gradle build', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  qualityGate: (projectRoot) => {
    console.log('[Kotlin Adapter] Executando Quality Gate...');
    const layers = ['domain', 'application', 'infrastructure'];
    const baseDir = path.join(projectRoot, 'src', 'main', 'kotlin');
    if (!fs.existsSync(baseDir)) {
      console.error('[Kotlin Adapter] src/main/kotlin/ directory not found.');
      return false;
    }
    let errors = 0;
    layers.forEach(layer => {
      const layerPath = path.join(baseDir, layer);
      if (!fs.existsSync(layerPath)) {
        console.warn(`[AVISO] Camada Clean Architecture ausente: src/main/kotlin/${layer}/`);
        errors++;
      }
    });
    try {
      execSync('gradle ktlintCheck', { cwd: projectRoot, stdio: 'pipe' });
    } catch {
      console.warn('[AVISO] ktlint encontrou problemas nas camadas internas.');
      errors++;
    }
    return errors === 0;
  }
};
