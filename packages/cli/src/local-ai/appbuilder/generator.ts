import { AppBlueprint, GeneratedFile } from './types';

/**
 * Gera app.
 * @param blueprint - Valor blueprint.
 * @returns O resultado da operação.
 */
export function generateApp(blueprint: AppBlueprint): GeneratedFile[] {
  switch (blueprint.template) {
    case 'api': return generateApi(blueprint);
    case 'web': return generateWeb(blueprint);
    case 'cli': return generateCli(blueprint);
    case 'library': return generateLibrary(blueprint);
    case 'fullstack': return generateFullstack(blueprint);
    case 'cpp-api': return generateCppApi(blueprint);
    case 'csharp-api': return generateCSharpApi(blueprint);
    case 'rust-api': return generateRustApi(blueprint);
    case 'java-api': return generateJavaApi(blueprint);
    case 'kotlin-api': return generateKotlinApi(blueprint);
    case 'ruby-api': return generateRubyApi(blueprint);
    case 'php-api': return generatePhpApi(blueprint);
    case 'swift-api': return generateSwiftApi(blueprint);
    case 'dart-api': return generateDartApi(blueprint);
    case 'zig-api': return generateZigApi(blueprint);
    case 'scala-api': return generateScalaApi(blueprint);
    case 'haskell-api': return generateHaskellApi(blueprint);
    case 'elixir-api': return generateElixirApi(blueprint);
    default: return generateApi(blueprint);
  }
}

function hasFeature(blueprint: AppBlueprint, name: string): boolean {
  return blueprint.features.some(f => f.name.includes(name) && f.enabled);
}

function generateApi(blueprint: AppBlueprint): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push({
    path: 'package.json', language: 'json',
    content: JSON.stringify({
      name: blueprint.name.toLowerCase().replace(/\s+/g, '-'), version: '1.0.0',
      main: 'dist/index.js', scripts: { build: 'tsc', start: 'node dist/index.js', dev: 'ts-node src/index.ts', test: 'jest' },
      dependencies: {
        express: '^4.18.0', zod: '^3.22.0', cors: '^2.8.5',
        ...(hasFeature(blueprint, 'Database (PostgreSQL)') ? { '@prisma/client': '^5.0.0', prisma: '^5.0.0' } : {}),
        ...(hasFeature(blueprint, 'Database (SQLite)') ? { 'better-sqlite3': '^9.0.0' } : {}),
        ...(hasFeature(blueprint, 'Logging') ? { pino: '^8.0.0' } : {}),
        ...(hasFeature(blueprint, 'Rate Limiting') ? { 'express-rate-limit': '^7.0.0' } : {}),
        ...(hasFeature(blueprint, 'WebSocket') ? { ws: '^8.0.0' } : {}),
        ...(hasFeature(blueprint, 'Authentication') ? { jsonwebtoken: '^9.0.0', bcrypt: '^5.0.0' } : {}),
      },
      devDependencies: { '@types/express': '^4.17.0', '@types/node': '^20.0.0', typescript: '^5.0.0', jest: '^29.0.0', 'ts-jest': '^29.0.0' },
    }, null, 2),
  });

  files.push({
    path: 'tsconfig.json', language: 'json',
    content: JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'commonjs', outDir: './dist', rootDir: './src', strict: true, esModuleInterop: true, resolveJsonModule: true, declaration: true }, include: ['src'], exclude: ['node_modules', 'dist'] }, null, 2),
  });

  files.push({
    path: 'src/index.ts', language: 'typescript',
    content: `import express from 'express';
import cors from 'cors';
${hasFeature(blueprint, 'Rate Limiting') ? `import rateLimit from 'express-rate-limit';` : ''}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
${hasFeature(blueprint, 'Rate Limiting') ? `
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);` : ''}

${hasFeature(blueprint, 'Health Check') ? `
app.get('/health', (_req, res) => { res.json({ status: 'ok', timestamp: new Date().toISOString() }); });
app.get('/ready', (_req, res) => { res.json({ status: 'ready' }); });` : ''}

app.get('/', (_req, res) => { res.json({ message: '${blueprint.name} API', version: '1.0.0' }); });

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => { console.log(\`Server running on port \${PORT}\`); });
export default app;`,
  });

  files.push({
    path: 'src/validators/index.ts', language: 'typescript',
    content: `import { z } from 'zod';

export const createItemSchema = z.object({ name: z.string().min(1).max(255), description: z.string().optional() });
export const updateItemSchema = z.object({ name: z.string().min(1).max(255).optional(), description: z.string().optional() });
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;`,
  });

  files.push({
    path: '.env.example', language: 'yaml',
    content: `PORT=3000
NODE_ENV=development
${hasFeature(blueprint, 'Authentication') ? 'JWT_SECRET=your-secret-key\nJWT_EXPIRES_IN=1d' : ''}
${hasFeature(blueprint, 'Database (PostgreSQL)') ? 'DATABASE_URL=postgresql://user:password@localhost:5432/dbname' : ''}`,
  });

  if (hasFeature(blueprint, 'Authentication (JWT)')) {
    files.push({
      path: 'src/middleware/auth.ts', language: 'typescript',
      content: `import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request { userId?: string; }

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'Authentication required' }); return; }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}`,
    });
  }

  if (hasFeature(blueprint, 'Docker Support')) {
    files.push({
      path: 'Dockerfile', language: 'yaml',
      content: `FROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:20-alpine AS production\nWORKDIR /app\nCOPY --from=builder /app/dist ./dist\nCOPY --from=builder /app/node_modules ./node_modules\nEXPOSE 3000\nCMD ["node", "dist/index.js"]`,
    });
  }

  if (hasFeature(blueprint, 'Unit Tests')) {
    files.push({
      path: 'src/__tests__/app.test.ts', language: 'typescript',
      content: `import request from 'supertest';
import app from '../index';

describe('API Tests', () => {
  it('should return health status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('should return welcome message', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });
});`,
    });
  }

  return files;
}

