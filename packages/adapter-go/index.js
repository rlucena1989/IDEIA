const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'go',
  capabilities: [
    'detect', 'init', 'generateTemplate', 'runLint',
    'runTests', 'runBuild', 'qualityGate'
  ],

  detect: (projectRoot) => {
    return fs.existsSync(path.join(projectRoot, 'go.mod'));
  },

  init: (projectRoot) => {
    console.log('[Golang Adapter] Verificando go.mod...');
    if (!fs.existsSync(path.join(projectRoot, 'go.mod'))) {
      console.log('[Golang Adapter] Nenhum go.mod encontrado. Execute "go mod init <module>" manualmente.');
      return false;
    }
    const toolsDir = path.join(projectRoot, 'tools');
    if (!fs.existsSync(toolsDir)) {
      fs.mkdirSync(toolsDir, { recursive: true });
      fs.writeFileSync(path.join(toolsDir, 'tools.go'), '//go:build tools\npackage tools\n\nimport (\n\t_ "github.com/golangci/golangci-lint/cmd/golangci-lint"\n)\n');
    }
    return true;
  },

  generateTemplate: (pkgName) => {
    const baseDir = path.join(process.cwd(), 'internal', pkgName);
    console.log(`[Golang Adapter] Gerando estrutura para o pacote: ${pkgName}`);
    ['application/usecase', 'domain/entity', 'domain/repository', 'infrastructure/handler', 'infrastructure/database'].forEach(dir => {
      fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
    });
    const entityName = pkgName.charAt(0).toUpperCase() + pkgName.slice(1);
    fs.writeFileSync(path.join(baseDir, 'domain', 'entity', `${pkgName}.go`),
      `package entity\n\ntype ${entityName} struct {\n\tID string\n}\n`);
    fs.writeFileSync(path.join(baseDir, 'domain', 'repository', `${pkgName}_repository.go`),
      `package repository\n\ntype ${entityName}Repository interface {\n\tFindByID(id string) (*entity.${entityName}, error)\n}\n`);
    fs.writeFileSync(path.join(baseDir, 'infrastructure', 'handler', `${pkgName}_handler.go`),
      `package handler\n\nimport (\n\t"net/http"\n)\n\nfunc List${entityName}(w http.ResponseWriter, r *http.Request) {\n\tw.WriteHeader(http.StatusOK)\n\tw.Write([]byte("[]"))\n}\n`);
    return baseDir;
  },

  runLint: (projectRoot) => {
    console.log('[Golang Adapter] Rodando go vet...');
    try {
      execSync('go vet ./...', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runTests: (projectRoot) => {
    console.log('[Golang Adapter] Rodando go test...');
    try {
      execSync('go test ./...', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runBuild: (projectRoot) => {
    console.log('[Golang Adapter] Rodando go build...');
    try {
      execSync('go build ./...', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  qualityGate: (projectRoot) => {
    console.log('[Golang Adapter] Executando Quality Gate...');
    const layers = ['domain', 'application', 'infrastructure'];
    const baseDir = path.join(projectRoot, 'internal');
    if (!fs.existsSync(baseDir)) {
      console.error('[Golang Adapter] internal/ directory not found.');
      return false;
    }
    let errors = 0;
    layers.forEach(layer => {
      const layerPath = path.join(baseDir, layer);
      if (!fs.existsSync(layerPath)) {
        console.warn(`[AVISO] Camada Clean Architecture ausente: internal/${layer}/`);
        errors++;
      }
    });
    try {
      execSync('go vet ./internal/...', { cwd: projectRoot, stdio: 'pipe' });
    } catch {
      console.warn('[AVISO] go vet encontrou problemas nas camadas internas.');
      errors++;
    }
    return errors === 0;
  }
};
