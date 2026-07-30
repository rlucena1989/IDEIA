import { DistillationSample, FilterConfig } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('trajectory-filter');

export interface SkillProfile {
  name: string
  domains: string[]
  weaknessThreshold: number
}

export interface FilterResult {
  passed: DistillationSample[]
  rejected: DistillationSample[]
  stats: {
    total: number
    passed: number
    rejected: number
    ratio: number
    diversityScore: number
    skillCoverage: Record<string, number>
  }
}

export class TrajectoryFilter {
  private skills: SkillProfile[] = []

  registerSkill(skill: SkillProfile): void {
    this.skills.push(skill)
  }

  filter(samples: DistillationSample[], config: FilterConfig): FilterResult {
    let passed = [...samples]

    if (config.strategy === 'correctness' || config.verifyWith) {
      passed = passed.filter(s => s.verified)
    }

    if (config.strategy === 'skill-aware' && this.skills.length > 0) {
      passed = this.skillAwareFilter(passed, config)
    }

    if (config.strategy === 'difficulty') {
      passed = this.difficultyFilter(passed)
    }

    passed = this.diversityFilter(passed, config)

    if (config.maxSamples > 0 && passed.length > config.maxSamples) {
      passed = passed.slice(0, config.maxSamples)
    }

    const passedIds = new Set(passed.map(s => s.id))
    const rejected = samples.filter(s => !passedIds.has(s.id))

    const skillCoverage: Record<string, number> = {}
    for (const skill of this.skills) {
      const covered = passed.filter(s =>
        skill.domains.some(d => s.prompt.toLowerCase().includes(d))
      )
      skillCoverage[skill.name] = passed.length > 0 ? covered.length / passed.length : 0
    }

    return {
      passed,
      rejected,
      stats: {
        total: samples.length,
        passed: passed.length,
        rejected: rejected.length,
        ratio: samples.length > 0 ? passed.length / samples.length : 0,
        diversityScore: this.calculateDiversityScore(passed),
        skillCoverage,
      },
    }
  }

  private skillAwareFilter(samples: DistillationSample[], config: FilterConfig): DistillationSample[] {
    const scored = samples.map(s => {
      let skillScore = 0
      for (const skill of this.skills) {
        const domainMatch = skill.domains.some(d => s.prompt.toLowerCase().includes(d))
        if (domainMatch) {
          skillScore += skill.weaknessThreshold
        }
      }
      const verifiedBonus = s.verified ? 0.3 : 0
      const difficultyBonus = (s.score || 0.5) * 0.2
      return { sample: s, score: skillScore + verifiedBonus + difficultyBonus }
    })

    scored.sort((a, b) => b.score - a.score)
    return scored.map(s => s.sample)
  }

  private difficultyFilter(samples: DistillationSample[]): DistillationSample[] {
    return [...samples].sort((a, b) => (b.score || 0.5) - (a.score || 0.5))
  }

  private diversityFilter(samples: DistillationSample[], config: FilterConfig): DistillationSample[] {
    if (config.strategy !== 'diversity' && config.strategy !== 'skill-aware') return samples

    const seen = new Set<string>()
    const semanticBuckets = new Map<string, DistillationSample[]>()

    for (const sample of samples) {
      const prefix = sample.prompt.split(' ').slice(0, 8).join(' ')
      let bucket = semanticBuckets.get(prefix)
      if (!bucket) {
        bucket = []
        semanticBuckets.set(prefix, bucket)
      }
      bucket.push(sample)
    }

    const result: DistillationSample[] = []
    for (const [, bucket] of semanticBuckets) {
      bucket.sort((a, b) => (b.score || 0) - (a.score || 0))
      result.push(bucket[0])
    }

    return result
  }

  private calculateDiversityScore(samples: DistillationSample[]): number {
    if (samples.length < 2) return 1

    const prefixes = new Set(samples.map(s => s.prompt.split(' ').slice(0, 5).join(' ')))
    return Math.min(1, prefixes.size / Math.max(1, samples.length * 0.3))
  }
}