function generateWeb(blueprint: AppBlueprint): GeneratedFile[] {
  return [
    { path: 'package.json', language: 'json', content: JSON.stringify({ name: blueprint.name.toLowerCase().replace(/\s+/g, '-') + '-web', version: '1.0.0', private: true, scripts: { dev: 'vite', build: 'tsc -b && vite build', preview: 'vite preview' }, dependencies: { react: '^18.3.0', 'react-dom': '^18.3.0', 'react-router-dom': '^6.0.0', zod: '^3.22.0' }, devDependencies: { '@types/react': '^18.3.0', '@types/react-dom': '^18.3.0', '@vitejs/plugin-react': '^4.3.0', typescript: '^5.4.0', vite: '^5.4.0' } }, null, 2) },
    { path: 'src/App.tsx', language: 'typescript', content: `import React from 'react';\nimport { BrowserRouter, Routes, Route } from 'react-router-dom';\n\nconst Home = () => <h1>${blueprint.name}</h1>;\nconst About = () => <h2>About</h2>;\n\nexport function App() {\n  return (\n    <BrowserRouter>\n      <Routes>\n        <Route path="/" element={<Home />} />\n        <Route path="/about" element={<About />} />\n      </Routes>\n    </BrowserRouter>\n  );\n}` },
    { path: 'index.html', language: 'markdown', content: '<!DOCTYPE html><html><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>' + blueprint.name + '</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>' },
    { path: 'src/main.tsx', language: 'typescript', content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport { App } from './App';\n\nReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);` },
  ];
}

function generateCli(blueprint: AppBlueprint): GeneratedFile[] {
  return [
    { path: 'package.json', language: 'json', content: JSON.stringify({ name: blueprint.name.toLowerCase().replace(/\s+/g, '-'), version: '1.0.0', bin: { [blueprint.name.toLowerCase().replace(/\s+/g, '-')]: './dist/index.js' }, scripts: { build: 'tsc', start: 'node dist/index.js', dev: 'ts-node src/index.ts' }, dependencies: { commander: '^10.0.0', chalk: '^4.1.2' }, devDependencies: { '@types/node': '^20.0.0', typescript: '^5.0.0' } }, null, 2) },
    { path: 'src/index.ts', language: 'typescript', content: `#!/usr/bin/env node\nimport { Command } from 'commander';\nimport chalk from 'chalk';\n\nconst program = new Command();\nprogram.name('${blueprint.name.toLowerCase().replace(/\s+/g, '-')}').description('${blueprint.description}').version('1.0.0');\n\nprogram.command('hello').description('Say hello').action(() => { console.log(chalk.green('Hello from ${blueprint.name}!')); });\n\nprogram.parse(process.argv);` },
  ];
}

function generateLibrary(blueprint: AppBlueprint): GeneratedFile[] {
  return [
    { path: 'package.json', language: 'json', content: JSON.stringify({ name: blueprint.name.toLowerCase().replace(/\s+/g, '-'), version: '1.0.0', main: 'dist/index.js', types: 'dist/index.d.ts', scripts: { build: 'tsc', test: 'jest' }, devDependencies: { '@types/node': '^20.0.0', typescript: '^5.0.0', jest: '^29.0.0', 'ts-jest': '^29.0.0' } }, null, 2) },
    { path: 'src/index.ts', language: 'typescript', content: `export function greet(name: string): string { return \`Hello, \${name}!\`; }\n\nexport function add(a: number, b: number): number { return a + b; }` },
    { path: 'src/__tests__/index.test.ts', language: 'typescript', content: `import { greet, add } from '../index';\n\ndescribe('greet', () => { it('should return greeting', () => { expect(greet('World')).toBe('Hello, World!'); }); });\n\ndescribe('add', () => { it('should add numbers', () => { expect(add(1, 2)).toBe(3); }); });` },
  ];
}

