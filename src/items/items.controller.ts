import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemsDto } from './dto/create-items.dto';

@Controller('itemss')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  create(@Body() dto: CreateItemsDto) {
    return this.itemsService.create(dto);
  }

  @Get()
  findAll() {
    return this.itemsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.itemsService.findOne(id);
  }
}
