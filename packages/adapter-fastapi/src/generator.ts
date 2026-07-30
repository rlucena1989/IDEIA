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

export interface GeneratedFile {
  path: string;
  content: string;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toSnake(s: string): string {
  return s.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

function pyType(field: SpecField): string {
  switch (field.type) {
    case 'number': return 'float';
    case 'boolean': return 'bool';
    case 'date': return 'datetime';
    case 'uuid': return 'UUID';
    case 'email': return 'EmailStr';
    case 'text': return 'str';
    default: return 'str';
  }
}

function pyImportForType(field: SpecField): string[] {
  const imports: string[] = [];
  if (field.type === 'date') imports.push('from datetime import datetime');
  if (field.type === 'uuid') imports.push('from uuid import UUID');
  if (field.type === 'email') imports.push('from pydantic import EmailStr');
  return imports;
}

function extractComponents(spec: Spec): SpecComponent[] {
  return spec.design.components.map(c => ({
    name: c.name,
    responsibility: c.responsibility,
    fields: [
      { name: 'id', type: 'uuid' as const, required: true },
      { name: 'name', type: 'string' as const, required: true },
      { name: 'created_at', type: 'date' as const, required: true },
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
    files.push(...generateRouter(toSnake(comp.name), path.join(destDir, 'src', 'routers')));
  }

  const allRouters = components.map(c =>
    `from src.routers.${toSnake(c.name)} import router as ${toSnake(c.name)}_router`
  ).join('\n');
  const allIncludes = components.map(c =>
    `app.include_router(${toSnake(c.name)}_router)`
  ).join('\n');

  files.push({
    path: path.join(destDir, 'src', 'main.py'),
    content: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
${allRouters}

app = FastAPI(title="${spec.title}", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

${allIncludes}


@app.get("/health")
def health():
    return {"status": "ok"}
`,
  });

  files.push({
    path: path.join(destDir, 'src', '__init__.py'),
    content: '',
  });

  files.push({
    path: path.join(destDir, 'pyproject.toml'),
    content: `[project]
name = "${spec.title}"
version = "0.1.0"
description = "IDEIA generated FastAPI project"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.109.0",
    "uvicorn[standard]>=0.27.0",
    "pydantic>=2.5.0",
    "pydantic-settings>=2.1.0",
]

[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.backends._legacy:_Backend"

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.pytest.ini_options]
testpaths = ["tests"]
`,
  });

  files.push({
    path: path.join(destDir, 'requirements.txt'),
    content: `fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pydantic>=2.5.0
pydantic-settings>=2.1.0
ruff>=0.1.0
pytest>=7.4.0
httpx>=0.26.0
`,
  });

  if (spec.acceptanceCriteria.length > 0) {
    const testMethods = spec.acceptanceCriteria.map(tc => `
async def test_${tc.id}(client: AsyncClient):
    \"\"\"${tc.description}\"\"\"
    # Given: ${tc.given}
    # When: ${tc.when}
    # Then: ${tc.then}
    response = await client.get("/health")
    assert response.status_code == 200
`).join('\n');

    files.push({
      path: path.join(destDir, 'tests', 'test_acceptance.py'),
      content: `import pytest
from httpx import AsyncClient
from src.main import app


@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
${testMethods}
`,
    });

    files.push({
      path: path.join(destDir, 'tests', '__init__.py'),
      content: '',
    });
  }

  return files;
}

export function generateRouter(routerName: string, destDir: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const routerCap = cap(routerName);

  files.push({
    path: path.join(destDir, `${routerName}.py`),
    content: `from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID, uuid4

router = APIRouter(prefix="/${routerName}s", tags=["${routerName}s"])


class ${routerCap}Base(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class ${routerCap}Create(${routerCap}Base):
    pass


class ${routerCap}Update(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)


class ${routerCap}Response(${routerCap}Base):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


_items: List[dict] = []


@router.post("/", response_model=${routerCap}Response, status_code=status.HTTP_201_CREATED)
def create(item: ${routerCap}Create):
    entry = {
        "id": uuid4(),
        "name": item.name,
        "created_at": datetime.utcnow(),
    }
    _items.append(entry)
    return entry


@router.get("/", response_model=List[${routerCap}Response])
def list_all():
    return _items


@router.get("/{item_id}", response_model=${routerCap}Response)
def get_one(item_id: UUID):
    for item in _items:
        if item["id"] == item_id:
            return item
    raise HTTPException(status_code=404, detail="Item not found")


@router.put("/{item_id}", response_model=${routerCap}Response)
def update(item_id: UUID, item: ${routerCap}Update):
    for i, existing in enumerate(_items):
        if existing["id"] == item_id:
            if item.name is not None:
                _items[i]["name"] = item.name
            return _items[i]
    raise HTTPException(status_code=404, detail="Item not found")


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(item_id: UUID):
    for i, existing in enumerate(_items):
        if existing["id"] == item_id:
            _items.pop(i)
            return
    raise HTTPException(status_code=404, detail="Item not found")
`,
  });

  files.push({
    path: path.join(destDir, `schemas.py`),
    content: `from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class ${routerCap}Base(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class ${routerCap}Create(${routerCap}Base):
    pass


class ${routerCap}Update(${routerCap}Base):
    pass


class ${routerCap}InDB(${routerCap}Base):
    id: UUID
    created_at: datetime


class ${routerCap}Response(${routerCap}InDB):
    class Config:
        from_attributes = True
`,
  });

  return files;
}

export function generateMainApp(): string {
  return `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="IDEIA Generated API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}
`;
}

export function scaffoldProject(projectName: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  files.push({
    path: path.join(projectName, 'pyproject.toml'),
    content: `[project]
name = "${projectName}"
version = "0.1.0"
description = "IDEIA generated FastAPI project"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.109.0",
    "uvicorn[standard]>=0.27.0",
    "pydantic>=2.5.0",
    "pydantic-settings>=2.1.0",
]

[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.backends._legacy:_Backend"

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.pytest.ini_options]
testpaths = ["tests"]
`,
  });

  files.push({
    path: path.join(projectName, 'src', 'main.py'),
    content: generateMainApp(),
  });

  files.push({
    path: path.join(projectName, 'src', '__init__.py'),
    content: '',
  });

  files.push({
    path: path.join(projectName, 'requirements.txt'),
    content: `fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pydantic>=2.5.0
pydantic-settings>=2.1.0
ruff>=0.1.0
pytest>=7.4.0
httpx>=0.26.0
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
