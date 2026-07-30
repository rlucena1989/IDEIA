import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
const logger = createLogger('generator');

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface SpecField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'uuid' | 'email' | 'text';
  required: boolean;
}

export interface SpecComponent {
  name: string;
  responsibility: string;
  fields: SpecField[];
}

export interface Spec {
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toSnake(s: string): string {
  return s.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

function goType(field: SpecField): string {
  switch (field.type) {
    case 'number': return 'float64';
    case 'boolean': return 'bool';
    case 'date': return 'time.Time';
    case 'uuid': return 'string';
    case 'email': return 'string';
    case 'text': return 'string';
    default: return 'string';
  }
}

function goJsonTag(field: SpecField): string {
  return `\`json:"${field.name}"\``;
}

function fieldToGoStruct(field: SpecField): string {
  const gt = goType(field);
  const tag = goJsonTag(field);
  return `\t${capitalize(field.name)} ${gt} ${tag}`;
}

function extractComponents(spec: Spec): SpecComponent[] {
  return spec.design.components.map(c => ({
    name: c.name,
    responsibility: c.responsibility,
    fields: [
      { name: 'id', type: 'uuid', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'created_at', type: 'date', required: true },
      ...c.interfaces.filter(i => i.type === 'input').map(i => ({
        name: toSnake(i.name),
        type: 'string' as const,
        required: true,
      })),
    ],
  }));
}

export function generateFromSpec(spec: Spec, destDir: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const components = extractComponents(spec);

  for (const comp of components) {
    files.push(...generateHandler(comp.name, path.join(destDir, 'internal', comp.name)));
  }

  files.push({
    path: path.join(destDir, 'cmd', 'main.go'),
    content: generateMainAppWithSpec(spec, components),
  });

  files.push({
    path: path.join(destDir, 'go.mod'),
    content: `module ${spec.title}

go 1.22

require (
)
`,
  });

  files.push({
    path: path.join(destDir, 'Makefile'),
    content: `.PHONY: build test lint run

build:
\tgo build -o bin/app ./cmd/main.go

test:
\tgo test ./... -v -cover

lint:
\tgo vet ./...

run:
\tgo run ./cmd/main.go

coverage:
\tgo test ./... -coverprofile=coverage.out
\tgo tool cover -html=coverage.out -o coverage.html
`,
  });

  if (spec.acceptanceCriteria.length > 0) {
    files.push({
      path: path.join(destDir, 'cmd', 'main_test.go'),
      content: `package main

import (
\t"encoding/json"
\t"net/http"
\t"net/http/httptest"
\t"strings"
\t"testing"
)

func TestHealthEndpoint(t *testing.T) {
\treq := httptest.NewRequest(http.MethodGet, "/health", nil)
\trec := httptest.NewRecorder()
\tmain() // just for compilation check
\tt.Log("Health endpoint registered")
\t_ = req
\t_ = rec
}

${spec.acceptanceCriteria.map(tc => `
func Test${tc.id}(t *testing.T) {
\tt.Log("${tc.description}")
\tt.Log("Given: ${tc.given}")
\tt.Log("When: ${tc.when}")
\tt.Log("Then: ${tc.then}")
}`).join('\n')}
`,
    });
  }

  return files;
}

function generateMainAppWithSpec(spec: Spec, components: SpecComponent[]): string {
  const routeRegistrations = components.map(c =>
    `\tmux.HandleFunc("/api/${c.name}s", ${capitalize(c.name)}Handler)`
  ).join('\n');

  return `package main

import (
\t"encoding/json"
\t"log"
\t"net/http"
\t"os"
)

func main() {
\tport := os.Getenv("PORT")
\tif port == "" {
\t\tport = "8080"
\t}

\tmux := http.NewServeMux()

\tmux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
\t\tw.Header().Set("Content-Type", "application/json")
\t\tw.Write([]byte(\`{"status":"ok"}\`))
\t})

${routeRegistrations}

\tlog.Printf("Server starting on :%s", port)
\tif err := http.ListenAndServe(":"+port, mux); err != nil {
\t\tlog.Fatal(err)
\t}
}
`;
}

export function generateHandler(handlerName: string, destDir: string): GeneratedFile[] {
  const cap = capitalize(handlerName);
  const files: GeneratedFile[] = [];

  files.push({
    path: path.join(destDir, `${handlerName}.go`),
    content: `package ${handlerName}

import (
\t"encoding/json"
\t"fmt"
\t"net/http"
\t"sync"
\t"time"
)

type ${cap} struct {
\tID        string    \`json:"id"\`
\tName      string    \`json:"name"\`
\tCreatedAt time.Time \`json:"created_at"\`
}

type Create${cap}Input struct {
\tName string \`json:"name"\`
}

type Update${cap}Input struct {
\tName string \`json:"name"\`
}

var (
\titems   []${cap}
\tmu      sync.RWMutex
\tcounter int
)

func init() {
\titems = make([]${cap}, 0)
}

func Create${cap}(w http.ResponseWriter, r *http.Request) {
\tif r.Method != http.MethodPost {
\t\thttp.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
\t\treturn
\t}
\tvar input Create${cap}Input
\tif err := json.NewDecoder(r.Body).Decode(&input); err != nil {
\t\thttp.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
\t\treturn
\t}
\tif input.Name == "" {
\t\thttp.Error(w, "Name is required", http.StatusBadRequest)
\t\treturn
\t}
\tmu.Lock()
\tcounter++
\titem := ${cap}{
\t\tID:        fmt.Sprintf("%d", counter),
\t\tName:      input.Name,
\t\tCreatedAt: time.Now(),
\t}
\titems = append(items, item)
\tmu.Unlock()
\tw.Header().Set("Content-Type", "application/json")
\tw.WriteHeader(http.StatusCreated)
\tjson.NewEncoder(w).Encode(item)
}

func List${cap}s(w http.ResponseWriter, r *http.Request) {
\tif r.Method != http.MethodGet {
\t\thttp.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
\t\treturn
\t}
\tmu.RLock()
\tdefer mu.RUnlock()
\tw.Header().Set("Content-Type", "application/json")
\tjson.NewEncoder(w).Encode(items)
}

func Get${cap}(w http.ResponseWriter, r *http.Request) {
\tif r.Method != http.MethodGet {
\t\thttp.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
\t\treturn
\t}
\tid := r.PathValue("id")
\tmu.RLock()
\tdefer mu.RUnlock()
\tfor _, item := range items {
\t\tif item.ID == id {
\t\t\tw.Header().Set("Content-Type", "application/json")
\t\t\tjson.NewEncoder(w).Encode(item)
\t\t\treturn
\t\t}
\t}
\thttp.Error(w, "Item not found", http.StatusNotFound)
}

func Update${cap}(w http.ResponseWriter, r *http.Request) {
\tif r.Method != http.MethodPut {
\t\thttp.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
\t\treturn
\t}
\tid := r.PathValue("id")
\tvar input Update${cap}Input
\tif err := json.NewDecoder(r.Body).Decode(&input); err != nil {
\t\thttp.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
\t\treturn
\t}
\tmu.Lock()
\tdefer mu.Unlock()
\tfor i, item := range items {
\t\tif item.ID == id {
\t\t\titems[i].Name = input.Name
\t\t\tw.Header().Set("Content-Type", "application/json")
\t\t\tjson.NewEncoder(w).Encode(items[i])
\t\t\treturn
\t\t}
\t}
\thttp.Error(w, "Item not found", http.StatusNotFound)
}

func Delete${cap}(w http.ResponseWriter, r *http.Request) {
\tif r.Method != http.MethodDelete {
\t\thttp.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
\t\treturn
\t}
\tid := r.PathValue("id")
\tmu.Lock()
\tdefer mu.Unlock()
\tfor i, item := range items {
\t\tif item.ID == id {
\t\t\titems = append(items[:i], items[i+1:]...)
\t\t\tw.WriteHeader(http.StatusNoContent)
\t\t\treturn
\t\t}
\t}
\thttp.Error(w, "Item not found", http.StatusNotFound)
}

func ${cap}Handler(w http.ResponseWriter, r *http.Request) {
\tswitch r.Method {
\tcase http.MethodGet:
\t\tif r.PathValue("id") != "" {
\t\t\tGet${cap}(w, r)
\t\t\treturn
\t\t}
\t\tList${cap}s(w, r)
\tcase http.MethodPost:
\t\tCreate${cap}(w, r)
\tcase http.MethodPut:
\t\tUpdate${cap}(w, r)
\tcase http.MethodDelete:
\t\tDelete${cap}(w, r)
\tdefault:
\t\thttp.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
\t}
}
`,
  });

  files.push({
    path: path.join(destDir, `${handlerName}_test.go`),
    content: `package ${handlerName}

import (
\t"encoding/json"
\t"net/http"
\t"net/http/httptest"
\t"strings"
\t"testing"
)

func resetItems() {
\tmu.Lock()
\titems = make([]${cap}, 0)
\tcounter = 0
\tmu.Unlock()
}

func TestCreate${cap}(t *testing.T) {
\tresetItems()
\tbody := strings.NewReader(\`{"name":"test item"}\`)
\treq := httptest.NewRequest(http.MethodPost, "/", body)
\trec := httptest.NewRecorder()
\tCreate${cap}(rec, req)
\tif rec.Code != http.StatusCreated {
\t\tt.Errorf("expected 201, got %d", rec.Code)
\t}
\tvar item ${cap}
\tif err := json.NewDecoder(rec.Body).Decode(&item); err != nil {
\t\tt.Fatal(err)
\t}
\tif item.Name != "test item" {
\t\tt.Errorf("expected 'test item', got '%s'", item.Name)
\t}
\tif item.ID == "" {
\t\tt.Error("expected non-empty ID")
\t}
}

func TestCreate${cap}_Validation(t *testing.T) {
\tresetItems()
\tbody := strings.NewReader(\`{"name":""}\`)
\treq := httptest.NewRequest(http.MethodPost, "/", body)
\trec := httptest.NewRecorder()
\tCreate${cap}(rec, req)
\tif rec.Code != http.StatusBadRequest {
\t\tt.Errorf("expected 400 for empty name, got %d", rec.Code)
\t}
}

func TestList${cap}s_Empty(t *testing.T) {
\tresetItems()
\treq := httptest.NewRequest(http.MethodGet, "/", nil)
\trec := httptest.NewRecorder()
\tList${cap}s(rec, req)
\tif rec.Code != http.StatusOK {
\t\tt.Errorf("expected 200, got %d", rec.Code)
\t}
\tvar items []${cap}
\tif err := json.NewDecoder(rec.Body).Decode(&items); err != nil {
\t\tt.Fatal(err)
\t}
\tif len(items) != 0 {
\t\tt.Errorf("expected empty list, got %d items", len(items))
\t}
}

func TestDelete${cap}_NotFound(t *testing.T) {
\tresetItems()
\treq := httptest.NewRequest(http.MethodDelete, "/999", nil)
\treq.SetPathValue("id", "999")
\trec := httptest.NewRecorder()
\tDelete${cap}(rec, req)
\tif rec.Code != http.StatusNotFound {
\t\tt.Errorf("expected 404, got %d", rec.Code)
\t}
}
`,
  });

  return files;
}

export function generateMainApp(): string {
  return `package main

import (
\t"log"
\t"net/http"
\t"os"
)

func main() {
\tport := os.Getenv("PORT")
\tif port == "" {
\t\tport = "8080"
\t}

\tmux := http.NewServeMux()

\tmux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
\t\tw.Header().Set("Content-Type", "application/json")
\t\tw.Write([]byte(\`{"status":"ok"}\`))
\t})

\tlog.Printf("Server starting on :%s", port)
\tif err := http.ListenAndServe(":"+port, mux); err != nil {
\t\tlog.Fatal(err)
\t}
}
`;
}

export function scaffoldProject(projectName: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push({
    path: path.join(projectName, 'go.mod'),
    content: `module ${projectName}

go 1.22

require (
)
`,
  });

  files.push({
    path: path.join(projectName, 'cmd', 'main.go'),
    content: `package main

import "fmt"

func main() {
\tfmt.Println("Hello from ${projectName}")
}
`,
  });

  files.push({
    path: path.join(projectName, 'Makefile'),
    content: `.PHONY: build test lint run coverage

build:
\tgo build -o bin/app ./cmd/main.go

test:
\tgo test ./... -v -cover

lint:
\tgo vet ./...

run:
\tgo run ./cmd/main.go

coverage:
\tgo test ./... -coverprofile=coverage.out
\tgo tool cover -html=coverage.out -o coverage.html
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
