import { sumKahan, sumKahanWithError, sumNaive } from '../acceleration/kahan-sum';
import { WelfordAggregator, varianceWelford, stddevWelford, meanWelford } from '../acceleration/welford-variance';
import {
  detectDomain,
  getDomainPrecision,
  applyDomainPrecision,
  applyPrecision,
  listDomains,
} from '../acceleration/domain-precision';
import { IncrementalEngine } from '../acceleration/incremental-engine';
import { Interval, interval, intervalFromMeasurement } from '../acceleration/interval-arithmetic';
import { validateBySample, validateMeanBySample, validateSumBySample } from '../acceleration/sample-validator';

const EPS = 1e-9;

const double = (...args: unknown[]): number => (args[0] as number) * 2;
const square = (...args: unknown[]): number => (args[0] as number) ** 2;
const addFive = (...args: unknown[]): number => (args[0] as number) + 5;
const identity = (...args: unknown[]): unknown => args[0];

describe('acceleration - kahan-sum', () => {
  it('deve somar valores basicos corretamente', () => {
    expect(sumKahan([1, 2, 3, 4, 5])).toBe(15);
  });

  it('deve ser mais preciso que a soma ingenua para muitos decimais', () => {
    const data: number[] = [];
    for (let i = 0; i < 100000; i++) data.push(0.1);
    const expected = 10000;
    const kahanResult = sumKahan(data);
    const naiveResult = sumNaive(data);
    expect(Math.abs(kahanResult - expected)).toBeLessThan(Math.abs(naiveResult - expected));
  });

  it('deve retornar 0 para array vazio', () => {
    expect(sumKahan([])).toBe(0);
  });

  it('deve retornar o proprio valor para um unico elemento', () => {
    expect(sumKahan([42])).toBe(42);
  });

  it('deve somar numeros grandes sem perda de magnitude', () => {
    expect(sumKahan([1e10, 2e10, 3e10])).toBe(6e10);
    expect(sumKahanWithError([1e15, 2e15, 3e15]).sum).toBe(6e15);
  });
});

describe('acceleration - welford-variance', () => {
  it('deve calcular media e variancia populacional corretamente', () => {
    const agg = new WelfordAggregator();
    [1, 2, 3, 4, 5].forEach((v) => agg.push(v));
    expect(Math.abs(agg.mean - 3)).toBeLessThan(EPS);
    expect(Math.abs(agg.variance - 2)).toBeLessThan(EPS);
    expect(Math.abs(agg.sampleVariance - 2.5)).toBeLessThan(EPS);
    expect(Math.abs(agg.stddev - Math.sqrt(2))).toBeLessThan(EPS);
    expect(agg.count).toBe(5);
  });

  it('deve atualizar a media progressivamente em streaming', () => {
    const agg = new WelfordAggregator();
    agg.push(10);
    expect(Math.abs(agg.mean - 10)).toBeLessThan(EPS);
    agg.push(20);
    expect(Math.abs(agg.mean - 15)).toBeLessThan(EPS);
    agg.push(30);
    expect(Math.abs(agg.mean - 20)).toBeLessThan(EPS);
    expect(agg.count).toBe(3);
  });

  it('deve fundir dois agregadores preservando estatisticas', () => {
    const a = new WelfordAggregator();
    [1, 2, 3].forEach((v) => a.push(v));
    const b = new WelfordAggregator();
    [4, 5].forEach((v) => b.push(v));
    a.merge(b);
    expect(a.count).toBe(5);
    expect(Math.abs(a.mean - 3)).toBeLessThan(EPS);
    expect(Math.abs(a.variance - 2)).toBeLessThan(EPS);
  });

  it('deve resetar agregador para o estado inicial', () => {
    const agg = new WelfordAggregator();
    [1, 2, 3, 4, 5].forEach((v) => agg.push(v));
    agg.reset();
    expect(agg.count).toBe(0);
    expect(agg.mean).toBe(0);
    expect(agg.variance).toBe(0);
  });

  it('deve lidar com um unico elemento (variancia zero)', () => {
    const agg = new WelfordAggregator();
    agg.push(42);
    expect(agg.count).toBe(1);
    expect(Math.abs(agg.mean - 42)).toBeLessThan(EPS);
    expect(agg.variance).toBe(0);
    expect(agg.sampleVariance).toBe(0);
    expect(agg.stddev).toBe(0);
  });

  it('deve retornar variancia zero para valores iguais', () => {
    const agg = new WelfordAggregator();
    [5, 5, 5].forEach((v) => agg.push(v));
    expect(agg.variance).toBe(0);
    expect(agg.sampleVariance).toBe(0);
    expect(agg.stddev).toBe(0);
  });

  it('deve lidar com valores negativos', () => {
    const agg = new WelfordAggregator();
    [-3, -1, 1, 3].forEach((v) => agg.push(v));
    expect(Math.abs(agg.mean - 0)).toBeLessThan(EPS);
    expect(Math.abs(agg.variance - 5)).toBeLessThan(EPS);
    expect(agg.count).toBe(4);
  });

  it('deve processar um grande conjunto de dados com precisao', () => {
    const agg = new WelfordAggregator();
    for (let i = 1; i <= 1000; i++) agg.push(i);
    expect(agg.count).toBe(1000);
    expect(Math.abs(agg.mean - 500.5)).toBeLessThan(1e-6);
    expect(Math.abs(agg.variance - 83333.25)).toBeLessThan(1.0);
  });

  it('deve manter media e variancia zero para valores identicos', () => {
    const agg = new WelfordAggregator();
    [7, 7, 7, 7].forEach((v) => agg.push(v));
    expect(Math.abs(agg.mean - 7)).toBeLessThan(EPS);
    expect(agg.variance).toBe(0);
    expect(agg.count).toBe(4);
  });

  it('deve fundir agregador vazio sem alterar o original', () => {
    const agg = new WelfordAggregator();
    [1, 2, 3].forEach((v) => agg.push(v));
    const empty = new WelfordAggregator();
    agg.merge(empty);
    expect(agg.count).toBe(3);
    expect(Math.abs(agg.mean - 2)).toBeLessThan(EPS);

    const intoEmpty = new WelfordAggregator();
    intoEmpty.merge(agg);
    expect(intoEmpty.count).toBe(3);
    expect(Math.abs(intoEmpty.mean - 2)).toBeLessThan(EPS);
  });
});

