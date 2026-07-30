export type PRStatus = 'planning' | 'implementing' | 'testing' | 'monitoring' | 'fixing' | 'reviewing' | 'merging' | 'completed' | 'failed'
export type PRStep = 'plan' | 'code' | 'test' | 'ci-monitor' | 'auto-fix' | 'review' | 'merge'
export type MergeStrategy = 'squash' | 'merge' | 'rebase'
export type ReviewSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface PRRequest {
  id: string
  title: string
  description: string
  branch: string
  baseBranch: string
  repository: string
  author: string
  files: string[]
  labels?: string[]
  reviewers?: string[]
}

export interface PRPlan {
  prId: string
  steps: PRStep[]
  estimatedTokens: number
  risks: string[]
  mergeStrategy: MergeStrategy
}

export interface PRCodeChange {
  file: string
  diff: string
  status: 'added' | 'modified' | 'deleted'
}

export interface PRTestResult {
  suite: string
  passed: boolean
  total: number
  failed: number
  durationMs: number
  coverage?: number
}

export interface PRCIStatus {
  step: string
  status: 'running' | 'passed' | 'failed' | 'skipped'
  durationMs: number
  output: string
  retryCount: number
}

export interface PRReviewComment {
  file: string
  line: number
  severity: ReviewSeverity
  message: string
  suggestion?: string
  category: 'style' | 'bug' | 'security' | 'performance' | 'architecture'
}

export interface PRReview {
  prId: string
  comments: PRReviewComment[]
  overallScore: number
  approved: boolean
  summary: string
}

export interface MergeGateResult {
  canMerge: boolean
  checks: MergeCheck[]
  blockReasons: string[]
}

export interface MergeCheck {
  name: string
  passed: boolean
  required: boolean
  message: string
}

export interface PRPipelineResult {
  prId: string
  success: boolean
  status: PRStatus
  plan?: PRPlan
  changes?: PRCodeChange[]
  testResults?: PRTestResult[]
  ciStatus?: PRCIStatus[]
  review?: PRReview
  mergeResult?: MergeGateResult
  errors: string[]
  durationMs: number
}
