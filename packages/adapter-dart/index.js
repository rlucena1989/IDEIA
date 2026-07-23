const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'dart',
  capabilities: [
    'detect', 'init', 'generateTemplate', 'runLint',
    'runTests', 'runBuild', 'qualityGate'
  ],

  detect: (projectRoot) => {
    return fs.existsSync(path.join(projectRoot, 'pubspec.yaml'));
  },

  init: (projectRoot) => {
    console.log('[Dart Adapter] Verificando pubspec.yaml...');
    if (!fs.existsSync(path.join(projectRoot, 'pubspec.yaml'))) {
      console.log('[Dart Adapter] Nenhum pubspec.yaml encontrado. Execute "dart create <project>" manualmente.');
      return false;
    }
    const analysisDir = path.join(projectRoot, 'analysis');
    if (!fs.existsSync(analysisDir)) {
      fs.mkdirSync(analysisDir, { recursive: true });
      fs.writeFileSync(path.join(analysisDir, 'analysis_options.yaml'),
        'include: package:flutter_lints/flutter.yaml\n\nlinter:\n  rules:\n    - prefer_const_constructors\n    - avoid_print\n');
    }
    return true;
  },

  generateTemplate: (pkgName) => {
    const baseDir = path.join(process.cwd(), 'lib', pkgName);
    console.log(`[Dart Adapter] Gerando estrutura para o pacote: ${pkgName}`);
    ['application/usecase', 'domain/entity', 'domain/repository', 'infrastructure/handler', 'infrastructure/database'].forEach(dir => {
      fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
    });
    const entityName = pkgName.replace(/_([a-z])/g, (_, c) => c.toUpperCase()).replace(/^[a-z]/, c => c.toUpperCase());
    fs.writeFileSync(path.join(baseDir, 'domain', 'entity', `${pkgName}.dart`),
      `class ${entityName} {\n  final String id;\n\n  const ${entityName}({required this.id});\n\n  Map<String, dynamic> toJson() => {'id': id};\n\n  factory ${entityName}.fromJson(Map<String, dynamic> json) =>\n    ${entityName}(id: json['id'] as String);\n}\n`);
    fs.writeFileSync(path.join(baseDir, 'domain', 'repository', `${pkgName}_repository.dart`),
      `import '../entity/${pkgName}.dart';\n\nabstract class ${entityName}Repository {\n  Future<${entityName}> findById(String id);\n}\n`);
    fs.writeFileSync(path.join(baseDir, 'infrastructure', 'handler', `${pkgName}_handler.dart`),
      `import 'dart:io';\n\nFuture<void> handle${entityName}(HttpRequest request) async {\n  request.response.statusCode = HttpStatus.ok;\n  request.response.write('[]');\n  await request.response.close();\n}\n`);
    return baseDir;
  },

  runLint: (projectRoot) => {
    console.log('[Dart Adapter] Rodando dart analyze...');
    try {
      execSync('dart analyze', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runTests: (projectRoot) => {
    console.log('[Dart Adapter] Rodando dart test...');
    try {
      execSync('dart test', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runBuild: (projectRoot) => {
    console.log('[Dart Adapter] Compilando com dart compile...');
    try {
      execSync('dart compile exe bin/main.dart', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  qualityGate: (projectRoot) => {
    console.log('[Dart Adapter] Executando Quality Gate...');
    const layers = ['domain', 'application', 'infrastructure'];
    const baseDir = path.join(projectRoot, 'lib');
    if (!fs.existsSync(baseDir)) {
      console.error('[Dart Adapter] lib/ directory not found.');
      return false;
    }
    let errors = 0;
    layers.forEach(layer => {
      const layerPath = path.join(baseDir, layer);
      if (!fs.existsSync(layerPath)) {
        console.warn(`[AVISO] Camada Clean Architecture ausente: lib/${layer}/`);
        errors++;
      }
    });
    try {
      execSync('dart analyze lib/', { cwd: projectRoot, stdio: 'pipe' });
    } catch {
      console.warn('[AVISO] dart analyze encontrou problemas nas camadas internas.');
      errors++;
    }
    return errors === 0;
  }
};
