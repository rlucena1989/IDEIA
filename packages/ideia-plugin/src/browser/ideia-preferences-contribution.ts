
export const IDEIA_LLM_ENDPOINT = 'ideia.llm.endpoint';
export const IDEIA_LLM_MODEL = 'ideia.llm.model';
export const IDEIA_WORKSPACE_ROOT = 'ideia.workspace.root';
export const IDEIA_AUTONOMY_LEVEL = 'ideia.autonomy.level';

export const IDEIA_PreferenceSchema = {
  type: 'object',
  properties: {
    [IDEIA_LLM_ENDPOINT]: {
      type: 'string',
      description: 'LLM endpoint URL (e.g. http://localhost:11434)',
      default: 'http://localhost:11434',
    },
    [IDEIA_LLM_MODEL]: {
      type: 'string',
      description: 'Default LLM model to use (e.g. llama3.1, gpt-4)',
      default: 'llama3.1',
    },
    [IDEIA_WORKSPACE_ROOT]: {
      type: 'string',
      description: 'Default workspace root path for IDEIA operations',
      default: '',
    },
    [IDEIA_AUTONOMY_LEVEL]: {
      type: 'string',
      enum: ['blocked', 'guided', 'autonomous'],
      description: 'Autonomy level: blocked (ask for everything), guided (suggest + confirm), autonomous (execute freely)',
      default: 'guided',
    },
  },
};