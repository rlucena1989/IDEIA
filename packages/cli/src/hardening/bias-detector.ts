export interface BiasCategory {
  name: string;
  patterns: RegExp[];
  sensitivity: 'low' | 'medium' | 'high';
  description: string;
}

export interface BiasMatch {
  category: string;
  match: string;
  position: number;
  sensitivity: string;
}

export interface BiasReport {
  detected: boolean;
  matches: BiasMatch[];
  categories: string[];
  overallSensitivity: 'low' | 'medium' | 'high' | 'none';
  suggestion?: string;
}

const BIAS_CATEGORIES: BiasCategory[] = [
  {
    name: 'gender_bias',
    patterns: [
      /\b(all\s+)?men\s+(are|always|never)\b/i,
      /\b(all\s+)?women\s+(are|always|never)\b/i,
      /\b(female|male)\s+(driver|nurse|engineer|programmer|scientist)\b/i,
      /\b(women|men)\s+(can't|cannot|shouldn't)\s+/i,
    ],
    sensitivity: 'high',
    description: 'Generalizações baseadas em gênero',
  },
  {
    name: 'racial_bias',
    patterns: [
      /\b(all\s+)?(race|ethnicity)\s+(is|determines|predicts)\b/i,
      /\b(these|those)\s+people\s+(always|never|are)\s+/i,
    ],
    sensitivity: 'high',
    description: 'Generalizações raciais ou étnicas',
  },
  {
    name: 'age_bias',
    patterns: [
      /\b(all\s+)?(young|old|elderly)\s+people\s+(are|always|never|cannot)\b/i,
      /\b(young|old)\s+(generation|folks|people)\s+(don't|can't)\b/i,
    ],
    sensitivity: 'medium',
    description: 'Generalizações baseadas em idade',
  },
  {
    name: 'socioeconomic_bias',
    patterns: [
      /\b(poor|rich|wealthy)\s+people\s+(are|always|never|should)\b/i,
      /\b(lower|upper)\s+class\s+(people|families)\s+(are|always)\b/i,
    ],
    sensitivity: 'medium',
    description: 'Generalizações socioeconômicas',
  },
  {
    name: 'cultural_bias',
    patterns: [
      /\b(our|my)\s+(culture|country|religion)\s+is\s+(better|superior|correct)\b/i,
      /\b(their|those)\s+(culture|customs|traditions)\s+are\s+(wrong|inferior|backward)\b/i,
    ],
    sensitivity: 'high',
    description: 'Superioridade cultural ou religiosa',
  },
  {
    name: 'confirmation_bias',
    patterns: [
      /\b(as\s+I\s+(said|thought|knew|expected))\b/i,
      /\b(I\s+already\s+knew\s+that)\b/i,
      /\b(this\s+proves\s+(my|our)\s+point)\b/i,
    ],
    sensitivity: 'low',
    description: 'Viés de confirmação',
  },
];

const BIAS_SUGGESTIONS: Record<string, string> = {
  gender_bias: 'Evite generalizações de gênero. Use linguagem neutra e inclusiva.',
  racial_bias: 'Evite referências a raça ou etnia como fator determinante.',
  age_bias: 'Não assuma capacidades ou comportamentos baseados em idade.',
  socioeconomic_bias: 'Evite julgamentos baseados em condição socioeconômica.',
  cultural_bias: 'Mantenha neutralidade cultural. Todas as culturas têm valor.',
  confirmation_bias: 'Considere evidências contrárias antes de concluir.',
};

export class BiasDetector {
  private categories: BiasCategory[];

  constructor(customCategories?: BiasCategory[]) {
    this.categories = customCategories ?? BIAS_CATEGORIES;
  }

  analyze(text: string): BiasReport {
    const matches: BiasMatch[] = [];
    const categoriesFound = new Set<string>();
    let maxSensitivity = 0;
    const sensitivityOrder = ['low', 'medium', 'high'];

    for (const category of this.categories) {
      for (const pattern of category.patterns) {
        const match = text.match(pattern);
        if (match) {
          const pos = match.index ?? 0;
          matches.push({
            category: category.name,
            match: match[0].substring(0, 80),
            position: pos,
            sensitivity: category.sensitivity,
          });
          categoriesFound.add(category.name);
          const sensIdx = sensitivityOrder.indexOf(category.sensitivity);
          if (sensIdx > maxSensitivity) maxSensitivity = sensIdx;
        }
      }
    }

    return {
      detected: matches.length > 0,
      matches,
      categories: Array.from(categoriesFound),
      overallSensitivity: matches.length > 0 ? sensitivityOrder[maxSensitivity] as 'low' | 'medium' | 'high' : 'none',
      suggestion: matches.length > 0
        ? Array.from(categoriesFound).map(c => BIAS_SUGGESTIONS[c]).filter(Boolean).join(' ')
        : undefined,
    };
  }

  addCategory(category: BiasCategory): void {
    this.categories.push(category);
  }

  getCategories(): BiasCategory[] {
    return [...this.categories];
  }
}

export function createBiasDetector(): BiasDetector {
  return new BiasDetector();
}
