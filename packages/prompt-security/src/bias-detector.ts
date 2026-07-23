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
    description: 'Gender generalizations',
  },
  {
    name: 'racial_bias',
    patterns: [
      /\b(all\s+)?(race|ethnicity)\s+(is|determines|predicts)\b/i,
      /\b(these|those)\s+people\s+(always|never|are)\s+/i,
    ],
    sensitivity: 'high',
    description: 'Racial or ethnic generalizations',
  },
  {
    name: 'age_bias',
    patterns: [
      /\b(all\s+)?(young|old|elderly)\s+people\s+(are|always|never|cannot)\b/i,
      /\b(young|old)\s+(generation|folks|people)\s+(don't|can't)\b/i,
    ],
    sensitivity: 'medium',
    description: 'Age-based generalizations',
  },
  {
    name: 'socioeconomic_bias',
    patterns: [
      /\b(poor|rich|wealthy)\s+people\s+(are|always|never|should)\b/i,
      /\b(lower|upper)\s+class\s+(people|families)\s+(are|always)\b/i,
    ],
    sensitivity: 'medium',
    description: 'Socioeconomic generalizations',
  },
  {
    name: 'cultural_bias',
    patterns: [
      /\b(our|my)\s+(culture|country|religion)\s+is\s+(better|superior|correct)\b/i,
      /\b(their|those)\s+(culture|customs|traditions)\s+are\s+(wrong|inferior|backward)\b/i,
    ],
    sensitivity: 'high',
    description: 'Cultural or religious superiority',
  },
  {
    name: 'confirmation_bias',
    patterns: [
      /\b(as\s+I\s+(said|thought|knew|expected))\b/i,
      /\b(I\s+already\s+knew\s+that)\b/i,
      /\b(this\s+proves\s+(my|our)\s+point)\b/i,
    ],
    sensitivity: 'low',
    description: 'Confirmation bias',
  },
  {
    name: 'ability_bias',
    patterns: [
      /\b(disabled|handicapped)\s+people\s+(can't|cannot|shouldn't)\b/i,
      /\b(able[-\s]?bodied)\s+(is\s+)?(normal|better|superior)\b/i,
    ],
    sensitivity: 'high',
    description: 'Disability/ability-based discrimination',
  },
  {
    name: 'religious_bias',
    patterns: [
      /\b(all\s+)?(muslims|christians|jews|hindus|atheists)\s+(are|always|never)\b/i,
      /\b(religion|faith|belief)\s+(is\s+)?(wrong|evil|primitive|backward)\b/i,
    ],
    sensitivity: 'high',
    description: 'Religious discrimination',
  },
  {
    name: 'political_bias',
    patterns: [
      /\b(all\s+)?(democrats|republicans|liberals|conservatives)\s+(are|always|never)\b/i,
    ],
    sensitivity: 'medium',
    description: 'Political affiliation bias',
  },
  {
    name: 'body_bias',
    patterns: [
      /\b(overweight|obese|fat|skinny)\s+people\s+(are|always|should|shouldn't)\b/i,
    ],
    sensitivity: 'medium',
    description: 'Body type discrimination',
  },
];

const BIAS_SUGGESTIONS: Record<string, string> = {
  gender_bias: 'Avoid gender generalizations. Use neutral and inclusive language.',
  racial_bias: 'Avoid references to race or ethnicity as determining factors.',
  age_bias: 'Do not assume capabilities or behaviors based on age.',
  socioeconomic_bias: 'Avoid judgments based on socioeconomic status.',
  cultural_bias: 'Maintain cultural neutrality. All cultures have value.',
  confirmation_bias: 'Consider contrary evidence before concluding.',
  ability_bias: 'Avoid assumptions based on disability or ability status.',
  religious_bias: 'Maintain religious neutrality and respect all beliefs.',
  political_bias: 'Avoid generalizations based on political affiliation.',
  body_bias: 'Avoid discrimination based on body type or appearance.',
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

  validateOutput(text: string): BiasReport {
    return this.analyze(text);
  }
}

export function createBiasDetector(): BiasDetector {
  return new BiasDetector();
}
