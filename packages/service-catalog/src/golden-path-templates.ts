export interface GoldenPathFile {
  path: string;
  content: string;
}

export interface GoldenPathTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  files: GoldenPathFile[];
  estimatedTime: string;
  prerequisites: string[];
}

export class GoldenPathTemplates {
  static getNodeExpressTemplate(): GoldenPathTemplate {
    return {
      id: 'node-express',
      name: 'Node.js Express API',
      description: 'REST API with Express.js, TypeScript, Jest tests',
      tags: ['node', 'express', 'api', 'typescript'],
      files: [
        { path: 'src/index.ts', content: "import express from 'express';\nconst app = express();\napp.listen(3000);" },
        { path: 'src/routes.ts', content: "import { Router } from 'express';\nconst router = Router();\nexport default router;" },
        { path: 'package.json', content: JSON.stringify({ name: 'my-api', scripts: { test: 'jest' } }) },
        { path: 'tsconfig.json', content: JSON.stringify({ compilerOptions: { strict: true } }) },
        { path: 'jest.config.js', content: 'module.exports = { preset: "ts-jest" };' },
      ],
      estimatedTime: '5 minutes',
      prerequisites: ['Node.js 20+', 'npm'],
    };
  }

  static getPythonFastAPITemplate(): GoldenPathTemplate {
    return {
      id: 'python-fastapi',
      name: 'Python FastAPI Service',
      description: 'FastAPI service with Pydantic, pytest, uvicorn',
      tags: ['python', 'fastapi', 'api', 'pydantic'],
      files: [
        { path: 'src/main.py', content: 'from fastapi import FastAPI\napp = FastAPI()' },
        { path: 'src/models.py', content: 'from pydantic import BaseModel\nclass Item(BaseModel):\n    name: str' },
        { path: 'requirements.txt', content: 'fastapi\nuvicorn\npytest\nhttpx' },
        { path: 'tests/test_main.py', content: 'def test_health():\n    assert True' },
      ],
      estimatedTime: '3 minutes',
      prerequisites: ['Python 3.11+', 'pip'],
    };
  }

  static getTypeScriptLibTemplate(): GoldenPathTemplate {
    return {
      id: 'ts-lib',
      name: 'TypeScript Library',
      description: 'TypeScript library with strict mode, Jest, ts-jest',
      tags: ['typescript', 'library', 'jest'],
      files: [
        { path: 'src/index.ts', content: 'export const greet = (name: string): string => `Hello, ${name}!`;' },
        { path: 'tsconfig.json', content: JSON.stringify({ compilerOptions: { strict: true, declaration: true } }) },
        { path: 'jest.config.js', content: 'module.exports = { preset: "ts-jest" };' },
      ],
      estimatedTime: '2 minutes',
      prerequisites: ['Node.js 20+'],
    };
  }

  static getTemplate(id: string): GoldenPathTemplate | undefined {
    const templates: Record<string, GoldenPathTemplate> = {
      'node-express': this.getNodeExpressTemplate(),
      'python-fastapi': this.getPythonFastAPITemplate(),
      'ts-lib': this.getTypeScriptLibTemplate(),
    };
    return templates[id];
  }

  static listTemplates(): { id: string; name: string; description: string }[] {
    return [
      { id: 'node-express', name: 'Node.js Express API', description: 'REST API with Express, TypeScript, Jest' },
      { id: 'python-fastapi', name: 'Python FastAPI Service', description: 'FastAPI with Pydantic, pytest' },
      { id: 'ts-lib', name: 'TypeScript Library', description: 'TypeScript library with strict mode' },
    ];
  }
}
