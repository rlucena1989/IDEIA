import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  LangGraphAgent,
  LangGraphAgentRole,
  LangGraphStateAnnotation,
  LangGraphNodeFunction,
  createLangGraphAgent,
} from './langgraph-graph';
import { createDefaultEdgeConditions } from './edges';

export interface YamlAgentConfig {
  name: string;
  description: string;
  version: string;
  workflow: {
    entryPoint: LangGraphAgentRole;
    maxIterations?: number;
    nodeTimeout?: number;
    maxRetries?: number;
    nodes: YamlAgentNode[];
    edges: YamlAgentEdge[];
  };
}

export interface YamlAgentNode {
  role: LangGraphAgentRole;
  label: string;
  prompt: string;
  tools?: string[];
  artifacts?: YamlArtifactConfig;
  dependsOn?: LangGraphAgentRole[];
}

export interface YamlAgentEdge {
  from: LangGraphAgentRole;
  to: LangGraphAgentRole[] | {
    condition: string;
    routes: Record<string, LangGraphAgentRole>;
  };
}

export interface YamlArtifactConfig {
  type: string;
  description?: string;
}

type YamlNode = Record<string, unknown>;
type YamlWorkflow = YamlAgentConfig['workflow'];

function parseYamlContent(content: string): YamlAgentConfig {
  const lines = content.split('\n');
  const workflow: YamlWorkflow = { entryPoint: 'analyst', nodes: [], edges: [] };
  const result: YamlAgentConfig = { name: '', description: '', version: '1.0.0', workflow };
  let currentSection = '';
  let currentNode: YamlNode | null = null;
  let currentEdge: YamlNode | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '' || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('name:')) {
      result.name = trimmed.replace('name:', '').trim().replace(/^"(.*)"$/, '$1');
    } else if (trimmed.startsWith('description:')) {
      result.description = trimmed.replace('description:', '').trim().replace(/^"(.*)"$/, '$1');
    } else if (trimmed.startsWith('version:')) {
      result.version = trimmed.replace('version:', '').trim().replace(/^"(.*)"$/, '$1');
    } else if (trimmed.startsWith('entryPoint:')) {
      workflow.entryPoint = trimmed.replace('entryPoint:', '').trim() as LangGraphAgentRole;
    } else if (trimmed.startsWith('maxIterations:')) {
      workflow.maxIterations = parseInt(trimmed.replace('maxIterations:', '').trim(), 10);
    } else if (trimmed.startsWith('nodeTimeout:')) {
      workflow.nodeTimeout = parseInt(trimmed.replace('nodeTimeout:', '').trim(), 10);
    } else if (trimmed.startsWith('maxRetries:')) {
      workflow.maxRetries = parseInt(trimmed.replace('maxRetries:', '').trim(), 10);
    } else if (trimmed === 'nodes:') {
      currentSection = 'nodes';
    } else if (trimmed === 'edges:') {
      currentSection = 'edges';
    } else if (currentSection === 'nodes' && trimmed.startsWith('- role:')) {
      currentNode = {
        role: trimmed.replace('- role:', '').trim(),
        label: '',
        prompt: '',
        tools: [],
      };
      workflow.nodes.push(currentNode as unknown as YamlAgentNode);
    } else if (currentNode && trimmed.startsWith('label:')) {
      currentNode.label = trimmed.replace('label:', '').trim().replace(/^"(.*)"$/, '$1');
    } else if (currentNode && trimmed.startsWith('prompt:')) {
      const promptLine = trimmed.replace('prompt:', '').trim().replace(/^"(.*)"$/, '$1');
      currentNode.prompt = promptLine;
    } else if (currentNode && trimmed.startsWith('tools:')) {
      const toolsStr = trimmed.replace('tools:', '').trim();
      currentNode.tools = toolsStr.replace(/^\[(.*)\]$/, '$1').split(',').map((t: string) => t.trim());
    } else if (currentSection === 'edges' && trimmed.startsWith('- from:')) {
      currentEdge = {
        from: trimmed.replace('- from:', '').trim(),
        to: [],
      };
      currentSection = 'edges_in_progress';
    } else if (currentSection === 'edges_in_progress' && currentEdge && trimmed.startsWith('to:')) {
      const toValue = trimmed.replace('to:', '').trim();
      if (toValue.startsWith('[')) {
        currentEdge.to = toValue.replace(/^\[(.*)\]$/, '$1').split(',').map((t: string) => t.trim());
      } else {
        currentEdge.to = [toValue];
      }
      workflow.edges.push(currentEdge as unknown as YamlAgentEdge);
      currentEdge = null;
      currentSection = 'edges';
    }
  }

  return result;
}

function createNodeFromConfig(node: YamlAgentNode): LangGraphNodeFunction {
  return async (_state: LangGraphStateAnnotation) => {
    const output = `[${node.label}] Executando: ${node.prompt.slice(0, 80)}${node.prompt.length > 80 ? '...' : ''}`;

    return {
      outputs: {
        [node.role]: output,
      },
      decisions: [
        `${node.label}: Prompt processado (${node.prompt.length} caracteres)`,
      ],
      artifacts: [
        {
          role: node.role,
          type: node.artifacts?.type || 'agent_output',
          content: node.prompt,
        },
      ],
    };
  };
}

export function loadYamlAgent(path: string): YamlAgentConfig {
  const resolvedPath = resolve(path);
  if (!existsSync(resolvedPath)) {
    throw new Error(`Agent YAML file not found: ${resolvedPath}`);
  }

  const content = readFileSync(resolvedPath, 'utf-8');
  return parseYamlContent(content);
}

export function buildAgentFromYaml(config: YamlAgentConfig): LangGraphAgent {
  const agent = createLangGraphAgent({
    maxIterations: config.workflow.maxIterations || 10,
    nodeTimeout: config.workflow.nodeTimeout || 30000,
    maxRetries: config.workflow.maxRetries || 3,
  });

  for (const node of config.workflow.nodes) {
    const nodeFn = createNodeFromConfig(node);
    agent.addNode(node.role, nodeFn);
  }

  const edgeConditions = createDefaultEdgeConditions();

  for (const edge of config.workflow.edges) {
    const toValue = edge.to;
    if (Array.isArray(toValue) && toValue.length > 0) {
      const firstTo = toValue[0];
      agent.addConditionalEdge(edge.from, () => firstTo);
    } else if (toValue && typeof toValue === 'object' && 'condition' in toValue) {
      const conditionMap = toValue.routes;
      agent.addConditionalEdge(edge.from, (state: LangGraphStateAnnotation) => {
        if (state.errors.length > 0 && conditionMap['error']) {
          return conditionMap['error'];
        }
        if (conditionMap['next']) {
          return conditionMap['next'];
        }
        return Object.values(conditionMap)[0] || '__end__';
      });
    } else if (edgeConditions[edge.from]) {
      agent.addConditionalEdge(edge.from, edgeConditions[edge.from]);
    }
  }

  if (config.workflow.entryPoint) {
    agent.setEntryPoint(config.workflow.entryPoint);
  } else {
    agent.setEntryPoint('analyst');
  }

  return agent;
}

export function loadAndBuildAgent(path: string): LangGraphAgent {
  const config = loadYamlAgent(path);
  return buildAgentFromYaml(config);
}
