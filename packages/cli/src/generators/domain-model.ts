import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { createLogger } from '@ideia/logger';

/**
 * Processa model.
 * @param entity - Valor entity.
 * @param options - Valor options.
 */
export function domainModel(entity: string, options: GeneratorOptions): void {
  const vars = buildVars(entity);
  const targetDir = 'src/{{name_kebab}}/domain';
  const files: FileEntry[] = [
    {
      path: `${targetDir}/{{Name}}.ts`,
      content: `export interface {{Name}}Props {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export class {{Name}} {
  private readonly _id: string;
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: {{Name}}Props) {
    this._id = props.id;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get id(): string { return this._id; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  static create(props: Omit<{{Name}}Props, 'id' | 'createdAt' | 'updatedAt'>): {{Name}} {
    return new {{Name}}({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  toJSON(): {{Name}}Props {
    return {
      id: this._id,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
`,
    },
    {
      path: `${targetDir}/__tests__/{{Name}}.test.ts`,
      content: `import { {{Name}} } from '../{{Name}}';

describe('{{Name}}', () => {
  it('should create a {{Name}} instance', () => {
    const entity = {{Name}}.create({});
    expect(entity).toBeInstanceOf({{Name}});
    expect(entity.id).toBeDefined();
  });

  it('should serialize to JSON', () => {
    const entity = {{Name}}.create({});
    const json = entity.toJSON();
    expect(json.id).toBe(entity.id);
  });
});
`,
    },
    {
      path: `${targetDir}/{{Name}}Validator.ts`,
      content: `export interface ValidationError {
  field: string;
  message: string;
}

export function validate{{Name}}(data: Partial<{{Name}}Props>): ValidationError[] {
  const errors: ValidationError[] = [];
  return errors;
}
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`Domain Model: ${entity}`, result, options.dryRun);
}
