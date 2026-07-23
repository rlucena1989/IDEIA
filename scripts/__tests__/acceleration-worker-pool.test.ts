import { runInParallel } from '../acceleration/worker-pool';

describe('acceleration - worker-pool', () => {
  it('deve executar todas as tarefas', async () => {
    const results = await runInParallel([1, 2, 3], 2, async (n: number) => n * 2);
    expect(results).toEqual([2, 4, 6]);
  });

  it('deve respeitar concorrencia maxima', async () => {
    let maxConcurrent = 0;
    let current = 0;

    const results = await runInParallel([1, 2, 3, 4, 5], 2, async (n: number) => {
      current++;
      maxConcurrent = Math.max(maxConcurrent, current);
      await new Promise(r => setTimeout(r, 10));
      current--;
      return n;
    });

    expect(maxConcurrent).toBeLessThanOrEqual(2);
    expect(results).toEqual([1, 2, 3, 4, 5]);
  });

  it('deve lidar com array vazio', async () => {
    const results = await runInParallel([], 5, async (n: number) => n);
    expect(results).toEqual([]);
  });

  it('deve lidar com concorrencia maior que itens', async () => {
    const results = await runInParallel([1, 2], 10, async (n: number) => n * 3);
    expect(results).toEqual([3, 6]);
  });

  it('deve propagar erros', async () => {
    await expect(
      runInParallel([1, 2], 2, async (n: number) => {
        if (n === 2) throw new Error('fail');
        return n;
      })
    ).rejects.toThrow('fail');
  });
});