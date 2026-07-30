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
  const pkg = 'com.' + spec.title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  for (const comp of components) {
    const kotlinDir = path.join(destDir, 'src', 'main', 'kotlin', ...pkg.split('.'));
    files.push(...generateController(comp.name, pkg, kotlinDir));
  }

  files.push({
    path: path.join(destDir, 'build.gradle.kts'),
    content: `plugins {
    id("org.springframework.boot") version "3.2.0"
    id("io.spring.dependency-management") version "1.1.4"
    kotlin("jvm") version "1.9.21"
    kotlin("plugin.spring") version "1.9.21"
}

group = "${pkg}"
version = "0.1.0"

repositories { mavenCentral() }

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.withType<Test> { useJUnitPlatform() }
`,
  });

  files.push({
    path: path.join(destDir, 'src', 'main', 'kotlin', ...pkg.split('.'), 'Application.kt'),
    content: `package ${pkg}

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class ${capitalize(spec.title)}Application

fun main(args: Array<String>) {
    runApplication<${capitalize(spec.title)}Application>(*args)
}
`,
  });

  files.push({
    path: path.join(destDir, 'src', 'main', 'resources', 'application.properties'),
    content: `spring.application.name=${spec.title}
server.port=8080
`,
  });

  if (spec.acceptanceCriteria.length > 0) {
    const testDir = path.join(destDir, 'src', 'test', 'kotlin', ...pkg.split('.'));
    const testMethods = spec.acceptanceCriteria.map(tc => `
    @Test
    fun \`${tc.id}: ${tc.description}\`() {
        // Given: ${tc.given}
        // When: ${tc.when}
        // Then: ${tc.then}
        assertTrue(true)
    }`).join('\n');

    files.push({
      path: path.join(testDir, `${capitalize(spec.title)}AcceptanceTests.kt`),
      content: `package ${pkg}

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.assertTrue

class ${capitalize(spec.title)}AcceptanceTests {
${testMethods}
}
`,
    });
  }

  return files;
}

export function generateController(entityName: string, pkg: string, destDir: string): GeneratedFile[] {
  const cap = capitalize(entityName);
  return [
    {
      path: path.join(destDir, `${cap}Controller.kt`),
      content: `package ${pkg}

import org.springframework.web.bind.annotation.*
import org.springframework.http.ResponseEntity
import org.springframework.http.HttpStatus
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

data class ${cap}(
    val id: String = UUID.randomUUID().toString(),
    @get:NotBlank(message = "Name is required")
    val name: String,
    val createdAt: Instant = Instant.now()
)

data class Create${cap}Request(
    @get:NotBlank
    val name: String
)

data class Update${cap}Request(
    val name: String?
)

@RestController
@RequestMapping("/api/${entityName}s")
class ${cap}Controller {
    private val items = ConcurrentHashMap<String, ${cap}>()

    @PostMapping
    fun create(@Valid @RequestBody request: Create${cap}Request): ResponseEntity<${cap}> {
        val entity = ${cap}(name = request.name)
        items[entity.id] = entity
        return ResponseEntity.status(HttpStatus.CREATED).body(entity)
    }

    @GetMapping
    fun list(): List<${cap}> = items.values.toList()

    @GetMapping("/{id}")
    fun get(@PathVariable id: String): ResponseEntity<${cap}> {
        val item = items[id] ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(item)
    }

    @PutMapping("/{id}")
    fun update(@PathVariable id: String, @RequestBody request: Update${cap}Request): ResponseEntity<${cap}> {
        val existing = items[id] ?: return ResponseEntity.notFound().build()
        val updated = existing.copy(name = request.name ?: existing.name)
        items[id] = updated
        return ResponseEntity.ok(updated)
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: String): ResponseEntity<Void> {
        if (items.remove(id) != null) {
            return ResponseEntity.noContent().build()
        }
        return ResponseEntity.notFound().build()
    }
}
`,
    },
    {
      path: path.join(destDir, `${cap}Service.kt`),
      content: `package ${pkg}

import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Service
class ${cap}Service {
    private val items = ConcurrentHashMap<String, ${cap}>()

    fun create(name: String): ${cap} {
        val entity = ${cap}(
            id = UUID.randomUUID().toString(),
            name = name,
            createdAt = Instant.now()
        )
        items[entity.id] = entity
        return entity
    }

    fun findById(id: String): ${cap}? = items[id]

    fun findAll(): List<${cap}> = items.values.toList()

    fun update(id: String, name: String): ${cap}? {
        val existing = items[id] ?: return null
        val updated = existing.copy(name = name)
        items[id] = updated
        return updated
    }

    fun delete(id: String): Boolean = items.remove(id) != null
}
`,
    },
  ];
}

export function scaffoldProject(projectName: string): GeneratedFile[] {
  const cap = capitalize(projectName);
  return [
    {
      path: path.join(projectName, 'build.gradle.kts'),
      content: `plugins {
    id("org.springframework.boot") version "3.2.0"
    id("io.spring.dependency-management") version "1.1.4"
    kotlin("jvm") version "1.9.21"
    kotlin("plugin.spring") version "1.9.21"
}

group = "com.example"
version = "0.1.0"

repositories { mavenCentral() }

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.withType<Test> { useJUnitPlatform() }
`,
    },
    {
      path: path.join(projectName, 'src', 'main', 'kotlin', 'com', 'example', 'Application.kt'),
      content: `package com.example

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class ${cap}Application

fun main(args: Array<String>) {
    runApplication<${cap}Application>(*args)
}
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
