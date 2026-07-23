const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'php',
  capabilities: [
    'detect', 'init', 'generateTemplate', 'runLint',
    'runTests', 'runBuild', 'qualityGate'
  ],

  detect: (projectRoot) => {
    return fs.existsSync(path.join(projectRoot, 'composer.json'));
  },

  init: (projectRoot) => {
    console.log('[PHP Adapter] Verificando composer.json...');
    if (!fs.existsSync(path.join(projectRoot, 'composer.json'))) {
      console.log('[PHP Adapter] Nenhum composer.json encontrado. Execute "composer init" manualmente.');
      return false;
    }
    const configDir = path.join(projectRoot, '.php-cs-fixer.d');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    const configPath = path.join(projectRoot, '.php-cs-fixer.d', '.php-cs-fixer.php');
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, `<?php

use PhpCsFixer\\Config;
use PhpCsFixer\\Finder;

\$finder = Finder::create()
    ->in(__DIR__ . '/../src')
    ->name('*.php');

return (new Config())
    ->setRules([
        '@PSR12' => true,
        'array_syntax' => ['syntax' => 'short'],
        'ordered_imports' => true,
        'no_unused_imports' => true,
    ])
    ->setFinder(\$finder);
`);
    }
    return true;
  },

  generateTemplate: (pkgName) => {
    const baseDir = path.join(process.cwd(), 'src', pkgName);
    console.log(`[PHP Adapter] Gerando estrutura para o pacote: ${pkgName}`);
    ['application/usecase', 'domain/entity', 'domain/repository', 'infrastructure/handler', 'infrastructure/database'].forEach(dir => {
      fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
    });
    const entityName = pkgName.charAt(0).toUpperCase() + pkgName.slice(1);
    fs.writeFileSync(path.join(baseDir, 'domain', 'entity', `${entityName}.php`),
      `<?php

declare(strict_types=1);

namespace App\\Domain\\Entity;

class ${entityName}
{
    private ?string \$id = null;

    public function getId(): ?string
    {
        return \$this->id;
    }

    public function setId(string \$id): self
    {
        \$this->id = \$id;
        return \$this;
    }
}
`);
    fs.writeFileSync(path.join(baseDir, 'domain', 'repository', `${entityName}RepositoryInterface.php`),
      `<?php

declare(strict_types=1);

namespace App\\Domain\\Repository;

use App\\Domain\\Entity\\${entityName};

interface ${entityName}RepositoryInterface
{
    public function findById(string \$id): ?${entityName};
}
`);
    fs.writeFileSync(path.join(baseDir, 'infrastructure', 'handler', `${entityName}Handler.php`),
      `<?php

declare(strict_types=1);

namespace App\\Infrastructure\\Handler;

use Psr\\Http\\Message\\ResponseInterface;
use Psr\\Http\\Message\\ServerRequestInterface;

class ${entityName}Handler
{
    public function __invoke(ServerRequestInterface \$request): ResponseInterface
    {
        // TODO: implement
    }
}
`);
    return baseDir;
  },

  runLint: (projectRoot) => {
    console.log('[PHP Adapter] Rodando phpcs...');
    try {
      execSync('php vendor/bin/phpcs --standard=PSR12 src/', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runTests: (projectRoot) => {
    console.log('[PHP Adapter] Rodando phpunit...');
    try {
      execSync('vendor/bin/phpunit', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runBuild: (projectRoot) => {
    console.log('[PHP Adapter] Rodando composer install...');
    try {
      execSync('composer install --no-dev --optimize-autoloader', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  qualityGate: (projectRoot) => {
    console.log('[PHP Adapter] Executando Quality Gate...');
    const layers = ['domain', 'application', 'infrastructure'];
    const baseDir = path.join(projectRoot, 'src');
    if (!fs.existsSync(baseDir)) {
      console.error('[PHP Adapter] src/ directory not found.');
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
      execSync('php vendor/bin/phpcs --standard=PSR12 src/ --report=full', { cwd: projectRoot, stdio: 'pipe' });
    } catch {
      console.warn('[AVISO] phpcs encontrou problemas nas camadas src.');
      errors++;
    }
    return errors === 0;
  }
};