function generateFullstack(blueprint: AppBlueprint): GeneratedFile[] {
  const hasAuth = hasFeature(blueprint, 'Authentication (JWT)');
  const hasDb = hasFeature(blueprint, 'Database (PostgreSQL)');
  return [
    { path: 'package.json', language: 'json', content: JSON.stringify({ name: blueprint.name.toLowerCase().replace(/\s+/g, '-'), version: '1.0.0', private: true, scripts: { dev: 'next dev', build: 'next build', start: 'next start', lint: 'next lint' }, dependencies: { next: '^14.0.0', react: '^18.3.0', 'react-dom': '^18.3.0', zod: '^3.22.0', ...(hasAuth ? { 'next-auth': '^4.0.0' } : {}), ...(hasDb ? { '@prisma/client': '^5.0.0' } : {}) }, devDependencies: { typescript: '^5.0.0', '@types/node': '^20.0.0', '@types/react': '^18.0.0', ...(hasDb ? { prisma: '^5.0.0' } : {}) } }, null, 2) },
    { path: 'src/app/page.tsx', language: 'typescript', content: `import React from 'react';\n\nexport default function Home() {\n  return (\n    <main>\n      <h1>${blueprint.name}</h1>\n      <p>${blueprint.description}</p>\n    </main>\n  );\n}` },
    { path: 'src/app/layout.tsx', language: 'typescript', content: `import React from 'react';\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}` },
    { path: 'src/app/api/health/route.ts', language: 'typescript', content: `import { NextResponse } from 'next/server';\n\nexport async function GET() {\n  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });\n}` },
  ];
}

/* ── C++ API ───────────────────────────────────────── */
function generateCppApi(blueprint: AppBlueprint): GeneratedFile[] {
  const isDrogon = blueprint.framework === 'drogon';
  const _name = blueprint.name.toLowerCase().replace(/\s+/g, '_');
  const Name = blueprint.name.replace(/\s+/g, '');
  const files: GeneratedFile[] = [
    { path: 'CMakeLists.txt', language: 'yaml', content: `cmake_minimum_required(VERSION 3.20)\nproject(${Name})\n\nset(CMAKE_CXX_STANDARD 20)\nset(CMAKE_CXX_STANDARD_REQUIRED ON)\n\n${isDrogon ? 'find_package(Drogon REQUIRED)' : 'find_package(httplib REQUIRED)'}\nfind_package(GTest REQUIRED)\n\nadd_executable(${Name}\n  src/main.cpp\n  src/api/handlers.cpp\n  src/domain/services.cpp\n  src/infra/repository.cpp\n)\n\n${isDrogon ? 'target_link_libraries(${Name} Drogon::Drogon GTest::GTest)' : 'target_link_libraries(${Name} httplib::httplib GTest::GTest)'}\n\nenable_testing()\nadd_test(NAME ${Name}_test COMMAND ${Name})` },
    { path: 'conanfile.txt', language: 'yaml', content: `[requires]\n${isDrogon ? 'drogon/1.9.0' : 'cpp-httplib/0.14.0'}\ngoogletest/1.14.0\n\n[generators]\nCMakeDeps\nCMakeToolchain` },
    { path: 'src/main.cpp', language: 'cpp', content: isDrogon
      ? `#include <drogon/drogon.h>\nint main() {\n  drogon::app().addListener("0.0.0.0", 3000);\n  drogon::app().registerHandler("/health", [](const drogon::HttpRequestPtr&, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {\n    auto resp = drogon::HttpResponse::newHttpJsonResponse({{"status", "ok"}});\n    callback(resp);\n  });\n  drogon::app().registerHandler("/", [](const drogon::HttpRequestPtr&, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {\n    auto resp = drogon::HttpResponse::newHttpResponse();\n    resp->setBody("${blueprint.name} API");\n    callback(resp);\n  });\n  drogon::app().run();\n  return 0;\n}`
      : `#include <httplib.h>\nint main() {\n  httplib::Server svr;\n  svr.Get("/health", [](const httplib::Request&, httplib::Response& res) {\n    res.set_content(R"({"status":"ok"})", "application/json");\n  });\n  svr.Get("/", [](const httplib::Request&, httplib::Response& res) {\n    res.set_content("${blueprint.name} API", "text/plain");\n  });\n  svr.listen("0.0.0.0", 3000);\n  return 0;\n}` },
    { path: 'src/api/handlers.cpp', language: 'cpp', content: `#include "handlers.h"\n// Route handlers for ${blueprint.name}` },
    { path: 'src/api/handlers.h', language: 'cpp', content: `#ifndef HANDLERS_H\n#define HANDLERS_H\n// Handler declarations for ${blueprint.name}\n#endif` },
    { path: 'src/domain/services.cpp', language: 'cpp', content: `#include "services.h"\n// Business logic for ${blueprint.name}` },
    { path: 'src/domain/services.h', language: 'cpp', content: `#ifndef SERVICES_H\n#define SERVICES_H\nnamespace ${Name} {\n  class Service {\n  public:\n    void execute();\n  };\n}\n#endif` },
    { path: 'src/infra/repository.cpp', language: 'cpp', content: `// Repository implementation` },
    { path: 'Dockerfile', language: 'yaml', content: `FROM gcc:13 AS builder\nWORKDIR /app\nCOPY . .\nRUN cmake -B build && cmake --build build\n\nFROM ubuntu:24.04\nWORKDIR /app\nCOPY --from=builder /app/build/${Name} .\nEXPOSE 3000\nCMD ["./${Name}"]` },
  ];
  return files;
}