describe('acceleration - domain-precision', () => {
  it('deve aplicar precisao 2 para dominio financeiro', () => {
    expect(getDomainPrecision('finance')).toBe(2);
    expect(Math.abs(applyDomainPrecision(3.14159265, 'finance') - 3.14)).toBeLessThan(EPS);
  });

  it('deve aplicar precisao 4 para dominio fisico', () => {
    expect(getDomainPrecision('physics')).toBe(4);
    expect(Math.abs(applyDomainPrecision(3.14159265, 'physics') - 3.1416)).toBeLessThan(EPS);
  });

  it('deve aplicar precisao 6 para dominio estatistico', () => {
    expect(getDomainPrecision('statistics')).toBe(6);
    expect(Math.abs(applyDomainPrecision(3.14159265, 'statistics') - 3.141593)).toBeLessThan(EPS);
  });

  it('deve usar dominio geral (precisao 4) para entrada desconhecida', () => {
    expect(detectDomain('zzz qq bb abc')).toBe('general');
    expect(getDomainPrecision('general')).toBe(4);
  });

  it('deve detectar dominio e arredondar atraves de applyPrecision', () => {
    expect(Math.abs(applyPrecision(9.87654321, 'preco financeiro') - 9.88)).toBeLessThan(EPS);
    expect(Math.abs(applyPrecision(9.87654321, 'calcular variance do conjunto') - 9.876543)).toBeLessThan(EPS);
    expect(listDomains().length).toBeGreaterThanOrEqual(5);
  });
});

