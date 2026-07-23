const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'ruby',
  capabilities: [
    'detect', 'init', 'generateTemplate', 'runLint',
    'runTests', 'runBuild', 'qualityGate'
  ],

  detect: (projectRoot) => {
    return fs.existsSync(path.join(projectRoot, 'Gemfile'));
  },

  init: (projectRoot) => {
    console.log('[Ruby Adapter] Verificando Gemfile...');
    if (!fs.existsSync(path.join(projectRoot, 'Gemfile'))) {
      console.log('[Ruby Adapter] Nenhum Gemfile encontrado. Execute "bundle init" manualmente.');
      return false;
    }
    const rubocopPath = path.join(projectRoot, '.rubocop.yml');
    if (!fs.existsSync(rubocopPath)) {
      fs.writeFileSync(rubocopPath, `AllCops:
  NewCops: enable
  TargetRubyVersion: 3.2
  Exclude:
    - 'vendor/**/*'
    - 'bin/*'

Layout/LineLength:
  Max: 120

Style/FrozenStringLiteralComment:
  EnforcedStyle: always

Metrics/MethodLength:
  Max: 20
`);
    }
    return true;
  },

  generateTemplate: (pkgName) => {
    const baseDir = path.join(process.cwd(), 'lib', pkgName);
    console.log(`[Ruby Adapter] Gerando estrutura para o pacote: ${pkgName}`);
    ['application/usecase', 'domain/entity', 'domain/repository', 'infrastructure/handler', 'infrastructure/database'].forEach(dir => {
      fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
    });
    const moduleName = pkgName.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
    const className = moduleName;
    fs.writeFileSync(path.join(baseDir, 'domain', 'entity', `${pkgName}.rb`),
      `# frozen_string_literal: true

module Domain
  module Entity
    class ${className}
      attr_accessor :id

      def initialize(id: nil)
        @id = id
      end
    end
  end
end
`);
    fs.writeFileSync(path.join(baseDir, 'domain', 'repository', `${pkgName}_repository.rb`),
      `# frozen_string_literal: true

module Domain
  module Repository
    class ${className}Repository
      def find_by_id(id)
        raise NotImplementedError
      end
    end
  end
end
`);
    fs.writeFileSync(path.join(baseDir, 'infrastructure', 'handler', `${pkgName}_handler.rb`),
      `# frozen_string_literal: true

module Infrastructure
  module Handler
    class ${className}Handler
      def call(request)
        # TODO: implement
      end
    end
  end
end
`);
    return baseDir;
  },

  runLint: (projectRoot) => {
    console.log('[Ruby Adapter] Rodando rubocop...');
    try {
      execSync('bundle exec rubocop --format simple', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runTests: (projectRoot) => {
    console.log('[Ruby Adapter] Rodando rspec...');
    try {
      execSync('bundle exec rspec --format progress', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runBuild: (projectRoot) => {
    console.log('[Ruby Adapter] Rodando bundle install...');
    try {
      execSync('bundle install --deployment', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  qualityGate: (projectRoot) => {
    console.log('[Ruby Adapter] Executando Quality Gate...');
    const layers = ['domain', 'application', 'infrastructure'];
    const baseDir = path.join(projectRoot, 'lib');
    if (!fs.existsSync(baseDir)) {
      console.error('[Ruby Adapter] lib/ directory not found.');
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
      execSync('bundle exec rubocop --format simple lib/', { cwd: projectRoot, stdio: 'pipe' });
    } catch {
      console.warn('[AVISO] rubocop encontrou problemas nas camadas lib.');
      errors++;
    }
    return errors === 0;
  }
};
