const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'java',
  capabilities: [
    'detect', 'init', 'generateTemplate', 'runLint',
    'runTests', 'runBuild', 'qualityGate'
  ],

  detect: (projectRoot) => {
    return fs.existsSync(path.join(projectRoot, 'pom.xml')) ||
           fs.existsSync(path.join(projectRoot, 'build.gradle'));
  },

  init: (projectRoot) => {
    console.log('[Java Adapter] Verificando Maven/Gradle...');
    const hasMaven = fs.existsSync(path.join(projectRoot, 'pom.xml'));
    const hasGradle = fs.existsSync(path.join(projectRoot, 'build.gradle'));
    if (!hasMaven && !hasGradle) {
      console.log('[Java Adapter] Nenhum pom.xml ou build.gradle encontrado. Execute "mvn archetype:generate" manualmente.');
      return false;
    }
    const checkstyleDir = path.join(projectRoot, 'config', 'checkstyle');
    if (!fs.existsSync(checkstyleDir)) {
      fs.mkdirSync(checkstyleDir, { recursive: true });
      fs.writeFileSync(path.join(checkstyleDir, 'checkstyle.xml'),
        '<?xml version="1.0"?>\n<!DOCTYPE module PUBLIC\n  "-//Checkstyle//DTD Checkstyle Configuration 1.3//EN"\n  "https://checkstyle.org/dtds/configuration_1_3.dtd">\n<module name="Checker">\n  <module name="TreeWalker">\n    <module name="UnusedImports"/>\n    <module name="RedundantImport"/>\n  </module>\n</module>\n');
    }
    return true;
  },

  generateTemplate: (pkgName) => {
    const baseDir = path.join(process.cwd(), 'src', 'main', 'java', ...pkgName.split('.'));
    console.log(`[Java Adapter] Gerando estrutura para o pacote: ${pkgName}`);
    ['application/usecase', 'domain/entity', 'domain/repository', 'infrastructure/handler', 'infrastructure/database'].forEach(dir => {
      fs.mkdirSync(path.join(baseDir, dir.replace(/\//g, path.sep)), { recursive: true });
    });
    const entityName = pkgName.split('.').pop().replace(/^[a-z]/, c => c.toUpperCase());
    const pkgPath = pkgName.split('.').join('.');
    fs.writeFileSync(path.join(baseDir, 'domain', 'entity', `${entityName}.java`),
      `package ${pkgPath}.domain.entity;\n\npublic class ${entityName} {\n  private String id;\n\n  public ${entityName}() {}\n\n  public ${entityName}(String id) { this.id = id; }\n\n  public String getId() { return id; }\n\n  public void setId(String id) { this.id = id; }\n}\n`);
    fs.writeFileSync(path.join(baseDir, 'domain', 'repository', `${entityName}Repository.java`),
      `package ${pkgPath}.domain.repository;\n\nimport ${pkgPath}.domain.entity.${entityName};\nimport java.util.Optional;\n\npublic interface ${entityName}Repository {\n  Optional<${entityName}> findById(String id);\n}\n`);
    fs.writeFileSync(path.join(baseDir, 'infrastructure', 'handler', `${entityName}Handler.java`),
      `package ${pkgPath}.infrastructure.handler;\n\nimport com.sun.net.httpserver.HttpExchange;\nimport com.sun.net.httpserver.HttpHandler;\nimport java.io.IOException;\nimport java.io.OutputStream;\n\npublic class ${entityName}Handler implements HttpHandler {\n  @Override\n  public void handle(HttpExchange exchange) throws IOException {\n    String response = "[]";\n    exchange.sendResponseHeaders(200, response.length());\n    try (OutputStream os = exchange.getResponseBody()) {\n      os.write(response.getBytes());\n    }\n  }\n}\n`);
    return baseDir;
  },

  runLint: (projectRoot) => {
    console.log('[Java Adapter] Rodando checkstyle...');
    const hasMaven = fs.existsSync(path.join(projectRoot, 'pom.xml'));
    try {
      if (hasMaven) {
        execSync('mvn checkstyle:check', { cwd: projectRoot, stdio: 'inherit' });
      } else {
        execSync('gradle check', { cwd: projectRoot, stdio: 'inherit' });
      }
      return true;
    } catch {
      return false;
    }
  },

  runTests: (projectRoot) => {
    console.log('[Java Adapter] Rodando testes...');
    const hasMaven = fs.existsSync(path.join(projectRoot, 'pom.xml'));
    try {
      if (hasMaven) {
        execSync('mvn test', { cwd: projectRoot, stdio: 'inherit' });
      } else {
        execSync('gradle test', { cwd: projectRoot, stdio: 'inherit' });
      }
      return true;
    } catch {
      return false;
    }
  },

  runBuild: (projectRoot) => {
    console.log('[Java Adapter] Compilando...');
    const hasMaven = fs.existsSync(path.join(projectRoot, 'pom.xml'));
    try {
      if (hasMaven) {
        execSync('mvn compile', { cwd: projectRoot, stdio: 'inherit' });
      } else {
        execSync('gradle build', { cwd: projectRoot, stdio: 'inherit' });
      }
      return true;
    } catch {
      return false;
    }
  },

  qualityGate: (projectRoot) => {
    console.log('[Java Adapter] Executando Quality Gate...');
    const layers = ['domain', 'application', 'infrastructure'];
    const baseDir = path.join(projectRoot, 'src', 'main', 'java');
    if (!fs.existsSync(baseDir)) {
      console.error('[Java Adapter] src/main/java/ directory not found.');
      return false;
    }
    let errors = 0;
    layers.forEach(layer => {
      const layerPath = path.join(baseDir, layer);
      if (!fs.existsSync(layerPath)) {
        console.warn(`[AVISO] Camada Clean Architecture ausente: src/main/java/${layer}/`);
        errors++;
      }
    });
    const hasMaven = fs.existsSync(path.join(projectRoot, 'pom.xml'));
    try {
      if (hasMaven) {
        execSync('mvn checkstyle:check', { cwd: projectRoot, stdio: 'pipe' });
      } else {
        execSync('gradle check', { cwd: projectRoot, stdio: 'pipe' });
      }
    } catch {
      console.warn('[AVISO] Linter encontrou problemas nas camadas internas.');
      errors++;
    }
    return errors === 0;
  }
};
