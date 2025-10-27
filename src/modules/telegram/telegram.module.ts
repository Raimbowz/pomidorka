import { Module } from '@nestjs/common';
import { TelegramUpdate } from './telegram.update';
import { TelegramActions } from './telegram.actions';
import { UserModule } from '../user/user.module';
import { MethodModule } from '../method/method.module';
import { SessionModule } from '../session/session.module';
import { StatsModule } from '../stats/stats.module';
import { TimerModule } from '../timer/timer.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    UserModule,
    MethodModule,
    SessionModule,
    StatsModule,
    TimerModule,
    NotificationModule,
  ],
  providers: [TelegramUpdate, TelegramActions],
})
export class TelegramModule {}
