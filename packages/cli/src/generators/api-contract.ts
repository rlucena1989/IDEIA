import { FileEntry, buildVars, generateFiles, GeneratorOptions, printGeneratorResult } from './engine';
import { createLogger } from '@ideia/logger';
const logger = createLogger('api-contract');

interface ApiContractOptions extends GeneratorOptions {
  type?: 'rest' | 'graphql';
  fields?: string;
  model?: string;
}

/**
 * Processa api spec.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function openApiSpec(name: string, options: ApiContractOptions): void {
  const vars = buildVars(name);
  const fields = (options.fields || 'id,name,createdAt').split(',').map(f => f.trim());

  const properties = fields.map(f => {
    const type = f === 'id' ? 'integer' : f === 'createdAt' || f === 'updatedAt' ? 'string' : 'string';
    return `        ${f}:\n          type: ${type}${type === 'string' ? '\n          format: date-time' : ''}`;
  }).join('\n');

  const lowerName = name.toLowerCase();
  const files: FileEntry[] = [
    {
      path: `specs/${vars.Name}API.yaml`,
      content: `openapi: 3.1.0
info:
  title: ${vars.Name} API
  version: "1.0.0"
paths:
  /${lowerName}s:
    get:
      summary: Lista ${lowerName}s
      responses:
        "200":
          description: Lista de ${lowerName}s
          content:
            application/json:
              schema:
                type: array
                items:
                  $$ref: "#/components/schemas/${vars.Name}"
    post:
      summary: Cria ${lowerName}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $$ref: "#/components/schemas/${vars.Name}Input"
      responses:
        "201":
          description: ${vars.Name} criado
  /${lowerName}s/{id}:
    get:
      summary: Obtém ${lowerName} por ID
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: integer }
      responses:
        "200":
          description: ${vars.Name} encontrado
    delete:
      summary: Remove ${lowerName}
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: integer }
      responses:
        "204":
          description: Removido
components:
  schemas:
    ${vars.Name}:
      type: object
      required: [${fields.slice(0, 2).join(', ')}]
      properties:
${properties}
    ${vars.Name}Input:
      type: object
      properties:
${properties}
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`OpenAPI: ${name} (${fields.length} fields)`, result, options.dryRun);
}

/**
 * Processa schema.
 * @param name - Valor name.
 * @param options - Valor options.
 */
export function graphqlSchema(name: string, options: ApiContractOptions): void {
  const vars = buildVars(name);
  const _model = options.model || name;
  const fields = (options.fields || 'id: Int! name: String! createdAt: DateTime').split(' ').filter(Boolean);

  const fieldDefs = fields.join('\n  ');

  const files: FileEntry[] = [
    {
      path: `schema/${vars.Name}.graphql`,
      content: `type ${vars.Name} {
  ${fieldDefs}
}

input ${vars.Name}Input {
  ${fields.filter(f => !f.startsWith('id')).join('\n  ')}
}

type Query {
  ${vars.name_kebab}s: [${vars.Name}!]!
  ${vars.name_kebab}(id: Int!): ${vars.Name}
}

type Mutation {
  create${vars.Name}(input: ${vars.Name}Input!): ${vars.Name}!
  delete${vars.Name}(id: Int!): Boolean!
}
`,
    },
  ];

  const result = generateFiles(files, vars, options);
  printGeneratorResult(`GraphQL: ${name}`, result, options.dryRun);
}
