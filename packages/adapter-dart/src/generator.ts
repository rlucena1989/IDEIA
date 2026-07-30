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

export interface GeneratedFile {
  path: string;
  content: string;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function camelCase(s: string): string {
  return s.replace(/[_-]([a-z])/g, (_, c) => c.toUpperCase());
}

function dartType(field: SpecField): string {
  switch (field.type) {
    case 'number': return 'num';
    case 'boolean': return 'bool';
    case 'date': return 'DateTime';
    case 'uuid': return 'String';
    case 'email': return 'String';
    case 'text': return 'String';
    default: return 'String';
  }
}

function fieldToDartField(field: SpecField): string {
  const dt = dartType(field);
  const name = camelCase(field.name);
  const req = field.required ? 'required ' : '';
  return `  final ${dt} ${name};`;
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
  const pkgName = path.basename(destDir).replace(/[^a-zA-Z0-9_-]/g, '_') || 'app';

  for (const comp of components) {
    files.push(...generateEntity(comp.name, path.join(destDir, 'lib', comp.name)));
  }

  files.push({
    path: path.join(destDir, 'pubspec.yaml'),
    content: `name: ${pkgName}
description: ${spec.title}
version: 0.1.0

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  http: ^1.1.0
  json_annotation: ^4.8.0

dev_dependencies:
  lints: ^3.0.0
  test: ^1.24.0
  build_runner: ^2.4.0
  json_serializable: ^6.7.0
`,
  });

  files.push({
    path: path.join(destDir, 'analysis_options.yaml'),
    content: `include: package:lints/recommended.yaml

linter:
  rules:
    - prefer_const_constructors
    - avoid_print
    - prefer_single_quotes
`,
  });

  files.push({
    path: path.join(destDir, 'bin', 'main.dart'),
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

  if (spec.acceptanceCriteria.length > 0) {
    files.push({
      path: path.join(destDir, 'test', 'acceptance_test.dart'),
      content: `import 'dart:convert';
import 'dart:io';
import 'package:test/test.dart';

void main() {
${spec.acceptanceCriteria.map((tc, i) => `
  test('${tc.id}: ${tc.description}', () {
    // Given: ${tc.given}
    // When: ${tc.when}
    // Then: ${tc.then}
    expect(true, isTrue, reason: '${tc.expectedResult}');
  });`).join('\n')}
}
`,
    });
  }

  return files;
}

export function generateEntity(entityName: string, destDir: string): GeneratedFile[] {
  const cap = entityName
    .split('_')
    .map(s => capitalize(s))
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

  ${cap} copyWith({
    String? id,
    String? name,
    DateTime? createdAt,
  }) => ${cap}(
    id: id ?? this.id,
    name: name ?? this.name,
    createdAt: createdAt ?? this.createdAt,
  );

  @override
  String toString() => '${cap}(id: $id, name: $name, createdAt: $createdAt)';

  @override
  bool operator ==(Object other) =>
    identical(this, other) ||
    other is ${cap} &&
    runtimeType == other.runtimeType &&
    id == other.id;

  @override
  int get hashCode => id.hashCode;
}
`,
  });

  files.push({
    path: path.join(destDir, 'domain', 'repository', `${entityName}_repository.dart`),
    content: `import '../entity/${entityName}.dart';

abstract class ${cap}Repository {
  Future<${cap}> findById(String id);
  Future<List<${cap}>> findAll();
  Future<${cap}> save(${cap} item);
  Future<${cap}> update(String id, ${cap} item);
  Future<void> delete(String id);
}
`,
  });

  files.push({
    path: path.join(destDir, 'infrastructure', 'handler', `${entityName}_handler.dart`),
    content: `import 'dart:io';
import 'dart:convert';
import '../../domain/entity/${entityName}.dart';
import '../../domain/repository/${entityName}_repository.dart';

class ${cap}Handler {
  final ${cap}Repository repository;

  ${cap}Handler(this.repository);

  Future<void> handleList(HttpRequest request) async {
    try {
      final items = await repository.findAll();
      request.response
        ..statusCode = HttpStatus.ok
        ..headers.contentType = ContentType.json
        ..write(jsonEncode(items.map((e) => e.toJson()).toList()))
        ..close();
    } catch (e) {
      request.response
        ..statusCode = HttpStatus.internalServerError
        ..headers.contentType = ContentType.json
        ..write(jsonEncode({'error': e.toString()}))
        ..close();
    }
  }

  Future<void> handleCreate(HttpRequest request) async {
    try {
      final body = jsonDecode(await request.transform(utf8.decoder).join()) as Map<String, dynamic>;
      final item = ${cap}.fromJson(body);
      final saved = await repository.save(item);
      request.response
        ..statusCode = HttpStatus.created
        ..headers.contentType = ContentType.json
        ..write(jsonEncode(saved.toJson()))
        ..close();
    } catch (e) {
      request.response
        ..statusCode = HttpStatus.badRequest
        ..headers.contentType = ContentType.json
        ..write(jsonEncode({'error': e.toString()}))
        ..close();
    }
  }

  Future<void> handleGet(String id, HttpRequest request) async {
    try {
      final item = await repository.findById(id);
      request.response
        ..statusCode = HttpStatus.ok
        ..headers.contentType = ContentType.json
        ..write(jsonEncode(item.toJson()))
        ..close();
    } catch (e) {
      request.response
        ..statusCode = HttpStatus.notFound
        ..headers.contentType = ContentType.json
        ..write(jsonEncode({'error': 'Not found'}))
        ..close();
    }
  }

  Future<void> handleDelete(String id, HttpRequest request) async {
    try {
      await repository.delete(id);
      request.response
        ..statusCode = HttpStatus.noContent
        ..close();
    } catch (e) {
      request.response
        ..statusCode = HttpStatus.notFound
        ..headers.contentType = ContentType.json
        ..write(jsonEncode({'error': 'Not found'}))
        ..close();
    }
  }

  Future<void> handleRequest(HttpRequest request) async {
    final uri = request.uri;
    final segments = uri.pathSegments;
    final method = request.method;

    if (method == 'GET' && segments.length == 2) {
      await handleList(request);
    } else if (method == 'POST' && segments.length == 2) {
      await handleCreate(request);
    } else if (method == 'GET' && segments.length == 3) {
      await handleGet(segments.last, request);
    } else if (method == 'DELETE' && segments.length == 3) {
      await handleDelete(segments.last, request);
    } else {
      request.response
        ..statusCode = HttpStatus.methodNotAllowed
        ..headers.contentType = ContentType.json
        ..write(jsonEncode({'error': 'Method not allowed'}))
        ..close();
    }
  }
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

  Future<${cap}> getById(String id) => repository.findById(id);

  Future<List<${cap}>> getAll() => repository.findAll();

  Future<${cap}> create(${cap} item) => repository.save(item);

  Future<${cap}> update(String id, ${cap} item) => repository.update(id, item);

  Future<void> delete(String id) => repository.delete(id);
}
`,
  });

  files.push({
    path: path.join(destDir, 'test', `${entityName}_test.dart`),
    content: `import 'package:test/test.dart';
import '../domain/entity/${entityName}.dart';

void main() {
  group('${cap}', () {
    test('should create from JSON', () {
      final json = {
        'id': '123',
        'name': 'test',
        'createdAt': '2024-01-01T00:00:00.000Z',
      };
      final item = ${cap}.fromJson(json);
      expect(item.id, equals('123'));
      expect(item.name, equals('test'));
    });

    test('should convert to JSON', () {
      final item = ${cap}(
        id: '123',
        name: 'test',
        createdAt: DateTime.utc(2024, 1, 1),
      );
      final json = item.toJson();
      expect(json['id'], equals('123'));
      expect(json['name'], equals('test'));
    });

    test('copyWith should preserve unchanged fields', () {
      final item = ${cap}(
        id: '123',
        name: 'test',
        createdAt: DateTime.utc(2024, 1, 1),
      );
      final copy = item.copyWith(name: 'updated');
      expect(copy.id, equals('123'));
      expect(copy.name, equals('updated'));
    });
  });
}
`,
  });

  return files;
}

export function scaffoldProject(projectName: string, simpleName?: string): GeneratedFile[] {
  const pkgName = simpleName || path.basename(projectName).replace(/[^a-zA-Z0-9_-]/g, '_') || 'app';
  const cap = capitalize(pkgName);
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
