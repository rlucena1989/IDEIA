import { ProfessorConfig, DistillationSample } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('professor-api');

export interface ProfessorApiResult {
  sample: DistillationSample
  cost: number
  durationMs: number
}

export class ProfessorApiProvider {
  async generate(
    prompt: string,
    config: ProfessorConfig,
    expectedAnswer?: string,
  ): Promise<ProfessorApiResult> {
    const start = Date.now()

    switch (config.provider) {
      case 'anthropic':
        return this.callAnthropic(prompt, config, expectedAnswer, start)
      case 'openai':
        return this.callOpenAI(prompt, config, expectedAnswer, start)
      case 'deepseek':
        return this.callDeepSeek(prompt, config, expectedAnswer, start)
      default:
        return this.mockCall(prompt, config, start)
    }
  }

  private async callAnthropic(
    prompt: string,
    config: ProfessorConfig,
    expectedAnswer?: string,
    start?: number,
  ): Promise<ProfessorApiResult> {
    const s = start || Date.now()
    const apiKey = config.apiKey || process.env['ANTHROPIC_API_KEY'] || ''
    const url = 'https://api.anthropic.com/v1/messages'

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: config.maxTokens,
          messages: [{ role: 'user', content: prompt }],
          thinking: { type: 'enabled', budget_tokens: Math.floor(config.maxTokens * 0.8) },
        }),
        signal: AbortSignal.timeout(120000),
      })

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`)
      }

      const data = await response.json() as {
        content: Array<{ type: string; text: string; thinking?: string }>
        usage?: { input_tokens: number; output_tokens: number }
      }

      const thinkingBlock = data.content.find(c => c.type === 'thinking')
      const textBlock = data.content.find(c => c.type === 'text')
      const completion = [
        thinkingBlock ? `[thinking]\n${thinkingBlock.text}\n[/thinking]` : '',
        textBlock ? textBlock.text : '',
      ].filter(Boolean).join('\n\n')

      const inputTokens = data.usage?.input_tokens || 0
      const outputTokens = data.usage?.output_tokens || 0

      return {
        sample: {
          id: `sample-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          prompt,
          completion,
          professorModel: config.model,
          verified: expectedAnswer ? completion.includes(expectedAnswer) : false,
          metadata: { provider: 'anthropic', inputTokens, outputTokens, timestamp: new Date().toISOString() },
        },
        cost: (inputTokens * 10 + outputTokens * 30) / 1_000_000,
        durationMs: Date.now() - s,
      }
    } catch (err) {
      return this.mockCall(prompt, config, s, `Anthropic error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  private async callOpenAI(
    prompt: string,
    config: ProfessorConfig,
    expectedAnswer?: string,
    start?: number,
  ): Promise<ProfessorApiResult> {
    const s = start || Date.now()
    const apiKey = config.apiKey || process.env['OPENAI_API_KEY'] || ''

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: config.maxTokens,
          reasoning_effort: 'high',
        }),
        signal: AbortSignal.timeout(120000),
      })

      if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`)
      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>
        usage?: { prompt_tokens: number; completion_tokens: number }
      }

      const completion = data.choices[0]?.message?.content || ''
      const promptTokens = data.usage?.prompt_tokens || 0
      const completionTokens = data.usage?.completion_tokens || 0

      return {
        sample: {
          id: `sample-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          prompt,
          completion,
          professorModel: config.model,
          verified: expectedAnswer ? completion.includes(expectedAnswer) : false,
          metadata: { provider: 'openai', promptTokens, completionTokens, timestamp: new Date().toISOString() },
        },
        cost: (promptTokens * 5 + completionTokens * 15) / 1_000_000,
        durationMs: Date.now() - s,
      }
    } catch (err) {
      return this.mockCall(prompt, config, s, `OpenAI error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  private async callDeepSeek(
    prompt: string,
    config: ProfessorConfig,
    expectedAnswer?: string,
    start?: number,
  ): Promise<ProfessorApiResult> {
    const s = start || Date.now()
    const apiKey = config.apiKey || process.env['DEEPSEEK_API_KEY'] || ''

    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: config.model || 'deepseek-reasoner',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: config.maxTokens,
        }),
        signal: AbortSignal.timeout(120000),
      })

      if (!response.ok) throw new Error(`DeepSeek API error: ${response.status}`)
      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>
        usage?: { prompt_tokens: number; completion_tokens: number }
      }

      const completion = data.choices[0]?.message?.content || ''
      const promptTokens = data.usage?.prompt_tokens || 0
      const completionTokens = data.usage?.completion_tokens || 0

      return {
        sample: {
          id: `sample-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          prompt,
          completion,
          professorModel: config.model,
          verified: expectedAnswer ? completion.includes(expectedAnswer) : false,
          metadata: { provider: 'deepseek', promptTokens, completionTokens, timestamp: new Date().toISOString() },
        },
        cost: (promptTokens * 0.28 + completionTokens * 1.10) / 1_000_000,
        durationMs: Date.now() - s,
      }
    } catch (err) {
      return this.mockCall(prompt, config, s, `DeepSeek error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  private mockCall(
    prompt: string,
    config: ProfessorConfig,
    start: number,
    error?: string,
  ): ProfessorApiResult {
    return {
      sample: {
        id: `sample-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        prompt,
        completion: error
          ? `[ERROR: ${error}]\n[Fallback reasoning for: ${prompt.slice(0, 100)}]`
          : `[Reasoning chain for: ${prompt.slice(0, 100)}]`,
        professorModel: config.model,
        verified: false,
        metadata: { provider: 'mock', error: error || '', timestamp: new Date().toISOString() },
      },
      cost: 0,
      durationMs: Date.now() - start,
    }
  }
}
