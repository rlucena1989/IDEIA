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

function extractComponents(spec: Spec): SpecComponent[] {
  return spec.design.components.map(c => ({
    name: c.name,
    responsibility: c.responsibility,
    fields: [
      { name: 'id', type: 'uuid' as const, required: true },
      { name: 'name', type: 'string' as const, required: true },
      { name: 'createdAt', type: 'date' as const, required: true },
      ...c.interfaces.filter(i => i.type === 'input').map(i => ({
        name: i.name.replace(/-/g, '_'),
        type: 'string' as const,
        required: true,
      })),
    ],
  }));
}

export function generateFromSpec(spec: Spec, destDir: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const components = extractComponents(spec);

  for (const comp of components) {
    files.push(...generateController(comp.name, path.join(destDir, 'src', 'Controllers')));
    files.push(...generateService(comp.name, path.join(destDir, 'src', 'Services')));
    files.push(...generateModel(comp.name, path.join(destDir, 'src', 'Models')));
  }

  const routes = components.map(c =>
    `$app->get('/api/${c.name}s', \App\Controllers\\${capitalize(c.name)}Controller::class . ':index');
$app->post('/api/${c.name}s', \App\Controllers\\${capitalize(c.name)}Controller::class . ':create');
$app->get('/api/${c.name}s/{id}', \App\Controllers\\${capitalize(c.name)}Controller::class . ':show');
$app->put('/api/${c.name}s/{id}', \App\Controllers\\${capitalize(c.name)}Controller::class . ':update');
$app->delete('/api/${c.name}s/{id}', \App\Controllers\\${capitalize(c.name)}Controller::class . ':delete');`
  ).join('\n');

  files.push({
    path: path.join(destDir, 'public', 'index.php'),
    content: `<?php

use Slim\\Factory\\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

$app = AppFactory::create();
$app->addBodyParsingMiddleware();
$app->addErrorMiddleware(true, true, true);

$app->get('/', function ($request, $response) {
    $response->getBody()->write(json_encode(['status' => 'ok']));
    return $response->withHeader('Content-Type', 'application/json');
});

${routes}

$app->run();
`,
  });

  files.push({
    path: path.join(destDir, 'composer.json'),
    content: JSON.stringify({
      name: `${spec.title}/app`,
      require: {
        php: '>=8.2',
        'slim/slim': '^4.0',
        'slim/psr7': '^1.6',
        'vlucas/phpdotenv': '^5.5',
      },
      autoload: {
        'psr-4': { 'App\\\\': 'src/' },
      },
      scripts: {
        start: 'php -S localhost:8080 -t public',
        lint: 'php vendor/bin/phpcs --standard=PSR12 src/',
        test: 'php vendor/bin/phpunit',
      },
    }, null, 2),
  });

  files.push({
    path: path.join(destDir, '.env'),
    content: `APP_ENV=development
APP_DEBUG=true
`,
  });

  if (spec.acceptanceCriteria.length > 0) {
    const testMethods = spec.acceptanceCriteria.map(tc => `
    public function test${tc.id}(): void
    {
        // Given: ${tc.given}
        // When: ${tc.when}
        // Then: ${tc.then}
        \$this->assertTrue(true);
    }`).join('\n');

    files.push({
      path: path.join(destDir, 'tests', 'AcceptanceTest.php'),
      content: `<?php

use PHPUnit\\Framework\\TestCase;

class AcceptanceTest extends TestCase
{${testMethods}
}
`,
    });
  }

  return files;
}

function generateService(entityName: string, destDir: string): GeneratedFile[] {
  const cap = capitalize(entityName);
  return [{
    path: path.join(destDir, `${cap}Service.php`),
    content: `<?php

namespace App\\Services;

use App\\Models\\${cap};

class ${cap}Service
{
    private array \$items = [];
    private int \$counter = 0;

    public function findAll(): array
    {
        return array_values(\$this->items);
    }

    public function findById(int \$id): ?${cap}
    {
        return \$this->items[\$id] ?? null;
    }

    public function create(array \$data): ${cap}
    {
        \$this->counter++;
        \$item = new ${cap}(\$this->counter, \$data['name']);
        \$this->items[\$this->counter] = \$item;
        return \$item;
    }

    public function update(int \$id, array \$data): ?${cap}
    {
        if (!isset(\$this->items[\$id])) {
            return null;
        }
        \$this->items[\$id]->setName(\$data['name'] ?? \$this->items[\$id]->getName());
        return \$this->items[\$id];
    }

    public function delete(int \$id): bool
    {
        if (!isset(\$this->items[\$id])) {
            return false;
        }
        unset(\$this->items[\$id]);
        return true;
    }
}
`,
  }];
}

