import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { JavaAdapter, createJavaAdapter } from '../src/index';
import { generateController, scaffoldProject } from '../src/generator';

describe('JavaAdapter', () => {
  let adapter: JavaAdapter;
  let tmpDir: string;

  beforeEach(() => {
    adapter = new JavaAdapter();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'java-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should have name and capabilities', () => {
    expect(adapter.name).toBe('java');
    expect(adapter.capabilities).toContain('detect');
    expect(adapter.capabilities).toContain('init');
    expect(adapter.capabilities).toContain('generateController');
  });

  it('detect() should detect pom.xml', () => {
    fs.writeFileSync(path.join(tmpDir, 'pom.xml'), '<project></project>');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should detect build.gradle', () => {
    fs.writeFileSync(path.join(tmpDir, 'build.gradle'), 'apply plugin: "java"');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should detect .java files', () => {
    fs.mkdirSync(path.join(tmpDir, 'src'));
    fs.writeFileSync(path.join(tmpDir, 'src', 'Main.java'), 'class Main {}');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should return false for empty directory', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('init() should scaffold Maven project', async () => {
    const result = await adapter.init(tmpDir);
    expect(result.success).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(tmpDir, 'pom.xml'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'src', 'main', 'resources', 'application.properties'))).toBe(true);
  });

  it('init() with generateExample should create controller', async () => {
    const result = await adapter.init(tmpDir, { generateExample: 'books', groupId: 'com.test' });
    expect(result.success).toBe(true);
    const controllerDir = path.join(tmpDir, 'src', 'main', 'java', 'com', 'test', 'books');
    expect(fs.existsSync(path.join(controllerDir, 'BooksController.java'))).toBe(true);
    expect(fs.existsSync(path.join(controllerDir, 'Books.java'))).toBe(true);
  });

  it('generateController() should create Java files', async () => {
    await adapter.generateController('products', tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'ProductsController.java'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'Products.java'))).toBe(true);
  });

  it('generateTemplate() should delegate correctly', async () => {
    const result = await adapter.generateTemplate('items');
    expect(typeof result).toBe('string');
  });

  it('qualityGate() should detect missing pom.xml', async () => {
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('qualityGate() should pass with proper structure', async () => {
    await adapter.init(tmpDir);
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it('createJavaAdapter factory works', () => {
    const instance = createJavaAdapter({ projectRoot: tmpDir });
    expect(instance).toBeInstanceOf(JavaAdapter);
    expect(instance.name).toBe('java');
  });

  it('scaffoldProject generates pom.xml', () => {
    const files = scaffoldProject('test-app', 'com.example');
    const pom = files.find(f => f.path.endsWith('pom.xml'));
    expect(pom).toBeDefined();
    expect(pom!.content).toContain('spring-boot-starter-parent');
  });

  it('generateController creates valid Java code', () => {
    const files = generateController('com.example.products', 'products', tmpDir);
    expect(files.length).toBe(2);
    const controller = files.find(f => f.path.endsWith('Controller.java'));
    expect(controller).toBeDefined();
    expect(controller!.content).toContain('@RestController');
    expect(controller!.content).toContain('ProductsController');
  });
});
