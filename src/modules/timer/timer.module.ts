import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TimerService } from './timer.service';
import { TimerProcessor } from './timer.processor';
import { SessionModule } from '../session/session.module';
import { NotificationModule } from '../notification/notification.module';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'timers',
    }),
    SessionModule,
    NotificationModule,
    StatsModule,
  ],
  providers: [TimerService, TimerProcessor],
  exports: [TimerService],
})
export class TimerModule {}
