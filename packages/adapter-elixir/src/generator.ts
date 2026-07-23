import * as fs from 'fs';
import * as path from 'path';

export interface GeneratedFile { path: string; content: string }

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
  end
end
`,
    },
    {
      path: path.join(destDir, `${moduleName}_context.ex`),
      content: `defmodule ${cap}Context do
  alias ${cap}.Repo
  alias ${cap}.{${cap}, ${cap}Query}

  def list_${moduleName}s do
    Repo.all(${cap})
  end

  def get_${moduleName}!(id), do: Repo.get!(${cap}, id)

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
