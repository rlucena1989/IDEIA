import { Complexity, Stage, SemanticNeed } from './semantic-types';

const TECH_KEYWORDS: Record<string, string[]> = {
  typescript: ['typescript', 'ts', 'tsx'],
  javascript: ['javascript', 'js', 'jsx', 'ecmascript', 'es6'],
  python: ['python', 'django', 'flask', 'fastapi'],
  java: ['java', 'spring', 'jakarta'],
  rust: ['rust', 'cargo'],
  go: ['golang', 'go'],
  react: ['react', 'reactjs', 'nextjs', 'next.js'],
  angular: ['angular', 'angularjs'],
  vue: ['vue', 'vuejs', 'nuxt', 'nuxtjs'],
  node: ['node', 'nodejs', 'node.js', 'express', 'nestjs'],
  docker: ['docker', 'container'],
  kubernetes: ['kubernetes', 'k8s'],
  postgresql: ['postgresql', 'postgres', 'pg'],
  mongodb: ['mongodb', 'mongo', 'mongoose'],
  redis: ['redis'],
  graphql: ['graphql', 'apollo', 'gql'],
  rest: ['rest', 'restful', 'rest api'],
  aws: ['aws', 'ec2', 's3', 'lambda', 'cloudformation'],
  azure: ['azure', 'azure devops'],
  gcp: ['gcp', 'google cloud', 'gke'],
  firebase: ['firebase', 'firestore'],
};

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  web: ['web', 'website', 'webapp', 'web app', 'spa', 'frontend', 'front-end'],
  api: ['api', 'rest', 'graphql', 'endpoint', 'microservice'],
  backend: ['backend', 'back-end', 'server', 'service'],
  mobile: ['mobile', 'ios', 'android', 'react native', 'flutter'],
  data: ['data', 'analytics', 'pipeline', 'etl', 'big data', 'database'],
  ml: ['ml', 'machine learning', 'ai', 'neural', 'deep learning', 'model'],
  devops: ['devops', 'ci/cd', 'deploy', 'infrastructure', 'terraform'],
  security: ['security', 'auth', 'authentication', 'vulnerability', 'compliance'],
  blockchain: ['blockchain', 'web3', 'solidity', 'smart contract', 'crypto'],
  iot: ['iot', 'internet of things', 'sensor', 'embedded'],
};

const COMPLEXITY_INDICATORS: Record<string, string[]> = {
  high: ['distributed', 'microservices', 'real-time', 'high-throughput', 'multi-tenant', 'event-driven', 'crdt', 'eventual consistency', 'fault-tolerant'],
  moderate: ['api', 'database', 'cache', 'queue', 'authentication', 'authorization', 'rest', 'graphql'],
};

const STAGE_INDICATORS: Record<string, string[]> = {
  idea: ['idea', 'concept', 'brainstorm', 'think about', 'planning', 'poc', 'proof of concept'],
  mvp: ['mvp', 'minimum viable', 'prototype', 'quick', 'initial'],
  growth: ['scale', 'growth', 'expand', 'optimize', 'improve', 'migrate'],
  mature: ['enterprise', 'production', 'high-available', 'disaster recovery', 'compliance'],
};

export class SemanticAnalyzer {
  analyze(description: string, teamSize: number = 1): SemanticNeed {
    const techStack = this.extractTechStack(description);
    const domain = this.detectDomain(description);
    const keywords = this.extractKeywords(description);
    const complexity = this.detectComplexity(description, keywords);
    const stage = this.detectStage(description);

    return {
      description,
      techStack,
      domain,
      complexity,
      teamSize,
      stage,
    };
  }

  extractKeywords(text: string): string[] {
    const lower = text.toLowerCase();
    const tokens = lower.split(/[\s,;:.!?()[\\\]{}"'`~@#$%^&*+=|<>/]+/).filter(Boolean);
    const bigrams: string[] = [];
    for (let i = 0; i < tokens.length - 1; i++) {
      bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
    }

    const seen = new Set<string>();
    const all = [...tokens, ...bigrams];
    for (const t of all) {
      if (t.length >= 2) seen.add(t);
    }

    return Array.from(seen);
  }

  detectComplexity(_text: string, features: string[]): Complexity {
    const lowerFeatures = features.join(' ').toLowerCase();

    for (const indicator of COMPLEXITY_INDICATORS.high) {
      if (lowerFeatures.includes(indicator)) return 'complex';
    }

    for (const indicator of COMPLEXITY_INDICATORS.moderate) {
      if (lowerFeatures.includes(indicator)) return 'moderate';
    }

    return 'simple';
  }

  detectStage(text: string): Stage {
    const lower = text.toLowerCase();

    for (const [stage, indicators] of Object.entries(STAGE_INDICATORS)) {
      for (const indicator of indicators) {
        if (lower.includes(indicator)) return stage as Stage;
      }
    }

    return 'idea';
  }

  private extractTechStack(text: string): string[] {
    const lower = text.toLowerCase();
    const found: string[] = [];

    for (const [tech, aliases] of Object.entries(TECH_KEYWORDS)) {
      for (const alias of aliases) {
        if (lower.includes(alias)) {
          found.push(tech);
          break;
        }
      }
    }

    return found;
  }

  private detectDomain(text: string): string {
    const lower = text.toLowerCase();
    const scores: Record<string, number> = {};

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      scores[domain] = 0;
      for (const kw of keywords) {
        if (lower.includes(kw)) scores[domain]++;
      }
    }

    let bestDomain = 'web';
    let bestScore = 0;

    for (const [domain, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestDomain = domain;
      }
    }

    return bestDomain;
  }
}
