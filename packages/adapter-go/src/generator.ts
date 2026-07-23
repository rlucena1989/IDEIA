import * as fs from 'fs';
import * as path from 'path';

export interface GeneratedFile {
  path: string;
  content: string;
}

export function generateHandler(handlerName: string, destDir: string): GeneratedFile[] {
  const cap = handlerName.charAt(0).toUpperCase() + handlerName.slice(1);
  const files: GeneratedFile[] = [];

  files.push({
    path: path.join(destDir, `${handlerName}.go`),
    content: `package ${handlerName}

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
)

type ${cap} struct {
	ID   string \`json:"id"\`
	Name string \`json:"name"\`
}

var (
	items   []${cap}
	mu      sync.RWMutex
	counter int
)

func init() {
	items = make([]${cap}, 0)
}

func CreateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var item ${cap}
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	mu.Lock()
	counter++
	item.ID = fmt.Sprintf("%d", counter)
	items = append(items, item)
	mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(item)
}

func ListHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	mu.RLock()
	defer mu.RUnlock()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}
`,
  });

  files.push({
    path: path.join(destDir, `${handlerName}_test.go`),
    content: `package ${handlerName}

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCreateHandler(t *testing.T) {
	body := strings.NewReader(\`{"name":"test item"}\`)
	req := httptest.NewRequest(http.MethodPost, "/", body)
	rec := httptest.NewRecorder()
	CreateHandler(rec, req)
	if rec.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", rec.Code)
	}
	var item ${cap}
	if err := json.NewDecoder(rec.Body).Decode(&item); err != nil {
		t.Fatal(err)
	}
	if item.Name != "test item" {
		t.Errorf("expected 'test item', got '%s'", item.Name)
	}
}

func TestListHandler(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	ListHandler(rec, req)
	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}
}
`,
  });

  return files;
}

export function generateMainApp(): string {
  return `package main

import (
	"log"
	"net/http"
	"os"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()

	// Register routes here
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(\`{"status":"ok"}\`))
	})

	log.Printf("Server starting on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
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
	fmt.Println("Hello from ${projectName}")
}
`,
  });

  files.push({
    path: path.join(projectName, 'Makefile'),
    content: `.PHONY: build test lint

build:
	go build -o bin/app ./cmd/main.go

test:
	go test ./...

lint:
	go vet ./...

run:
	go run ./cmd/main.go
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