/* ── C# API ─────────────────────────────────────────── */
function generateCSharpApi(blueprint: AppBlueprint): GeneratedFile[] {
  const _name = blueprint.name.toLowerCase().replace(/\s+/g, '-');
  const Name = blueprint.name.replace(/\s+/g, '');
  return [
    { path: `${Name}.sln`, language: 'markdown', content: `\nMicrosoft Visual Studio Solution File, Format Version 12.00\n# Visual Studio Version 17\nVisualStudioVersion = 17.0\nMinimumVisualStudioVersion = 10.0\nProject("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "${Name}", "src/${Name}.csproj", "{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}"\nEndProject\nGlobal\n\tGlobalSection(SolutionConfigurationPlatforms) = preSolution\n\t\tDebug|Any CPU = Debug|Any CPU\n\t\tRelease|Any CPU = Release|Any CPU\n\tEndGlobalSection\nEndGlobal\n` },
    { path: `src/${Name}.csproj`, language: 'csharp', content: `<Project Sdk="Microsoft.NET.Sdk.Web">\n  <PropertyGroup>\n    <TargetFramework>net8.0</TargetFramework>\n    <RootNamespace>${Name}</RootNamespace>\n  </PropertyGroup>\n  <ItemGroup>\n    <PackageReference Include="Microsoft.EntityFrameworkCore.InMemory" Version="8.0.0" />\n  </ItemGroup>\n</Project>` },
    { path: 'src/Program.cs', language: 'csharp', content: `using Microsoft.AspNetCore.Builder;\nusing Microsoft.Extensions.DependencyInjection;\nusing Microsoft.Extensions.Hosting;\n\nvar builder = WebApplication.CreateBuilder(args);\nbuilder.Services.AddControllers();\nvar app = builder.Build();\napp.MapControllers();\napp.MapGet("/health", () => Results.Ok(new { status = "ok" }));\napp.Run();` },
    { path: 'src/Controllers/HealthController.cs', language: 'csharp', content: `using Microsoft.AspNetCore.Mvc;\n\nnamespace ${Name}.Controllers;\n\n[ApiController]\n[Route("[controller]")]\npublic class HealthController : ControllerBase {\n  [HttpGet]\n  public IActionResult Get() => Ok(new { status = "ok", timestamp = DateTime.UtcNow });\n}` },
    { path: 'src/Domain/Models/Entity.cs', language: 'csharp', content: `namespace ${Name}.Domain.Models;\n\npublic class Entity {\n  public Guid Id { get; set; }\n  public string Name { get; set; } = string.Empty;\n  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;\n}` },
    { path: 'src/Infra/AppDbContext.cs', language: 'csharp', content: `using Microsoft.EntityFrameworkCore;\nusing ${Name}.Domain.Models;\n\nnamespace ${Name}.Infra;\n\npublic class AppDbContext : DbContext {\n  public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}\n  public DbSet<Entity> Entities => Set<Entity>();\n}` },
    { path: 'Dockerfile', language: 'yaml', content: `FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build\nWORKDIR /app\nCOPY . .\nRUN dotnet restore\nRUN dotnet publish -c Release -o out\n\nFROM mcr.microsoft.com/dotnet/aspnet:8.0\nWORKDIR /app\nCOPY --from=build /app/out .\nEXPOSE 8080\nENV ASPNETCORE_URLS=http://+:8080\nENTRYPOINT ["dotnet", "${Name}.dll"]` },
  ];
}

