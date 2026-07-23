import * as fs from 'fs';
import * as path from 'path';

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export function generateEntity(entityName: string, destDir: string): GeneratedFile[] {
  const cap = entityName
    .split('_')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
  const files: GeneratedFile[] = [];

  files.push({
    path: path.join(destDir, 'domain', 'entity', `${entityName}.dart`),
    content: `class ${cap} {
  final String id;
  final String name;
  final DateTime createdAt;

  const ${cap}({
    required this.id,
    required this.name,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'createdAt': createdAt.toIso8601String(),
  };

  factory ${cap}.fromJson(Map<String, dynamic> json) => ${cap}(
    id: json['id'] as String,
    name: json['name'] as String,
    createdAt: DateTime.parse(json['createdAt'] as String),
  );

  @override
  String toString() => '${cap}(id: $id, name: $name)';
}
`,
  });

  files.push({
    path: path.join(destDir, 'domain', 'repository', `${entityName}_repository.dart`),
    content: `import '../entity/${entityName}.dart';

abstract class ${cap}Repository {
  Future<${cap}> findById(String id);
  Future<List<${cap}>> findAll();
  Future<void> save(${cap} item);
  Future<void> delete(String id);
}
`,
  });

  files.push({
    path: path.join(destDir, 'infrastructure', 'handler', `${entityName}_handler.dart`),
    content: `import 'dart:io';
import 'dart:convert';
import '../../domain/entity/${entityName}.dart';

Future<void> handle${cap}Request(HttpRequest request) async {
  final response = request.response;
  response.statusCode = HttpStatus.ok;
  response.headers.contentType = ContentType.json;
  response.write(jsonEncode({'message': '${cap} endpoint ready'}));
  await response.close();
}
`,
  });

  files.push({
    path: path.join(destDir, 'application', 'usecase', `${entityName}_usecase.dart`),
    content: `import '../../domain/entity/${entityName}.dart';
import '../../domain/repository/${entityName}_repository.dart';

class ${cap}UseCase {
  final ${cap}Repository repository;

  const ${cap}UseCase(this.repository);

  Future<${cap}> execute(String id) => repository.findById(id);
}
`,
  });

  return files;
}

export function scaffoldProject(projectName: string, simpleName?: string): GeneratedFile[] {
  const pkgName = simpleName || path.basename(projectName).replace(/[^a-zA-Z0-9_-]/g, '_') || 'app';
  const cap = pkgName.charAt(0).toUpperCase() + pkgName.slice(1);
  const files: GeneratedFile[] = [];

  files.push({
    path: path.join(projectName, 'pubspec.yaml'),
    content: `name: ${pkgName}
description: IDEIA generated Dart project
version: 0.1.0

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  http: ^1.1.0

dev_dependencies:
  lints: ^3.0.0
  test: ^1.24.0
`,
  });

  files.push({
    path: path.join(projectName, 'analysis_options.yaml'),
    content: `include: package:lints/recommended.yaml

linter:
  rules:
    - prefer_const_constructors
    - avoid_print
`,
  });

  files.push({
    path: path.join(projectName, 'bin', 'main.dart'),
    content: `import 'dart:io';
import 'dart:convert';

int _parsePort(String value) {
  final parsed = int.tryParse(value);
  if (parsed == null) {
    throw ArgumentError('Invalid port: $value');
  }
  return parsed;
}

Future<void> main() async {
  final server = await HttpServer.bind(
    InternetAddress.anyIPv4,
    _parsePort(Platform.environment['PORT'] ?? '8080'),
  );

  print('Server running on port \${server.port}');

  await for (final request in server) {
    handleRequest(request);
  }
}

void handleRequest(HttpRequest request) {
  request.response
    ..statusCode = HttpStatus.ok
    ..headers.contentType = ContentType.json
    ..write(jsonEncode({'status': 'ok'}))
    ..close();
}
`,
  });

  files.push({
    path: path.join(projectName, 'lib', pkgName, `${pkgName}.dart`),
    content: `library ${pkgName};

export 'src/${pkgName}_base.dart';
`,
  });

  files.push({
    path: path.join(projectName, 'lib', pkgName, 'src', `${pkgName}_base.dart`),
    content: `class ${cap}Base {
  final String name;

  const ${cap}Base(this.name);

  @override
  String toString() => '${cap}Base(name: $name)';
}
`,
  });

  return files;
}

export function writeFiles(files: GeneratedFile[]): void {
  for (const file of files) {
    const dir = path.dirname(file.path);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file.path, file.content, 'utf-8');
  }
}
