import { RiskNodeDefinition } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('scenarios');

export const HIGH_RISK_SCENARIO: RiskNodeDefinition[] = [
  {
    name: 'action_type',
    values: ['read', 'write', 'delete', 'execute', 'network'],
    parents: [],
    cpt: { read: 0.30, write: 0.25, delete: 0.15, execute: 0.20, network: 0.10 },
  },
  {
    name: 'agent_trust',
    values: ['trusted', 'known', 'unknown', 'suspicious'],
    parents: [],
    cpt: { trusted: 0.40, known: 0.30, unknown: 0.20, suspicious: 0.10 },
  },
  {
    name: 'time_context',
    values: ['business_hours', 'after_hours', 'weekend', 'holiday'],
    parents: [],
    cpt: { business_hours: 0.45, after_hours: 0.25, weekend: 0.20, holiday: 0.10 },
  },
  {
    name: 'target_sensitivity',
    values: ['low', 'medium', 'high', 'critical'],
    parents: ['action_type'],
    cpt: {
      'low|read': 0.50, 'medium|read': 0.30, 'high|read': 0.15, 'critical|read': 0.05,
      'low|write': 0.20, 'medium|write': 0.40, 'high|write': 0.30, 'critical|write': 0.10,
      'low|delete': 0.05, 'medium|delete': 0.15, 'high|delete': 0.50, 'critical|delete': 0.30,
      'low|execute': 0.10, 'medium|execute': 0.20, 'high|execute': 0.30, 'critical|execute': 0.40,
      'low|network': 0.15, 'medium|network': 0.25, 'high|network': 0.25, 'critical|network': 0.35,
    },
  },
  {
    name: 'history_count',
    values: ['none', 'few', 'many'],
    parents: ['agent_trust'],
    cpt: {
      'none|trusted': 0.10, 'few|trusted': 0.30, 'many|trusted': 0.60,
      'none|known': 0.20, 'few|known': 0.40, 'many|known': 0.40,
      'none|unknown': 0.50, 'few|unknown': 0.30, 'many|unknown': 0.20,
      'none|suspicious': 0.70, 'few|suspicious': 0.20, 'many|suspicious': 0.10,
    },
  },
  {
    name: 'risk_level',
    values: ['low', 'medium', 'high', 'critical'],
    parents: ['target_sensitivity', 'agent_trust', 'time_context', 'history_count'],
    cpt: {
      'low|low,trusted,business_hours,none': 0.70, 'medium|low,trusted,business_hours,none': 0.20, 'high|low,trusted,business_hours,none': 0.08, 'critical|low,trusted,business_hours,none': 0.02,
      'low|high,suspicious,after_hours,none': 0.05, 'medium|high,suspicious,after_hours,none': 0.10, 'high|high,suspicious,after_hours,none': 0.30, 'critical|high,suspicious,after_hours,none': 0.55,
      'low|medium,unknown,weekend,few': 0.15, 'medium|medium,unknown,weekend,few': 0.25, 'high|medium,unknown,weekend,few': 0.35, 'critical|medium,unknown,weekend,few': 0.25,
      'low|critical,suspicious,holiday,none': 0.02, 'medium|critical,suspicious,holiday,none': 0.05, 'high|critical,suspicious,holiday,none': 0.18, 'critical|critical,suspicious,holiday,none': 0.75,
      'low|medium,known,business_hours,many': 0.60, 'medium|medium,known,business_hours,many': 0.25, 'high|medium,known,business_hours,many': 0.10, 'critical|medium,known,business_hours,many': 0.05,
    },
  },
  {
    name: 'recommendation',
    values: ['allow', 'review', 'deny', 'escalate'],
    parents: ['risk_level'],
    cpt: {
      'allow|low': 0.90, 'review|low': 0.08, 'deny|low': 0.01, 'escalate|low': 0.01,
      'allow|medium': 0.30, 'review|medium': 0.50, 'deny|medium': 0.15, 'escalate|medium': 0.05,
      'allow|high': 0.05, 'review|high': 0.20, 'deny|high': 0.55, 'escalate|high': 0.20,
      'allow|critical': 0.01, 'review|critical': 0.04, 'deny|critical': 0.25, 'escalate|critical': 0.70,
    },
  },
]
