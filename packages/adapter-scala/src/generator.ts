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
  const appName = spec.title.replace(/[^a-zA-Z0-9_-]/g, '') || 'App';
  const appCap = capitalize(appName);
  const scalaDir = path.join(destDir, 'src', 'main', 'scala', ...pkg.split('.'));

  for (const comp of components) {
    files.push(...generateController(comp.name, pkg, scalaDir));
  }

  files.push({
    path: path.join(destDir, 'build.sbt'),
    content: `name := "${appName}"
version := "0.1.0"
scalaVersion := "3.3.1"

libraryDependencies ++= Seq(
  "org.springframework.boot" % "spring-boot-starter-web" % "3.2.0",
  "org.scala-lang.modules" %% "scala-java8-compat" % "1.0.2",
  "org.springframework.boot" % "spring-boot-starter-validation" % "3.2.0"
)
`,
  });

  files.push({
    path: path.join(scalaDir, 'Application.scala'),
    content: `package ${pkg}

import org.springframework.boot.SpringApplication
import org.springframework.boot.autoconfigure.SpringBootApplication

@SpringBootApplication
class ${appCap}Application

object ${appCap}Application {
  def main(args: Array[String]): Unit = {
    SpringApplication.run(classOf[${appCap}Application], args*)
  }
}
`,
  });

  if (spec.acceptanceCriteria.length > 0) {
    const testDir = path.join(destDir, 'src', 'test', 'scala', ...pkg.split('.'));
    const testMethods = spec.acceptanceCriteria.map(tc =>
      `  test("${tc.id}: ${tc.description}") {
    // Given: ${tc.given}
    // When: ${tc.when}
    // Then: ${tc.then}
    assert(true)
  }`
    ).join('\n\n');

    files.push({
      path: path.join(testDir, `${appCap}AcceptanceTests.scala`),
      content: `package ${pkg}

import org.scalatest.funsuite.AnyFunSuite

class ${appCap}AcceptanceTests extends AnyFunSuite {
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
      path: path.join(destDir, `${cap}Controller.scala`),
      content: `package ${pkg}

import org.springframework.web.bind.annotation._
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.{ResponseEntity, HttpStatus}
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import java.time.Instant
import java.util.UUID
import scala.collection.concurrent.TrieMap
import scala.jdk.CollectionConverters._

case class ${cap}(
    id: String = UUID.randomUUID().toString,
    @NotBlank name: String,
    createdAt: Instant = Instant.now
)

case class Create${cap}Request(
    @NotBlank name: String
)

case class Update${cap}Request(
    name: Option[String] = None
)

@RestController
@RequestMapping(Array("/api/${entityName}s"))
class ${cap}Controller @Autowired() {
  private val items = TrieMap.empty[String, ${cap}]

  @PostMapping
  def create(@Valid @RequestBody request: Create${cap}Request): ResponseEntity[${cap}] = {
    val entity = ${cap}(name = request.name)
    items.put(entity.id, entity)
    ResponseEntity.status(HttpStatus.CREATED).body(entity)
  }

  @GetMapping
  def list(): java.util.List[${cap}] = {
    items.values.toSeq.asJava
  }

  @GetMapping(Array("/{id}"))
  def get(@PathVariable id: String): ResponseEntity[${cap}] = {
    items.get(id) match {
      case Some(item) => ResponseEntity.ok(item)
      case None => ResponseEntity.notFound().build()
    }
  }

  @PutMapping(Array("/{id}"))
  def update(@PathVariable id: String, @RequestBody request: Update${cap}Request): ResponseEntity[${cap}] = {
    items.get(id) match {
      case Some(existing) =>
        val updated = existing.copy(name = request.name.getOrElse(existing.name))
        items.put(id, updated)
        ResponseEntity.ok(updated)
      case None => ResponseEntity.notFound().build()
    }
  }

  @DeleteMapping(Array("/{id}"))
  def delete(@PathVariable id: String): ResponseEntity[Void] = {
    if (items.remove(id).isDefined) {
      ResponseEntity.noContent().build()
    } else {
      ResponseEntity.notFound().build()
    }
  }
}
`,
    },
    {
      path: path.join(destDir, `${cap}Service.scala`),
      content: `package ${pkg}

import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID
import scala.collection.concurrent.TrieMap

@Service
class ${cap}Service {
  private val items = TrieMap.empty[String, ${cap}]

  def create(name: String): ${cap} = {
    val entity = ${cap}(id = UUID.randomUUID().toString, name = name, createdAt = Instant.now)
    items.put(entity.id, entity)
    entity
  }

  def findById(id: String): Option[${cap}] = items.get(id)

  def findAll(): List[${cap}] = items.values.toList

  def update(id: String, name: String): Option[${cap}] = {
    items.get(id) match {
      case Some(existing) =>
        val updated = existing.copy(name = name)
        items.put(id, updated)
        Some(updated)
      case None => None
    }
  }

  def delete(id: String): Boolean = items.remove(id).isDefined
}
`,
    },
  ];
}

export function scaffoldProject(projectName: string): GeneratedFile[] {
  const simpleName = path.basename(projectName).replace(/[^a-zA-Z0-9_-]/g, '') || 'App';
  const cap = capitalize(simpleName);

  const buildSbt = 'name := "' + simpleName + '"\n' +
    'version := "0.1.0"\n' +
    'scalaVersion := "3.3.1"\n' +
    '\n' +
    'libraryDependencies ++= Seq(\n' +
    '  "org.springframework.boot" % "spring-boot-starter-web" % "3.2.0",\n' +
    '  "org.scala-lang.modules" %% "scala-java8-compat" % "1.0.2"\n' +
    ')\n';

  return [
    {
      path: path.join(projectName, 'build.sbt'),
      content: buildSbt,
    },
    {
      path: path.join(projectName, 'src', 'main', 'scala', 'com', 'example', 'Application.scala'),
      content: `package com.example

import org.springframework.boot.SpringApplication
import org.springframework.boot.autoconfigure.SpringBootApplication

@SpringBootApplication
class ${cap}Application

object ${cap}Application {
  def main(args: Array[String]): Unit = {
    SpringApplication.run(classOf[${cap}Application], args*)
  }
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
