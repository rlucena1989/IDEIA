import { PromptDefinition, PromptContext, RenderedPrompt } from './prompt-types';
import { renderPrompt } from './prompt-factory';
import { getMasterPrompt } from './prompt-master';

export function renderMasterPrompt(ctx?: PromptContext): RenderedPrompt {
  return renderPrompt(getMasterPrompt(), ctx);
}

export function renderPromptList(prompts: PromptDefinition[], ctx?: PromptContext): RenderedPrompt[] {
  return prompts.map(p => renderPrompt(p, ctx));
}
