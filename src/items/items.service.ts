import { Injectable } from '@nestjs/common';
import { CreateItemsDto } from './dto/create-items.dto';

export interface ItemsEntity {
  id: string;
  name: string;
  createdAt: Date;
}

@Injectable()
export class ItemsService {
  private items: ItemsEntity[] = [];

  create(dto: CreateItemsDto): ItemsEntity {
    const entity: ItemsEntity = {
      id: Math.random().toString(36).slice(2),
      name: dto.name,
      createdAt: new Date(),
    };
    this.items.push(entity);
    return entity;
  }

  findAll(): ItemsEntity[] {
    return this.items;
  }

  findOne(id: string): ItemsEntity | undefined {
    return this.items.find(item => item.id === id);
  }
}
