import { analyzeConcurrency } from '../runtime/concurrency-analyzer';

describe('concurrency-analyzer', () => {
  it('should detect sync fs calls', () => {
    const code = 'const data = fs.readFileSync("file.txt"); fs.writeFileSync("out.txt", data);';
    const report = analyzeConcurrency(code);
    const syncFs = report.findings.filter(f => f.name === 'sync_fs');
    expect(syncFs.length).toBeGreaterThanOrEqual(2);
    expect(report.blockingCalls.length).toBeGreaterThan(0);
  });

  it('should detect callback hell', () => {
    const code = 'request(url, function(err, res) { parseBody(res, function(err, body) { saveDb(body, function(err, id) { console.log(id); }); }); });';
    const report = analyzeConcurrency(code);
    expect(report.warnings).toBeGreaterThan(0);
    const cbNames = report.findings.map(f => f.name);
    expect(cbNames).toContain('callback_hell');
  });

  it('should detect sequential awaits', () => {
    const code = 'const a = await fetchA(); const b = await fetchB(); const c = await fetchC();';
    const report = analyzeConcurrency(code);
    const seqAwait = report.findings.find(f => f.name === 'promise_all_needed');
    expect(seqAwait).toBeDefined();
  });

  it('should score clean async code as 100', () => {
    const code = 'const [a, b] = await Promise.all([fetchA(), fetchB()]);';
    const report = analyzeConcurrency(code);
    expect(report.score).toBe(100);
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });
});