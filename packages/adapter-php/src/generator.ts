import * as fs from 'fs';
import * as path from 'path';

export interface GeneratedFile { path: string; content: string }

export function generateController(entityName: string, destDir: string): GeneratedFile[] {
  const cap = entityName.charAt(0).toUpperCase() + entityName.slice(1);
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
    private ${cap}Service $service;

    public function __construct(${cap}Service $service)
    {
        $this->service = $service;
    }

    public function index(Request $request, Response $response): Response
    {
        $items = $this->service->findAll();
        $response->getBody()->write(json_encode($items));
        return $response->withHeader('Content-Type', 'application/json');
    }

    public function show(Request $request, Response $response, array $args): Response
    {
        $item = $this->service->findById((int) $args['id']);
        if (!$item) {
            $response->getBody()->write(json_encode(['error' => 'Not found']));
            return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
        }
        $response->getBody()->write(json_encode($item));
        return $response->withHeader('Content-Type', 'application/json');
    }

    public function create(Request $request, Response $response): Response
    {
        $data = $request->getParsedBody();
        $item = $this->service->create($data);
        $response->getBody()->write(json_encode($item));
        return $response->withStatus(201)->withHeader('Content-Type', 'application/json');
    }
}
`,
    },
    {
      path: path.join(destDir, `${cap}Service.php`),
      content: `<?php

namespace App\\Services;

use App\\Models\\${cap};

class ${cap}Service
{
    private array $items = [];
    private int $counter = 0;

    public function findAll(): array
    {
        return array_values($this->items);
    }

    public function findById(int $id): ?${cap}
    {
        return $this->items[$id] ?? null;
    }

    public function create(array $data): ${cap}
    {
        $this->counter++;
        $item = new ${cap}($this->counter, $data['name']);
        $this->items[$this->counter] = $item;
        return $item;
    }
}
`,
    },
    {
      path: path.join(destDir, `${cap}.php`),
      content: `<?php

namespace App\\Models;

class ${cap}
{
    public int $id;
    public string $name;

    public function __construct(int $id, string $name)
    {
        $this->id = $id;
        $this->name = $name;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
        ];
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
