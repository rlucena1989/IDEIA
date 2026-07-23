import * as fs from 'fs';
import * as path from 'path';

export interface GeneratedFile {
  path: string;
  content: string;
}

export function generateController(packageName: string, entityName: string, destDir: string): GeneratedFile[] {
  const cap = entityName.charAt(0).toUpperCase() + entityName.slice(1);
  const pkg = packageName.replace(/\//g, '.');
  const files: GeneratedFile[] = [];

  files.push({
    path: path.join(destDir, `${cap}Controller.java`),
    content: `package ${pkg};

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/${entityName}s")
public class ${cap}Controller {

    private final List<${cap}> items = new ArrayList<>();
    private long counter = 0;

    @PostMapping
    public ${cap} create(@RequestBody ${cap} item) {
        counter++;
        ${cap} entity = new ${cap}(counter, item.name());
        items.add(entity);
        return entity;
    }

    @GetMapping
    public List<${cap}> list() {
        return items;
    }

    @GetMapping("/{id}")
    public ${cap} get(@PathVariable long id) {
        return items.stream()
            .filter(i -> i.id() == id)
            .findFirst()
            .orElseThrow(() -> new RuntimeException("Not found"));
    }
}
`,
  });

  files.push({
    path: path.join(destDir, `${cap}.java`),
    content: `package ${pkg};

public record ${cap}(long id, String name) {
}
`,
  });

  return files;
}

export function generateMainApp(packageName: string): string {
  const pkg = packageName.replace(/\//g, '.');
  const mainClass = packageName.split('/').pop() || 'Application';
  const cap = mainClass.charAt(0).toUpperCase() + mainClass.slice(1);

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
  const appCap = appName.charAt(0).toUpperCase() + appName.slice(1);
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
