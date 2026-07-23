const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'haskell',
  capabilities: [
    'detect', 'init', 'generateTemplate', 'runLint',
    'runTests', 'runBuild', 'qualityGate'
  ],

  detect: (projectRoot) => {
    return fs.existsSync(path.join(projectRoot, 'stack.yaml')) ||
           fs.existsSync(path.join(projectRoot, '*.cabal')) ||
           fs.existsSync(path.join(projectRoot, 'package.yaml'));
  },

  init: (projectRoot) => {
    console.log('[Haskell Adapter] Verificando stack.yaml...');
    if (!fs.existsSync(path.join(projectRoot, 'stack.yaml'))) {
      console.log('[Haskell Adapter] Nenhum stack.yaml encontrado. Execute "stack new <project>" manualmente.');
      return false;
    }
    const toolsDir = path.join(projectRoot, 'tools');
    if (!fs.existsSync(toolsDir)) {
      fs.mkdirSync(toolsDir, { recursive: true });
      fs.writeFileSync(path.join(toolsDir, '.hlint.yaml'),
        '- arguments: [ -XTypeApplications, -XLambdaCase ]\n- ignore: { name: "Redundant id" }\n');
    }
    return true;
  },

  generateTemplate: (pkgName) => {
    const baseDir = path.join(process.cwd(), 'src', pkgName);
    console.log(`[Haskell Adapter] Gerando estrutura para o pacote: ${pkgName}`);
    ['Application/Usecase', 'Domain/Entity', 'Domain/Repository', 'Infrastructure/Handler', 'Infrastructure/Database'].forEach(dir => {
      fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
    });
    const moduleName = pkgName.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^[a-z]/, c => c.toUpperCase());
    fs.writeFileSync(path.join(baseDir, 'Domain', 'Entity', `${pkgName}.hs`),
      `module ${moduleName}.Domain.Entity.${moduleName}\n  ( ${moduleName}(..)\n  ) where\n\ndata ${moduleName} = ${moduleName}\n  { entityId :: !String\n  } deriving (Show, Eq, Generic)\n\ninstance ToJSON ${moduleName}\ninstance FromJSON ${moduleName}\n`);
    fs.writeFileSync(path.join(baseDir, 'Domain', 'Repository', `${pkgName}Repository.hs`),
      `module ${moduleName}.Domain.Repository.${moduleName}Repository\n  ( ${moduleName}Repository(..)\n  ) where\n\nimport ${moduleName}.Domain.Entity.${moduleName}\n\nclass ${moduleName}Repository m where\n  findById :: String -> m (Maybe ${moduleName})\n`);
    fs.writeFileSync(path.join(baseDir, 'Infrastructure', 'Handler', `${pkgName}Handler.hs`),
      `module ${moduleName}.Infrastructure.Handler.${moduleName}Handler\n  ( handler\n  ) where\n\nimport qualified Network.Wai as Wai\nimport qualified Network.HTTP.Types as HTTP\n\nhandler :: Wai.Application\nhandler _ respond = respond $ Wai.responseLBS HTTP.status200 [] "[]"\n`);
    return baseDir;
  },

  runLint: (projectRoot) => {
    console.log('[Haskell Adapter] Rodando hlint...');
    try {
      execSync('hlint src/', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runTests: (projectRoot) => {
    console.log('[Haskell Adapter] Rodando stack test...');
    try {
      execSync('stack test', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runBuild: (projectRoot) => {
    console.log('[Haskell Adapter] Compilando com stack build...');
    try {
      execSync('stack build', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  qualityGate: (projectRoot) => {
    console.log('[Haskell Adapter] Executando Quality Gate...');
    const layers = ['Domain', 'Application', 'Infrastructure'];
    const baseDir = path.join(projectRoot, 'src');
    if (!fs.existsSync(baseDir)) {
      console.error('[Haskell Adapter] src/ directory not found.');
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
      execSync('hlint src/', { cwd: projectRoot, stdio: 'pipe' });
    } catch {
      console.warn('[AVISO] hlint encontrou problemas nas camadas internas.');
      errors++;
    }
    return errors === 0;
  }
};
