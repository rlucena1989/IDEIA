import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
const logger = createLogger('generator');

interface SpecField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'uuid' | 'email' | 'text';
  required: boolean;
}

interface SpecComponent {
  name: string;
  responsibility: string;
  fields: SpecField[];
}

interface Spec {
  id: string;
  title: string;
  requirements: Array<{
    id: string;
    description: string;
    category: string;
    priority: string;
    acceptanceCriteria: string[];
  }>;
  design: {
    components: Array<{
      name: string;
      responsibility: string;
      interfaces: Array<{
        name: string;
        type: string;
        contract: string;
      }>;
      dependencies: string[];
    }>;
  };
  acceptanceCriteria: Array<{
    id: string;
    description: string;
    type: string;
    given: string;
    when: string;
    then: string;
    expectedResult: string;
  }>;
}

export interface GeneratedFile { path: string; content: string }

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function underscore(s: string): string {
  return s.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

function extractComponents(spec: Spec): SpecComponent[] {
  return spec.design.components.map(c => ({
    name: c.name,
    responsibility: c.responsibility,
    fields: [
      { name: 'id', type: 'uuid' as const, required: true },
      { name: 'name', type: 'string' as const, required: true },
      { name: 'created_at', type: 'date' as const, required: true },
      ...c.interfaces.filter(i => i.type === 'input').map(i => ({
        name: underscore(i.name),
        type: 'string' as const,
        required: true,
      })),
    ],
  }));
}

export function generateFromSpec(spec: Spec, destDir: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const components = extractComponents(spec);
  const mod = capitalize(spec.title.replace(/[^a-zA-Z0-9]/g, '_'));

  for (const comp of components) {
    files.push(...generateModule(underscore(comp.name), path.join(destDir, 'lib', underscore(comp.name))));
  }

  files.push({
    path: path.join(destDir, 'mix.exs'),
    content: `defmodule ${mod}.MixProject do
  use Mix.Project

  def project do
    [
      app: :${underscore(spec.title)},
      version: "0.1.0",
      elixir: "~> 1.16",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    [extra_applications: [:logger], mod: {${mod}.Application, []}]
  end

  defp deps do
    [
      {:phoenix, "~> 1.7"},
      {:ecto_sql, "~> 3.11"},
      {:jason, "~> 1.4"},
      {:plug_cowboy, "~> 2.6"}
    ]
  end
end
`,
  });

  files.push({
    path: path.join(destDir, 'lib', `${underscore(spec.title)}.ex`),
    content: `defmodule ${mod} do
  @moduledoc """
  ${spec.title}
  """
end
`,
  });

  files.push({
    path: path.join(destDir, 'lib', `${underscore(spec.title)}_application.ex`),
    content: `defmodule ${mod}.Application do
  @moduledoc false
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {Plug.Cowboy, scheme: :http, plug: ${mod}.Router, options: [port: 8080]}
    ]
    opts = [strategy: :one_for_one, name: ${mod}.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
`,
  });

  files.push({
    path: path.join(destDir, 'lib', `${underscore(spec.title)}_router.ex`),
    content: `defmodule ${mod}.Router do
  use Plug.Router

  plug :match
  plug :dispatch

  get "/health" do
    send_resp(conn, 200, Jason.encode!(%{status: "ok"}))
  end

${components.map(c => `
  get "/api/${underscore(c.name)}s" do
    send_resp(conn, 200, Jason.encode!(%{message: "list ${underscore(c.name)}s"}))
  end

  post "/api/${underscore(c.name)}s" do
    {:ok, body, _} = Plug.Conn.read_body(conn)
    send_resp(conn, 201, body)
  end

  get "/api/${underscore(c.name)}s/:id" do
    send_resp(conn, 200, Jason.encode!(%{id: id, message: "get ${underscore(c.name)}"}))
  end

  delete "/api/${underscore(c.name)}s/:id" do
    send_resp(conn, 204, "")
  end
`).join('\n')}

  match _ do
    send_resp(conn, 404, Jason.encode!(%{error: "Not found"}))
  end
end
`,
  });

  if (spec.acceptanceCriteria.length > 0) {
    files.push({
      path: path.join(destDir, 'test', `${underscore(spec.title)}_test.exs`),
      content: `defmodule ${mod}Test do
  use ExUnit.Case

${spec.acceptanceCriteria.map(tc => `
  test "${tc.id}: ${tc.description}" do
    # Given: ${tc.given}
    # When: ${tc.when}
    # Then: ${tc.then}
    assert true
  end`).join('\n')}
end
`,
    });
  }

  return files;
}

export function generateModule(moduleName: string, destDir: string): GeneratedFile[] {
  const cap = capitalize(moduleName);
  return [
    {
      path: path.join(destDir, `${moduleName}.ex`),
      content: `defmodule ${cap} do
  use Ecto.Schema
  import Ecto.Changeset

  schema "${moduleName}s" do
    field :name, :string
    timestamps()
  end

  def changeset(struct, params \\\\ %{}) do
    struct
    |> cast(params, [:name])
    |> validate_required([:name])
    |> validate_length(:name, min: 1, max: 255)
  end

  def update_changeset(struct, params \\\\ %{}) do
    struct
    |> cast(params, [:name])
    |> validate_required([:name])
  end
end
`,
    },
    {
      path: path.join(destDir, `${moduleName}_context.ex`),
      content: `defmodule ${cap}Context do
  alias ${cap}.Repo

  def list_${moduleName}s do
    Repo.all(${cap})
  end

  def get_${moduleName}!(id), do: Repo.get!(${cap}, id)

  def get_${moduleName}(id) do
    case Repo.get(${cap}, id) do
      nil -> {:error, :not_found}
      item -> {:ok, item}
    end
  end

  def create_${moduleName}(attrs \\\\ %{}) do
    %${cap}{}
    |> ${cap}.changeset(attrs)
    |> Repo.insert()
  end

  def update_${moduleName}(%${cap}{} = item, attrs) do
    item
    |> ${cap}.changeset(attrs)
    |> Repo.update()
  end

  def delete_${moduleName}(%${cap}{} = item) do
    Repo.delete(item)
  end

  def delete_${moduleName}!(id) do
    item = get_${moduleName}!(id)
    Repo.delete(item)
  end
end
`,
    },
  ];
}

export function scaffoldProject(projectName: string): GeneratedFile[] {
  const simpleName = path.basename(projectName).replace(/[^a-zA-Z0-9_-]/g, '_') || 'app';
  const mod = capitalize(simpleName);
  return [
    {
      path: path.join(projectName, 'mix.exs'),
      content: `defmodule ${mod}.MixProject do
  use Mix.Project

  def project do
    [
      app: :${simpleName},
      version: "0.1.0",
      elixir: "~> 1.16",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    [extra_applications: [:logger], mod: {${mod}.Application, []}]
  end

  defp deps do
    [
      {:phoenix, "~> 1.7"},
      {:ecto_sql, "~> 3.11"},
      {:jason, "~> 1.4"}
    ]
  end
end
`,
    },
    {
      path: path.join(projectName, 'lib', `${simpleName}.ex`),
      content: `defmodule ${mod} do
  @moduledoc """
  IDEIA generated Elixir project.
  """
end
`,
    },
    {
      path: path.join(projectName, 'lib', `${simpleName}_application.ex`),
      content: `defmodule ${mod}.Application do
  @moduledoc false
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      ${mod}.Repo,
      {Phoenix.PubSub, name: ${mod}.PubSub},
    ]
    opts = [strategy: :one_for_one, name: ${mod}.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
`,
    },
  ];
}

export function writeFiles(files: GeneratedFile[]): void {
  for (const f of files) {
    const dir = path.dirname(f.path);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(f.path, f.content, 'utf-8');
  }
}
