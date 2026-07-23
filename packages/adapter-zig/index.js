const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'zig',
  capabilities: [
    'detect', 'init', 'generateTemplate', 'runLint',
    'runTests', 'runBuild', 'qualityGate'
  ],

  detect: (projectRoot) => {
    return fs.existsSync(path.join(projectRoot, 'build.zig'));
  },

  init: (projectRoot) => {
    console.log('[Zig Adapter] Verificando build.zig...');
    if (!fs.existsSync(path.join(projectRoot, 'build.zig'))) {
      console.log('[Zig Adapter] Nenhum build.zig encontrado. Execute "zig init-exe" ou "zig init-lib" manualmente.');
      return false;
    }
    const srcDir = path.join(projectRoot, 'src');
    if (!fs.existsSync(srcDir)) {
      fs.mkdirSync(srcDir, { recursive: true });
    }
    const buildZigPath = path.join(projectRoot, 'build.zig');
    const content = fs.readFileSync(buildZigPath, 'utf-8');
    if (!content.includes('exe.addModule') && !content.includes('lib.addModule')) {
      console.log('[Zig Adapter] build.zig existente mantido. Verifique se há módulos configurados.');
    }
    return true;
  },

  generateTemplate: (pkgName) => {
    const baseDir = path.join(process.cwd(), 'src', pkgName);
    console.log(`[Zig Adapter] Gerando estrutura para o pacote: ${pkgName}`);
    ['application/usecase', 'domain/entity', 'domain/repository', 'infrastructure/handler', 'infrastructure/database'].forEach(dir => {
      fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
    });
    const className = pkgName.charAt(0).toUpperCase() + pkgName.slice(1);
    fs.writeFileSync(path.join(baseDir, 'domain', 'entity', `${pkgName}.zig`),
      `const std = @import("std");

pub const ${className} = struct {
    id: []const u8,

    pub fn init(id: []const u8) ${className} {
        return ${className}{ .id = id };
    }
};
`);
    fs.writeFileSync(path.join(baseDir, 'domain', 'repository', `${pkgName}_repository.zig`),
      `const ${className} = @import("../entity/${pkgName}.zig").${className};

pub fn findById(allocator: std.mem.Allocator, id: []const u8) !?${className} {
    _ = allocator;
    _ = id;
    @compileError("implement findById");
}

const std = @import("std");
`);
    fs.writeFileSync(path.join(baseDir, 'infrastructure', 'handler', `${pkgName}_handler.zig`),
      `const std = @import("std");

pub fn list${className}(allocator: std.mem.Allocator) ![]const u8 {
    _ = allocator;
    return "[]";
}

const ${className} = @import("../../domain/entity/${pkgName}.zig").${className};
`);
    return baseDir;
  },

  runLint: (projectRoot) => {
    console.log('[Zig Adapter] Rodando zig fmt...');
    try {
      execSync('zig fmt --check src/', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runTests: (projectRoot) => {
    console.log('[Zig Adapter] Rodando zig build test...');
    try {
      execSync('zig build test --summary all', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runBuild: (projectRoot) => {
    console.log('[Zig Adapter] Rodando zig build...');
    try {
      execSync('zig build --summary all', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  qualityGate: (projectRoot) => {
    console.log('[Zig Adapter] Executando Quality Gate...');
    const layers = ['domain', 'application', 'infrastructure'];
    const baseDir = path.join(projectRoot, 'src');
    if (!fs.existsSync(baseDir)) {
      console.error('[Zig Adapter] src/ directory not found.');
      return false;
    }
    let errors = 0;
    layers.forEach(layer => {
      const layerPath = path.join(baseDir, layer);
      if (!fs.existsSync(layerPath)) {
        console.warn(`[AVISO] Camada Clean Architecture ausente: src/${layer}/`);
        errors++;
      }
    });
    try {
      execSync('zig fmt --check src/', { cwd: projectRoot, stdio: 'pipe' });
    } catch {
      console.warn('[AVISO] zig fmt --check encontrou problemas de formatação.');
      errors++;
    }
    return errors === 0;
  }
};