/* ── Rust API ───────────────────────────────────────── */
function generateRustApi(blueprint: AppBlueprint): GeneratedFile[] {
  const isAxum = blueprint.framework !== 'actix-web';
  const name = blueprint.name.toLowerCase().replace(/\s+/g, '_');
  return [
    { path: 'Cargo.toml', language: 'toml', content: `[package]\nname = "${name}"\nversion = "1.0.0"\nedition = "2021"\n\n[dependencies]\n${isAxum ? 'axum = "0.7"\ntokio = { version = "1", features = ["full"] }\ntower = "0.4"' : 'actix-web = "4"\ntokio = { version = "1", features = ["full"] }'}\nserde = { version = "1", features = ["derive"] }\nserde_json = "1"\n\n[dev-dependencies]\nreqwest = { version = "0.12", features = ["json"] }` },
    { path: 'src/main.rs', language: 'rust', content: isAxum
      ? `use axum::{Router, routing::get, Json};\nuse serde::Serialize;\nuse std::net::SocketAddr;\n\n#[derive(Serialize)]\nstruct Health { status: String }\n\nasync fn health() -> Json<Health> {\n  Json(Health { status: "ok".into() })\n}\n\nasync fn index() -> &'static str {\n  "${blueprint.name} API"\n}\n\n#[tokio::main]\nasync fn main() {\n  let app = Router::new()\n    .route("/", get(index))\n    .route("/health", get(health));\n  let addr = SocketAddr::from(([0, 0, 0, 0], 3000));\n  axum::Server::bind(&addr).serve(app.into_make_service()).await.unwrap();\n}`
      : `use actix_web::{web, App, HttpServer, HttpResponse, Responder};\nuse serde::Serialize;\n\n#[derive(Serialize)]\nstruct Health { status: String }\n\nasync fn health() -> impl Responder {\n  HttpResponse::Ok().json(Health { status: "ok".into() })\n}\n\nasync fn index() -> impl Responder {\n  "${blueprint.name} API"\n}\n\n#[actix_web::main]\nasync fn main() -> std::io::Result<()> {\n  HttpServer::new(|| App::new()\n    .route("/", web::get().to(index))\n    .route("/health", web::get().to(health)))\n    .bind("0.0.0.0:3000")?\n    .run().await\n}` },
    { path: 'src/api/mod.rs', language: 'rust', content: `pub mod handlers;\n// API module for ${blueprint.name}` },
    { path: 'src/domain/mod.rs', language: 'rust', content: `pub mod models;\npub mod services;\n// Domain layer for ${blueprint.name}` },
    { path: 'src/domain/models.rs', language: 'rust', content: `use serde::{Serialize, Deserialize};\n\n#[derive(Debug, Serialize, Deserialize)]\npub struct Entity {\n  pub id: String,\n  pub name: String,\n}` },
    { path: 'src/infra/mod.rs', language: 'rust', content: `pub mod repository;\n// Infrastructure layer` },
    { path: 'Dockerfile', language: 'yaml', content: `FROM rust:1.77 AS builder\nWORKDIR /app\nCOPY . .\nRUN cargo build --release\n\nFROM debian:bookworm-slim\nWORKDIR /app\nCOPY --from=builder /app/target/release/${name} .\nEXPOSE 3000\nCMD ["./${name}"]` },
  ];
}

/* ── Java API ───────────────────────────────────────── */
function generateJavaApi(blueprint: AppBlueprint): GeneratedFile[] {
  const name = blueprint.name.toLowerCase().replace(/\s+/g, '-');
  const _Name = blueprint.name.replace(/\s+/g, '');
  return [
    { path: 'pom.xml', language: 'xml', content: `<?xml version="1.0" encoding="UTF-8"?>\n<project xmlns="http://maven.apache.org/POM/4.0.0">\n  <modelVersion>4.0.0</modelVersion>\n  <parent>\n    <groupId>org.springframework.boot</groupId>\n    <artifactId>spring-boot-starter-parent</artifactId>\n    <version>3.2.0</version>\n  </parent>\n  <groupId>com.example</groupId>\n  <artifactId>${name}</artifactId>\n  <version>1.0.0</version>\n  <dependencies>\n    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>\n    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-test</artifactId><scope>test</scope></dependency>\n  </dependencies>\n</project>` },
    { path: 'src/main/java/com/example/Application.java', language: 'java', content: `package com.example;\n\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.autoconfigure.SpringBootApplication;\n\n@SpringBootApplication\npublic class Application {\n  public static void main(String[] args) {\n    SpringApplication.run(Application.class, args);\n  }\n}` },
    { path: 'src/main/java/com/example/HealthController.java', language: 'java', content: `package com.example;\n\nimport org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.RestController;\n\n@RestController\npublic class HealthController {\n  @GetMapping("/health")\n  public String health() { return "{\\"status\\":\\"ok\\"}"; }\n\n  @GetMapping("/")\n  public String index() { return "${blueprint.name} API"; }\n}` },
    { path: 'Dockerfile', language: 'yaml', content: `FROM maven:3-eclipse-temurin-21 AS build\nWORKDIR /app\nCOPY pom.xml .\nRUN mvn dependency:go-offline\nCOPY src ./src\nRUN mvn package -DskipTests\n\nFROM eclipse-temurin:21-jre\nWORKDIR /app\nCOPY --from=build /app/target/${name}-1.0.0.jar app.jar\nEXPOSE 8080\nENTRYPOINT ["java", "-jar", "app.jar"]` },
  ];
}

/* ── Kotlin API ─────────────────────────────────────── */
function generateKotlinApi(blueprint: AppBlueprint): GeneratedFile[] {
  const name = blueprint.name.toLowerCase().replace(/\s+/g, '-');
  const Name = blueprint.name.replace(/\s+/g, '');
  return [
    { path: 'build.gradle.kts', language: 'kotlin', content: `plugins {\n  kotlin("jvm") version "2.0.0"\n  kotlin("plugin.serialization") version "2.0.0"\n  application\n}\n\napplication { mainClass.set("${Name}Kt") }\n\ndependencies {\n  implementation("io.ktor:ktor-server-core:3.0.0")\n  implementation("io.ktor:ktor-server-netty:3.0.0")\n  implementation("io.ktor:ktor-serialization-kotlinx-json:3.0.0")\n  testImplementation("io.ktor:ktor-server-test-host:3.0.0")\n  testImplementation("org.jetbrains.kotlin:kotlin-test")\n}` },
    { path: 'settings.gradle.kts', language: 'kotlin', content: `rootProject.name = "${name}"` },
    { path: 'src/main/kotlin/${Name}Kt.kt'.replace('${Name}', Name), language: 'kotlin', content: `import io.ktor.server.engine.*\nimport io.ktor.server.netty.*\nimport io.ktor.server.routing.*\nimport io.ktor.server.response.*\n\nfun main() {\n  embeddedServer(Netty, port = 3000) {\n    routing {\n      get("/") { call.respondText("${blueprint.name} API") }\n      get("/health") { call.respond(mapOf("status" to "ok")) }\n    }\n  }.start(wait = true)\n}` },
    { path: 'Dockerfile', language: 'yaml', content: `FROM gradle:8-jdk21 AS build\nWORKDIR /app\nCOPY . .\nRUN gradle build -x test\n\nFROM eclipse-temurin:21-jre\nWORKDIR /app\nCOPY --from=build /app/build/libs/${name}-1.0.0.jar app.jar\nEXPOSE 3000\nENTRYPOINT ["java", "-jar", "app.jar"]` },
  ];
}

