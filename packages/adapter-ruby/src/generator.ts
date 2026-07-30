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
      { name: 'createdAt', type: 'date' as const, required: true },
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
  const appName = underscore(spec.title);

  for (const comp of components) {
    files.push(...generateController(underscore(comp.name), path.join(destDir, 'app', 'controllers')));
  }

  const routeDefs = components.map(c =>
    `  get '/api/${underscore(c.name)}s' do
    content_type :json
    ${capitalize(c.name)}Controller.new.index.to_json
  end

  post '/api/${underscore(c.name)}s' do
    content_type :json
    data = JSON.parse(request.body.read)
    status 201
    ${capitalize(c.name)}Controller.new.create(data).to_json
  end

  get '/api/${underscore(c.name)}s/:id' do |id|
    content_type :json
    item = ${capitalize(c.name)}Controller.new.show(id)
    if item
      item.to_json
    else
      status 404
      { error: 'Not found' }.to_json
    end
  end

  delete '/api/${underscore(c.name)}s/:id' do |id|
    content_type :json
    ${capitalize(c.name)}Controller.new.delete(id)
    status 204
  end`
  ).join('\n\n');

  files.push({
    path: path.join(destDir, 'app.rb'),
    content: `require 'sinatra'
require 'json'
require_relative 'app/controllers/${underscore(spec.title)}_controller'

set :port, ENV.fetch('PORT', 4567)

before do
  content_type :json
end

get '/health' do
  { status: 'ok' }.to_json
end

${routeDefs}
`,
  });

  files.push({
    path: path.join(destDir, 'config.ru'),
    content: `require './app'

run Sinatra::Application
`,
  });

  files.push({
    path: path.join(destDir, 'Gemfile'),
    content: `source 'https://rubygems.org'

gem 'sinatra', '~> 3.1'
gem 'puma', '~> 6.4'
gem 'json'

group :development do
  gem 'rubocop', '~> 1.60'
  gem 'rspec', '~> 3.12'
  gem 'rack-test'
end
`,
  });

  files.push({
    path: path.join(destDir, '.rubocop.yml'),
    content: `AllCops:
  TargetRubyVersion: 3.2
  NewCops: enable

Style/Documentation:
  Enabled: false

Metrics/MethodLength:
  Max: 30
`,
  });

  if (spec.acceptanceCriteria.length > 0) {
    const testMethods = spec.acceptanceCriteria.map((tc, i) =>
      `  it '${tc.id}: ${tc.description}' do
    # Given: ${tc.given}
    # When: ${tc.when}
    # Then: ${tc.then}
    expect(true).to be true
  end`
    ).join('\n\n');

    files.push({
      path: path.join(destDir, 'spec', 'acceptance_spec.rb'),
      content: `require 'rack/test'
require 'rspec'
require_relative '../app'

describe 'Acceptance Tests' do
  include Rack::Test::Methods

  def app
    Sinatra::Application
  end

${testMethods}
end
`,
    });
  }

  return files;
}

export function generateController(entityName: string, destDir: string): GeneratedFile[] {
  const cap = capitalize(entityName);
  const snake = underscore(entityName);
  return [
    {
      path: path.join(destDir, `${snake}_controller.rb`),
      content: `require 'securerandom'
require 'time'
require_relative '../services/${snake}_service'
require_relative '../models/${snake}'

class ${cap}Controller
  def initialize
    @service = ${cap}Service.instance
  end

  def index
    @service.list
  end

  def show(id)
    @service.find(id)
  end

  def create(params)
    @service.create(params)
  end

  def update(id, params)
    @service.update(id, params)
  end

  def delete(id)
    @service.delete(id)
  end
end
`,
    },
    {
      path: path.join(destDir, '..', 'services', `${snake}_service.rb`),
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
    item = ${cap}.new(@counter, attrs['name'] || attrs[:name])
    @items[@counter] = item
    item
  end

  def update(id, attrs)
    item = @items[id.to_i]
    return nil unless item
    item.name = attrs['name'] || attrs[:name] if attrs['name'] || attrs[:name]
    item
  end

  def delete(id)
    @items.delete(id.to_i)
  end
end
`,
    },
    {
      path: path.join(destDir, '..', 'models', `${snake}.rb`),
      content: `class ${cap}
  attr_accessor :id, :name, :created_at

  def initialize(id, name)
    @id = id
    @name = name
    @created_at = Time.now
  end

  def to_h
    { id: @id, name: @name, created_at: @created_at.iso8601 }
  end

  def to_json(*args)
    to_h.to_json(*args)
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
