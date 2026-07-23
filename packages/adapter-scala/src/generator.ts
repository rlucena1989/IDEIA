import * as fs from 'fs';
import * as path from 'path';

export interface GeneratedFile { path: string; content: string }

export function generateController(entityName: string, pkg: string, destDir: string): GeneratedFile[] {
  const cap = entityName.charAt(0).toUpperCase() + entityName.slice(1);
  return [
    {
      path: path.join(destDir, `${cap}Controller.scala`),
      content: `package ${pkg}

import org.springframework.web.bind.annotation._
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.{ResponseEntity, HttpStatus}
import java.time.Instant
import java.util.UUID
import scala.collection.concurrent.TrieMap

case class ${cap}(id: String = UUID.randomUUID().toString, name: String, createdAt: Instant = Instant.now)

@RestController
@RequestMapping(Array("/api/${entityName}s"))
class ${cap}Controller @Autowired() {
  private val items = TrieMap.empty[String, ${cap}]

  @PostMapping
  def create(@RequestBody item: ${cap}): ResponseEntity[${cap}] = {
    val entity = item.copy(id = UUID.randomUUID().toString)
    items.put(entity.id, entity)
    ResponseEntity.status(HttpStatus.CREATED).body(entity)
  }

  @GetMapping
  def list(): java.util.List[${cap}] = {
    import scala.jdk.CollectionConverters._
    items.values.toSeq.asJava
  }

  @GetMapping(Array("/{id}"))
  def get(@PathVariable id: String): ResponseEntity[${cap}] = {
    items.get(id) match {
      case Some(item) => ResponseEntity.ok(item)
      case None => ResponseEntity.notFound().build()
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

  def delete(id: String): Boolean = items.remove(id).isDefined
}
`,
    },
  ];
}

export function scaffoldProject(projectName: string): GeneratedFile[] {
  const simpleName = path.basename(projectName).replace(/[^a-zA-Z0-9_-]/g, '') || 'App';
  const cap = simpleName.charAt(0).toUpperCase() + simpleName.slice(1);

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
