export interface ApiResponse<T> {
  data: T
  meta: { requestId: string; timestamp: string; version: string }
  links: { self: string; next?: string; prev?: string; related?: Record<string, string> }
  error?: ApiError
}

export interface ApiError {
  code: string
  message: string
  details?: Array<{ field: string; code: string; message: string }>
}

export interface PaginatedResponse<T> extends Omit<ApiResponse<T[]>, 'meta'> {
  meta: { pagination: { cursor: string | null; previous?: string | null; limit: number; total?: number; hasMore: boolean }; requestId: string; timestamp: string; version: string }
}

export interface RetryConfig {
  maxRetries: number
  backoff: 'linear' | 'exponential'
  retryOn: number[]
}

export interface IdeiaClientConfig {
  apiKey?: string
  accessToken?: string
  baseUrl: string
  timeout?: number
  retry?: RetryConfig
  headers?: Record<string, string>
}

export interface IdeiaEvent {
  id: string
  specversion: string
  source: string
  type: string
  subject: string
  time: string
  datacontenttype: string
  data: Record<string, unknown>
  extensions?: { projectId?: string; workflowId?: string; traceId?: string }
}

export interface SSEEvent {
  event: string
  data: unknown
}

export interface WebhookConfig {
  url: string
  events: string[]
  secret: string
  filters?: { projectId?: string }
  retryConfig?: { maxRetries: number; backoffMs: number }
}

export interface OpenAPIObject {
  openapi: string
  info: { title: string; version: string; description?: string }
  servers?: Array<{ url: string; description?: string }>
  paths?: Record<string, unknown>
  components?: {
    schemas?: Record<string, unknown>
    securitySchemes?: Record<string, unknown>
  }
}

export interface GeneratorConfig {
  spec: OpenAPIObject
  language: 'typescript' | 'python' | 'rust' | 'go'
  style: 'fetch' | 'axios' | 'graphql-request'
  includeReactHooks: boolean
  generateTests: boolean
}

export interface EndpointDef {
  method: string
  path: string
  operationId: string
  params: Array<{ name: string; in: string; required: boolean; schema: any }>
  requestBody?: any
  response?: any
  summary: string
}

export interface GeneratedSDK {
  files: Array<{ path: string; content: string }>
  stats: { endpointCount: number; typeCount: number }
}

export interface McpTool {
  name: string
  description: string
  inputSchema: { type: string; properties: Record<string, unknown>; required?: string[] }
}
