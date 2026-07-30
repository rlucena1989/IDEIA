import { Test, TestingModule } from '@nestjs/testing';
import { ItemsService } from './items.service';
import { CreateItemsDto } from './dto/create-items.dto';

describe('ItemsService', () => {
  let service: ItemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ItemsService],
    }).compile();
    service = module.get<ItemsService>(ItemsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a items', () => {
    const dto: CreateItemsDto = { name: 'test' };
    const result = service.create(dto);
    expect(result).toBeDefined();
    expect(result.name).toBe('test');
    expect(result.id).toBeDefined();
  });

  it('should find all itemss', () => {
    service.create({ name: 'item1' });
    service.create({ name: 'item2' });
    const items = service.findAll();
    expect(items.length).toBe(2);
  });

  it('should find one items by id', () => {
    const created = service.create({ name: 'test' });
    const found = service.findOne(created.id);
    expect(found).toBeDefined();
    expect(found.id).toBe(created.id);
  });

  it('should throw on find one not found', () => {
    expect(() => service.findOne('nonexistent')).toThrow();
  });

  it('should remove a items', () => {
    const created = service.create({ name: 'test' });
    service.remove(created.id);
    expect(() => service.findOne(created.id)).toThrow();
  });
});
