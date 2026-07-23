const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'elixir',
  capabilities: [
    'detect', 'init', 'generateTemplate', 'runLint',
    'runTests', 'runBuild', 'qualityGate'
  ],

  detect: (projectRoot) => {
    return fs.existsSync(path.join(projectRoot, 'mix.exs'));
  },

  init: (projectRoot) => {
    console.log('[Elixir Adapter] Verificando mix.exs...');
    if (!fs.existsSync(path.join(projectRoot, 'mix.exs'))) {
      console.log('[Elixir Adapter] Nenhum mix.exs encontrado. Execute "mix new <project>" manualmente.');
      return false;
    }
    const configDir = path.join(projectRoot, 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, 'credo.exs'),
        '%{\n  configs: [\n    %{\n      name: "default",\n      strict: true,\n      color: true,\n      checks: [\n        {Credo.Check.Readability.ModuleDoc, false}\n      ]\n    }\n  ]\n}\n');
    }
    return true;
  },

  generateTemplate: (pkgName) => {
    const baseDir = path.join(process.cwd(), 'lib', pkgName);
    console.log(`[Elixir Adapter] Gerando estrutura para o pacote: ${pkgName}`);
    ['application/usecase', 'domain/entity', 'domain/repository', 'infrastructure/handler', 'infrastructure/database'].forEach(dir => {
      fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
    });
    const moduleName = pkgName.replace(/_([a-z])/g, (_, c) => c.toUpperCase()).replace(/^[a-z]/, c => c.toUpperCase());
    fs.writeFileSync(path.join(baseDir, 'domain', 'entity', `${pkgName}.ex`),
      `defmodule ${moduleName}.Domain.Entity.${moduleName} do\n  defstruct [:id]\n\n  @type t :: %__MODULE__{id: String.t()}\nend\n`);
    fs.writeFileSync(path.join(baseDir, 'domain', 'repository', `${pkgName}_repository.ex`),
      `defmodule ${moduleName}.Domain.Repository.${moduleName}Repository do\n  @callback find_by_id(id :: String.t()) :: {:ok, %${moduleName}.Domain.Entity.${moduleName}{}} | {:error, String.t()}\nend\n`);
    fs.writeFileSync(path.join(baseDir, 'infrastructure', 'handler', `${pkgName}_handler.ex`),
      `defmodule ${moduleName}.Infrastructure.Handler.${moduleName}Handler do\n  import Plug.Conn\n\n  def init(opts), do: opts\n\n  def call(conn, _opts) do\n    conn\n    |> put_resp_content_type("application/json")\n    |> send_resp(200, "[]")\n  end\nend\n`);
    return baseDir;
  },

  runLint: (projectRoot) => {
    console.log('[Elixir Adapter] Rodando mix credo...');
    try {
      execSync('mix credo --strict', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runTests: (projectRoot) => {
    console.log('[Elixir Adapter] Rodando mix test...');
    try {
      execSync('mix test', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  runBuild: (projectRoot) => {
    console.log('[Elixir Adapter] Compilando com mix compile...');
    try {
      execSync('mix compile --force', { cwd: projectRoot, stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  },

  qualityGate: (projectRoot) => {
    console.log('[Elixir Adapter] Executando Quality Gate...');
    const layers = ['domain', 'application', 'infrastructure'];
    const baseDir = path.join(projectRoot, 'lib');
    if (!fs.existsSync(baseDir)) {
      console.error('[Elixir Adapter] lib/ directory not found.');
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
      execSync('mix credo lib/', { cwd: projectRoot, stdio: 'pipe' });
    } catch {
      console.warn('[AVISO] mix credo encontrou problemas nas camadas internas.');
      errors++;
    }
    return errors === 0;
  }
};