describe('acceleration - incremental-engine', () => {
  it('deve registrar cache miss na primeira execucao', () => {
    const engine = new IncrementalEngine();
    const result = engine.compute('k', [1], double);
    expect(result).toBe(2);
    expect(engine.misses).toBe(1);
    expect(engine.hits).toBe(0);
    expect(engine.size).toBe(1);
  });

  it('deve registrar cache hit na segunda execucao com mesmo input', () => {
    const engine = new IncrementalEngine();
    engine.compute('k', [1], double);
    const result = engine.compute('k', [1], double);
    expect(result).toBe(2);
    expect(engine.hits).toBe(1);
    expect(engine.misses).toBe(1);
  });

  it('deve invalidar cache quando a flag dirty e ativada', () => {
    const engine = new IncrementalEngine();
    engine.compute('k', [1], double);
    engine.markDirty('k');
    expect(engine.dirtyCount).toBe(1);
    const result = engine.compute('k', [1], double);
    expect(result).toBe(2);
    expect(engine.misses).toBe(2);
    expect(engine.hits).toBe(0);
  });

  it('deve produzir resultados diferentes para inputs diferentes na mesma chave', () => {
    const engine = new IncrementalEngine();
    const r1 = engine.compute('k', [5], double);
    const r2 = engine.compute('k', [6], double);
    expect(r1).toBe(10);
    expect(r2).toBe(12);
    expect(engine.misses).toBe(2);
  });

  it('deve manter slots separados para chaves diferentes com mesmo input', () => {
    const engine = new IncrementalEngine();
    engine.compute('a', [1], double);
    engine.compute('b', [1], double);
    expect(engine.size).toBe(2);
    engine.compute('a', [1], double);
    engine.compute('b', [1], double);
    expect(engine.hits).toBe(2);
  });

  it('deve invalidar manualmente por prefixo de chave', () => {
    const engine = new IncrementalEngine();
    engine.compute('grp:1', [1], double);
    engine.compute('grp:2', [2], double);
    engine.compute('other', [3], double);
    engine.invalidate('grp:');
    const r1 = engine.compute('grp:1', [1], double);
    const r2 = engine.compute('other', [3], double);
    expect(r1).toBe(2);
    expect(r2).toBe(6);
    expect(engine.misses).toBe(4);
    expect(engine.hits).toBe(1);
  });

  it('deve suportar dependencias aninhadas em cascata', () => {
    const engine = new IncrementalEngine();
    const base = engine.compute('base', [10], square);
    const derived = engine.compute('derived', [base], addFive);
    expect(base).toBe(100);
    expect(derived).toBe(105);
    const base2 = engine.compute('base', [12], square);
    const derived2 = engine.compute('derived', [base2], addFive);
    expect(base2).toBe(144);
    expect(derived2).toBe(149);
    expect(engine.misses).toBe(4);
  });

  it('deve processar um input grande e reutilizar cache', () => {
    const engine = new IncrementalEngine();
    const makeBig = (): number[] => Array.from({ length: 10000 }, (_, i) => i);
    const r1 = engine.compute('big', [makeBig()], (...args) => (args[0] as number[]).length);
    const r2 = engine.compute('big', [makeBig()], (...args) => (args[0] as number[]).length);
    expect(r1).toBe(10000);
    expect(r2).toBe(10000);
    expect(engine.misses).toBe(1);
    expect(engine.hits).toBe(1);
  });

  it('deve lidar com input vazio e armazenar em cache', () => {
    const engine = new IncrementalEngine();
    const r1 = engine.compute('empty', [], () => 42);
    const r2 = engine.compute('empty', [], () => 99);
    expect(r1).toBe(42);
    expect(r2).toBe(42);
    expect(engine.hits).toBe(1);
  });

  it('deve suportar padrao de acesso intercalado entre chaves', () => {
    const engine = new IncrementalEngine();
    engine.compute('a', [1], double);
    engine.compute('b', [2], double);
    engine.compute('a', [1], double);
    engine.compute('b', [2], double);
    engine.compute('c', [3], double);
    expect(engine.misses).toBe(3);
    expect(engine.hits).toBe(2);
    expect(engine.size).toBe(3);
  });

  it('deve remover uma entrada do cache', () => {
    const engine = new IncrementalEngine();
    engine.compute('k', [1], double);
    expect(engine.size).toBe(1);
    engine.remove('k');
    expect(engine.size).toBe(0);
    const result = engine.compute('k', [1], double);
    expect(result).toBe(2);
    expect(engine.misses).toBe(2);
  });

  it('deve limpar todo o estado com clear', () => {
    const engine = new IncrementalEngine();
    engine.compute('a', [1], double);
    engine.compute('b', [2], double);
    engine.compute('a', [1], double);
    engine.clear();
    expect(engine.size).toBe(0);
    expect(engine.hits).toBe(0);
    expect(engine.misses).toBe(0);
    expect(engine.dirtyCount).toBe(0);
  });

  it('deve marcar todas as entradas como dirty com markAllDirty', () => {
    const engine = new IncrementalEngine();
    engine.compute('a', [1], double);
    engine.compute('b', [2], double);
    engine.compute('c', [3], double);
    engine.markAllDirty();
    expect(engine.dirtyCount).toBe(3);
    engine.compute('a', [1], double);
    expect(engine.misses).toBe(4);
    expect(engine.hits).toBe(0);
  });

  it('deve retornar metricas corretas em getStats', () => {
    const engine = new IncrementalEngine();
    engine.compute('x', [1], double);
    engine.compute('x', [1], double);
    engine.compute('y', [1], double);
    const stats = engine.getStats();
    expect(stats.entries).toBe(2);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(2);
    expect(stats.dirtyCount).toBe(0);
    expect(stats.hitRate).toBe(33.33);
  });

  it('deve rastrear dirtyCount ao longo de invalidacoes', () => {
    const engine = new IncrementalEngine();
    engine.compute('k', [1], double);
    expect(engine.dirtyCount).toBe(0);
    engine.markDirty('k');
    expect(engine.dirtyCount).toBe(1);
    engine.compute('k', [1], double);
    expect(engine.dirtyCount).toBe(2);
    engine.markAllDirty();
    expect(engine.dirtyCount).toBe(1);
  });
});

