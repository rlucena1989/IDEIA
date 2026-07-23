import * as fs from 'fs'; import * as _path from 'path';
import { RealData } from '../src/real-data';
describe('RealData', () => {
  it('should register datasets', () => {
    const rd = new RealData();
    rd.registerDataset('users', 'csv', { name: 'string', age: 'number' }, 100);
    expect(rd.listDatasets()).toHaveLength(1);
  });
  it('should generate seed data', () => {
    const rd = new RealData();
    const data = rd.generateSeed({ entity: 'User', count: 5, fields: { name: { type: 'string', options: ['Alice','Bob'] }, age: { type: 'number', min: 18, max: 99 } } });
    expect(data).toHaveLength(5);
    expect(data[0]).toHaveProperty('name');
    expect(data[0]).toHaveProperty('age');
  });
  it('should generate seed file', () => {
    const rd = new RealData();
    const f = rd.generateSeedFile({ entity: 'Product', count: 3, fields: { title: { type: 'string', options: ['A','B','C'] }, price: { type: 'number', min: 10, max: 100 } } }, '__test_seed.json');
    expect(fs.existsSync(f)).toBe(true); fs.unlinkSync(f);
  });
  it('should register pipelines', () => {
    const rd = new RealData();
    rd.registerPipeline({ name: 'etl', source: 'csv', transforms: ['clean','validate'], destination: 'db' });
    expect(rd.getPipelines()).toHaveLength(1);
  });
  it('should handle various field types', () => {
    const rd = new RealData();
    const data = rd.generateSeed({ entity: 'Test', count: 1, fields: { active: { type: 'boolean' }, email: { type: 'email' }, date: { type: 'date' } } });
    expect(typeof data[0].active).toBe('boolean');
    expect(String(data[0].email)).toContain('@');
  });
});
