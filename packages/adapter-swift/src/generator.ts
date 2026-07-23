import * as fs from 'fs';
import * as path from 'path';

export interface GeneratedFile { path: string; content: string }

export function generateController(entityName: string, destDir: string): GeneratedFile[] {
  const cap = entityName.charAt(0).toUpperCase() + entityName.slice(1);
  return [
    {
      path: path.join(destDir, `${cap}Controller.swift`),
      content: `import Vapor

struct ${cap}: Content {
    let id: UUID
    var name: String
    let createdAt: Date
}

final class ${cap}Controller: RouteCollection {
    private var items: [${cap}] = []
    private var counter = 0

    func boot(routes: RoutesBuilder) throws {
        let ${entityName}s = routes.grouped("api", "${entityName}s")
        ${entityName}s.get(use: index)
        ${entityName}s.post(use: create)
        ${entityName}s.group(":id") { ${entityName} in
            ${entityName}.get(use: show)
            ${entityName}.delete(use: delete)
        }
    }

    func index(req: Request) throws -> EventLoopFuture<[${cap}]> {
        return req.eventLoop.makeSucceededFuture(items)
    }

    func create(req: Request) throws -> EventLoopFuture<${cap}> {
        let input = try req.content.decode(${cap}.self)
        counter += 1
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