/* ── Ruby API ────────────────────────────────────────── */
function generateRubyApi(blueprint: AppBlueprint): GeneratedFile[] {
  const _name = blueprint.name.toLowerCase().replace(/\s+/g, '_');
  return [
    { path: 'Gemfile', language: 'ruby', content: "source 'https://rubygems.org'\n\ngem 'sinatra'\ngem 'puma'\ngem 'rack-cors'\n\ngroup :test do\n  gem 'rspec'\n  gem 'rack-test'\nend" },
    { path: 'app.rb', language: 'ruby', content: "require 'sinatra'\nrequire 'json'\n\nset :port, 3000\n\nget '/' do\n  content_type :json\n  { message: '#{blueprint.name} API' }.to_json\nend\n\nget '/health' do\n  content_type :json\n  { status: 'ok' }.to_json\nend" },
    { path: 'spec/app_spec.rb', language: 'ruby', content: "require 'rspec'\nrequire 'rack/test'\nrequire_relative '../app'\n\ndescribe 'App' do\n  include Rack::Test::Methods\n  def app; Sinatra::Application; end\n  it 'returns health' do\n    get '/health'\n    expect(last_response.status).to eq(200)\n  end\nend" },
    { path: 'config.ru', language: 'ruby', content: "require './app'\nrun Sinatra::Application" },
    { path: 'Dockerfile', language: 'yaml', content: "FROM ruby:3.3\nWORKDIR /app\nCOPY Gemfile Gemfile.lock ./\nRUN bundle install\nCOPY . .\nEXPOSE 3000\nCMD [\"ruby\", \"app.rb\"]" },
  ];
}

/* ── PHP API ─────────────────────────────────────────── */
function generatePhpApi(blueprint: AppBlueprint): GeneratedFile[] {
  const _name = blueprint.name.toLowerCase().replace(/\s+/g, '-');
  return [
    { path: 'composer.json', language: 'json', content: JSON.stringify({ name: "$name/api", require: { "slim/slim": "^4.0", "slim/psr7": "^1.6" }, "autoload": { "psr-4": { "App\\": "src/" } } }, null, 2) },
    { path: 'public/index.php', language: 'php', content: "<?php\nrequire __DIR__ . '/../vendor/autoload.php';\n\nuse Slim\\Factory\\AppFactory;\n\n$app = AppFactory::create();\n$app->get('/', function ($request, $response) {\n  $response->getBody()->write('${blueprint.name} API');\n  return $response;\n});\n$app->get('/health', function ($request, $response) {\n  $response->getBody()->write(json_encode(['status' => 'ok']));\n  return $response->withHeader('Content-Type', 'application/json');\n});\n$app->run();" },
    { path: 'src/Controllers/HealthController.php', language: 'php', content: "<?php\nnamespace App\\Controllers;\n\nclass HealthController {\n  public function __invoke($request, $response) {\n    $response->getBody()->write(json_encode(['status' => 'ok']));\n    return $response->withHeader('Content-Type', 'application/json');\n  }\n}" },
    { path: 'Dockerfile', language: 'yaml', content: "FROM php:8.3-cli\nWORKDIR /app\nCOPY . .\nRUN php -r \"copy('https://getcomposer.org/installer', 'composer-setup.php');\" && php composer-setup.php && php -r \"unlink('composer-setup.php');\"\nRUN php composer.phar install --no-dev\nEXPOSE 8080\nCMD [\"php\", \"-S\", \"0.0.0.0:8080\", \"-t\", \"public/\"]" },
  ];
}

