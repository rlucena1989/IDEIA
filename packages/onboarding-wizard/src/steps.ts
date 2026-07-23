import type { WizardStep } from './types.js'

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to IDEIA',
    description: 'Choose your profile to get started with the right defaults',
    required: true,
    expertOnly: false,
    fields: [
      {
        id: 'profile',
        label: 'Select your profile',
        type: 'select',
        required: true,
        options: [
          { value: 'solo-dev', label: 'Solo Dev - Individual developer' },
          { value: 'tech-lead', label: 'Tech Lead - Team management' },
          { value: 'automator', label: 'Automator - CI/CD specialist' },
          { value: 'enterprise', label: 'Enterprise - Organization-wide' },
          { value: 'custom', label: 'Custom - Full control' }
        ]
      }
    ]
  },
  {
    id: 'autonomy',
    title: 'Autonomy Level',
    description: 'How much autonomy should the AI have?',
    required: true,
    expertOnly: false,
    fields: [
      {
        id: 'level',
        label: 'Autonomy',
        type: 'select',
        required: true,
        options: [
          { value: 'N1', label: 'N1 - Supervisionado (IA sugere, humano aprova)' },
          { value: 'N2', label: 'N2 - Semi-autônomo (IA executa com supervisão seletiva)' },
          { value: 'N3', label: 'N3 - Autônomo (IA executa e reporta)' },
          { value: 'N4', label: 'N4 - Total (IA age independentemente)' }
        ],
        defaultValue: 'N1'
      }
    ]
  },
  {
    id: 'scanner',
    title: 'Scanner Configuration',
    description: 'Configure how IDEIA scans your project',
    required: true,
    expertOnly: false,
    fields: [
      {
        id: 'scanDepth',
        label: 'Scan depth',
        type: 'select',
        required: true,
        options: [
          { value: 'shallow', label: 'Shallow - Only top-level files' },
          { value: 'normal', label: 'Normal - Standard depth' },
          { value: 'deep', label: 'Deep - Full project scan' }
        ],
        defaultValue: 'normal'
      },
      {
        id: 'ignorePatterns',
        label: 'Ignore patterns (comma separated)',
        type: 'text',
        required: false,
        placeholder: 'node_modules, dist, .git'
      },
      {
        id: 'watchMode',
        label: 'Enable file watching',
        type: 'toggle',
        required: false,
        defaultValue: true
      }
    ]
  },
  {
    id: 'notifications',
    title: 'Notification Preferences',
    description: 'Configure how IDEIA notifies you',
    required: true,
    expertOnly: false,
    fields: [
      {
        id: 'channel',
        label: 'Notification channel',
        type: 'multiselect',
        required: true,
        options: [
          { value: 'terminal', label: 'Terminal' },
          { value: 'desktop', label: 'Desktop notification' },
          { value: 'email', label: 'Email summary' },
          { value: 'slack', label: 'Slack webhook' }
        ]
      },
      {
        id: 'frequency',
        label: 'Summary frequency',
        type: 'select',
        required: false,
        options: [
          { value: 'realtime', label: 'Real-time' },
          { value: 'hourly', label: 'Hourly digest' },
          { value: 'daily', label: 'Daily summary' }
        ],
        defaultValue: 'realtime'
      },
      {
        id: 'alertsOnly',
        label: 'Alerts only (suppress info messages)',
        type: 'toggle',
        required: false,
        defaultValue: false
      }
    ]
  },
  {
    id: 'advanced',
    title: 'Advanced Options',
    description: 'Fine-tune IDEIA behavior (expert mode only)',
    required: false,
    expertOnly: true,
    fields: [
      {
        id: 'model',
        label: 'Default AI model',
        type: 'select',
        required: false,
        options: [
          { value: 'ollama', label: 'Ollama (local)' },
          { value: 'openai', label: 'OpenAI' },
          { value: 'deepseek', label: 'DeepSeek' }
        ],
        defaultValue: 'ollama'
      },
      {
        id: 'maxTokens',
        label: 'Max tokens per response',
        type: 'number',
        required: false,
        defaultValue: 4096
      },
      {
        id: 'temperature',
        label: 'AI temperature (0.0 - 2.0)',
        type: 'slider',
        required: false,
        defaultValue: 0.3
      },
      {
        id: 'debugMode',
        label: 'Enable debug mode',
        type: 'toggle',
        required: false,
        defaultValue: false
      },
      {
        id: 'pluginSources',
        label: 'Additional plugin sources',
        type: 'text',
        required: false,
        placeholder: 'https://plugins.example.com'
      }
    ]
  },
  {
    id: 'summary',
    title: 'Summary & Confirm',
    description: 'Review your settings before applying',
    required: true,
    expertOnly: false,
    fields: [
      {
        id: 'confirm',
        label: 'I confirm these settings',
        type: 'toggle',
        required: true,
        defaultValue: false
      }
    ]
  }
]