describe('acceleration - interval-arithmetic', () => {
  it('deve somar dois intervalos', () => {
    const r = new Interval(1, 2).add(new Interval(3, 4));
    expect(Math.abs(r.low - 4)).toBeLessThan(EPS);
    expect(Math.abs(r.high - 6)).toBeLessThan(EPS);
  });

  it('deve subtrair dois intervalos', () => {
    const r = new Interval(5, 6).sub(new Interval(3, 4));
    expect(Math.abs(r.low - 1)).toBeLessThan(EPS);
    expect(Math.abs(r.high - 3)).toBeLessThan(EPS);
  });

  it('deve multiplicar intervalos positivos', () => {
    const r = new Interval(1, 2).mul(new Interval(3, 4));
    expect(Math.abs(r.low - 3)).toBeLessThan(EPS);
    expect(Math.abs(r.high - 8)).toBeLessThan(EPS);
  });

  it('deve multiplicar intervalos negativos', () => {
    const r = new Interval(-2, -1).mul(new Interval(-4, -3));
    expect(Math.abs(r.low - 3)).toBeLessThan(EPS);
    expect(Math.abs(r.high - 8)).toBeLessThan(EPS);
  });

  it('deve multiplicar intervalos com sinais mistos', () => {
    const r = new Interval(-1, 2).mul(new Interval(3, 4));
    expect(Math.abs(r.low - -4)).toBeLessThan(EPS);
    expect(Math.abs(r.high - 8)).toBeLessThan(EPS);
  });

  it('deve dividir dois intervalos', () => {
    const r = new Interval(3, 8).div(new Interval(1, 2));
    expect(Math.abs(r.low - 1.5)).toBeLessThan(EPS);
    expect(Math.abs(r.high - 8)).toBeLessThan(EPS);
  });

  it('deve elevar intervalo a potencia (par e cruzando zero)', () => {
    const r1 = new Interval(2, 3).pow(2);
    expect(Math.abs(r1.low - 4)).toBeLessThan(EPS);
    expect(Math.abs(r1.high - 9)).toBeLessThan(EPS);
    const r2 = new Interval(-2, 3).pow(2);
    expect(Math.abs(r2.low - 0)).toBeLessThan(EPS);
    expect(Math.abs(r2.high - 9)).toBeLessThan(EPS);
  });

  it('deve calcular o inverso de um intervalo', () => {
    const r = new Interval(2, 4).inverse();
    expect(Math.abs(r.low - 0.25)).toBeLessThan(EPS);
    expect(Math.abs(r.high - 0.5)).toBeLessThan(EPS);
  });

  it('deve verificar se um ponto esta contido no intervalo', () => {
    const i = new Interval(1, 5);
    expect(i.contains(3)).toBe(true);
    expect(i.contains(1)).toBe(true);
    expect(i.contains(5)).toBe(true);
    expect(i.contains(0)).toBe(false);
    expect(i.contains(6)).toBe(false);
  });

  it('deve verificar se um intervalo esta contido em outro', () => {
    const outer = new Interval(1, 10);
    expect(outer.contains(5) && outer.contains(8)).toBe(true);
    expect(outer.contains(0) || outer.contains(11)).toBe(false);
  });

  it('deve calcular a largura do intervalo', () => {
    expect(Math.abs(new Interval(1, 5).width() - 4)).toBeLessThan(EPS);
  });

  it('deve calcular o ponto medio do intervalo', () => {
    expect(Math.abs(new Interval(1, 5).midpoint() - 3)).toBeLessThan(EPS);
  });

  it('deve lidar com intervalo de largura zero', () => {
    const z = new Interval(5, 5);
    expect(z.width()).toBe(0);
    expect(Math.abs(z.midpoint() - 5)).toBeLessThan(EPS);
    expect(z.contains(5)).toBe(true);
    expect(z.contains(4)).toBe(false);
  });

  it('deve retornar infinito na divisao por intervalo contendo zero', () => {
    const r = new Interval(1, 2).div(new Interval(-1, 1));
    expect(r.low).toBe(-Infinity);
    expect(r.high).toBe(Infinity);
  });

  it('deve normalizar limites invertidos no construtor', () => {
    const i = new Interval(5, 1);
    expect(i.low).toBe(1);
    expect(i.high).toBe(5);
  });
});

