const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'scala',
  capabilities: [
    'detect', 'init', 'generateTemplate', 'runLint',
    'runTests', 'runBuild', 'qualityGate'
  ],

  detect: (projectRoot) => {
    return fs.existsSync(path.join(projectRoot, 'build.sbt'));
  },

  init: (projectRoot) => {
    console.log('[Scala Adapter] Verificando build.sbt...');
    if (!fs.existsSync(path.join(projectRoot, 'build.sbt'))) {
      console.log('[Scala Adapter] Nenhum build.sbt encontrado. Execute "sbt new scala/hello-world.g8" manualmente.');
      return false;
    }
    const projectDir = path.join(projectRoot, 'project');
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    const pluginsPath = path.join(projectDir, 'plugins.sbt');
    if (!fs.existsSync(pluginsPath)) {
      fs.writeFileSync(pluginsPath, 'addSbtPlugin("org.scalameta" % "sbt-scalafmt" % "2.5.2")\n');
    }
    const scalafmtPath = path.join(projectRoot, '.scalafmt.conf');
    if (!fs.existsSync(scalafmtPath)) {
      fs.writeFileSync(scalafmtPath, `version = "3.7.4"
runner.dialect = scala3
maxColumn = 120
align.preset = more
`);
    }
    return true;
  },

  generateTemplate: (pkgName) => {
    const baseDir = path.join(process.cwd(), 'src', 'main', 'scala', pkgName);
    console.log(`[Scala Adapter] Gerando estrutura para o pacote: ${pkgName}`);
    ['application/usecase', 'domain/entity', 'domain/repository', 'infrastructure/handler', 'infrastructure/database'].forEach(dir => {
      fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
    });
    const entityName = pkgName.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
    const className = pkgName.charAt(0).toUpperCase() + pkgName.slice(1);
    fs.writeFileSync(path.join(baseDir, 'domain', 'entity', `${className}.scala`),
      `package ${pkgName}.domain.entity

case class ${className}(id: String)
`);
    fs.writeFileSync(path.join(baseDir, 'domain', 'repository', `${className}Repository.scala`),
      `package ${pkgName}.domain.repository

import ${pkgName}.domain.entity.${className}

trait ${className}Repository {
  def findById(id: String): Option[${className}]
}
`);
    fs.writeFileSync(path.join(baseDir, 'infrastructure', 'handler', `${className}Handler.scala`),
      `package ${pkgName}.infrastructure.handler

import scala.concurrent.Future

class ${className}Handler {
  def list(): Future[String] = Future.successful("[]")
}
`);
    return baseDir;
  },

  runLint: (projectRoot) => {
    console.log('[Scala Adapter] Rodando scalafmt...');
    try {
      execSync('sbt scalafmtCheckAll', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runTests: (projectRoot) => {
    console.log('[Scala Adapter] Rodando sbt test...');
    try {
      execSync('sbt test', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runBuild: (projectRoot) => {
    console.log('[Scala Adapter] Rodando sbt compile...');
    try {
      execSync('sbt compile', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  qualityGate: (projectRoot) => {
    console.log('[Scala Adapter] Executando Quality Gate...');
    const layers = ['domain', 'application', 'infrastructure'];
    const baseDir = path.join(projectRoot, 'src', 'main', 'scala');
    if (!fs.existsSync(baseDir)) {
      console.error('[Scala Adapter] src/main/scala/ directory not found.');
      return false;
    }
    let errors = 0;
    layers.forEach(layer => {
      const layerPath = path.join(baseDir, layer);
      if (!fs.existsSync(layerPath)) {
        console.warn(`[AVISO] Camada Clean Architecture ausente: src/main/scala/${layer}/`);
        errors++;
      }
    });
    try {
      execSync('sbt scalafmtCheckAll', { cwd: projectRoot, stdio: 'pipe' });
    } catch {
      console.warn('[AVISO] scalafmtCheckAll encontrou problemas de formatação.');
      errors++;
    }
    return errors === 0;
  }
};
