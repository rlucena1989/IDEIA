import * as fs from 'fs';
import * as path from 'path';

export interface GeneratedFile { path: string; content: string }

export function generateController(entityName: string, destDir: string): GeneratedFile[] {
  const cap = entityName.charAt(0).toUpperCase() + entityName.slice(1);
  return [
    {
      path: path.join(destDir, `${entityName}_controller.rb`),
      content: `class ${cap}Controller < ApplicationController
  def index
    items = ${cap}Service.instance.list
    render json: items
  end

  def show
    item = ${cap}Service.instance.find(params[:id])
    if item
      render json: item
    else
      render json: { error: "Not found" }, status: :not_found
    end
  end

  def create
    item = ${cap}Service.instance.create(params.require(:${entityName}).permit(:name))
    render json: item, status: :created
  end

  def destroy
    ${cap}Service.instance.delete(params[:id])
    head :no_content
  end
end
`,
    },
    {
      path: path.join(destDir, `${entityName}_service.rb`),
      content: `require 'singleton'

class ${cap}Service
  include Singleton

  def initialize
    @items = {}
    @counter = 0
  end

  def list
    @items.values
  end

  def find(id)
    @items[id.to_i]
  end

  def create(attrs)
    @counter += 1
    @items[@counter] = { id: @counter, name: attrs[:name] }
  end

  def delete(id)
    @items.delete(id.to_i)
  end
end
`,
    },
    {
      path: path.join(destDir, `${entityName}.rb`),
      content: `class ${cap}
  attr_accessor :id, :name

  def initialize(id:, name:)
    @id = id
    @name = name
  end

  def to_h
    { id: @id, name: @name }
  end
end
`,
    },
  ];
}

export function scaffoldProject(projectName: string): GeneratedFile[] {
  return [
    {
      path: path.join(projectName, 'Gemfile'),
      content: `source 'https://rubygems.org'

gem 'sinatra', '~> 3.1'
gem 'puma', '~> 6.4'
gem 'json'

group :development do
  gem 'rubocop', '~> 1.60'
  gem 'rspec', '~> 3.12'
end
`,
    },
    {
      path: path.join(projectName, 'app.rb'),
      content: `require 'sinatra'
require 'json'

set :port, ENV.fetch('PORT', 4567)

before do
  content_type :json
end

get '/health' do
  { status: 'ok' }.to_json
end

run Sinatra::Application
`,
    },
    {
      path: path.join(projectName, 'config.ru'),
      content: `require './app'

run Sinatra::Application
`,
    },
    {
      path: path.join(projectName, '.rubocop.yml'),
      content: `AllCops:
  TargetRubyVersion: 3.2
  NewCops: enable

Style/Documentation:
  Enabled: false
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
