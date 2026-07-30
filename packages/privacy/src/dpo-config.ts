import { createLogger } from '@ideia/logger'
import { config as cfg } from '@ideia/config-engine'

const logger = createLogger('dpo-config')

export interface DPOConfig {
  name: string
  email: string
  phone?: string
  organization?: string
}

const DPO_CONFIG_KEY = 'IDEIA_DPO_NAME'
const DPO_EMAIL_KEY = 'IDEIA_DPO_EMAIL'

export function getDPOConfig(): DPOConfig | null {
  const name = cfg.get(DPO_CONFIG_KEY)
  const email = cfg.get(DPO_EMAIL_KEY)
  if (!name && !email) return null
  return {
    name: name || 'Unnamed DPO',
    email: email || 'dpo@ideia.dev',
  }
}

export function hasDPOConfigured(): boolean {
  return !!cfg.get(DPO_CONFIG_KEY) || !!cfg.get(DPO_EMAIL_KEY)
}

export function formatDPOContact(): string {
  const dpo = getDPOConfig()
  if (!dpo) return 'No DPO configured. Set IDEIA_DPO_NAME and IDEIA_DPO_EMAIL env vars.'
  let result = `DPO: ${dpo.name}`
  result += `\nEmail: ${dpo.email}`
  if (dpo.phone) result += `\nPhone: ${dpo.phone}`
  if (dpo.organization) result += `\nOrganization: ${dpo.organization}`
  return result
}
