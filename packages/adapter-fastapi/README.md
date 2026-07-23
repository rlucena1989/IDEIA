# FastAPI Adapter

Adapter oficial do AI-Devkit para projetos Python/FastAPI com Clean Architecture.

## Funcionalidades

| Comando            | Descrição                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `detect`           | Detecta projetos Python via `requirements.txt` ou `pyproject.toml`                                                         |
| `init`             | Gera `requirements.txt` (fastapi, uvicorn, pytest, flake8, httpx, pydantic) e `.flake8`                                    |
| `generateTemplate` | Scaffold de módulo Clean Architecture: domain/entities, application/use_cases/schemas, infrastructure/http/routes/database |
| `runLint`          | Executa `flake8 src/`                                                                                                      |
| `runTests`         | Executa `pytest`                                                                                                           |
| `runBuild`         | Verifica sintaxe Python com `py_compile`                                                                                   |
| `qualityGate`      | Valida estrutura Clean Architecture (camadas domain/application/infrastructure + entrypoint main.py)                       |

## Uso

```js
const fastapi = require('@ideia/adapter-fastapi');

if (fastapi.detect('/caminho/do/projeto')) {
  fastapi.init('/caminho/do/projeto');
  fastapi.generateTemplate('users');
  fastapi.runLint('/caminho/do/projeto');
  fastapi.runTests('/caminho/do/projeto');
  fastapi.runBuild('/caminho/do/projeto');
  fastapi.qualityGate('/caminho/do/projeto');
}
```
