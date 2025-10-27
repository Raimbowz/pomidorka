import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Method } from '../../entities/method.entity';
import { MethodService } from './method.service';

@Module({
  imports: [TypeOrmModule.forFeature([Method])],
  providers: [MethodService],
  exports: [MethodService],
})
export class MethodModule {}
