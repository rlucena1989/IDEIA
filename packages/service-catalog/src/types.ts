export interface ServiceDefinition { id: string; name: string; description: string; owner: string; language: string; tags: string[]; repository: string; status: 'active' | 'deprecated' | 'planned'; score: number; grade: string }

export interface GoldenPath { id: string; name: string; description: string; category: string; steps: GoldenPathStep[]; estimatedMinutes: number; tags: string[] }

export interface GoldenPathStep { id: string; title: string; command: string; description: string; optional: boolean }

export interface ScorecardEntry { serviceId: string; scores: Record<string, number>; overall: number; grade: 'A' | 'B' | 'C' | 'D' | 'F'; timestamp: string }

export interface SelfServiceAction { id: string; name: string; description: string; type: 'scaffold' | 'deploy' | 'test' | 'docs'; params: Array<{ name: string; type: string; required: boolean; default?: unknown }> }