describe('acceleration - sample-validator', () => {
  it('deve retornar resultado de amostragem com campos esperados', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = validateBySample(data, 5, (b) => b.reduce((a, c) => a + c, 0) / b.length, 0.05);
    expect(result).toHaveProperty('sampleResult');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('errorMargin');
    expect(result.sampleSize).toBe(5);
    expect(result.fullSize).toBe(10);
    expect(typeof result.sampleResult).toBe('number');
  });

  it('deve aprovar quando a media amostral esta dentro da tolerancia', () => {
    const result = validateMeanBySample([1, 2, 3, 4, 5], 3, 0.5);
    expect(result.passed).toBe(true);
  });

  it('deve calcular soma amostral e total corretamente', () => {
    const result = validateSumBySample([10, 20, 30], 5, 0.05);
    expect(result.passed).toBe(true);
    expect(result.sampleResult).toBe(60);
    expect(result.fullResult).toBe(60);
  });

  it('deve rejeitar com threshold estrito e aprovar com threshold largo', () => {
    const strict = validateMeanBySample([1, 2, 3, 4, 5], 3, 0.05);
    const loose = validateMeanBySample([1, 2, 3, 4, 5], 3, 0.5);
    expect(strict.passed).toBe(false);
    expect(loose.passed).toBe(true);
  });

  it('deve respeitar min(sampleSize, data.length) no tamanho da amostra', () => {
    const bigger = validateBySample([1, 2, 3], 10, (b) => b.length, 0.05);
    expect(bigger.sampleSize).toBe(3);
    const smaller = validateBySample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3, (b) => b.length, 0.05);
    expect(smaller.sampleSize).toBe(3);
  });

  it('deve calcular o nivel de confianca conforme a razao amostral', () => {
    const partial = validateMeanBySample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 2, 0.05);
    expect(partial.confidence).toBe(0.4);
    const full = validateMeanBySample([1, 2, 3, 4, 5], 10, 0.05);
    expect(full.confidence).toBe(1);
  });

  it('deve retornar passed=true e sampleResult=0 para dados vazios', () => {
    const result = validateBySample([], 5, (b) => b.reduce((a, c) => a + c, 0), 0.05);
    expect(result.passed).toBe(true);
    expect(result.sampleResult).toBe(0);
    expect(result.confidence).toBe(1);
    expect(result.sampleSize).toBe(0);
    expect(result.fullSize).toBe(0);
  });

  it('deve processar uma amostra unica corretamente', () => {
    const result = validateMeanBySample([5], 3, 0.05);
    expect(result.passed).toBe(true);
    expect(result.sampleSize).toBe(1);
    expect(Math.abs(result.sampleResult - 5)).toBeLessThan(EPS);
  });

  it('deve produzir media amostral igual a total para valores identicos', () => {
    const result = validateMeanBySample([4, 4, 4, 4, 4], 3, 0.05);
    expect(result.passed).toBe(true);
    expect(result.sampleResult).toBe(result.fullResult);
  });

  it('deve processar uma amostra grande sem erros', () => {
    const data = Array.from({ length: 1000 }, (_, i) => i + 1);
    const result = validateMeanBySample(data, 100, 0.05);
    expect(result.fullSize).toBe(1000);
    expect(result.sampleSize).toBe(100);
    expect(typeof result.sampleResult).toBe('number');
    expect(typeof result.confidence).toBe('number');
  });
});
