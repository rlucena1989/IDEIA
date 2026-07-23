const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'swift',
  capabilities: [
    'detect', 'init', 'generateTemplate', 'runLint',
    'runTests', 'runBuild', 'qualityGate'
  ],

  detect: (projectRoot) => {
    return fs.existsSync(path.join(projectRoot, 'Package.swift'));
  },

  init: (projectRoot) => {
    console.log('[Swift Adapter] Verificando Package.swift...');
    if (!fs.existsSync(path.join(projectRoot, 'Package.swift'))) {
      console.log('[Swift Adapter] Nenhum Package.swift encontrado. Execute "swift package init" manualmente.');
      return false;
    }
    const swiftlintPath = path.join(projectRoot, '.swiftlint.yml');
    if (!fs.existsSync(swiftlintPath)) {
      fs.writeFileSync(swiftlintPath, `disabled_rules:
  - trailing_whitespace
opt_in_rules:
  - empty_count
  - force_unwrapping
included:
  - Sources
  - Tests
line_length: 120
identifier_name:
  min_length: 2
  max_length: 50
type_name:
  min_length: 3
  max_length: 50
`);
    }
    return true;
  },

  generateTemplate: (pkgName) => {
    const baseDir = path.join(process.cwd(), 'Sources', pkgName);
    console.log(`[Swift Adapter] Gerando estrutura para o pacote: ${pkgName}`);
    ['application/usecase', 'domain/entity', 'domain/repository', 'infrastructure/handler', 'infrastructure/database'].forEach(dir => {
      fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
    });
    const className = pkgName.charAt(0).toUpperCase() + pkgName.slice(1);
    fs.writeFileSync(path.join(baseDir, 'domain', 'entity', `${className}.swift`),
      `import Foundation

struct ${className}: Codable {
    let id: String
}
`);
    fs.writeFileSync(path.join(baseDir, 'domain', 'repository', `${className}Repository.swift`),
      `import Foundation

protocol ${className}Repository {
    func findById(id: String) async throws -> ${className}?
}
`);
    fs.writeFileSync(path.join(baseDir, 'infrastructure', 'handler', `${className}Handler.swift`),
      `import Foundation

struct ${className}Handler {
    func list() -> String {
        return "[]"
    }
}
`);
    return baseDir;
  },

  runLint: (projectRoot) => {
    console.log('[Swift Adapter] Rodando swiftlint...');
    try {
      execSync('swiftlint lint --strict', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runTests: (projectRoot) => {
    console.log('[Swift Adapter] Rodando swift test...');
    try {
      execSync('swift test --parallel', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runBuild: (projectRoot) => {
    console.log('[Swift Adapter] Rodando swift build...');
    try {
      execSync('swift build -c release', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  qualityGate: (projectRoot) => {
    console.log('[Swift Adapter] Executando Quality Gate...');
    const layers = ['domain', 'application', 'infrastructure'];
    const baseDir = path.join(projectRoot, 'Sources');
    if (!fs.existsSync(baseDir)) {
      console.error('[Swift Adapter] Sources/ directory not found.');
      return false;
    }
    let errors = 0;
    layers.forEach(layer => {
      const layerPath = path.join(baseDir, layer);
      if (!fs.existsSync(layerPath)) {
        console.warn(`[AVISO] Camada Clean Architecture ausente: Sources/${layer}/`);
        errors++;
      }
    });
    try {
      execSync('swiftlint lint --strict Sources/', { cwd: projectRoot, stdio: 'pipe' });
    } catch {
      console.warn('[AVISO] swiftlint encontrou problemas nas camadas Sources.');
      errors++;
    }
    return errors === 0;
  }
};
