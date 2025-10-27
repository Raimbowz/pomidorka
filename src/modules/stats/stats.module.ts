import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Statistic } from '../../entities/statistic.entity';
import { Session } from '../../entities/session.entity';
import { StatsService } from './stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([Statistic, Session])],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
