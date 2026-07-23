const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'fastapi',
  capabilities: [
    'detect', 'init', 'generateTemplate', 'runLint',
    'runTests', 'runBuild', 'qualityGate'
  ],

  detect: (projectRoot) => {
    return fs.existsSync(path.join(projectRoot, 'requirements.txt'))
        || fs.existsSync(path.join(projectRoot, 'pyproject.toml'));
  },

  init: (projectRoot) => {
    console.log('[FastAPI Adapter] Inicializando configs Python (requirements.txt, .flake8)...');
    const reqPath = path.join(projectRoot, 'requirements.txt');
    if (!fs.existsSync(reqPath)) {
      fs.writeFileSync(reqPath, [
        'fastapi>=0.110.0',
        'uvicorn[standard]>=0.29.0',
        'pytest>=8.0.0',
        'httpx>=0.27.0',
        'flake8>=7.0.0',
        'pydantic>=2.0.0'
      ].join('\n') + '\n');
    }
    const flake8Path = path.join(projectRoot, '.flake8');
    if (!fs.existsSync(flake8Path)) {
      fs.writeFileSync(flake8Path, '[flake8]\nmax-line-length = 120\n\nextend-ignore = E203, W503\n');
    }
    return true;
  },

  generateTemplate: (routerName) => {
    const baseDir = path.join(process.cwd(), 'src', 'modules', routerName);
    console.log(`[FastAPI Adapter] Gerando estrutura modular para: ${routerName}`);
    ['application/use_cases', 'application/schemas', 'domain/entities', 'domain/repositories', 'infrastructure/http/routes', 'infrastructure/database'].forEach(dir => {
      fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
    });
    fs.writeFileSync(path.join(baseDir, '__init__.py'), `# ${routerName} module\n`);
    fs.writeFileSync(path.join(baseDir, 'application', 'schemas', `${routerName}_schema.py`),
      `from pydantic import BaseModel\n\n\nclass ${routerName.charAt(0).toUpperCase() + routerName.slice(1)}(BaseModel):\n    pass\n`);
    fs.writeFileSync(path.join(baseDir, 'infrastructure', 'http', 'routes', `${routerName}_router.py`),
      `from fastapi import APIRouter\n\nrouter = APIRouter(prefix="/${routerName}", tags=["${routerName}"])\n\n\n@router.get("/")\nasync def list_${routerName}():\n    return {"${routerName}": []}\n`);
    fs.writeFileSync(path.join(baseDir, 'infrastructure', `${routerName}_module.py`),
      `from fastapi import APIRouter\nfrom .http.routes.${routerName}_router import router as ${routerName}_router\n\n\ndef register_routes(app: APIRouter):\n    app.include_router(${routerName}_router)\n`);
    return baseDir;
  },

  runLint: (projectRoot) => {
    console.log('[FastAPI Adapter] Rodando flake8...');
    try {
      execSync('python -m flake8 src/', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runTests: (projectRoot) => {
    console.log('[FastAPI Adapter] Rodando pytest...');
    try {
      execSync('python -m pytest', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runBuild: (projectRoot) => {
    console.log('[FastAPI Adapter] Verificando sintaxe Python...');
    try {
      execSync('python -m py_compile src/', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  qualityGate: (projectRoot) => {
    console.log('[FastAPI Adapter] Executando Quality Gate...');
    const layers = ['domain', 'application', 'infrastructure'];
    const baseDir = path.join(projectRoot, 'src');
    if (!fs.existsSync(baseDir)) {
      console.error('[FastAPI Adapter] src/ directory not found.');
      return false;
    }
    let errors = 0;
    layers.forEach(layer => {
      const layerPath = path.join(baseDir, layer);
      if (!fs.existsSync(layerPath)) {
        console.warn(`[AVISO] Camada Clean Architecture ausente: ${layer}/`);
        errors++;
      }
    });
    const mainPy = path.join(baseDir, 'main.py');
    if (!fs.existsSync(mainPy)) {
      console.warn('[AVISO] src/main.py não encontrado — esperado entrypoint FastAPI.');
      errors++;
    }
    return errors === 0;
  }
};
