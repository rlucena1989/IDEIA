import { LanguageModel, UserRequest, LanguageModelResponse } from '@theia/ai-core/lib/common/language-model';
import { createLogger } from '@ideia/logger';
const logger = createLogger('language-model-config');

interface TheiaMessage {
  actor?: string;
  text?: string;
}

export function configureLanguageModels(registry: { addLanguageModels?: (models: LanguageModel[]) => void }): void {
  const model: LanguageModel = {
    id: 'ollama/deepseek-coder',
    name: 'DeepSeek Coder (Ollama)',
    vendor: 'ollama',
    version: '1.0',
    status: { status: 'ready' },
    request: async (req: UserRequest): Promise<LanguageModelResponse> => {
      const endpoint = process.env.IDEIA_LLM_ENDPOINT || 'http://localhost:11434';
      const modelName = process.env.IDEIA_LLM_MODEL || 'deepseek-coder';
      const response = await fetch(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages: req.messages.map((m: TheiaMessage) => ({
            role: m.actor || 'user',
            content: typeof m.text === 'string' ? m.text : '',
          })),
          stream: false,
        }),
      });
      const data = await response.json();
      return { text: data.message?.content || '' };
    },
  };

  registry.addLanguageModels?.([model]);
}
