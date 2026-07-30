import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { createLogger } from '@ideia/logger';
const logger = createLogger('infrastructure');

interface InfraOptions extends GeneratorOptions {
  stack?: 'node' | 'python' | 'go' | 'java';
  db?: 'postgres' | 'mysql' | 'mongo' | 'none';
  port?: string;
  domain?: string;
}

/**
 * Processa dockerfile.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function dockerfile(name: string, options: InfraOptions): void {
  const vars = buildVars(name);
  const stack = options.stack || 'node';

  const templates: Record<string, string> = {
    node: `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE ${options.port || '3000'}
CMD ["node", "dist/index.js"]
`,
    python: `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE ${options.port || '8000'}
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${options.port || '8000'}"]
`,
    go: `FROM golang:1.22 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /server .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=builder /server /server
EXPOSE ${options.port || '8080'}
CMD ["/server"]
`,
    java: `FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN ./mvnw dependency:go-offline
COPY src ./src
RUN ./mvnw package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE ${options.port || '8080'}
CMD ["java", "-jar", "app.jar"]
`,
  };

  const content = templates[stack] || templates.node;
  const files: FileEntry[] = [{ path: 'Dockerfile', content }];
  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Dockerfile: ${name} (${stack})`, result, options.dryRun);
}

/**
 * Processa action.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function dockerfileAction(name: string, options: InfraOptions): void {
  dockerfile(name, options);
}

/**
 * Processa compose.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function dockerCompose(name: string, options: InfraOptions): void {
  const vars = buildVars(name);
  const db = options.db || 'postgres';
  const dbImage: Record<string, string> = { postgres: 'postgres:16', mysql: 'mysql:8', mongo: 'mongo:7' };
  const serviceName = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-db`;

  const services: string[] = [`services:
  app:
    build: .
    ports:
      - "${options.port || '3000'}:${options.port || '3000'}"
    environment:
      - DATABASE_URL=${db === 'postgres' ? `postgresql://user:pass@${serviceName}:5432/${name}` : db === 'mysql' ? `mysql://user:pass@${serviceName}:3306/${name}` : `mongodb://${serviceName}:27017/${name}`}
    depends_on:
      - ${serviceName}`];

  if (db !== 'none') {
    services.push(`  ${serviceName}:
    image: ${dbImage[db] || 'postgres:16'}
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: ${name}
    volumes:
      - ${serviceName}-data:/var/lib/postgresql/data
    ports:
      - "${db === 'postgres' ? '5432' : db === 'mysql' ? '3306' : '27017'}:${db === 'postgres' ? '5432' : db === 'mysql' ? '3306' : '27017'}"
volumes:
  ${serviceName}-data:`);
  }

  const files: FileEntry[] = [{ path: 'docker-compose.yml', content: services.join('\n') }];
  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Docker Compose: ${name}`, result, options.dryRun);
}

/**
 * Processa actions.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function githubActions(name: string, options: InfraOptions): void {
  const vars = buildVars(name);
  const stack = options.stack || 'node';

  const testCmd: Record<string, string> = {
    node: 'npm run test:quick',
    python: 'pytest',
    go: 'go test ./...',
    java: './mvnw test',
  };

  const content = `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      ${options.db !== 'none' ? `${name.toLowerCase()}-db:
        image: postgres:16
        env:
          POSTGRES_USER: user
          POSTGRES_PASSWORD: pass
          POSTGRES_DB: ${name}
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5` : ''}
    steps:
      - uses: actions/checkout@v4
      - name: Setup ${stack}
        uses: actions/setup-${stack === 'node' ? 'node' : stack}@v4
        with:
          ${stack === 'node' ? 'node-version: 20' : stack === 'python' ? 'python-version: 3.12' : stack === 'go' ? 'go-version: 1.22' : 'java-version: 21'}
      - run: ${stack === 'node' ? 'npm ci' : stack === 'python' ? 'pip install -r requirements.txt' : stack === 'go' ? 'go mod download' : './mvnw dependency:go-offline'}
      - run: ${testCmd[stack] || 'npm test'}
`;

  const files: FileEntry[] = [{ path: '.github/workflows/ci.yml', content }];
  const result = generateFiles(files, vars, options);
  printGeneratorResult(`GitHub Actions: ${name}`, result, options.dryRun);
}

/**
 * Processa terraform.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function terraform(name: string, options: InfraOptions): void {
  const vars = buildVars(name);
  const domain = options.domain || `${name.toLowerCase()}.example.com`;

  const mainTf = [
    'terraform {',
    '  required_providers {',
    '    aws = { source = "hashicorp/aws", version = "~> 5.0" }',
    '  }',
    '}',
    '',
    'provider "aws" {',
    '  region = var.aws_region',
    '}',
    '',
    'resource "aws_ecs_cluster" "main" {',
    '  name = "${name}-cluster"',
    '}',
    '',
    'resource "aws_ecs_service" "app" {',
    '  name            = "${name}-service"',
    '  cluster         = aws_ecs_cluster.main.id',
    '  task_definition = aws_ecs_task_definition.app.arn',
    '  desired_count   = 2',
    '  launch_type     = "FARGATE"',
    '  network_configuration {',
    '    subnets         = aws_subnet.main[*].id',
    '    assign_public_ip = true',
    '  }',
    '}',
    '',
    'resource "aws_ecs_task_definition" "app" {',
    '  family                   = "${name}-app"',
    '  network_mode             = "awsvpc"',
    '  requires_compatibilities = ["FARGATE"]',
    '  cpu                      = "256"',
    '  memory                   = "512"',
    '  container_definitions = jsonencode([',
    '    {',
    '      name  = "${name}"',
    '      image = "${var.container_image}"',
    '      portMappings = [{ containerPort = ' + (options.port || '3000') + ' }]',
    '    }',
    '  ])',
    '}',
    '',
    'resource "aws_rds_instance" "db" {',
    '  engine         = ' + JSON.stringify(options.db === 'postgres' ? 'postgres' : options.db === 'mysql' ? 'mysql' : 'postgres'),
    '  engine_version = ' + JSON.stringify(options.db === 'postgres' ? '16' : '8'),
    '  instance_class = "db.t3.micro"',
    '  db_name        = "${name}"',
    '  username       = "admin"',
    '  password       = var.db_password',
    '  skip_final_snapshot = true',
    '}',
    '',
  ].join('\n');

  const files: FileEntry[] = [
    { path: 'infra/main.tf', content: mainTf },
    { path: 'infra/variables.tf', content: [
      'variable "aws_region" { default = "us-east-1" }',
      'variable "container_image" { description = "Docker image URL" }',
      'variable "db_password" { sensitive = true }',
    ].join('\n') },
    { path: 'infra/outputs.tf', content: [
      'output "cluster_name" { value = aws_ecs_cluster.main.name }',
      'output "db_endpoint" { value = aws_rds_instance.db.endpoint }',
    ].join('\n') },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Terraform: ${name} (${domain})`, result, options.dryRun);
}
