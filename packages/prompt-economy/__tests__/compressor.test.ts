import { ContextCompressor } from '../src/compressor/index';
import { CompressorInput } from '../src/types';

describe('ContextCompressor', () => {
  const compressor = new ContextCompressor();

  it('compresses with summarize strategy', async () => {
    const input: CompressorInput = {
      messages: [
        { role: 'user', content: 'Olá, quero criar um sistema de login', id: '1' },
        { role: 'assistant', content: 'Vou ajudar com isso', id: '2' },
        { role: 'user', content: 'Preciso de autenticação JWT', id: '3' },
      ],
      contextItems: [
        { id: 'ctx1', content: 'doc1', source: 'docs', priority: 5, tokenCount: 10, timestamp: new Date().toISOString() },
        { id: 'ctx2', content: 'doc2', source: 'docs', priority: 3, tokenCount: 10, timestamp: new Date().toISOString() },
      ],
      maxTokens: 4000,
      strategy: 'summarize',
    };

    const output = await compressor.compress(input);
    expect(output.originalTokens).toBeGreaterThan(0);
    expect(Array.isArray(output.messages)).toBe(true);
    expect(Array.isArray(output.contextItems)).toBe(true);
  });

  it('compresses with full strategy using deduplication', async () => {
    const input: CompressorInput = {
      messages: [
        { role: 'user', content: 'Consertar bug no login usando JWT', id: '1' },
        { role: 'user', content: 'Consertar bug no login usando JWT', id: '2' },
      ],
      contextItems: [],
      maxTokens: 100,
      strategy: 'full',
    };

    const output = await compressor.compress(input);
    expect(output.messages.length).toBeLessThanOrEqual(input.messages.length);
  });

  it('handles empty input', async () => {
    const input: CompressorInput = {
      messages: [],
      contextItems: [],
      maxTokens: 100,
      strategy: 'full',
    };

    const output = await compressor.compress(input);
    expect(output.originalTokens).toBe(0);
    expect(output.compressedTokens).toBe(0);
  });
});
