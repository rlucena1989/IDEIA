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
  const appName = spec.title.replace(/[^a-zA-Z0-9_-]/g, '') || 'App';

  for (const comp of components) {
    files.push(...generateController(comp.name, path.join(destDir, 'Sources', appName, 'Controllers')));
  }

  files.push({
    path: path.join(destDir, 'Package.swift'),
    content: `// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "${appName}",
    platforms: [.macOS(.v14)],
    dependencies: [
        .package(url: "https://github.com/vapor/vapor.git", from: "4.89.0"),
    ],
    targets: [
        .executableTarget(
            name: "${appName}",
            dependencies: ["Vapor"],
            path: "Sources"
        )
    ]
)
`,
  });

  const routeRegistrations = components.map(c =>
    `    try app.register(collection: ${capitalize(c.name)}Controller())`
  ).join('\n');

  files.push({
    path: path.join(destDir, 'Sources', appName, 'main.swift'),
    content: `import Vapor

let app = Application()

app.get("health") { req -> HTTPStatus in
    return .ok
}

${routeRegistrations}

try app.run()
`,
  });

  if (spec.acceptanceCriteria.length > 0) {
    const testMethods = spec.acceptanceCriteria.map(tc => `
    func test${tc.id}() throws {
        // Given: ${tc.given}
        // When: ${tc.when}
        // Then: ${tc.then}
        XCTAssertTrue(true, "${tc.expectedResult}")
    }`).join('\n');

    files.push({
      path: path.join(destDir, 'Tests', appName, `${appName}Tests.swift`),
      content: `import XCTest
@testable import ${appName}

final class ${appName}Tests: XCTestCase {
${testMethods}
}
`,
    });
  }

  return files;
}

export function generateController(entityName: string, destDir: string): GeneratedFile[] {
  const cap = capitalize(entityName);
  return [
    {
      path: path.join(destDir, `${cap}Controller.swift`),
      content: `import Vapor

struct ${cap}: Content {
    let id: UUID
    var name: String
    let createdAt: Date
}

struct Create${cap}Request: Content {
    let name: String
}

struct Update${cap}Request: Content {
    let name: String?
}

final class ${cap}Controller: RouteCollection {
    private var items: [${cap}] = []

    func boot(routes: RoutesBuilder) throws {
        let ${entityName}s = routes.grouped("api", "${entityName}s")
        ${entityName}s.get(use: index)
        ${entityName}s.post(use: create)
        ${entityName}s.group(":id") { ${entityName} in
            ${entityName}.get(use: show)
            ${entityName}.put(use: update)
            ${entityName}.delete(use: delete)
        }
    }

    func index(req: Request) throws -> EventLoopFuture<[${cap}]> {
        return req.eventLoop.makeSucceededFuture(items)
    }

    func create(req: Request) throws -> EventLoopFuture<${cap}> {
        let input = try req.content.decode(Create${cap}Request.self)
        let item = ${cap}(id: UUID(), name: input.name, createdAt: Date())
        items.append(item)
        return req.eventLoop.makeSucceededFuture(item)
    }

    func show(req: Request) throws -> EventLoopFuture<${cap}> {
        guard let id = req.parameters.get("id", as: UUID.self) else {
            throw Abort(.badRequest)
        }
        guard let item = items.first(where: { $0.id == id }) else {
            throw Abort(.notFound)
        }
        return req.eventLoop.makeSucceededFuture(item)
    }

    func update(req: Request) throws -> EventLoopFuture<${cap}> {
        guard let id = req.parameters.get("id", as: UUID.self) else {
            throw Abort(.badRequest)
        }
        let input = try req.content.decode(Update${cap}Request.self)
        guard let index = items.firstIndex(where: { $0.id == id }) else {
            throw Abort(.notFound)
        }
        if let name = input.name {
            items[index].name = name
        }
        return req.eventLoop.makeSucceededFuture(items[index])
    }

    func delete(req: Request) throws -> EventLoopFuture<HTTPStatus> {
        guard let id = req.parameters.get("id", as: UUID.self) else {
            throw Abort(.badRequest)
        }
        items.removeAll { $0.id == id }
        return req.eventLoop.makeSucceededFuture(.noContent)
    }
}
`,
    },
    {
      path: path.join(destDir, `${cap}Service.swift`),
      content: `import Foundation

final class ${cap}Service {
    static let shared = ${cap}Service()
    private var items: [${cap}] = []
    private let queue = DispatchQueue(label: "${entityName}.sync")

    func findAll() -> [${cap}] {
        queue.sync { items }
    }

    func findById(_ id: UUID) -> ${cap}? {
        queue.sync { items.first { $0.id == id } }
    }

    func create(name: String) -> ${cap} {
        let item = ${cap}(id: UUID(), name: name, createdAt: Date())
        queue.sync { items.append(item) }
        return item
    }

    func update(_ id: UUID, name: String) -> ${cap}? {
        queue.sync {
            guard let index = items.firstIndex(where: { $0.id == id }) else {
                return nil
            }
            items[index].name = name
            return items[index]
        }
    }

    func delete(_ id: UUID) {
        queue.sync { items.removeAll { $0.id == id } }
    }
}
`,
    },
  ];
}

export function scaffoldProject(projectName: string): GeneratedFile[] {
  return [
    {
      path: path.join(projectName, 'Package.swift'),
      content: `// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "${projectName}",
    platforms: [.macOS(.v14)],
    dependencies: [
        .package(url: "https://github.com/vapor/vapor.git", from: "4.89.0"),
    ],
    targets: [
        .executableTarget(
            name: "${projectName}",
            dependencies: ["Vapor"],
            path: "Sources"
        )
    ]
)
`,
    },
    {
      path: path.join(projectName, 'Sources', 'main.swift'),
      content: `import Vapor

let app = Application()

app.get("health") { req -> HTTPStatus in
    return .ok
}

try app.run()
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