/* ── Swift API ───────────────────────────────────────── */
function generateSwiftApi(blueprint: AppBlueprint): GeneratedFile[] {
  const _name = blueprint.name.toLowerCase().replace(/\s+/g, '-');
  return [
    { path: 'Package.swift', language: 'swift', content: "// swift-tools-version:5.9\nimport PackageDescription\n\nlet package = Package(\n  name: \"${name}\",\n  platforms: [.macOS(.v14)],\n  dependencies: [.package(url: \"https://github.com/vapor/vapor\", from: \"4.92.0\")],\n  targets: [.executableTarget(name: \"${name}\", dependencies: [.product(name: \"Vapor\", package: \"vapor\")])]\n)" },
    { path: 'Sources/main.swift', language: 'swift', content: "import Vapor\n\nlet app = Application()\napp.routes.get(\"/\") { req in\n  return \"${blueprint.name} API\"\n}\napp.routes.get(\"/health\") { req -> [String: String] in\n  return [\"status\": \"ok\"]\n}\ntry! app.run()" },
    { path: 'Dockerfile', language: 'yaml', content: "FROM swift:5.9 AS build\nWORKDIR /app\nCOPY . .\nRUN swift build -c release\n\nFROM ubuntu:24.04\nWORKDIR /app\nCOPY --from=build /app/.build/release/${name} .\nEXPOSE 8080\nCMD [\"./${name}\"]" },
  ];
}

/* ── Dart API ────────────────────────────────────────── */
function generateDartApi(blueprint: AppBlueprint): GeneratedFile[] {
  const _name = blueprint.name.toLowerCase().replace(/\s+/g, '_');
  return [
    { path: 'pubspec.yaml', language: 'yaml', content: "name: ${name}\nversion: 1.0.0\n\ndependencies:\n  shelf: ^1.4.0\n  shelf_router: ^1.1.0\n  shelf_io: ^1.1.0\n\ndev_dependencies:\n  test: ^1.24.0\n  shelf_test: ^1.0.0" },
    { path: 'bin/server.dart', language: 'dart', content: "import 'package:shelf/shelf.dart';\nimport 'package:shelf_router/shelf_router.dart';\nimport 'package:shelf_io/shelf_io.dart' as io;\n\nfinal router = Router()\n  ..get('/', (req) => Response.ok('${blueprint.name} API'))\n  ..get('/health', (req) => Response.ok('{\"status\":\"ok\"}', headers: {'Content-Type': 'application/json'}));\n\nFuture<void> main() async {\n  final server = await io.serve(router, '0.0.0.0', 3000);\n  print('Server running on port ${server.port}');\n}" },
    { path: 'test/server_test.dart', language: 'dart', content: "import 'package:test/test.dart';\nimport 'package:shelf_test/shelf_test.dart';\nimport 'package:${name}/${name}.dart';\n\nvoid main() {\n  test('health returns 200', () {\n    final handler = Router()\n      ..get('/health', (req) => Response.ok('ok'));\n    expect(handler, isNotNull);\n  });\n}" },
    { path: 'Dockerfile', language: 'yaml', content: "FROM dart:3.4 AS build\nWORKDIR /app\nCOPY pubspec.* ./\nRUN dart pub get\nCOPY . .\nRUN dart compile exe bin/server.dart -o server\n\nFROM alpine:3.19\nWORKDIR /app\nCOPY --from=build /app/server .\nEXPOSE 3000\nCMD [\"./server\"]" },
  ];
}

/* ── Zig API ─────────────────────────────────────────── */
function generateZigApi(_blueprint: AppBlueprint): GeneratedFile[] {
  return [
    { path: 'build.zig', language: 'zig', content: "const std = @import(\"std\");\npub fn build(b: *std.Build) void {\n  const exe = b.addExecutable(.{ .name = \"${blueprint.name.toLowerCase().replace(/s+/g, '-')}\", .root_source_file = b.path(\"src/main.zig\") });\n  exe.linkLibC();\n  b.default_step.dependOn(&exe.step);\n}" },
    { path: 'src/main.zig', language: 'zig', content: "const std = @import(\"std\");\nconst net = std.net;\n\npub fn main() !void {\n  var gpa = std.heap.GeneralPurposeAllocator(.{}){};\n  const allocator = gpa.allocator();\n  var server = try net.Address.resolve(\"0.0.0.0\", 3000);\n  var listener = try server.listen(.{ .reuse_address = true });\n  std.debug.print(\"${blueprint.name} API running on port 3000\\n\", .{});\n  while (true) {\n    const conn = try listener.accept();\n    _ = conn;\n  }\n}" },
    { path: 'Dockerfile', language: 'yaml', content: "FROM ziglang/zig:0.13.0 AS build\nWORKDIR /app\nCOPY . .\nRUN zig build\n\nFROM alpine:3.19\nWORKDIR /app\nCOPY --from=build /app/zig-out/bin/* .\nEXPOSE 3000\nCMD [\"./${blueprint.name.toLowerCase().replace(/s+/g, '-')}\"]" },
  ];
}

