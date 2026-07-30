import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUnknownTypeDto } from './dto/createUnknownType.dto';
import { UpdateUnknownTypeDto } from './dto/updateUnknownType.dto';

export interface UnknownTypeEntity {
  id: string;
  name: string;
  createdAt: Date;
}

@Injectable()
export class UnknownTypeService {
  private items: UnknownTypeEntity[] = [];
  private counter = 0;

  create(dto: CreateUnknownTypeDto): UnknownTypeEntity {
    this.counter++;
    const entity: UnknownTypeEntity = {
      id: String(this.counter),
      name: dto.name,
      createdAt: new Date(),
    };
    this.items.push(entity);
    return entity;
  }

  findAll(): UnknownTypeEntity[] {
    return this.items;
  }

  findOne(id: string): UnknownTypeEntity {
    const item = this.items.find((item) => item.id === id);
    if (!item) throw new NotFoundException(`UnknownType with id ${id} not found`);
    return item;
  }

  update(id: string, dto: UpdateUnknownTypeDto): UnknownTypeEntity {
    const item = this.findOne(id);
    if (dto.name !== undefined) item.name = dto.name;
    return item;
  }

  remove(id: string): void {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) throw new NotFoundException(`UnknownType with id ${id} not found`);
    this.items.splice(index, 1);
  }
}