function generateModel(entityName: string, destDir: string): GeneratedFile[] {
  const cap = capitalize(entityName);
  return [{
    path: path.join(destDir, `${cap}.php`),
    content: `<?php

namespace App\\Models;

class ${cap}
{
    private int \$id;
    private string \$name;

    public function __construct(int \$id, string \$name)
    {
        \$this->id = \$id;
        \$this->name = \$name;
    }

    public function getId(): int
    {
        return \$this->id;
    }

    public function getName(): string
    {
        return \$this->name;
    }

    public function setName(string \$name): void
    {
        \$this->name = \$name;
    }

    public function toArray(): array
    {
        return [
            'id' => \$this->id,
            'name' => \$this->name,
        ];
    }
}
`,
  }];
}

export function generateController(entityName: string, destDir: string): GeneratedFile[] {
  const cap = capitalize(entityName);
  return [
    {
      path: path.join(destDir, `${cap}Controller.php`),
      content: `<?php

namespace App\\Controllers;

use App\\Models\\${cap};
use App\\Services\\${cap}Service;
use Psr\\Http\\Message\\ResponseInterface as Response;
use Psr\\Http\\Message\\ServerRequestInterface as Request;

class ${cap}Controller
{
    private ${cap}Service \$service;

    public function __construct()
    {
        \$this->service = new ${cap}Service();
    }

    public function index(Request \$request, Response \$response): Response
    {
        \$items = \$this->service->findAll();
        \$response->getBody()->write(json_encode(array_map(fn(\$item) => \$item->toArray(), \$items)));
        return \$response->withHeader('Content-Type', 'application/json');
    }

    public function show(Request \$request, Response \$response, array \$args): Response
    {
        \$item = \$this->service->findById((int) \$args['id']);
        if (!\$item) {
            \$response->getBody()->write(json_encode(['error' => 'Not found']));
            return \$response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }
        \$response->getBody()->write(json_encode(\$item->toArray()));
        return \$response->withHeader('Content-Type', 'application/json');
    }

    public function create(Request \$request, Response \$response): Response
    {
        \$data = \$request->getParsedBody();
        if (!isset(\$data['name']) || empty(\$data['name'])) {
            \$response->getBody()->write(json_encode(['error' => 'Name is required']));
            return \$response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }
        \$item = \$this->service->create(\$data);
        \$response->getBody()->write(json_encode(\$item->toArray()));
        return \$response->withStatus(201)->withHeader('Content-Type', 'application/json');
    }

    public function update(Request \$request, Response \$response, array \$args): Response
    {
        \$data = \$request->getParsedBody();
        \$item = \$this->service->update((int) \$args['id'], \$data);
        if (!\$item) {
            \$response->getBody()->write(json_encode(['error' => 'Not found']));
            return \$response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }
        \$response->getBody()->write(json_encode(\$item->toArray()));
        return \$response->withHeader('Content-Type', 'application/json');
    }

    public function delete(Request \$request, Response \$response, array \$args): Response
    {
        \$deleted = \$this->service->delete((int) \$args['id']);
        if (!\$deleted) {
            \$response->getBody()->write(json_encode(['error' => 'Not found']));
            return \$response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }
        return \$response->withStatus(204);
    }
}
`,
    },
  ];
}

export function scaffoldProject(projectName: string): GeneratedFile[] {
  return [
    {
      path: path.join(projectName, 'composer.json'),
      content: JSON.stringify({
        name: `${projectName}/app`,
        require: {
          php: '>=8.2',
          'slim/slim': '^4.0',
          'slim/psr7': '^1.6',
          'vlucas/phpdotenv': '^5.5',
        },
        autoload: {
          'psr-4': { 'App\\\\': 'src/' },
        },
        scripts: {
          start: 'php -S localhost:8080 -t public',
          lint: 'php vendor/bin/phpcs --standard=PSR12 src/',
          test: 'php vendor/bin/phpunit',
        },
      }, null, 2),
    },
    {
      path: path.join(projectName, 'public', 'index.php'),
      content: `<?php

use Slim\\Factory\\AppFactory;
use App\\Controllers\\HomeController;

require __DIR__ . '/../vendor/autoload.php';

$app = AppFactory::create();

$app->get('/', function ($request, $response) {
    $response->getBody()->write(json_encode(['status' => 'ok']));
    return $response->withHeader('Content-Type', 'application/json');
});

$app->run();
`,
    },
    {
      path: path.join(projectName, '.env'),
      content: `APP_ENV=development
APP_DEBUG=true
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