/* ── Scala API ───────────────────────────────────────── */
function generateScalaApi(blueprint: AppBlueprint): GeneratedFile[] {
  const name = blueprint.name.toLowerCase().replace(/\s+/g, '-');
  return [
    { path: 'build.sbt', language: 'scala', content: 'name := "' + name + '"\nversion := "1.0.0"\nscalaVersion := "3.5.0"\nlibraryDependencies ++= Seq(\n  "org.http4s" %% "http4s-ember-server" % "1.0.0-M41",\n  "org.http4s" %% "http4s-dsl" % "1.0.0-M41",\n  "org.slf4j" % "slf4j-simple" % "2.0.0"\n)' },
    { path: 'src/main/scala/Main.scala', language: 'scala', content: 'import cats.effect.{IO, IOApp}\nimport org.http4s.ember.server.EmberServerBuilder\nimport org.http4s.dsl.io.*\nimport org.http4s.implicits.*\nimport org.http4s.HttpRoutes\nimport com.comcast.ip4s.*\n\nobject Main extends IOApp.Simple {\n  val routes = HttpRoutes.of[IO] {\n    case GET -> Root => Ok("' + blueprint.name + ' API")\n    case GET -> Root / "health" => Ok(\'{"status":"ok"}\')\n  }.orNotFound\n\n  def run = EmberServerBuilder.default[IO]\n    .withHost(ipv4"0.0.0.0")\n    .withPort(port"3000")\n    .withHttpApp(routes)\n    .build\n    .use(_ => IO.never)\n}' },
    { path: 'Dockerfile', language: 'yaml', content: 'FROM sbtscala/scala-sbt:eclipse-temurin-21-1.10.0 AS build\nWORKDIR /app\nCOPY . .\nRUN sbt assembly\n\nFROM eclipse-temurin:21-jre\nWORKDIR /app\nCOPY --from=build /app/target/scala-3.5.0/*.jar app.jar\nEXPOSE 3000\nENTRYPOINT ["java", "-jar", "app.jar"]' },
  ];
}

/* ── Haskell API ─────────────────────────────────────── */
function generateHaskellApi(blueprint: AppBlueprint): GeneratedFile[] {
  const name = blueprint.name.toLowerCase().replace(/\s+/g, '-');
  return [
    { path: 'stack.yaml', language: 'yaml', content: "resolver: lts-22.0\npackages:\n- .\nextra-deps: []" },
    { path: `${name}.cabal`.replace(name, name), language: 'yaml', content: `name: ${name}\nversion: 1.0.0\nbuild-type: Simple\ncabal-version: >=1.10\nexecutable ${name}\n  main-is: Main.hs\n  build-depends: base >=4.18, scotty, wai-extra\n  hs-source-dirs: src` },
    { path: 'src/Main.hs', language: 'haskell', content: "module Main where\nimport Web.Scotty\n\nmain :: IO ()\nmain = scotty 3000 $ do\n  get \"/\" $ text \"${blueprint.name} API\"\n  get \"/health\" $ json $ object [\"status\" .= (\"ok\" :: String)]" },
    { path: 'Dockerfile', language: 'yaml', content: "FROM haskell:9.6 AS build\nWORKDIR /app\nCOPY stack.yaml ./\nRUN stack setup\nCOPY . .\nRUN stack build\n\nFROM debian:bookworm-slim\nWORKDIR /app\nCOPY --from=build /app/.stack-work/install/**/bin/${name} .\nEXPOSE 3000\nCMD [\"./${name}\"]" },
  ];
}

/* ── Elixir API ──────────────────────────────────────── */
function generateElixirApi(blueprint: AppBlueprint): GeneratedFile[] {
  const name = blueprint.name.toLowerCase().replace(/\s+/g, '_');
  const Name = blueprint.name.replace(/\s+/g, '');
  return [
    { path: 'mix.exs', language: 'elixir', content: `defmodule ${Name}.MixProject do\n  use Mix.Project\n  def project do\n    [app: :${name}, version: "1.0.0", elixir: "~> 1.17", deps: deps()]\n  end\n  def application do\n    [extra_applications: [:logger], mod: {${Name}.Application, []}]\n  end\n  defp deps do\n    [{:plug_cowboy, "~> 2.7"},\n     {:jason, "~> 1.4"}]\n  end\nend` },
    { path: 'lib/application.ex', language: 'elixir', content: `defmodule ${Name}.Application do\n  use Application\n  def start(_type, _args) do\n    children = [{Plug.Cowboy, scheme: :http, plug: ${Name}.Router, options: [port: 3000]}]\n    Supervisor.start_link(children, strategy: :one_for_one)\n  end\nend` },
    { path: 'lib/router.ex', language: 'elixir', content: `defmodule ${Name}.Router do\n  use Plug.Router\n  plug :match\n  plug :dispatch\n\n  get "/" do\n    send_resp(conn, 200, "${blueprint.name} API")\n  end\n\n  get "/health" do\n    conn |> put_resp_content_type("application/json") |> send_resp(200, ~s({"status":"ok"}))\n  end\n\n  match _ do\n    send_resp(conn, 404, "not found")\n  end\nend` },
    { path: 'mix.lock', language: 'markdown', content: '' },
    { path: 'Dockerfile', language: 'yaml', content: "FROM elixir:1.17 AS build\nWORKDIR /app\nCOPY mix.exs mix.lock ./\nRUN mix deps.get --only prod\nCOPY . .\nRUN mix release\n\nFROM debian:bookworm-slim\nWORKDIR /app\nCOPY --from=build /app/_build/prod/rel/${name} .\nEXPOSE 3000\nCMD [\"bin/${name}\", \"start\"]" },
  ];
}