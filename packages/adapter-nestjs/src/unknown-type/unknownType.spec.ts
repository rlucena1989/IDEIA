import { Test, TestingModule } from '@nestjs/testing';
import { UnknownTypeService } from './unknownType.service';
import { CreateUnknownTypeDto } from './dto/createUnknownType.dto';

describe('UnknownTypeService', () => {
  let service: UnknownTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnknownTypeService],
    }).compile();
    service = module.get<UnknownTypeService>(UnknownTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a unknownType', () => {
    const dto: CreateUnknownTypeDto = { name: 'test' };
    const result = service.create(dto);
    expect(result).toBeDefined();
    expect(result.name).toBe('test');
    expect(result.id).toBeDefined();
  });

  it('should find all unknownTypes', () => {
    service.create({ name: 'item1' });
    service.create({ name: 'item2' });
    const items = service.findAll();
    expect(items.length).toBe(2);
  });

  it('should find one unknownType by id', () => {
    const created = service.create({ name: 'test' });
    const found = service.findOne(created.id);
    expect(found).toBeDefined();
    expect(found.id).toBe(created.id);
  });

  it('should throw on find one not found', () => {
    expect(() => service.findOne('nonexistent')).toThrow();
  });

  it('should remove a unknownType', () => {
    const created = service.create({ name: 'test' });
    service.remove(created.id);
    expect(() => service.findOne(created.id)).toThrow();
  });
});
