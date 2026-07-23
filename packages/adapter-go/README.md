# @ideia/adapter-go

Go/Golang adapter for IDEIA — Clean Architecture scaffolding, project detection, linting, testing, and build.

## Status

⚠️ **Experimental** — The adapter generates real Go scaffold files with Clean Architecture layers but requires Go toolchain (`go`) for lint/test/build commands.

## Capabilities

- `detect` — Detects Go projects by checking for `go.mod`
- `init` — Creates `tools/tools.go` with golangci-lint import
- `generateTemplate` — Generates Clean Architecture scaffold under `internal/<name>/`
- `runLint` — Runs `go vet ./...`
- `runTests` — Runs `go test ./...`
- `runBuild` — Runs `go build ./...`
- `qualityGate` — Validates Clean Architecture layers + `go vet`

## Generated Structure

```
internal/<name>/
  application/usecase/
  domain/entity/
  domain/repository/
  infrastructure/handler/
  infrastructure/database/
```

## Tests

8 tests checking name, capabilities, project detection, template generation, and function exports.
