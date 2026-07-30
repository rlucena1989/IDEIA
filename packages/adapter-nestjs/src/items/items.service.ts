import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateItemsDto } from './dto/create-items.dto';
import { UpdateItemsDto } from './dto/update-items.dto';

export interface ItemsEntity {
  id: string;
  name: string;
  createdAt: Date;
}

@Injectable()
export class ItemsService {
  private items: ItemsEntity[] = [];
  private counter = 0;

  create(dto: CreateItemsDto): ItemsEntity {
    this.counter++;
    const entity: ItemsEntity = {
      id: String(this.counter),
      name: dto.name,
      createdAt: new Date(),
    };
    this.items.push(entity);
    return entity;
  }

  findAll(): ItemsEntity[] {
    return this.items;
  }

  findOne(id: string): ItemsEntity {
    const item = this.items.find(item => item.id === id);
    if (!item) throw new NotFoundException(`${cap} with id ${id} not found`);
    return item;
  }

  update(id: string, dto: UpdateItemsDto): ItemsEntity {
    const item = this.findOne(id);
    if (dto.name !== undefined) item.name = dto.name;
    return item;
  }

  remove(id: string): void {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) throw new NotFoundException(`${cap} with id ${id} not found`);
    this.items.splice(index, 1);
  }
}
