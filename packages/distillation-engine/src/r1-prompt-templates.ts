export type TaskCategory = 'math' | 'code' | 'reasoning' | 'general'

export interface R1PromptTemplate {
  category: TaskCategory
  systemPrompt: string
  wrapPrompt: (prompt: string) => string
}

const R1_TEMPLATES: Record<TaskCategory, R1PromptTemplate> = {
  math: {
    category: 'math',
    systemPrompt: 'You are an expert mathematician. Solve the problem step by step, showing all reasoning.',
    wrapPrompt: (p: string) => `Solve this problem carefully:\n\n${p}\n\nLet me think through this step by step.`,
  },
  code: {
    category: 'code',
    systemPrompt: 'You are an expert programmer. Write clean, efficient, and well-documented code.',
    wrapPrompt: (p: string) => `Implement the following:\n\n${p}\n\nLet me analyze the requirements and design the solution.`,
  },
  reasoning: {
    category: 'reasoning',
    systemPrompt: 'You are a logical reasoning expert. Analyze problems systematically and provide clear reasoning.',
    wrapPrompt: (p: string) => `${p}\n\nLet me reason through this step by step:`,
  },
  general: {
    category: 'general',
    systemPrompt: 'You are a helpful AI assistant. Provide accurate, well-reasoned responses.',
    wrapPrompt: (p: string) => `${p}\n\nLet me think about this carefully:`,
  },
}

export function getR1Template(category: TaskCategory): R1PromptTemplate {
  return R1_TEMPLATES[category]
}

export function classifyPrompt(prompt: string): TaskCategory {
  const lower = prompt.toLowerCase()
  if (/\b(solve|calculate|equation|math|algebra|calculus|geometry|proof|theorem|compute|sum|integral)\b/.test(lower)) {
    return 'math'
  }
  if (/\b(write|implement|code|function|algorithm|debug|refactor|api|endpoint|database|typescript|python|javascript|program)\b/.test(lower)) {
    return 'code'
  }
  if (/\b(why|explain|reason|analyze|compare|contrast|argument|cause|effect|implication|if.*then|deduce|infer)\b/.test(lower)) {
    return 'reasoning'
  }
  return 'general'
}

export function applyR1Template(prompt: string): { systemPrompt: string; wrappedPrompt: string } {
  const category = classifyPrompt(prompt)
  const template = getR1Template(category)
  return {
    systemPrompt: template.systemPrompt,
    wrappedPrompt: template.wrapPrompt(prompt),
  }
}

export function extractReasoningChain(completion: string): { thinking: string; answer: string } {
  const thinkingMatch = completion.match(/\[thinking\]([\s\S]*?)\[\/thinking\]/)
  const thinking = thinkingMatch ? (thinkingMatch[1] ?? '').trim() : ''

  const answer = completion
    .replace(/\[thinking\][\s\S]*?\[\/thinking\]/g, '')
    .replace(/Let me think (about|through) this.*?(?=\n|$)/g, '')
    .trim()

  return { thinking, answer }
}

export function formatAsR1Sample(prompt: string, completion: string): string {
  const { thinking, answer } = extractReasoningChain(completion)
  const parts: string[] = []
  if (thinking) parts.push(`<thinking>\n${thinking}\n</thinking>`)
  parts.push(`<answer>\n${answer}\n</answer>`)
  return parts.join('\n\n')
}
