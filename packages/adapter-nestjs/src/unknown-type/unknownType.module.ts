import { Module } from '@nestjs/common';
import { UnknownTypeController } from './unknownType.controller';
import { UnknownTypeService } from './unknownType.service';

@Module({
  controllers: [UnknownTypeController],
  providers: [UnknownTypeService],
  exports: [UnknownTypeService],
})
export class UnknownTypeModule {}
