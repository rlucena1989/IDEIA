import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { UnknownTypeService } from './unknownType.service';
import { CreateUnknownTypeDto } from './dto/createUnknownType.dto';
import { UpdateUnknownTypeDto } from './dto/updateUnknownType.dto';

@Controller('unknown-types')
export class UnknownTypeController {
  constructor(private readonly unknownTypeService: UnknownTypeService) {}

  @Post()
  create(@Body() dto: CreateUnknownTypeDto) {
    return this.unknownTypeService.create(dto);
  }

  @Get()
  findAll() {
    return this.unknownTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.unknownTypeService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUnknownTypeDto) {
    return this.unknownTypeService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.unknownTypeService.remove(id);
  }
}
