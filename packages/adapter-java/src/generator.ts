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

function javaType(field: SpecField): string {
  switch (field.type) {
    case 'number': return 'double';
    case 'boolean': return 'boolean';
    case 'date': return 'LocalDateTime';
    case 'uuid': return 'UUID';
    case 'email': return 'String';
    case 'text': return 'String';
    default: return 'String';
  }
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
  const groupId = 'com.' + spec.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const appName = spec.title.replace(/[^a-zA-Z0-9_-]/g, '') || 'App';
  const appCap = capitalize(appName);

  for (const comp of components) {
    const pkgDir = groupId.replace(/\./g, '/') + '/' + appName;
    files.push(...generateController(groupId + '/' + appName, comp.name, path.join(destDir, 'src', 'main', 'java', pkgDir, 'controller')));
    files.push(...generateService(groupId + '/' + appName, comp.name, path.join(destDir, 'src', 'main', 'java', pkgDir, 'service')));
    files.push(...generateRepositoryInterface(groupId + '/' + appName, comp.name, path.join(destDir, 'src', 'main', 'java', pkgDir, 'repository')));
  }

  files.push({
    path: path.join(destDir, 'pom.xml'),
    content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
    </parent>
    <groupId>${groupId}</groupId>
    <artifactId>${spec.title}</artifactId>
    <version>0.1.0</version>
    <name>${spec.title}</name>
    <properties>
        <java.version>21</java.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>`,
  });

  const pkg = groupId + '.' + appName;
  const srcMain = path.join(destDir, 'src', 'main', 'java', ...groupId.split('.'), appName);

  files.push({
    path: path.join(srcMain, `${appCap}Application.java`),
    content: generateMainApp(groupId + '/' + appName),
  });

  files.push({
    path: path.join(destDir, 'src', 'main', 'resources', 'application.properties'),
    content: `spring.application.name=${appName}
server.port=8080
`,
  });

  if (spec.acceptanceCriteria.length > 0) {
    const testSrc = path.join(destDir, 'src', 'test', 'java', ...groupId.split('.'), appName);
    const testMethods = spec.acceptanceCriteria.map(tc => `
    @Test
    void ${tc.id}() {
        // Given: ${tc.given}
        // When: ${tc.when}
        // Then: ${tc.then}
        assertTrue(true, "${tc.expectedResult}");
    }`).join('\n');

    files.push({
      path: path.join(testSrc, `${appCap}AcceptanceTests.java`),
      content: `package ${pkg};

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ${appCap}AcceptanceTests {
${testMethods}
}
`,
    });
  }

  return files;
}

function generateService(packageName: string, entityName: string, destDir: string): GeneratedFile[] {
  const cap = capitalize(entityName);
  const pkg = packageName.replace(/\//g, '.');
  return [{
    path: path.join(destDir, `${cap}Service.java`),
    content: `package ${pkg};

import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.time.LocalDateTime;

@Service
public class ${cap}Service {

    private final List<${cap}> items = new ArrayList<>();

    public ${cap} create(${cap} item) {
        ${cap} entity = new ${cap}(UUID.randomUUID(), item.name(), LocalDateTime.now());
        items.add(entity);
        return entity;
    }

    public List<${cap}> findAll() {
        return new ArrayList<>(items);
    }

    public Optional<${cap}> findById(UUID id) {
        return items.stream()
            .filter(i -> i.id().equals(id))
            .findFirst();
    }

    public Optional<${cap}> update(UUID id, ${cap} item) {
        for (int i = 0; i < items.size(); i++) {
            if (items.get(i).id().equals(id)) {
                ${cap} updated = new ${cap}(id, item.name(), items.get(i).createdAt());
                items.set(i, updated);
                return Optional.of(updated);
            }
        }
        return Optional.empty();
    }

    public boolean delete(UUID id) {
        return items.removeIf(i -> i.id().equals(id));
    }
}
`,
  }];
}

function generateRepositoryInterface(packageName: string, entityName: string, destDir: string): GeneratedFile[] {
  const cap = capitalize(entityName);
  const pkg = packageName.replace(/\//g, '.');
  return [{
    path: path.join(destDir, `${cap}Repository.java`),
    content: `package ${pkg};

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ${cap}Repository {
    ${cap} save(${cap} item);
    List<${cap}> findAll();
    Optional<${cap}> findById(UUID id);
    Optional<${cap}> update(UUID id, ${cap} item);
    boolean delete(UUID id);
}
`,
  }];
}

export function generateController(packageName: string, entityName: string, destDir: string): GeneratedFile[] {
  const cap = capitalize(entityName);
  const pkg = packageName.replace(/\//g, '.');
  const files: GeneratedFile[] = [];

  files.push({
    path: path.join(destDir, `${cap}Controller.java`),
    content: `package ${pkg};

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/${entityName.toLowerCase()}s")
public class ${cap}Controller {

    private final ${cap}Service ${entityName.toLowerCase()}Service;

    public ${cap}Controller(${cap}Service ${entityName.toLowerCase()}Service) {
        this.${entityName.toLowerCase()}Service = ${entityName.toLowerCase()}Service;
    }

    @PostMapping
    public ResponseEntity<${cap}> create(@Valid @RequestBody ${cap} item) {
        ${cap} entity = ${entityName.toLowerCase()}Service.create(item);
        return ResponseEntity.status(HttpStatus.CREATED).body(entity);
    }

    @GetMapping
    public List<${cap}> list() {
        return ${entityName.toLowerCase()}Service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<${cap}> get(@PathVariable UUID id) {
        return ${entityName.toLowerCase()}Service.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<${cap}> update(@PathVariable UUID id, @Valid @RequestBody ${cap} item) {
        return ${entityName.toLowerCase()}Service.update(id, item)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        if (${entityName.toLowerCase()}Service.delete(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
`,
  });

  files.push({
    path: path.join(destDir, `${cap}.java`),
    content: `package ${pkg};

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.UUID;

public record ${cap}(
    UUID id,
    @NotBlank(message = "Name is required") String name,
    LocalDateTime createdAt
) {
}
`,
  });

  return files;
}

export function generateMainApp(packageName: string): string {
  const pkg = packageName.replace(/\//g, '.');
  const mainClass = packageName.split('/').pop() || 'Application';
  const cap = capitalize(mainClass);

  return `package ${pkg};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ${cap}Application {

    public static void main(String[] args) {
        SpringApplication.run(${cap}Application.class, args);
    }
}
`;
}

export function scaffoldProject(projectName: string, groupId?: string, simpleName?: string): GeneratedFile[] {
  const gid = groupId || 'com.example';
  const appName = simpleName || projectName.replace(/[^a-zA-Z0-9_-]/g, '') || 'App';
  const appCap = capitalize(appName);
  const files: GeneratedFile[] = [];

  const pomContent = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
    </parent>
    <groupId>${gid}</groupId>
    <artifactId>${projectName}</artifactId>
    <version>0.1.0</version>
    <name>${projectName}</name>
    <properties>
        <java.version>21</java.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>`;

  files.push({
    path: path.join(projectName, 'pom.xml'),
    content: pomContent,
  });

  const srcMain = path.join(projectName, 'src', 'main', 'java', ...gid.split('.'));
  const srcTest = path.join(projectName, 'src', 'test', 'java', ...gid.split('.'));

  files.push({
    path: path.join(srcMain, `${appCap}Application.java`),
    content: generateMainApp(gid + '/' + appName),
  });

  files.push({
    path: path.join(srcTest, `${appCap}ApplicationTests.java`),
    content: `package ${gid}.${appName};

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ${appCap}ApplicationTests {

    @Test
    void contextLoads() {
    }
}
`,
  });

  files.push({
    path: path.join(projectName, 'src', 'main', 'resources', 'application.properties'),
    content: `spring.application.name=${appName}
server.port=8080
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
