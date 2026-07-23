import * as fs from 'fs';
import * as path from 'path';

export interface GeneratedFile {
  path: string;
  content: string;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function generateRouter(routerName: string, destDir: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const routerCap = cap(routerName);

  files.push({
    path: path.join(destDir, `${routerName}.py`),
    content: `from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/${routerName}s", tags=["${routerName}s"])


class ${routerCap}Create(BaseModel):
    name: str


class ${routerCap}Response(BaseModel):
    id: int
    name: str


_items: List[dict] = []
_counter: int = 0


@router.post("/", response_model=${routerCap}Response)
def create(item: ${routerCap}Create):
    global _counter
    _counter += 1
    entry = {"id": _counter, "name": item.name}
    _items.append(entry)
    return entry


@router.get("/", response_model=List[${routerCap}Response])
def list_all():
    return _items


@router.get("/{item_id}", response_model=${routerCap}Response)
def get_one(item_id: int):
    for item in _items:
        if item["id"] == item_id:
            return item
    raise HTTPException(status_code=404, detail="Item not found")
`,
  });

  files.push({
    path: path.join(destDir, `schemas.py`),
    content: `from pydantic import BaseModel
from typing import Optional


class ${routerCap}Base(BaseModel):
    name: str
    description: Optional[str] = None


class ${routerCap}Create(${routerCap}Base):
    pass


class ${routerCap}Update(${routerCap}Base):
    pass


class ${routerCap}InDB(${routerCap}Base):
    id: int


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
