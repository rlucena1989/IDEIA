import { PromptDefinition, PromptContext, RenderedPrompt } from './prompt-types';
import { createLogger } from '@ideia/logger';
import { renderPrompt } from './prompt-factory';
import { getMasterPrompt } from './prompt-master';
const logger = createLogger('prompt-renderer');

export function renderMasterPrompt(ctx?: PromptContext): RenderedPrompt {
  return renderPrompt(getMasterPrompt(), ctx);
}

export function renderPromptList(prompts: PromptDefinition[], ctx?: PromptContext): RenderedPrompt[] {
  return prompts.map(p => renderPrompt(p, ctx));
}
