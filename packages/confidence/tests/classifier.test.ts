import { SemanticClassifier, createClassifier } from '../src/classifier';
import { ClassificationResultSchema } from '../src/types';

describe('SemanticClassifier', () => {
  let classifier: SemanticClassifier;

  beforeEach(() => {
    classifier = new SemanticClassifier();
  });

  describe('classify', () => {
    it('should classify web development input', () => {
      const result = classifier.classify('Create a React component with HTML and CSS');
      
      expect(result.domain).toContain('web-development');
      expect(result.keywords).toEqual(expect.arrayContaining(['react', 'html', 'css']));
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should classify backend input', () => {
      const result = classifier.classify('Build a REST API server with database');
      
      expect(result.domain).toContain('backend');
      expect(result.keywords).toEqual(expect.arrayContaining(['server', 'rest', 'api', 'database']));
    });

    it('should classify devops input', () => {
      const result = classifier.classify('Deploy with Docker and Kubernetes CI/CD pipeline');
      
      expect(result.domain).toContain('devops');
      expect(result.keywords).toEqual(expect.arrayContaining(['deploy', 'docker', 'kubernetes', 'ci', 'cd']));
    });

    it('should classify security input', () => {
      const result = classifier.classify('Implement OAuth JWT authentication');
      
      expect(result.domain).toContain('security');
      expect(result.keywords).toEqual(expect.arrayContaining(['auth', 'oauth', 'jwt']));
    });

    it('should classify data science input', () => {
      const result = classifier.classify('Train ML model with dataset features');
      
      expect(result.domain).toContain('data-science');
      expect(result.keywords).toEqual(expect.arrayContaining(['ml', 'model', 'dataset', 'feature']));
    });

    it('should detect simple complexity', () => {
      const result = classifier.classify('Create a simple CRUD list form');
      
      expect(result.complexity).toBe('simple');
    });

    it('should detect moderate complexity', () => {
      const result = classifier.classify('Build integration with async queue middleware');
      
      expect(result.complexity).toBe('moderate');
    });

    it('should detect complex complexity', () => {
      const result = classifier.classify('Implement distributed consensus with CRDT');
      
      expect(result.complexity).toBe('complex');
    });

    it('should return empty result for unknown input', () => {
      const result = classifier.classify('Hello world basic simple');
      
      expect(result.domain).toEqual([]);
      expect(result.keywords).toEqual(expect.arrayContaining(['hello', 'world', 'basic', 'simple']));
      expect(result.complexity).toBe('simple');
    });

    it('should limit keywords to 15', () => {
      const result = classifier.classify('react vue angular html css http rest api endpoint server database sql nosql queue cache middleware service deploy ci cd pipeline docker kubernetes terraform monitoring auth oauth jwt encryption vulnerability cve owasp xss csrf ml ai model training inference dataset feature prediction pattern module dependency microservice event cqrs saga crud list form basic simple');
      
      expect(result.keywords.length).toBeLessThanOrEqual(15);
    });

    it('should validate result schema', () => {
      const result = classifier.classify('Build React REST API');
      
      const parsed = ClassificationResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });

  describe('createClassifier', () => {
    it('should create a new classifier instance', () => {
      const classifier = createClassifier();
      
      expect(classifier).toBeInstanceOf(SemanticClassifier);
    });

    it('should classify correctly with factory function', () => {
      const classifier = createClassifier();
      const result = classifier.classify('React component');
      
      expect(result.domain).toContain('web-development');
    });
  });
});
