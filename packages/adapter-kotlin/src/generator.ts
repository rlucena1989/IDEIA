import * as fs from 'fs';
import * as path from 'path';

export interface GeneratedFile { path: string; content: string }

export function generateController(entityName: string, pkg: string, destDir: string): GeneratedFile[] {
  const cap = entityName.charAt(0).toUpperCase() + entityName.slice(1);
  return [
    {
      path: path.join(destDir, `${cap}Controller.kt`),
      content: `package ${pkg}

import org.springframework.web.bind.annotation.*
import org.springframework.http.ResponseEntity
import org.springframework.http.HttpStatus
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

data class ${cap}(val id: String = UUID.randomUUID().toString(), val name: String, val createdAt: Instant = Instant.now())

@RestController
@RequestMapping("/api/${entityName}s")
class ${cap}Controller {
    private val items = ConcurrentHashMap<String, ${cap}>()

    @PostMapping
    fun create(@RequestBody item: ${cap}): ResponseEntity<${cap}> {
        val entity = item.copy(id = UUID.randomUUID().toString())
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

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: String): ResponseEntity<Void> {
        items.remove(id)
        return ResponseEntity.noContent().build()
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
        val entity = ${cap}(id = UUID.randomUUID().toString(), name = name, createdAt = Instant.now())
        items[entity.id] = entity
        return entity
    }

    fun findById(id: String): ${cap}? = items[id]

    fun findAll(): List<${cap}> = items.values.toList()

    fun delete(id: String): Boolean = items.remove(id) != null
}
`,
    },
  ];
}

export function scaffoldProject(projectName: string): GeneratedFile[] {
  const cap = projectName.charAt(0).toUpperCase() + projectName.slice(1);
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
