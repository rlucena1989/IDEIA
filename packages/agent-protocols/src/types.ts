export type AgentType =
  | 'analyst' | 'architect' | 'programmer'
  | 'reviewer' | 'tester' | 'devops'
  | 'supervisor' | 'coordinator' | 'specialist'
  | 'human_proxy';

export interface AgentAddress {
  id: string;
  type: AgentType;
  instance: string;
}

export type MessageType =
  | 'request' | 'response' | 'broadcast'
  | 'announce' | 'debate' | 'vote'
  | 'coordinate' | 'query' | 'error'
  | 'heartbeat' | 'disconnect'
  | 'gossip' | 'negotiate' | 'consensus'
  | 'stream' | 'stream_ack' | 'stream_end';

export interface AgentMessage<T = unknown> {
  id: string;
  type: MessageType;
  from: AgentAddress;
  to: AgentAddress | AgentAddress[] | '*';
  payload: T;
  metadata: {
    correlationId: string;
    ttl: number;
    priority: 1 | 2 | 3;
    timestamp: number;
    traceId: string;
    spanId: string;
    signature?: string;
  };
}

export interface Envelope {
  version: 1;
  messageId: string;
  correlationId: string;
  from: AgentAddress;
  to: AgentAddress | AgentAddress[] | '*';
  type: MessageType;
  payload: unknown;
  timestamp: number;
  ttl: number;
  priority: 1 | 2 | 3;
  signature?: string;
  replyTo?: string;
  traceId: string;
  spanId: string;
  format: SerializationFormat;
}

export enum SerializationFormat {
  JSON = 'json',
  PROTOBUF = 'protobuf',
  MESSAGEPACK = 'messagepack',
  CAPNPROTO = 'capnproto',
}

export interface DeliveryGuarantee {
  mode: 'at-most-once' | 'at-least-once' | 'exactly-once';
  ackTimeout: number;
  maxRetries: number;
  dedupWindow: number;
}

export interface A2AAgentCard {
  name: string;
  description: string;
  url: string;
  provider: { organization: string; url: string };
  version: string;
  capabilities: {
    skills: A2ASkill[];
    protocols: ('a2a' | 'mcp' | 'acp')[];
    authentication: A2AAuth[];
  };
}

export interface A2ASkill {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

export interface A2AAuth {
  scheme: 'bearer' | 'oauth2' | 'mtls' | 'api_key';
  credentials?: string;
}

export interface A2ATask {
  id: string;
  sessionId: string;
  status: 'submitted' | 'working' | 'completed' | 'failed' | 'canceled';
  input: { text?: string; files?: A2AFile[]; metadata?: Record<string, unknown> };
  output?: { text?: string; files?: A2AFile[]; artifacts?: unknown[] };
  artifacts?: unknown[];
  history?: A2AMessage[];
  metadata?: Record<string, unknown>;
}

export interface A2AFile {
  name: string;
  mimeType: string;
  bytes: string;
  uri?: string;
}

export interface A2AMessage {
  role: 'agent' | 'user';
  text?: string;
  parts?: A2APart[];
  timestamp: number;
}

export interface A2APart {
  type: 'text' | 'file' | 'code' | 'data';
  content: unknown;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface MCPPrompt {
  name: string;
  description: string;
  arguments: Array<{ name: string; description: string; required: boolean }>;
}

export interface MCPContext {
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
  instructions: string[];
}

export interface BenchmarkConfig {
  operations: number;
  payloadSize: number;
  parallel: number;
}

export interface BenchmarkResult {
  protocol: string;
  operation: string;
  throughput: number;
  p50Latency: number;
  p99Latency: number;
  serializedSize: number;
  errors: number;
}
