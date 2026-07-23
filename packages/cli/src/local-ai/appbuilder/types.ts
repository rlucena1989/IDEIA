/** Tipo que define app template. */
export type AppTemplate = 'api' | 'web' | 'cli' | 'library' | 'fullstack'
  | 'cpp-api' | 'csharp-api' | 'rust-api'
  | 'java-api' | 'kotlin-api' | 'ruby-api' | 'php-api' | 'swift-api' | 'dart-api'
  | 'zig-api' | 'scala-api' | 'haskell-api' | 'elixir-api';

/** Tipo que define app framework. */
export type AppFramework = 'express' | 'nestjs' | 'fastify' | 'nextjs'
  | 'react' | 'vue' | 'angular' | 'svelte'
  | 'drogon' | 'httplib' | 'aspnet-core' | 'blazor'
  | 'axum' | 'actix-web' | 'rocket'
  | 'spring-boot' | 'quarkus' | 'micronaut'
  | 'ktor' | 'rails' | 'sinatra' | 'laravel' | 'symfony'
  | 'vapor' | 'flutter' | 'play' | 'phoenix' | 'yesod' | 'gin' | 'echo' | 'fiber';

/** Interface que define a estrutura de app blueprint. */
export interface AppBlueprint {
  name: string;
  description: string;
  template: AppTemplate;
  framework?: AppFramework;
  features: AppFeature[];
  createdAt: string;
  files: GeneratedFile[];
}

/** Interface que define a estrutura de app feature. */
export interface AppFeature {
  name: string;
  description: string;
  category: 'auth' | 'crud' | 'api' | 'storage' | 'ui' | 'monitoring' | 'messaging';
  enabled: boolean;
}

/** Interface que define a estrutura de generated file. */
export interface GeneratedFile {
  path: string;
  content: string;
  language: 'typescript' | 'javascript' | 'json' | 'yaml' | 'markdown'
    | 'java' | 'kotlin' | 'ruby' | 'php' | 'swift' | 'dart' | 'zig' | 'scala'
    | 'haskell' | 'elixir' | 'cpp' | 'csharp' | 'rust' | 'c'
    | 'xml' | 'toml' | 'sql';
}

/** Processa v a i l a b l e_ t e m p l a t e s. */
export const AVAILABLE_TEMPLATES: { id: AppTemplate; name: string; description: string; frameworks?: string[] }[] = [
  { id: 'api', name: 'REST API', description: 'Node.js + Express REST API', frameworks: ['express'] },
  { id: 'web', name: 'Web App', description: 'React + Vite frontend application', frameworks: ['react'] },
  { id: 'cli', name: 'CLI Tool', description: 'TypeScript CLI with Commander.js' },
  { id: 'library', name: 'Library', description: 'TypeScript library with tests' },
  { id: 'fullstack', name: 'Full Stack', description: 'Next.js full stack application', frameworks: ['nextjs'] },
  { id: 'cpp-api', name: 'C++ API', description: 'C++ REST API with CMake', frameworks: ['drogon', 'httplib'] },
  { id: 'csharp-api', name: 'C# API', description: 'C# ASP.NET Core API', frameworks: ['aspnet-core'] },
  { id: 'rust-api', name: 'Rust API', description: 'Rust REST API with Axum/Actix', frameworks: ['axum', 'actix-web'] },
  { id: 'java-api', name: 'Java API', description: 'Java Spring Boot REST API', frameworks: ['spring-boot'] },
  { id: 'kotlin-api', name: 'Kotlin API', description: 'Kotlin Ktor REST API', frameworks: ['ktor'] },
  { id: 'ruby-api', name: 'Ruby API', description: 'Ruby on Rails API', frameworks: ['rails'] },
  { id: 'php-api', name: 'PHP API', description: 'PHP Laravel API', frameworks: ['laravel'] },
  { id: 'swift-api', name: 'Swift API', description: 'Swift Vapor API', frameworks: ['vapor'] },
  { id: 'dart-api', name: 'Dart API', description: 'Dart Server API (shelf)', frameworks: ['dart'] },
  { id: 'zig-api', name: 'Zig API', description: 'Zig HTTP API', frameworks: ['zig'] },
  { id: 'scala-api', name: 'Scala API', description: 'Scala Play API', frameworks: ['play'] },
  { id: 'haskell-api', name: 'Haskell API', description: 'Haskell Servant/Yesod API', frameworks: ['yesod'] },
  { id: 'elixir-api', name: 'Elixir API', description: 'Elixir Phoenix API', frameworks: ['phoenix'] },
];

/** Processa v a i l a b l e_ f e a t u r e s. */
export const AVAILABLE_FEATURES: Omit<AppFeature, 'enabled'>[] = [
  { name: 'Authentication (JWT)', description: 'JWT-based authentication with login/register', category: 'auth' },
  { name: 'User CRUD', description: 'Full CRUD operations for user management', category: 'crud' },
  { name: 'RESTful API', description: 'REST API endpoints with validation', category: 'api' },
  { name: 'Database (SQLite)', description: 'SQLite database with better-sqlite3', category: 'storage' },
  { name: 'Database (PostgreSQL)', description: 'PostgreSQL with Prisma ORM', category: 'storage' },
  { name: 'Health Check', description: '/health and /ready endpoints', category: 'monitoring' },
  { name: 'Logging', description: 'Structured logging with pino or winston', category: 'monitoring' },
  { name: 'Error Handling', description: 'Centralized error handling middleware', category: 'api' },
  { name: 'Rate Limiting', description: 'Rate limiting with express-rate-limit', category: 'api' },
  { name: 'WebSocket', description: 'WebSocket support with ws library', category: 'messaging' },
  { name: 'CORS', description: 'CORS configuration', category: 'api' },
  { name: 'Environment Config', description: '.env configuration with dotenv', category: 'api' },
  { name: 'Unit Tests', description: 'Jest unit tests', category: 'monitoring' },
  { name: 'Docker Support', description: 'Dockerfile and docker-compose.yml', category: 'monitoring' },
];
