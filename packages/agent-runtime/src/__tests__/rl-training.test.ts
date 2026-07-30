import { GRPOTrainer, RewardVerifier } from '../rl-training'

describe('RewardVerifier', () => {
  it('verifies exact match correctness', async () => {
    const verifier = new RewardVerifier({ type: 'correctness' })
    const result = await verifier.verify('the answer is 42', '42')
    expect(result.correct).toBe(true)
    expect(result.score).toBe(1.0)
  })

  it('rejects incorrect answers', async () => {
    const verifier = new RewardVerifier({ type: 'correctness' })
    const result = await verifier.verify('the answer is 7', '42')
    expect(result.correct).toBe(false)
    expect(result.score).toBe(0.0)
  })

  it('executes valid JS code', async () => {
    const verifier = new RewardVerifier({ type: 'execution-based' })
    const result = await verifier.verify('const x = 1;', '')
    expect(result.correct).toBe(true)
  })
})

describe('GRPOTrainer', () => {
  let trainer: GRPOTrainer
  let verifier: RewardVerifier

  beforeEach(() => {
    trainer = new GRPOTrainer({ groupSize: 4, policyEpochs: 2, clipEpsilon: 0.2, miniBatchSize: 2 })
    verifier = new RewardVerifier({ type: 'correctness' })
  })

  const mockGenerator = async (_prompt: string, n: number): Promise<string[]> => {
    return Array.from({ length: n }, (_, i) => `response ${i} with answer 42`)
  }

  it('executes a training step', async () => {
    const episode = await trainer.trainStep('What is the answer?', mockGenerator, verifier, '42')
    expect(episode.id).toBeDefined()
    expect(episode.responses.length).toBe(4)
    expect(episode.bestReward).toBeGreaterThanOrEqual(0)
    expect(episode.avgReward).toBeGreaterThanOrEqual(0)
    expect(typeof episode.policyLoss).toBe('number')
    expect(typeof episode.klDivergence).toBe('number')
    expect(typeof episode.totalLoss).toBe('number')
    expect(episode.advantages.length).toBe(4)
  })

  it('computes policy loss (may be zero when all answers identical)', async () => {
    const episode = await trainer.trainStep('Solve: 2+2', mockGenerator, verifier, '4')
    expect(typeof episode.policyLoss).toBe('number')
  })

  it('tracks training history', async () => {
    await trainer.trainStep('Q1', mockGenerator, verifier, 'A1')
    await trainer.trainStep('Q2', mockGenerator, verifier, 'A2')
    expect(trainer.getHistory().length).toBe(2)
    const stats = trainer.getStats()
    expect(stats.totalEpisodes).toBe(2)
    expect(typeof stats.avgReward).toBe('number')
  })

  it('resets training state', async () => {
    await trainer.trainStep('Q1', mockGenerator, verifier, 'A1')
    trainer.reset()
    expect(trainer.getHistory().length).toBe(0)
    expect(trainer.getStats().totalEpisodes).toBe(0)
  })

  it('returns config', () => {
    const config = trainer.getConfig()
    expect(config.algorithm).toBe('grpo')
    expect(config.groupSize).toBe(4)
    expect(config.clipEpsilon).toBe(0.2)
  })
})
